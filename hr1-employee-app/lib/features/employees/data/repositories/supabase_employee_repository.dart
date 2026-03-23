import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/employees/domain/entities/employee_contact.dart';

/// 社員データのSupabaseリポジトリ
class SupabaseEmployeeRepository {
  SupabaseEmployeeRepository(this._client, {this.overrideUserId});

  final SupabaseClient _client;
  final String? overrideUserId;

  static const _avatarColors = [
    Color(0xFF0F6CBD),
    Color(0xFF0E7A0B),
    Color(0xFFBC4B09),
    Color(0xFF115EA3),
    Color(0xFFB10E1C),
  ];

  String get _userId {
    final id = overrideUserId ?? _client.auth.currentUser?.id;
    if (id == null) throw StateError('ユーザーが認証されていません');
    return id;
  }

  Future<String> _getOrganizationId() async {
    final row = await _client
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', _userId)
        .limit(1)
        .single();
    return row['organization_id'] as String;
  }

  /// 社員を検索
  Future<List<EmployeeContact>> searchEmployees(String query) async {
    final orgId = await _getOrganizationId();

    final results = await _client
        .from('user_organizations')
        .select(
          'user_id, profiles(id, display_name, email, department, position, avatar_url)',
        )
        .eq('organization_id', orgId)
        .or(
          'profiles.display_name.ilike.%$query%,profiles.department.ilike.%$query%,profiles.position.ilike.%$query%',
        );

    return (results as List)
        .where((r) => r['profiles'] != null)
        .toList()
        .asMap()
        .entries
        .map((entry) {
          final p = entry.value['profiles'];
          final name =
              p['display_name'] as String? ?? p['email'] as String? ?? '';
          return EmployeeContact(
            id: p['id'] as String,
            name: name,
            initial: name.isNotEmpty ? name[0] : '?',
            position: p['position'] as String? ?? '',
            department: p['department'] as String? ?? '',
            color: _avatarColors[entry.key % _avatarColors.length],
            email: p['email'] as String?,
            avatarUrl: p['avatar_url'] as String?,
          );
        })
        .toList();
  }

  /// 組織内の全社員を取得
  Future<List<EmployeeContact>> getEmployees() async {
    final orgId = await _getOrganizationId();

    final results = await _client
        .from('user_organizations')
        .select(
          'user_id, profiles(id, display_name, email, department, position, avatar_url)',
        )
        .eq('organization_id', orgId);

    return (results as List)
        .where((r) => r['profiles'] != null)
        .toList()
        .asMap()
        .entries
        .map((entry) {
          final p = entry.value['profiles'];
          final name =
              p['display_name'] as String? ?? p['email'] as String? ?? '';
          return EmployeeContact(
            id: p['id'] as String,
            name: name,
            initial: name.isNotEmpty ? name[0] : '?',
            position: p['position'] as String? ?? '',
            department: p['department'] as String? ?? '',
            color: _avatarColors[entry.key % _avatarColors.length],
            email: p['email'] as String?,
            avatarUrl: p['avatar_url'] as String?,
          );
        })
        .toList();
  }

  /// 組織内の部署一覧を取得
  Future<List<String>> getDepartments() async {
    final orgId = await _getOrganizationId();

    final results = await _client
        .from('departments')
        .select('name')
        .eq('organization_id', orgId)
        .order('name');

    return (results as List).map((r) => r['name'] as String).toList();
  }
}
