import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// メッセージ入力バー
class MessageInputBar extends StatelessWidget {
  const MessageInputBar({
    super.key,
    required this.controller,
    required this.onSend,
    this.isSending = false,
    this.hintText = 'メッセージを入力',
  });

  final TextEditingController controller;
  final VoidCallback onSend;
  final bool isSending;
  final String hintText;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.surface(context),
      padding: EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
        AppSpacing.sm,
        MediaQuery.of(context).padding.bottom + AppSpacing.sm,
      ),
      child: Container(
        constraints: const BoxConstraints(minHeight: 48),
        padding: const EdgeInsets.symmetric(horizontal: 6),
        decoration: BoxDecoration(
          color: AppColors.surfaceTertiary(context),
          borderRadius: BorderRadius.circular(9999),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            const SizedBox(width: 6),
            Expanded(
              child: TextField(
                controller: controller,
                decoration: InputDecoration(
                  hintText: hintText,
                  hintStyle: AppTextStyles.body1.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                  filled: false,
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 14),
                  isDense: true,
                ),
                style: AppTextStyles.body1,
                maxLines: 4,
                minLines: 1,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => onSend(),
              ),
            ),
            const SizedBox(width: 12),
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: GestureDetector(
                onTap: isSending ? null : onSend,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: isSending
                        ? AppColors.divider(context)
                        : AppColors.brand,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Icon(
                      Icons.send,
                      color: isSending
                          ? AppColors.textTertiary(context)
                          : Colors.white,
                      size: 22,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
