import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/skills/domain/entities/certification_master.dart';
import 'package:hr1_employee_app/features/skills/domain/entities/employee_certification.dart';
import 'package:hr1_employee_app/features/skills/domain/entities/employee_skill.dart';
import 'package:hr1_employee_app/features/skills/domain/entities/skill_master.dart';
import 'package:hr1_employee_app/features/skills/domain/repositories/skills_repository.dart';

/// Supabase スキル・資格リポジトリ実装
class SupabaseSkillsRepository implements SkillsRepository {
  SupabaseSkillsRepository(this._client, {required this.activeOrganizationId});

  final SupabaseClient _client;

  /// 現在アクティブな組織ID
  final String activeOrganizationId;

  String get _userId => _client.auth.currentUser!.id;

  // ─── スキルマスタ ───

  @override
  Future<List<SkillMaster>> getSkillMasters() async {
    final response = await _client
        .from('skill_masters')
        .select()
        .order('category')
        .order('name');
    return response.map((e) => SkillMaster.fromJson(e)).toList();
  }

  // ─── 資格マスタ ───

  @override
  Future<List<CertificationMaster>> getCertificationMasters() async {
    final response = await _client
        .from('certification_masters')
        .select()
        .order('category')
        .order('name');
    return response.map((e) => CertificationMaster.fromJson(e)).toList();
  }

  // ─── スキル ───

  @override
  Future<List<EmployeeSkill>> getSkills(String userId) async {
    final response = await _client
        .from('employee_skills')
        .select()
        .eq('user_id', userId)
        .order('sort_order');
    return response.map((e) => EmployeeSkill.fromJson(e)).toList();
  }

  @override
  Future<EmployeeSkill> addSkill(String name) async {
    final orgId = activeOrganizationId;
    final maxOrder = await _client
        .from('employee_skills')
        .select('sort_order')
        .eq('user_id', _userId)
        .order('sort_order', ascending: false)
        .limit(1)
        .maybeSingle();
    final nextOrder = (maxOrder?['sort_order'] as int? ?? -1) + 1;

    final response = await _client
        .from('employee_skills')
        .insert({
          'user_id': _userId,
          'organization_id': orgId,
          'name': name,
          'sort_order': nextOrder,
        })
        .select()
        .single();
    return EmployeeSkill.fromJson(response);
  }

  @override
  Future<void> updateSkill(EmployeeSkill skill) async {
    await _client
        .from('employee_skills')
        .update(skill.toJson())
        .eq('id', skill.id)
        .eq('user_id', _userId);
  }

  @override
  Future<void> deleteSkill(String id) async {
    await _client
        .from('employee_skills')
        .delete()
        .eq('id', id)
        .eq('user_id', _userId);
  }

  // ─── 資格 ───

  @override
  Future<List<EmployeeCertification>> getCertifications(String userId) async {
    final response = await _client
        .from('employee_certifications')
        .select()
        .eq('user_id', userId)
        .order('sort_order');
    return response.map((e) => EmployeeCertification.fromJson(e)).toList();
  }

  @override
  Future<EmployeeCertification> addCertification(
    String name,
    DateTime? acquiredDate, {
    int? score,
  }) async {
    final orgId = activeOrganizationId;
    final maxOrder = await _client
        .from('employee_certifications')
        .select('sort_order')
        .eq('user_id', _userId)
        .order('sort_order', ascending: false)
        .limit(1)
        .maybeSingle();
    final nextOrder = (maxOrder?['sort_order'] as int? ?? -1) + 1;

    final response = await _client
        .from('employee_certifications')
        .insert({
          'user_id': _userId,
          'organization_id': orgId,
          'name': name,
          'acquired_date': acquiredDate?.toIso8601String().split('T').first,
          'score': score,
          'sort_order': nextOrder,
        })
        .select()
        .single();
    return EmployeeCertification.fromJson(response);
  }

  @override
  Future<void> updateCertification(EmployeeCertification certification) async {
    await _client
        .from('employee_certifications')
        .update(certification.toJson())
        .eq('id', certification.id)
        .eq('user_id', _userId);
  }

  @override
  Future<void> deleteCertification(String id) async {
    await _client
        .from('employee_certifications')
        .delete()
        .eq('id', id)
        .eq('user_id', _userId);
  }
}
