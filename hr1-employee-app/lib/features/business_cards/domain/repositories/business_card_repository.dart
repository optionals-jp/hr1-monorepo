import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_activity.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_card.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_company.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_contact.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_deal.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_todo.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/crm_pipeline_stage.dart';

/// OCR解析結果
class ParsedCardData {
  const ParsedCardData({
    this.companyName,
    this.companyNameKana,
    this.corporateNumber,
    this.department,
    this.position,
    this.lastName,
    this.firstName,
    this.lastNameKana,
    this.firstNameKana,
    this.email,
    this.phone,
    this.mobilePhone,
    this.postalCode,
    this.address,
    this.website,
  });

  final String? companyName;
  final String? companyNameKana;
  final String? corporateNumber;
  final String? department;
  final String? position;
  final String? lastName;
  final String? firstName;
  final String? lastNameKana;
  final String? firstNameKana;
  final String? email;
  final String? phone;
  final String? mobilePhone;
  final String? postalCode;
  final String? address;
  final String? website;

  factory ParsedCardData.fromJson(Map<String, dynamic> json) {
    return ParsedCardData(
      companyName: json['company_name'] as String?,
      companyNameKana: json['company_name_kana'] as String?,
      corporateNumber: json['corporate_number'] as String?,
      department: json['department'] as String?,
      position: json['position'] as String?,
      lastName: json['last_name'] as String?,
      firstName: json['first_name'] as String?,
      lastNameKana: json['last_name_kana'] as String?,
      firstNameKana: json['first_name_kana'] as String?,
      email: json['email'] as String?,
      phone: json['phone'] as String?,
      mobilePhone: json['mobile_phone'] as String?,
      postalCode: json['postal_code'] as String?,
      address: json['address'] as String?,
      website: json['website'] as String?,
    );
  }
}

/// 名刺管理リポジトリインターフェース
abstract class BusinessCardRepository {
  // === 名刺スキャン ===
  /// 画像をStorageにアップロードしURLを返す
  Future<String> uploadCardImage(String filePath);

  /// Edge Functionで構造化データを取得
  Future<ParsedCardData> parseBusinessCard(String rawText);

  /// 名刺カードを保存
  Future<BcCard> saveCard({
    required String imageUrl,
    String? rawText,
    String? contactId,
  });

  // === 企業 ===
  Future<List<BcCompany>> getCompanies({String? query});
  Future<BcCompany?> getCompany(String id);
  Future<BcCompany?> findCompanyByCorporateNumber(String corporateNumber);
  Future<BcCompany?> findCompanyByName(String name);
  Future<BcCompany> createCompany(Map<String, dynamic> data);
  Future<void> updateCompany(String id, Map<String, dynamic> data);
  Future<void> deleteCompany(String id);

  // === 連絡先 ===
  Future<List<BcContact>> getContacts({String? query, String? companyId});
  Future<BcContact?> getContact(String id);
  Future<BcContact?> findContactByEmail(String email);
  Future<BcContact> createContact(Map<String, dynamic> data);
  Future<void> updateContact(String id, Map<String, dynamic> data);
  Future<void> deleteContact(String id);

  // === 商談 ===
  Future<List<BcDeal>> getDeals({String? companyId, String? contactId});
  Future<BcDeal?> getDeal(String id);
  Future<BcDeal> createDeal(Map<String, dynamic> data);
  Future<void> updateDeal(String id, Map<String, dynamic> data);
  Future<void> deleteDeal(String id);

  // === パイプラインステージ ===
  Future<List<CrmPipelineStage>> getPipelineStages();

  // === 活動 ===
  Future<List<BcActivity>> getActivities({
    String? companyId,
    String? contactId,
    String? dealId,
  });
  Future<BcActivity> createActivity(Map<String, dynamic> data);
  Future<void> updateActivity(String id, Map<String, dynamic> data);
  Future<void> deleteActivity(String id);

  // === TODO ===
  Future<List<BcTodo>> getTodos({bool includeCompleted = false});
  Future<List<BcTodo>> getMyTodos({bool includeCompleted = false});
  Future<BcTodo> createTodo(Map<String, dynamic> data);
  Future<void> updateTodo(String id, Map<String, dynamic> data);
  Future<void> toggleTodoComplete(String id, bool isCompleted);
  Future<void> deleteTodo(String id);

  // === 名刺画像 ===
  Future<List<BcCard>> getCards({String? contactId});

  // === 検索 ===
  Future<List<BcContact>> searchContacts(String query);
  Future<List<BcCompany>> searchCompanies(String query);
}
