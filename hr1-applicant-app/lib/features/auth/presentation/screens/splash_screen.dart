import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../../../../core/result/result.dart';
import '../../../../core/router/app_router.dart';
import '../providers/auth_providers.dart';

/// スプラッシュ画面
/// アプリ起動時に表示し、認証状態に応じてルートを切り替える
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigateToNextScreen();
  }

  /// 認証状態を確認して適切な画面に遷移
  Future<void> _navigateToNextScreen() async {
    // スプラッシュ画面を最低1秒表示
    await Future.delayed(const Duration(seconds: 1));

    if (!mounted) return;

    final authRepo = ref.read(authRepositoryProvider);

    if (authRepo.isAuthenticated) {
      // セッションが有効 → プロフィール取得してホームへ
      final result = await authRepo.getCurrentUser();
      if (!mounted) return;

      switch (result) {
        case Success(data: final user):
          ref.read(appUserProvider.notifier).setUser(user);
          context.go(AppRoutes.companyHome);
        case Failure():
          // プロフィール取得失敗 → ログインへ
          context.go(AppRoutes.login);
      }
    } else {
      // 未認証 → ログインへ
      context.go(AppRoutes.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primary,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // アプリロゴ（仮）
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Center(
                child: Text(
                  'HR1',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'HR1',
              style: AppTextStyles.heading1.copyWith(
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'AI-Native HR SaaS',
              style: AppTextStyles.body.copyWith(
                color: Colors.white.withValues(alpha: 0.7),
              ),
            ),
            const SizedBox(height: 48),
            const SizedBox(
              width: 24,
              height: 24,
              child: LoadingIndicator(size: 24),
            ),
          ],
        ),
      ),
    );
  }
}
