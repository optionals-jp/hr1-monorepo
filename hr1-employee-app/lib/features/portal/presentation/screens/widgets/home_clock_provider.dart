import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 1秒ごとに現在時刻を流す Stream Provider。
/// autoDispose のため購読画面が外れると Timer も停止する。
final homeClockProvider = StreamProvider.autoDispose<DateTime>((ref) {
  final controller = StreamController<DateTime>();
  controller.add(DateTime.now());
  final timer = Timer.periodic(const Duration(seconds: 1), (_) {
    controller.add(DateTime.now());
  });
  ref.onDispose(() {
    timer.cancel();
    controller.close();
  });
  return controller.stream;
});
