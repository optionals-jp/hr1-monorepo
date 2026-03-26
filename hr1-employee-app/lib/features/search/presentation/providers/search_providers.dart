import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/employees/domain/entities/employee_contact.dart';
import 'package:hr1_employee_app/features/employees/presentation/providers/employee_providers.dart';
import 'package:hr1_employee_app/features/wiki/domain/entities/wiki_page.dart';
import 'package:hr1_employee_app/features/wiki/presentation/providers/wiki_providers.dart';
import 'package:hr1_employee_app/features/announcements/domain/entities/announcement.dart';
import 'package:hr1_employee_app/features/announcements/presentation/providers/announcement_providers.dart';
import 'package:hr1_employee_app/features/faq/domain/entities/faq_item.dart';
import 'package:hr1_employee_app/features/faq/presentation/providers/faq_providers.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_contact.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_company.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';
import 'package:hr1_employee_app/features/search/domain/entities/portal_search_results.dart';

/// 横断検索コントローラー
final searchControllerProvider =
    AutoDisposeAsyncNotifierProvider<SearchController, PortalSearchResults?>(
      SearchController.new,
    );

class SearchController extends AutoDisposeAsyncNotifier<PortalSearchResults?> {
  @override
  FutureOr<PortalSearchResults?> build() => null;

  /// 横断検索を実行
  Future<void> search(String query) async {
    if (query.trim().isEmpty) return;
    state = const AsyncLoading();

    state = await AsyncValue.guard(() async {
      final employeeRepo = ref.read(employeeRepositoryProvider);
      final wikiRepo = ref.read(wikiRepositoryProvider);
      final announcementsRepo = ref.read(announcementsRepositoryProvider);
      final faqRepo = ref.read(faqRepositoryProvider);
      final bcRepo = ref.read(bcRepositoryProvider);

      final results = await Future.wait([
        employeeRepo.searchEmployees(query),
        wikiRepo.searchPages(query),
        announcementsRepo.searchAnnouncements(query),
        faqRepo.searchFaqs(query),
        bcRepo.searchContacts(query),
        bcRepo.searchCompanies(query),
      ]);

      return PortalSearchResults(
        employees: results[0] as List<EmployeeContact>,
        wikiPages: results[1] as List<WikiPage>,
        announcements: results[2] as List<Announcement>,
        faqs: results[3] as List<FaqItem>,
        bcContacts: results[4] as List<BcContact>,
        bcCompanies: results[5] as List<BcCompany>,
      );
    });
  }

  /// 検索結果をクリア
  void clear() {
    state = const AsyncData(null);
  }
}
