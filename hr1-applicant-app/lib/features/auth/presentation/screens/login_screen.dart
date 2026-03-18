import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/result/result.dart';
import '../../../../core/router/app_router.dart';
import '../../../../core/utils/validators.dart';
import '../../../../shared/widgets/common_button.dart';
import '../../../../shared/widgets/common_snackbar.dart';
import '../providers/auth_providers.dart';

/// ログイン画面（OTP認証）
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  bool _isLoading = false;
  bool _otpSent = false;

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  /// OTPを送信
  Future<void> _sendOtp() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final result = await ref
          .read(authRepositoryProvider)
          .sendOtp(email: _emailController.text.trim());

      if (!mounted) return;

      switch (result) {
        case Success():
          setState(() => _otpSent = true);
          CommonSnackBar.show(context, '認証コードを送信しました。メールをご確認ください。');
        case Failure(message: final message):
          CommonSnackBar.error(context, message);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// OTPを検証してログイン
  Future<void> _verifyOtp() async {
    final otp = _otpController.text.trim();
    if (otp.isEmpty) return;

    setState(() => _isLoading = true);

    try {
      final result = await ref
          .read(authRepositoryProvider)
          .verifyOtp(email: _emailController.text.trim(), token: otp);

      if (!mounted) return;

      switch (result) {
        case Success(data: final user):
          ref.read(appUserProvider.notifier).setUser(user);
          context.go(AppRoutes.companyHome);
        case Failure(message: final message):
          CommonSnackBar.error(context, message);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// メール入力画面に戻る
  void _backToEmail() {
    setState(() {
      _otpSent = false;
      _otpController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenHorizontal,
            ),
            child: Form(
              key: _formKey,
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
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Center(
                        child: Text(
                          'HR1',
                          style: AppTextStyles.heading3.copyWith(
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
                      _otpSent ? '認証コードを入力' : 'ログイン',
                      style: AppTextStyles.heading2,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Center(
                    child: Text(
                      _otpSent
                          ? '${_emailController.text.trim()} に送信された\n6桁のコードを入力してください'
                          : 'メールアドレスを入力してください',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),

                  if (!_otpSent) ...[
                    // メールアドレス入力
                    TextFormField(
                      controller: _emailController,
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
                      onPressed: _sendOtp,
                      loading: _isLoading,
                      child: const Text('認証コードを送信'),
                    ),
                  ] else ...[
                    // OTP入力
                    TextFormField(
                      controller: _otpController,
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      style: AppTextStyles.heading2.copyWith(letterSpacing: 8),
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
                      onPressed: _verifyOtp,
                      loading: _isLoading,
                      child: const Text('ログイン'),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    // 戻るボタン・再送信
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        TextButton(
                          onPressed: _isLoading ? null : _backToEmail,
                          child: const Text('メールアドレスを変更'),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        TextButton(
                          onPressed: _isLoading ? null : _sendOtp,
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
