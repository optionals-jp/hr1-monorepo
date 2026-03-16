import 'package:flutter/material.dart';

/// 社員の勤務ステータス
enum WorkStatus {
  /// 勤務中
  working,

  /// 休憩中
  onBreak,

  /// 退勤済み / オフライン
  offline,
}

/// 社員連絡先モデル（Avatar Carousel / 社員ディレクトリ用）
class EmployeeContact {
  const EmployeeContact({
    required this.id,
    required this.name,
    required this.initial,
    required this.position,
    required this.department,
    required this.color,
    this.email,
    this.phone,
    this.avatarUrl,
    this.workStatus = WorkStatus.offline,
  });

  final String id;
  final String name;
  final String initial;
  final String position;
  final String department;
  final Color color;
  final String? email;
  final String? phone;
  final String? avatarUrl;
  final WorkStatus workStatus;
}
