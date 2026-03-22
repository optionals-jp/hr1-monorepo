import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/repositories/supabase_skills_repository.dart';
import '../../domain/entities/certification_master.dart';
import '../../domain/entities/employee_certification.dart';
import '../../domain/entities/employee_skill.dart';
import '../../domain/entities/skill_master.dart';
import '../../domain/repositories/skills_repository.dart';

/// スキルリポジトリプロバイダー
final skillsRepositoryProvider = Provider<SkillsRepository>((ref) {
  return SupabaseSkillsRepository(Supabase.instance.client);
});

/// 自分のスキル一覧
final mySkillsProvider = FutureProvider.autoDispose<List<EmployeeSkill>>((
  ref,
) async {
  final repo = ref.watch(skillsRepositoryProvider);
  final userId = Supabase.instance.client.auth.currentUser!.id;
  return repo.getSkills(userId);
});

/// 自分の資格一覧
final myCertificationsProvider =
    FutureProvider.autoDispose<List<EmployeeCertification>>((ref) async {
      final repo = ref.watch(skillsRepositoryProvider);
      final userId = Supabase.instance.client.auth.currentUser!.id;
      return repo.getCertifications(userId);
    });

/// 指定ユーザーのスキル一覧
final userSkillsProvider = FutureProvider.autoDispose
    .family<List<EmployeeSkill>, String>((ref, userId) async {
      final repo = ref.watch(skillsRepositoryProvider);
      return repo.getSkills(userId);
    });

/// 指定ユーザーの資格一覧
final userCertificationsProvider = FutureProvider.autoDispose
    .family<List<EmployeeCertification>, String>((ref, userId) async {
      final repo = ref.watch(skillsRepositoryProvider);
      return repo.getCertifications(userId);
    });

/// スキルマスタ一覧
final skillMastersProvider = FutureProvider.autoDispose<List<SkillMaster>>((
  ref,
) async {
  final repo = ref.watch(skillsRepositoryProvider);
  return repo.getSkillMasters();
});

/// 資格マスタ一覧
final certificationMastersProvider =
    FutureProvider.autoDispose<List<CertificationMaster>>((ref) async {
      final repo = ref.watch(skillsRepositoryProvider);
      return repo.getCertificationMasters();
    });

/// スキル追加中フラグ
final skillIsAddingProvider = StateProvider.autoDispose<bool>((ref) => false);

/// 資格追加中フラグ
final certificationIsAddingProvider = StateProvider.autoDispose<bool>(
  (ref) => false,
);
