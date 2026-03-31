import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_applicant_app/core/constants/constants.dart';
import 'package:hr1_applicant_app/shared/widgets/widgets.dart';
import 'package:hr1_applicant_app/core/router/app_router.dart';
import 'package:hr1_applicant_app/features/auth/presentation/controllers/auth_controller.dart';
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
                      await ref.read(authControllerProvider.notifier).signOut();
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

    final isDark = AppColors.isDark(context);
    return Scaffold(
      backgroundColor: isDark
          ? AppColors.darkBackground
          : AppColors.lightBackground,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: Image.asset(
                'assets/icon/app_icon.png',
                width: 120,
                height: 120,
              ),
            ),
            const SizedBox(height: 24),
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
