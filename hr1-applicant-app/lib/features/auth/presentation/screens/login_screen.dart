import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/core/result/result.dart';
import 'package:hr1_applicant_app/core/router/app_router.dart';
import 'package:hr1_shared/hr1_shared.dart' show Validators;
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';

const _resendCooldownSeconds = 60;

class LoginScreen extends HookConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formKey = useMemoized(() => GlobalKey<FormState>());
    final emailController = useTextEditingController();
    final otpController = useTextEditingController();
    final isLoading = useState(false);
    final otpSent = useState(false);
    final resendCooldown = useState(0);

    useEffect(() {
      if (resendCooldown.value <= 0) return null;
      final timer = Timer.periodic(const Duration(seconds: 1), (_) {
        resendCooldown.value--;
        if (resendCooldown.value <= 0) {
          resendCooldown.value = 0;
        }
      });
      return timer.cancel;
    }, [resendCooldown.value > 0]);

    Future<void> sendOtp() async {
      if (isLoading.value) return;
      if (!formKey.currentState!.validate()) return;

      isLoading.value = true;

      try {
        final result = await ref
            .read(authRepositoryProvider)
            .sendOtp(email: emailController.text.trim());

        if (!context.mounted) return;

        switch (result) {
          case Success():
            final wasAlreadySent = otpSent.value;
            otpSent.value = true;
            resendCooldown.value = _resendCooldownSeconds;
            CommonSnackBar.show(
              context,
              wasAlreadySent ? '認証コードを再送信しました' : '認証コードを送信しました。メールをご確認ください。',
            );
          case Failure():
            CommonSnackBar.error(context, 'メール送信に失敗しました。メールアドレスを確認してください');
        }
      } finally {
        if (context.mounted) isLoading.value = false;
      }
    }

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
          case Failure():
            CommonSnackBar.error(context, '認証コードが正しくありません。再度お試しください');
        }
      } finally {
        if (context.mounted) isLoading.value = false;
      }
    }

    void backToEmail() {
      otpSent.value = false;
      otpController.clear();
      resendCooldown.value = 0;
    }

    final canResend = resendCooldown.value <= 0 && !isLoading.value;

    return CommonScaffold(
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
                  Center(
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: AppColors.brandSecondary,
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
                        color: AppColors.textSecondary(context),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),

                  if (!otpSent.value) ...[
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

                    CommonButton(
                      onPressed: sendOtp,
                      loading: isLoading.value,
                      child: const Text('認証コードを送信'),
                    ),
                  ] else ...[
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

                    CommonButton(
                      onPressed: verifyOtp,
                      loading: isLoading.value,
                      child: const Text('ログイン'),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    CommonButton.outline(
                      onPressed: canResend ? sendOtp : null,
                      child: Text(
                        canResend
                            ? 'OTPを再送信'
                            : '再送信可能まで ${resendCooldown.value}秒',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    Center(
                      child: TextButton(
                        onPressed: isLoading.value ? null : backToEmail,
                        child: const Text('メールアドレスを変更'),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    Center(
                      child: Text(
                        'ログインでお困りの場合は support@hr1.jp までご連絡ください',
                        style: AppTextStyles.caption1.copyWith(
                          color: AppColors.textSecondary(context),
                        ),
                        textAlign: TextAlign.center,
                      ),
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
