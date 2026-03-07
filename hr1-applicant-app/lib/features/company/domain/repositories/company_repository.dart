import '../entities/company_page_config.dart';

/// 企業ページリポジトリの抽象インターフェース
abstract class CompanyRepository {
  /// 企業IDからページ設定を取得
  CompanyPageConfig? getPageConfig(String organizationId);
}
