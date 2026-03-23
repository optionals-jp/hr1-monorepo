import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import '../constants/app_spacing.dart';
import '../constants/app_text_styles.dart';
import 'common_button.dart';
import 'common_scaffold.dart';

/// 単一フィールド編集画面
///
/// MenuRow タップ → この画面に遷移 → 保存して pop で結果を返す。
///
/// ```dart
/// final result = await Navigator.push<String>(
///   context,
///   MaterialPageRoute(
///     builder: (_) => FieldEditScreen(
///       title: '表示名',
///       initialValue: currentName,
///     ),
///   ),
/// );
/// ```
class FieldEditScreen extends StatefulWidget {
  const FieldEditScreen({
    super.key,
    required this.title,
    this.initialValue = '',
    this.hintText,
    this.maxLength,
    this.maxLines = 1,
    this.keyboardType,
    this.validator,
  });

  final String title;
  final String initialValue;
  final String? hintText;
  final int? maxLength;
  final int maxLines;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;

  @override
  State<FieldEditScreen> createState() => _FieldEditScreenState();
}

class _FieldEditScreenState extends State<FieldEditScreen> {
  late final TextEditingController _controller;
  final _formKey = GlobalKey<FormState>();
  bool _hasChanged = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
    _controller.addListener(() {
      final changed = _controller.text.trim() != widget.initialValue.trim();
      if (changed != _hasChanged) {
        setState(() => _hasChanged = changed);
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _save() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final value = _controller.text.trim();
    if (value.isEmpty) return;
    Navigator.pop(context, value);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return CommonScaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: Form(
        key: _formKey,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppSpacing.sm),
              Text(
                widget.title,
                style: AppTextStyles.caption1.copyWith(
                  color: AppColors.textSecondary(theme.brightness),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextFormField(
                controller: _controller,
                autofocus: true,
                maxLength: widget.maxLength,
                maxLines: widget.maxLines,
                keyboardType: widget.keyboardType,
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _save(),
                validator: widget.validator,
                decoration: InputDecoration(
                  hintText: widget.hintText ?? '${widget.title}を入力',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
                  ),
                ),
              ),
              const Spacer(),
              SafeArea(
                child: CommonButton(
                  onPressed: _hasChanged ? _save : null,
                  enabled: _hasChanged,
                  child: const Text('保存'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
