import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/repositories/supabase_forms_repository.dart';
import '../../domain/entities/custom_form.dart';

/// FormsRepository プロバイダー
final formsRepositoryProvider = Provider<SupabaseFormsRepository>((ref) {
  return SupabaseFormsRepository(Supabase.instance.client);
});

/// フォームIDからフォーム情報を取得
final formDetailProvider =
    FutureProvider.autoDispose.family<CustomForm?, String>((ref, formId) async {
  final repo = ref.watch(formsRepositoryProvider);
  return repo.getFormAsync(formId);
});

/// フォーム回答の状態管理
final formAnswersProvider = StateNotifierProvider.autoDispose
    .family<FormAnswersNotifier, Map<String, dynamic>, String>((ref, formId) {
  return FormAnswersNotifier();
});

class FormAnswersNotifier extends StateNotifier<Map<String, dynamic>> {
  FormAnswersNotifier() : super({});

  void setAnswer(String fieldId, dynamic value) {
    state = {...state, fieldId: value};
  }

  void clear() {
    state = {};
  }
}
