import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../domain/entities/app_user.dart';
import '../../../../shared/widgets/loading_indicator.dart';
import '../providers/auth_providers.dart';

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

    final session = Supabase.instance.client.auth.currentSession;
    if (session != null) {
      final loaded = await _loadCurrentUser();
      if (!mounted) return;
      if (loaded) {
        context.go(AppRoutes.portal);
      } else {
        context.go(AppRoutes.login);
      }
      return;
    }

    context.go(AppRoutes.login);
  }

  Future<bool> _loadCurrentUser() async {
    try {
      final client = Supabase.instance.client;
      final currentUser = client.auth.currentUser;
      if (currentUser == null) return false;
      final userId = currentUser.id;
      final email = currentUser.email ?? '';

      final profile = await client
          .from('profiles')
          .select()
          .eq('id', userId)
          .maybeSingle();

      if (profile == null) {
        debugPrint('プロフィールが見つかりません: $userId');
        return false;
      }

      final userOrg = await client
          .from('user_organizations')
          .select('organization_id, organizations(name)')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

      final orgId = userOrg?['organization_id'] as String? ?? '';
      final orgName =
          (userOrg?['organizations'] as Map?)?['name'] as String? ?? '';

      final user = AppUser(
        id: userId,
        email: email,
        organizationId: orgId,
        organizationName: orgName,
        role: profile['role'] as String? ?? 'employee',
        displayName: profile['display_name'] as String?,
        avatarUrl: profile['avatar_url'] as String?,
        department: profile['department'] as String?,
        position: profile['position'] as String?,
      );
      ref.read(appUserProvider.notifier).setUser(user);
      return true;
    } on PostgrestException catch (e) {
      debugPrint('ユーザー情報の取得に失敗しました: ${e.message}');
      return false;
    } catch (e) {
      debugPrint('ユーザー情報の取得中にエラー: $e');
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.brandPrimary,
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
                      color: AppColors.brandPrimary,
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
