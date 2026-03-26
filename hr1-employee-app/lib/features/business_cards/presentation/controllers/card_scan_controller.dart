import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_company.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_contact.dart';
import 'package:hr1_employee_app/features/business_cards/domain/repositories/business_card_repository.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';

/// スキャン結果の状態
class ScanResult {
  const ScanResult({
    required this.parsedData,
    required this.imageUrl,
    this.rawText,
  });

  final ParsedCardData parsedData;
  final String imageUrl;
  final String? rawText;
}

/// 名刺スキャンコントローラー
final cardScanControllerProvider =
    AutoDisposeAsyncNotifierProvider<CardScanController, ScanResult?>(
      CardScanController.new,
    );

class CardScanController extends AutoDisposeAsyncNotifier<ScanResult?> {
  @override
  FutureOr<ScanResult?> build() => null;

  BusinessCardRepository get _repo => ref.read(bcRepositoryProvider);

  /// 画像をアップロードしてOCRテキストを解析
  Future<void> processCard(String imagePath, String ocrText) async {
    state = const AsyncLoading();

    state = await AsyncValue.guard(() async {
      // 画像をStorageにアップロード
      final imageUrl = await _repo.uploadCardImage(imagePath);

      // Edge Functionで構造化データを取得
      final parsed = await _repo.parseBusinessCard(ocrText);

      return ScanResult(
        parsedData: parsed,
        imageUrl: imageUrl,
        rawText: ocrText,
      );
    });
  }

  /// 確認済みデータを保存（重複チェック付き）
  Future<({BcContact contact, BcCompany? company})?> saveContact({
    required String imageUrl,
    String? rawText,
    // 企業情報
    String? companyName,
    String? companyNameKana,
    String? corporateNumber,
    String? companyPostalCode,
    String? companyAddress,
    String? companyPhone,
    String? companyWebsite,
    // 連絡先情報
    required String lastName,
    String? firstName,
    String? lastNameKana,
    String? firstNameKana,
    String? department,
    String? position,
    String? email,
    String? phone,
    String? mobilePhone,
  }) async {
    // 1. 企業の重複チェック・作成
    BcCompany? company;
    if (companyName != null && companyName.isNotEmpty) {
      // 法人番号で検索
      if (corporateNumber != null && corporateNumber.isNotEmpty) {
        company = await _repo.findCompanyByCorporateNumber(corporateNumber);
      }
      // 会社名で検索
      company ??= await _repo.findCompanyByName(companyName);
      // 新規作成
      company ??= await _repo.createCompany({
        'name': companyName,
        'name_kana': companyNameKana,
        'corporate_number': corporateNumber,
        'postal_code': companyPostalCode,
        'address': companyAddress,
        'phone': companyPhone,
        'website': companyWebsite,
      });
    }

    // 2. 連絡先の重複チェック・作成
    BcContact? contact;
    if (email != null && email.isNotEmpty) {
      contact = await _repo.findContactByEmail(email);
    }

    if (contact != null) {
      // 既存連絡先を更新
      await _repo.updateContact(contact.id, {
        'last_name': lastName,
        'first_name': firstName,
        'last_name_kana': lastNameKana,
        'first_name_kana': firstNameKana,
        'department': department,
        'position': position,
        'phone': phone,
        'mobile_phone': mobilePhone,
        if (company != null) 'company_id': company.id,
      });
      // 更新後のデータを取得
      contact = await _repo.getContact(contact.id);
    } else {
      // 新規作成
      contact = await _repo.createContact({
        'last_name': lastName,
        'first_name': firstName,
        'last_name_kana': lastNameKana,
        'first_name_kana': firstNameKana,
        'department': department,
        'position': position,
        'email': email,
        'phone': phone,
        'mobile_phone': mobilePhone,
        if (company != null) 'company_id': company.id,
      });
    }

    // 3. 名刺画像を保存（画像がある場合のみ）
    if (imageUrl.isNotEmpty) {
      await _repo.saveCard(
        imageUrl: imageUrl,
        rawText: rawText,
        contactId: contact!.id,
      );
    }

    // プロバイダーを無効化して再取得を促す
    ref.invalidate(bcContactsProvider);
    ref.invalidate(bcCompaniesProvider);

    return (contact: contact!, company: company);
  }
}
