import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/router/app_router.dart';
import '../../../../core/utils/validators.dart';
import '../../../../shared/widgets/common_button.dart';
import '../../../../shared/widgets/common_snackbar.dart';
import '../controllers/auth_controller.dart';

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
  bool _otpSent = false;

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref
        .read(authControllerProvider.notifier)
        .sendOtp(_emailController.text.trim());

    if (!mounted) return;

    if (success) {
      setState(() => _otpSent = true);
      CommonSnackBar.show(context, '認証コードを送信しました。メールをご確認ください。');
    } else {
      final error = ref.read(authControllerProvider).error;
      CommonSnackBar.error(context, error ?? 'エラーが発生しました');
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
      final error = ref.read(authControllerProvider).error;
      CommonSnackBar.error(context, error ?? 'エラーが発生しました');
    }
  }

  void _backToEmail() {
    setState(() {
      _otpSent = false;
      _otpController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final isLoading = authState.isLoading;
    final theme = Theme.of(context);

    return Scaffold(
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
                  // ロゴ
                  Center(
                    child: Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: AppColors.brandPrimary,
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

                  // タイトル
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
                        color: theme.colorScheme.onSurface.withValues(
                          alpha: 0.6,
                        ),
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
                    const SizedBox(height: AppSpacing.lg),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        TextButton(
                          onPressed: isLoading ? null : _backToEmail,
                          child: const Text('メールアドレスを変更'),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        TextButton(
                          onPressed: isLoading ? null : _sendOtp,
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
