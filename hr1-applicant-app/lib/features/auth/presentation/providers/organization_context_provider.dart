import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hr1_applicant_app/features/auth/domain/entities/organization.dart';
import 'auth_providers.dart';

const _kLastOrgIdKey = 'last_selected_organization_id';

/// 全企業一覧プロバイダー（企業選択画面用）
final allOrganizationsProvider = FutureProvider.autoDispose<List<Organization>>(
  (ref) async {
    final client = ref.watch(supabaseClientProvider);
    final data = await client.from('organizations').select().order('name');
    return (data as List).map((e) => Organization.fromJson(e)).toList();
  },
);

/// 現在選択中の企業を管理するプロバイダー
final currentOrganizationProvider =
    StateNotifierProvider<CurrentOrganizationNotifier, Organization?>((ref) {
      return CurrentOrganizationNotifier(ref);
    });

/// 選択中の企業の状態管理（SharedPreferences で永続化）
class CurrentOrganizationNotifier extends StateNotifier<Organization?> {
  CurrentOrganizationNotifier(this._ref) : super(null) {
    _init();
  }

  final Ref _ref;

  Future<void> _init() async {
    final currentUser = _ref.read(appUserProvider);
    if (currentUser != null && currentUser.organizations.isNotEmpty) {
      final savedId = await _loadLastOrgId();
      final matched = savedId != null
          ? currentUser.organizations
                .where((org) => org.id == savedId)
                .firstOrNull
          : null;
      state = matched ?? currentUser.organizations.first;
    }

    _ref.listen(appUserProvider, (previous, next) {
      if (next != null && next.organizations.isNotEmpty) {
        if (state == null ||
            !next.organizations.any((org) => org.id == state!.id)) {
          state = next.organizations.first;
          _saveLastOrgId(state!.id);
        }
      } else {
        state = null;
      }
    });
  }

  /// 企業を切り替え
  void switchOrganization(Organization organization) {
    state = organization;
    _saveLastOrgId(organization.id);
  }

  Future<String?> _loadLastOrgId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kLastOrgIdKey);
  }

  Future<void> _saveLastOrgId(String orgId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kLastOrgIdKey, orgId);
  }
}

/// 企業切り替えが可能かどうか（応募者かつ2社以上）
final canSwitchOrganizationProvider = Provider<bool>((ref) {
  final user = ref.watch(appUserProvider);
  if (user == null) return false;
  return user.isApplicant && user.hasMultipleOrganizations;
});
