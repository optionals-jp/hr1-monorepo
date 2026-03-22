import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/result/result.dart';
import '../../../../core/router/app_router.dart';
import '../../../../core/utils/validators.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/auth_providers.dart';

/// ログイン画面（OTP認証）
class LoginScreen extends HookConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formKey = useMemoized(() => GlobalKey<FormState>());
    final emailController = useTextEditingController();
    final otpController = useTextEditingController();
    final isLoading = useState(false);
    final otpSent = useState(false);

    final theme = Theme.of(context);

    /// OTPを送信
    Future<void> sendOtp() async {
      if (!formKey.currentState!.validate()) return;

      isLoading.value = true;

      try {
        final result = await ref
            .read(authRepositoryProvider)
            .sendOtp(email: emailController.text.trim());

        if (!context.mounted) return;

        switch (result) {
          case Success():
            otpSent.value = true;
            CommonSnackBar.show(context, '認証コードを送信しました。メールをご確認ください。');
          case Failure(message: final message):
            CommonSnackBar.error(context, message);
        }
      } finally {
        if (context.mounted) isLoading.value = false;
      }
    }

    /// OTPを検証してログイン
    Future<void> verifyOtp() async {
      final otp = otpController.text.trim();
      if (otp.isEmpty) return;

      isLoading.value = true;

      try {
        final result = await ref
            .read(authRepositoryProvider)
            .verifyOtp(email: emailController.text.trim(), token: otp);

        if (!context.mounted) return;

        switch (result) {
          case Success(data: final user):
            ref.read(appUserProvider.notifier).setUser(user);
            context.go(AppRoutes.companyHome);
          case Failure(message: final message):
            CommonSnackBar.error(context, message);
        }
      } finally {
        if (context.mounted) isLoading.value = false;
      }
    }

    /// メール入力画面に戻る
    void backToEmail() {
      otpSent.value = false;
      otpController.clear();
    }

    return CommonScaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenHorizontal,
            ),
            child: Form(
              key: formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ロゴ
                  Center(
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: AppRadius.radius160,
                      ),
                      child: Center(
                        child: Text(
                          'HR1',
                          style: AppTextStyles.title3.copyWith(
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // タイトル
                  Center(
                    child: Text(
                      otpSent.value ? '認証コードを入力' : 'ログイン',
                      style: AppTextStyles.title2,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Center(
                    child: Text(
                      otpSent.value
                          ? '${emailController.text.trim()} に送信された\n6桁のコードを入力してください'
                          : 'メールアドレスを入力してください',
                      style: AppTextStyles.caption1.copyWith(
                        color: AppColors.textSecondaryOf(theme.brightness),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),

                  if (!otpSent.value) ...[
                    // メールアドレス入力
                    TextFormField(
                      controller: emailController,
                      keyboardType: TextInputType.emailAddress,
                      validator: Validators.email,
                      decoration: const InputDecoration(
                        labelText: 'メールアドレス',
                        prefixIcon: Icon(Icons.email_outlined),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // OTP送信ボタン
                    CommonButton(
                      onPressed: sendOtp,
                      loading: isLoading.value,
                      child: const Text('認証コードを送信'),
                    ),
                  ] else ...[
                    // OTP入力
                    TextFormField(
                      controller: otpController,
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      style: AppTextStyles.title2.copyWith(letterSpacing: 8),
                      maxLength: 6,
                      decoration: const InputDecoration(
                        labelText: '認証コード',
                        prefixIcon: Icon(Icons.lock_outlined),
                        counterText: '',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ログインボタン
                    CommonButton(
                      onPressed: verifyOtp,
                      loading: isLoading.value,
                      child: const Text('ログイン'),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    // 戻るボタン・再送信
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        TextButton(
                          onPressed: isLoading.value ? null : backToEmail,
                          child: const Text('メールアドレスを変更'),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        TextButton(
                          onPressed: isLoading.value ? null : sendOtp,
                          child: const Text('コードを再送信'),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
