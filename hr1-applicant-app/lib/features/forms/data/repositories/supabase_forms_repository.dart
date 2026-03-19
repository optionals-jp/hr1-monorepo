import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/custom_form.dart';
import '../../domain/repositories/forms_repository.dart';

/// FormsRepository の Supabase 実装
class SupabaseFormsRepository implements FormsRepository {
  SupabaseFormsRepository(this._client);

  final SupabaseClient _client;

  @override
  Future<void> submitResponses({
    required String formId,
    required String applicantId,
    required Map<String, dynamic> answers,
  }) async {
    final now = DateTime.now().toIso8601String();
    final rows = answers.entries.where((e) => e.value != null).map((e) {
      dynamic value = e.value;
      if (value is DateTime) {
        value = value.toIso8601String();
      }
      return {
        'form_id': formId,
        'field_id': e.key,
        'applicant_id': applicantId,
        'value': value,
        'submitted_at': now,
      };
    }).toList();
    if (rows.isNotEmpty) {
      await _client.from('form_responses').insert(rows);
    }
  }

  @override
  Future<CustomForm?> getForm(String formId) async {
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
