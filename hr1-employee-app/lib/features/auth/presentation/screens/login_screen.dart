import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_shared/hr1_shared.dart' show Validators;
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/auth/presentation/controllers/auth_controller.dart';

const _resendCooldownSeconds = 60;

class LoginScreen extends HookConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formKey = useMemoized(GlobalKey<FormState>.new);
    final emailController = useTextEditingController();
    final otpController = useTextEditingController();
    final otpSent = useState(false);
    final resendCooldown = useState(0);
    final cooldownTimerRef = useRef<Timer?>(null);

    useEffect(() {
      return () => cooldownTimerRef.value?.cancel();
    }, []);

    void startCooldown() {
      cooldownTimerRef.value?.cancel();
      resendCooldown.value = _resendCooldownSeconds;
      cooldownTimerRef.value = Timer.periodic(const Duration(seconds: 1), (_) {
        resendCooldown.value--;
        if (resendCooldown.value <= 0) {
          resendCooldown.value = 0;
          cooldownTimerRef.value?.cancel();
        }
      });
    }

    Future<void> sendOtp() async {
      final authState = ref.read(authControllerProvider);
      if (authState.isLoading) return;
      if (!formKey.currentState!.validate()) return;

      final wasAlreadySent = otpSent.value;

      final success = await ref
          .read(authControllerProvider.notifier)
          .sendOtp(emailController.text.trim());

      if (!context.mounted) return;

      if (success) {
        otpSent.value = true;
        startCooldown();
        CommonSnackBar.show(
          context,
          wasAlreadySent ? '認証コードを再送信しました' : '認証コードを送信しました。メールをご確認ください。',
        );
      } else {
        CommonSnackBar.error(context, 'メール送信に失敗しました。メールアドレスを確認してください');
      }
    }

    Future<void> verifyOtp() async {
      final otp = otpController.text.trim();
      if (otp.isEmpty) return;

      final success = await ref
          .read(authControllerProvider.notifier)
          .verifyOtp(emailController.text.trim(), otp);

      if (!context.mounted) return;

      if (success) {
        context.go(AppRoutes.portal);
      } else {
        CommonSnackBar.error(context, '認証コードが正しくありません。再度お試しください');
      }
    }

    void backToEmail() {
      cooldownTimerRef.value?.cancel();
      otpSent.value = false;
      otpController.clear();
      resendCooldown.value = 0;
    }

    final authState = ref.watch(authControllerProvider);
    final isLoading = authState.isLoading;
    final canResend = resendCooldown.value <= 0 && !isLoading;

    return CommonScaffold(
      backgroundColor: AppColors.surface(context),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Form(
              key: formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: AppColors.brand,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Center(
                        child: Text(
                          'HR1',
                          style: AppTextStyles.headline.copyWith(
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: -0.3,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),

                  Center(
                    child: Text(
                      otpSent.value ? '認証コードを入力' : 'ログイン',
                      style: AppTextStyles.title1,
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
                  const SizedBox(height: 36),

                  if (!otpSent.value) ...[
                    TextFormField(
                      controller: emailController,
                      keyboardType: TextInputType.emailAddress,
                      validator: Validators.email,
                      decoration: const InputDecoration(
                        labelText: 'メールアドレス',
                        prefixIcon: Icon(Icons.email_outlined, size: 20),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    CommonButton(
                      onPressed: sendOtp,
                      loading: isLoading,
                      child: const Text('認証コードを送信'),
                    ),
                  ] else ...[
                    TextFormField(
                      controller: otpController,
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      style: AppTextStyles.title2.copyWith(
                        letterSpacing: 8,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLength: 6,
                      decoration: const InputDecoration(
                        labelText: '認証コード',
                        prefixIcon: Icon(Icons.lock_outlined, size: 20),
                        counterText: '',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    CommonButton(
                      onPressed: verifyOtp,
                      loading: isLoading,
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
                        onPressed: isLoading ? null : backToEmail,
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
