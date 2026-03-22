import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/constants/constants.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../../core/result/result.dart';
import '../../../../core/router/app_router.dart';
import '../providers/auth_providers.dart';

/// スプラッシュ画面
/// アプリ起動時に表示し、認証状態に応じてルートを切り替える
class SplashScreen extends HookConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    useEffect(() {
      _navigateToNextScreen(context, ref);
      return null;
    }, const []);

    return Scaffold(
      backgroundColor: AppColors.primary,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: AppRadius.radius160,
              ),
              child: Center(
                child: Text(
                  'HR1',
                  style: AppTextStyles.title2.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'HR1',
              style: AppTextStyles.title1.copyWith(color: Colors.white),
            ),
            const SizedBox(height: 8),
            Text(
              'AI-Native HR SaaS',
              style: AppTextStyles.body2.copyWith(
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

  Future<void> _navigateToNextScreen(
    BuildContext context,
    WidgetRef ref,
  ) async {
    await Future.delayed(const Duration(seconds: 1));

    if (!context.mounted) return;

    final authRepo = ref.read(authRepositoryProvider);

    if (authRepo.isAuthenticated) {
      final result = await authRepo.getCurrentUser();
      if (!context.mounted) return;

      switch (result) {
        case Success(data: final user):
          ref.read(appUserProvider.notifier).setUser(user);
          if (!context.mounted) return;
          if (user.organizations.isEmpty) {
            context.go(AppRoutes.organizationSelect);
          } else {
            context.go(AppRoutes.companyHome);
          }
        case Failure():
          context.go(AppRoutes.login);
      }
    } else {
      context.go(AppRoutes.login);
    }
  }
}
