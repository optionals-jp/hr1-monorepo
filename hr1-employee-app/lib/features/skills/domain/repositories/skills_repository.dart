import '../entities/certification_master.dart';
import '../entities/employee_certification.dart';
import '../entities/employee_skill.dart';
import '../entities/skill_master.dart';

/// スキル・資格リポジトリインターフェース
abstract class SkillsRepository {
  /// スキルマスタ一覧を取得（システム共通 + 自組織）
  Future<List<SkillMaster>> getSkillMasters();

  /// 資格マスタ一覧を取得（システム共通 + 自組織）
  Future<List<CertificationMaster>> getCertificationMasters();

  /// ユーザーのスキル一覧を取得
  Future<List<EmployeeSkill>> getSkills(String userId);

  /// スキルを追加
  Future<EmployeeSkill> addSkill(String name);

  /// スキルを更新
  Future<void> updateSkill(EmployeeSkill skill);

  /// スキルを削除
  Future<void> deleteSkill(String id);

  /// ユーザーの資格一覧を取得
  Future<List<EmployeeCertification>> getCertifications(String userId);

  /// 資格を追加
  Future<EmployeeCertification> addCertification(
    String name,
    DateTime? acquiredDate, {
    int? score,
  });

  /// 資格を更新
  Future<void> updateCertification(EmployeeCertification certification);

  /// 資格を削除
  Future<void> deleteCertification(String id);
}
