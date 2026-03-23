import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_shared/hr1_shared.dart' show Validators;
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/auth/presentation/controllers/auth_controller.dart';

const _resendCooldownSeconds = 60;

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  bool _otpSent = false;
  int _resendCooldown = 0;
  Timer? _cooldownTimer;

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    _cooldownTimer?.cancel();
    super.dispose();
  }

  void _startCooldown() {
    _cooldownTimer?.cancel();
    setState(() => _resendCooldown = _resendCooldownSeconds);
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() {
        _resendCooldown--;
        if (_resendCooldown <= 0) {
          _resendCooldown = 0;
          _cooldownTimer?.cancel();
        }
      });
    });
  }

  Future<void> _sendOtp() async {
    final authState = ref.read(authControllerProvider);
    if (authState.isLoading) return;
    if (!_formKey.currentState!.validate()) return;

    final wasAlreadySent = _otpSent;

    final success = await ref
        .read(authControllerProvider.notifier)
        .sendOtp(_emailController.text.trim());

    if (!mounted) return;

    if (success) {
      setState(() => _otpSent = true);
      _startCooldown();
      CommonSnackBar.show(
        context,
        wasAlreadySent ? '認証コードを再送信しました' : '認証コードを送信しました。メールをご確認ください。',
      );
    } else {
      CommonSnackBar.error(context, 'メール送信に失敗しました。メールアドレスを確認してください');
    }
  }

  Future<void> _verifyOtp() async {
    final otp = _otpController.text.trim();
    if (otp.isEmpty) return;

    final success = await ref
        .read(authControllerProvider.notifier)
        .verifyOtp(_emailController.text.trim(), otp);

    if (!mounted) return;

    if (success) {
      context.go(AppRoutes.portal);
    } else {
      CommonSnackBar.error(context, '認証コードが正しくありません。再度お試しください');
    }
  }

  void _backToEmail() {
    _cooldownTimer?.cancel();
    setState(() {
      _otpSent = false;
      _otpController.clear();
      _resendCooldown = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final isLoading = authState.isLoading;
    final theme = Theme.of(context);
    final canResend = _resendCooldown <= 0 && !isLoading;

    return CommonScaffold(
      backgroundColor: theme.colorScheme.surface,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Form(
              key: _formKey,
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
                      _otpSent ? '認証コードを入力' : 'ログイン',
                      style: AppTextStyles.title1,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Center(
                    child: Text(
                      _otpSent
                          ? '${_emailController.text.trim()} に送信された\n6桁のコードを入力してください'
                          : 'メールアドレスを入力してください',
                      style: AppTextStyles.caption1.copyWith(
                        color: AppColors.textSecondary(theme.brightness),
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 36),

                  if (!_otpSent) ...[
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      validator: Validators.email,
                      decoration: const InputDecoration(
                        labelText: 'メールアドレス',
                        prefixIcon: Icon(Icons.email_outlined, size: 20),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    CommonButton(
                      onPressed: _sendOtp,
                      loading: isLoading,
                      child: const Text('認証コードを送信'),
                    ),
                  ] else ...[
                    TextFormField(
                      controller: _otpController,
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
                      onPressed: _verifyOtp,
                      loading: isLoading,
                      child: const Text('ログイン'),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    CommonButton.outline(
                      onPressed: canResend ? _sendOtp : null,
                      child: Text(
                        canResend ? 'OTPを再送信' : '再送信可能まで $_resendCooldown秒',
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    Center(
                      child: TextButton(
                        onPressed: isLoading ? null : _backToEmail,
                        child: const Text('メールアドレスを変更'),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    Center(
                      child: Text(
                        'ログインでお困りの場合は support@hr1.jp までご連絡ください',
                        style: AppTextStyles.caption1.copyWith(
                          color: AppColors.textSecondary(theme.brightness),
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
