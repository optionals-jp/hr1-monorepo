import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/auth/presentation/controllers/auth_controller.dart';

/// スプラッシュ画面
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnimation = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOut,
    );
    _fadeController.forward();
    _navigateToNextScreen();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    super.dispose();
  }

  Future<void> _navigateToNextScreen() async {
    await Future.delayed(const Duration(seconds: 1));

    if (!mounted) return;

    final loaded = await ref
        .read(authControllerProvider.notifier)
        .restoreSession();
    if (!mounted) return;

    if (loaded) {
      context.go(AppRoutes.portal);
    } else {
      context.go(AppRoutes.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.brand,
      body: Center(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Center(
                  child: Text(
                    'HR1',
                    style: AppTextStyles.title2.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.brand,
                      letterSpacing: -0.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'HR1',
                style: AppTextStyles.title1.copyWith(
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'AI-Native HR SaaS',
                style: AppTextStyles.caption1.copyWith(
                  color: Colors.white.withValues(alpha: 0.7),
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 48),
              const LoadingIndicator(size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
