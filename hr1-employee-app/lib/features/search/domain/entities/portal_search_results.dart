import 'package:hr1_employee_app/features/employees/domain/entities/employee_contact.dart';
import 'package:hr1_employee_app/features/wiki/domain/entities/wiki_page.dart';
import 'package:hr1_employee_app/features/announcements/domain/entities/announcement.dart';
import 'package:hr1_employee_app/features/faq/domain/entities/faq_item.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_contact.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_company.dart';

/// 横断検索の結果をまとめるモデル
class PortalSearchResults {
  const PortalSearchResults({
    this.employees = const [],
    this.wikiPages = const [],
    this.announcements = const [],
    this.faqs = const [],
    this.bcContacts = const [],
    this.bcCompanies = const [],
  });

  final List<EmployeeContact> employees;
  final List<WikiPage> wikiPages;
  final List<Announcement> announcements;
  final List<FaqItem> faqs;
  final List<BcContact> bcContacts;
  final List<BcCompany> bcCompanies;

  bool get isEmpty =>
      employees.isEmpty &&
      wikiPages.isEmpty &&
      announcements.isEmpty &&
      faqs.isEmpty &&
      bcContacts.isEmpty &&
      bcCompanies.isEmpty;
}
