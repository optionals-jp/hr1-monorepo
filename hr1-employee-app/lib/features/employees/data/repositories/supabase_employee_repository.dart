import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:hr1_employee_app/features/employees/domain/entities/employee_contact.dart';

/// 社員データのSupabaseリポジトリ
class SupabaseEmployeeRepository {
  SupabaseEmployeeRepository(
    this._client, {
    required this.activeOrganizationId,
    this.overrideUserId,
  });

  final SupabaseClient _client;

  /// 現在アクティブな組織ID
  final String activeOrganizationId;

  final String? overrideUserId;

  static const _avatarColors = [
    Color(0xFF0F6CBD),
    Color(0xFF0E7A0B),
    Color(0xFFBC4B09),
    Color(0xFF115EA3),
    Color(0xFFB10E1C),
  ];

  /// 社員を検索
  Future<List<EmployeeContact>> searchEmployees(String query) async {
    final orgId = activeOrganizationId;

    // 組織に所属するユーザーIDを取得
    final orgUsers = await _client
        .from('user_organizations')
        .select('user_id')
        .eq('organization_id', orgId);
    final userIds = (orgUsers as List)
        .map((r) => r['user_id'] as String)
        .toList();
    if (userIds.isEmpty) return [];

    final sanitized = sanitizeForLike(query);
    final pattern = '%$sanitized%';

    // profiles テーブルを直接検索（.or() はリレーション越しに使えないため）
    final results = await _client
        .from('profiles')
        .select('id, display_name, email, department, position, avatar_url')
        .inFilter('id', userIds)
        .inFilter('role', ['admin', 'employee'])
        .or(
          'display_name.ilike.$pattern,department.ilike.$pattern,position.ilike.$pattern',
        )
        .limit(20);

    return (results as List).asMap().entries.map((entry) {
      final p = entry.value;
      final name = p['display_name'] as String? ?? p['email'] as String? ?? '';
      return EmployeeContact(
        id: p['id'] as String,
        name: name,
        initial: name.isNotEmpty ? name[0] : '?',
        position: p['position'] as String? ?? '',
        department: p['department'] as String? ?? '',
        color: _avatarColors[entry.key % _avatarColors.length],
        email: p['email'] as String?,
        avatarUrl: p['avatar_url'] as String?,
      );
    }).toList();
  }

  /// 組織内の全社員を取得
  Future<List<EmployeeContact>> getEmployees() async {
    final orgId = activeOrganizationId;

    final results = await _client
        .from('user_organizations')
        .select(
          'user_id, profiles!inner(id, display_name, email, department, position, avatar_url, role)',
        )
        .eq('organization_id', orgId)
        .inFilter('profiles.role', ['admin', 'employee']);

    return (results as List).toList().asMap().entries.map((entry) {
      final p = entry.value['profiles'];
      final name = p['display_name'] as String? ?? p['email'] as String? ?? '';
      return EmployeeContact(
        id: p['id'] as String,
        name: name,
        initial: name.isNotEmpty ? name[0] : '?',
        position: p['position'] as String? ?? '',
        department: p['department'] as String? ?? '',
        color: _avatarColors[entry.key % _avatarColors.length],
        email: p['email'] as String?,
        avatarUrl: p['avatar_url'] as String?,
      );
    }).toList();
  }

  /// 組織内の部署一覧を取得
  Future<List<String>> getDepartments() async {
    final orgId = activeOrganizationId;

    final results = await _client
        .from('departments')
        .select('name')
        .eq('organization_id', orgId)
        .order('name');

    return (results as List).map((r) => r['name'] as String).toList();
  }

  /// 組織内の役職一覧を取得
  Future<List<String>> getPositions() async {
    final orgId = activeOrganizationId;

    final results = await _client
        .from('positions')
        .select('name')
        .eq('organization_id', orgId)
        .order('name');

    return (results as List).map((r) => r['name'] as String).toList();
  }
}
