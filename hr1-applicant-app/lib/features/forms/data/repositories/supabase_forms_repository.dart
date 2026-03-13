import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/custom_form.dart';
import '../../domain/repositories/forms_repository.dart';

/// FormsRepository の Supabase 実装
class SupabaseFormsRepository implements FormsRepository {
  SupabaseFormsRepository(this._client);

  final SupabaseClient _client;

  @override
  CustomForm? getForm(String formId) {
    throw UnimplementedError('Use getFormAsync instead');
  }

  /// フォームIDからフォーム情報を非同期取得
  Future<CustomForm?> getFormAsync(String formId) async {
    try {
      final response = await _client
          .from('custom_forms')
          .select('*, form_fields(*)')
          .eq('id', formId)
          .maybeSingle();

      if (response == null) return null;
      final map = Map<String, dynamic>.from(response);
      // form_fields を fields にリネーム、sort_order を order にマッピング
      final rawFields = (map['form_fields'] as List?) ?? [];
      map['fields'] = rawFields.map((f) {
        final fMap = Map<String, dynamic>.from(f);
        fMap['order'] = fMap['sort_order'];
        return fMap;
      }).toList();
      map.remove('form_fields');
      return CustomForm.fromJson(map);
    } catch (e, stackTrace) {
      debugPrint('Error fetching form $formId: $e');
      debugPrint('$stackTrace');
      rethrow;
    }
  }
}
