import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 共通 SnackBar ユーティリティ
///
/// 表示: 下から上にスライドイン
/// 非表示: 上から下にフェードアウト
class CommonSnackBar {
  CommonSnackBar._();

  static OverlayEntry? _entry;

  /// 成功・情報の SnackBar を表示。
  ///
  /// [actionLabel] と [onAction] を指定すると右側にアクションボタンを表示する
  /// （Undo 等）。アクションタップで自動的に dismiss する。
  static void show(
    BuildContext context,
    String message, {
    String? actionLabel,
    VoidCallback? onAction,
    Duration duration = const Duration(seconds: 3),
  }) {
    if (!context.mounted) return;
    _showOverlay(
      context,
      child: Text(message, style: AppTextStyles.body2),
      actionLabel: actionLabel,
      onAction: onAction,
      duration: duration,
    );
  }

  /// エラーの SnackBar を表示（赤系半透明背景 + アイコン）。
  static void error(
    BuildContext context,
    String message, {
    String? actionLabel,
    VoidCallback? onAction,
    Duration duration = const Duration(seconds: 3),
  }) {
    if (!context.mounted) return;
    _showOverlay(
      context,
      backgroundColor: AppColors.error.withValues(alpha: 0.1),
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
              style: AppTextStyles.body2.copyWith(color: AppColors.error),
            ),
          ),
        ],
      ),
      actionLabel: actionLabel,
      onAction: onAction,
      actionColor: AppColors.error,
      duration: duration,
    );
  }

  static void _showOverlay(
    BuildContext context, {
    required Widget child,
    Color? backgroundColor,
    String? actionLabel,
    VoidCallback? onAction,
    Color? actionColor,
    Duration duration = const Duration(seconds: 3),
  }) {
    _entry?.remove();
    _entry = null;

    final overlay = Overlay.of(context);
    late OverlayEntry entry;

    entry = OverlayEntry(
      builder: (_) => _AnimatedSnackBar(
        backgroundColor: backgroundColor,
        actionLabel: actionLabel,
        onAction: onAction,
        actionColor: actionColor,
        duration: duration,
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
    this.actionLabel,
    this.onAction,
    this.actionColor,
    this.duration = const Duration(seconds: 3),
  });

  final Widget child;
  final VoidCallback onDismissed;
  final Color? backgroundColor;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Color? actionColor;
  final Duration duration;

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

    Future.delayed(widget.duration, _dismiss);
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
      bottom: bottomPadding + 24,
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
        child: Material(
          color: widget.backgroundColor ?? AppColors.inverseSurface(context),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 0,
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              20,
              14,
              widget.actionLabel != null ? 8 : 20,
              14,
            ),
            child: DefaultTextStyle(
              style: AppTextStyles.body2.copyWith(
                color: widget.backgroundColor != null
                    ? null
                    : AppColors.onInverseSurface(context),
              ),
              child: widget.actionLabel == null
                  ? widget.child
                  : Row(
                      children: [
                        Expanded(child: widget.child),
                        const SizedBox(width: 8),
                        TextButton(
                          onPressed: () {
                            widget.onAction?.call();
                            _dismiss();
                          },
                          style: TextButton.styleFrom(
                            foregroundColor:
                                widget.actionColor ??
                                AppColors.onInverseSurface(context),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            minimumSize: const Size(0, 32),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            textStyle: AppTextStyles.body2.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          child: Text(widget.actionLabel!),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
