import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../domain/entities/app_user.dart';
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

    if (kDevMode) {
      // 開発モード：Supabaseから企業情報を取得して直接ホームへ
      await _setDevUser();
      if (!mounted) return;
      context.go(AppRoutes.portal);
      return;
    }

    // TODO: 本番用の認証チェック
    context.go(AppRoutes.login);
  }

  /// 開発用ユーザーをセット（profiles からSupabase取得）
  Future<void> _setDevUser() async {
    final profile = await Supabase.instance.client
        .from('profiles')
        .select()
        .eq('id', 'dev-employee-001')
        .single();

    final user = AppUser.fromJson(Map<String, dynamic>.from(profile));
    ref.read(appUserProvider.notifier).setUser(user);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

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
                color: theme.colorScheme.surface,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Center(
                child: Text(
                  'HR1',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'HR1',
              style: AppTextStyles.heading1.copyWith(
                color: theme.colorScheme.surface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'AI-Native HR SaaS',
              style: AppTextStyles.body.copyWith(
                color: theme.colorScheme.surface.withValues(alpha: 0.7),
              ),
            ),
            const SizedBox(height: 48),
            SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(theme.colorScheme.surface),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
