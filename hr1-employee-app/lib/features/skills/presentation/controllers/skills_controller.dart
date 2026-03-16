import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/employee_certification.dart';
import '../../domain/entities/employee_skill.dart';
import '../../domain/repositories/skills_repository.dart';
import '../providers/skills_providers.dart';

/// スキル管理コントローラー
class SkillsController extends AutoDisposeAsyncNotifier<List<EmployeeSkill>> {
  SkillsRepository get _repo => ref.read(skillsRepositoryProvider);

  @override
  Future<List<EmployeeSkill>> build() async {
    return ref.watch(mySkillsProvider.future);
  }

  /// スキル追加
  Future<void> addSkill(String name) async {
    await _repo.addSkill(name);
    ref.invalidate(mySkillsProvider);
    ref.invalidateSelf();
  }

  /// スキル削除
  Future<void> deleteSkill(String id) async {
    await _repo.deleteSkill(id);
    ref.invalidate(mySkillsProvider);
    ref.invalidateSelf();
  }
}

final skillsControllerProvider =
    AutoDisposeAsyncNotifierProvider<SkillsController, List<EmployeeSkill>>(
  SkillsController.new,
);

/// 資格管理コントローラー
class CertificationsController
    extends AutoDisposeAsyncNotifier<List<EmployeeCertification>> {
  SkillsRepository get _repo => ref.read(skillsRepositoryProvider);

  @override
  Future<List<EmployeeCertification>> build() async {
    return ref.watch(myCertificationsProvider.future);
  }

  /// 資格追加
  Future<void> addCertification(
    String name,
    DateTime? acquiredDate, {
    int? score,
  }) async {
    await _repo.addCertification(name, acquiredDate, score: score);
    ref.invalidate(myCertificationsProvider);
    ref.invalidateSelf();
  }

  /// 資格削除
  Future<void> deleteCertification(String id) async {
    await _repo.deleteCertification(id);
    ref.invalidate(myCertificationsProvider);
    ref.invalidateSelf();
  }
}

final certificationsControllerProvider = AutoDisposeAsyncNotifierProvider<
    CertificationsController, List<EmployeeCertification>>(
  CertificationsController.new,
);
