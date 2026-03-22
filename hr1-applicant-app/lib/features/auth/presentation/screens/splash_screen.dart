import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/core/router/app_router.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/app_init_provider.dart';

/// スプラッシュ画面
/// アプリ起動時に表示し、認証状態に応じてルートを切り替える
class SplashScreen extends HookConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final initAsync = ref.watch(appInitProvider);

    useEffect(() {
      void navigate() async {
        await Future.delayed(const Duration(seconds: 1));
        if (!context.mounted) return;

        final result = initAsync.valueOrNull;
        if (result == null) return;

        switch (result) {
          case AppInitUnauthenticated():
            context.go(AppRoutes.login);
          case AppInitEmployee():
            await showDialog(
              context: context,
              barrierDismissible: false,
              builder: (ctx) => AlertDialog(
                title: const Text('入社おめでとうございます！'),
                content: const Text('社員として登録されました。\n今後は社員アプリをご利用ください。'),
                actions: [
                  TextButton(
                    onPressed: () async {
                      await Supabase.instance.client.auth.signOut();
                      if (ctx.mounted) {
                        Navigator.of(ctx).pop();
                        GoRouter.of(context).go(AppRoutes.login);
                      }
                    },
                    child: const Text('ログアウト'),
                  ),
                ],
              ),
            );
          case AppInitAuthenticated(user: final user):
            if (user.organizations.isEmpty) {
              context.go(AppRoutes.organizationSelect);
            } else {
              context.go(AppRoutes.companyHome);
            }
        }
      }

      if (initAsync.hasValue) {
        navigate();
      }
      return null;
    }, [initAsync]);

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
}
