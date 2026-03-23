import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_applicant_app/features/forms/data/repositories/supabase_forms_repository.dart';
import 'package:hr1_applicant_app/features/forms/domain/entities/custom_form.dart';
import 'package:hr1_applicant_app/features/forms/domain/repositories/forms_repository.dart';

/// FormsRepository プロバイダー
final formsRepositoryProvider = Provider<FormsRepository>((ref) {
  return SupabaseFormsRepository(ref.watch(supabaseClientProvider));
});

/// フォームIDからフォーム情報を取得
final formDetailProvider = FutureProvider.autoDispose
    .family<CustomForm?, String>((ref, formId) async {
      final repo = ref.watch(formsRepositoryProvider);
      return repo.getForm(formId);
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
