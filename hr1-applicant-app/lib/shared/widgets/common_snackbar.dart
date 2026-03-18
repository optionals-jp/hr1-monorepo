import 'dart:ui';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_text_styles.dart';

/// 共通 SnackBar ユーティリティ
///
/// 表示: 下から上にスライドイン
/// 非表示: 下に移動 + フェードアウト
class CommonSnackBar {
  CommonSnackBar._();

  static OverlayEntry? _entry;

  /// 成功・情報の SnackBar を表示
  static void show(BuildContext context, String message) {
    if (!context.mounted) return;
    _showOverlay(context, child: Text(message, style: AppTextStyles.body));
  }

  /// エラーの SnackBar を表示（赤系半透明背景 + アイコン）
  static void error(BuildContext context, String message) {
    if (!context.mounted) return;
    _showOverlay(
      context,
      backgroundColor: AppColors.error.withValues(alpha: 0.3),
      child: Row(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: AppColors.error,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: AppTextStyles.body.copyWith(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }

  static void _showOverlay(
    BuildContext context, {
    required Widget child,
    Color? backgroundColor,
  }) {
    _entry?.remove();
    _entry = null;

    final overlay = Overlay.of(context);
    late OverlayEntry entry;

    entry = OverlayEntry(
      builder: (_) => _AnimatedSnackBar(
        backgroundColor: backgroundColor,
        onDismissed: () {
          entry.remove();
          if (_entry == entry) _entry = null;
        },
        child: child,
      ),
    );

    _entry = entry;
    overlay.insert(entry);
  }
}

class _AnimatedSnackBar extends StatefulWidget {
  const _AnimatedSnackBar({
    required this.child,
    required this.onDismissed,
    this.backgroundColor,
  });

  final Widget child;
  final VoidCallback onDismissed;
  final Color? backgroundColor;

  @override
  State<_AnimatedSnackBar> createState() => _AnimatedSnackBarState();
}

class _AnimatedSnackBarState extends State<_AnimatedSnackBar>
    with TickerProviderStateMixin {
  late final AnimationController _enterController;
  late final AnimationController _exitController;
  bool _dismissing = false;

  @override
  void initState() {
    super.initState();
    _enterController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _exitController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    );
    _enterController.forward();
    Future.delayed(const Duration(seconds: 3), _dismiss);
  }

  void _dismiss() {
    if (!mounted || _dismissing) return;
    _dismissing = true;
    _exitController.forward().then((_) {
      if (mounted) widget.onDismissed();
    });
  }

  @override
  void dispose() {
    _enterController.dispose();
    _exitController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bottomPadding = MediaQuery.of(context).viewPadding.bottom;

    final enterSlide =
        Tween<Offset>(begin: const Offset(0, 1), end: Offset.zero).animate(
          CurvedAnimation(parent: _enterController, curve: Curves.easeOutCubic),
        );

    final exitSlide =
        Tween<Offset>(begin: Offset.zero, end: const Offset(0, 0.5)).animate(
          CurvedAnimation(parent: _exitController, curve: Curves.easeInCubic),
        );

    final exitFade = Tween<double>(
      begin: 1.0,
      end: 0.0,
    ).animate(CurvedAnimation(parent: _exitController, curve: Curves.easeIn));

    return Positioned(
      left: 16,
      right: 16,
      bottom: bottomPadding + 10,
      child: AnimatedBuilder(
        animation: Listenable.merge([_enterController, _exitController]),
        builder: (context, child) {
          final slide = _dismissing ? exitSlide.value : enterSlide.value;
          final opacity = _dismissing ? exitFade.value : 1.0;
          return FractionalTranslation(
            translation: slide,
            child: Opacity(opacity: opacity.clamp(0.0, 1.0), child: child),
          );
        },
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color:
                    widget.backgroundColor ??
                    (isDark
                        ? Colors.white.withValues(alpha: 0.15)
                        : Colors.black.withValues(alpha: 0.7)),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : Colors.white.withValues(alpha: 0.2),
                ),
              ),
              child: DefaultTextStyle(
                style: AppTextStyles.body.copyWith(
                  color: widget.backgroundColor != null ? null : Colors.white,
                ),
                child: widget.child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
