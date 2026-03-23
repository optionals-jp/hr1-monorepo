import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_applicant_app/features/forms/domain/entities/custom_form.dart';
import 'package:hr1_applicant_app/features/forms/domain/repositories/forms_repository.dart';

/// FormsRepository の Supabase 実装
class SupabaseFormsRepository implements FormsRepository {
  SupabaseFormsRepository(this._client);

  final SupabaseClient _client;

  static const _allowedExtensions = {
    'jpg',
    'jpeg',
    'png',
    'gif',
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
  };

  static String _sanitizePathSegment(String value) {
    return value.replaceAll(RegExp(r'[/\\.]'), '_');
  }

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
  Future<String> uploadFormFile({
    required String formId,
    required String fieldId,
    required File file,
    required String extension,
  }) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) throw Exception('ユーザーが認証されていません');

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.lengthSync() > maxFileSize) {
      throw Exception('ファイルサイズが10MBを超えています');
    }

    final ext = extension.toLowerCase();
    if (!_allowedExtensions.contains(ext)) {
      throw Exception('許可されていないファイル形式です: $extension');
    }

    final safeFormId = _sanitizePathSegment(formId);
    final safeFieldId = _sanitizePathSegment(fieldId);

    final path =
        '$safeFormId/$userId/${safeFieldId}_${DateTime.now().millisecondsSinceEpoch}.$ext';

    await _client.storage
        .from('form-attachments')
        .upload(path, file, fileOptions: const FileOptions(upsert: true));

    return path;
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
