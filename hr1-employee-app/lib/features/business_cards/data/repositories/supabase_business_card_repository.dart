import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_activity.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_card.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_company.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_contact.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_deal.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_todo.dart';
import 'package:hr1_employee_app/features/business_cards/domain/repositories/business_card_repository.dart';

class SupabaseBusinessCardRepository implements BusinessCardRepository {
  SupabaseBusinessCardRepository(this._client);

  final SupabaseClient _client;

  String get _userId => _client.auth.currentUser!.id;

  Future<String> _getOrganizationId() async {
    final result = await _client
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', _userId)
        .single();
    return result['organization_id'] as String;
  }

  // ==========================================================
  // 名刺スキャン
  // ==========================================================

  @override
  Future<String> uploadCardImage(String filePath) async {
    final orgId = await _getOrganizationId();
    final fileExt = filePath.split('.').last;
    final fileName = '${DateTime.now().millisecondsSinceEpoch}.$fileExt';
    final storagePath = '$orgId/$fileName';

    await _client.storage
        .from('business-cards')
        .upload(storagePath, File(filePath));

    final url = _client.storage
        .from('business-cards')
        .getPublicUrl(storagePath);
    return url;
  }

  @override
  Future<ParsedCardData> parseBusinessCard(String rawText) async {
    final response = await _client.functions.invoke(
      'parse-business-card',
      body: {'raw_text': rawText},
    );

    if (response.status != 200) {
      throw Exception('名刺の解析に失敗しました');
    }

    return ParsedCardData.fromJson(response.data as Map<String, dynamic>);
  }

  @override
  Future<BcCard> saveCard({
    required String imageUrl,
    String? rawText,
    String? contactId,
  }) async {
    final orgId = await _getOrganizationId();
    final result = await _client
        .from('crm_cards')
        .insert({
          'organization_id': orgId,
          'image_url': imageUrl,
          'raw_text': rawText,
          'contact_id': contactId,
          'scanned_by': _userId,
        })
        .select()
        .single();
    return BcCard.fromJson(result);
  }

  // ==========================================================
  // 企業
  // ==========================================================

  @override
  Future<List<BcCompany>> getCompanies({String? query}) async {
    final orgId = await _getOrganizationId();
    var q = _client.from('crm_companies').select().eq('organization_id', orgId);

    if (query != null && query.isNotEmpty) {
      q = q.or('name.ilike.%$query%,name_kana.ilike.%$query%');
    }

    final data = await q.order('name');
    return data.map((e) => BcCompany.fromJson(e)).toList();
  }

  @override
  Future<BcCompany?> getCompany(String id) async {
    final result = await _client
        .from('crm_companies')
        .select()
        .eq('id', id)
        .maybeSingle();
    return result != null ? BcCompany.fromJson(result) : null;
  }

  @override
  Future<BcCompany?> findCompanyByCorporateNumber(
    String corporateNumber,
  ) async {
    final orgId = await _getOrganizationId();
    final result = await _client
        .from('crm_companies')
        .select()
        .eq('organization_id', orgId)
        .eq('corporate_number', corporateNumber)
        .maybeSingle();
    return result != null ? BcCompany.fromJson(result) : null;
  }

  @override
  Future<BcCompany?> findCompanyByName(String name) async {
    final orgId = await _getOrganizationId();
    final result = await _client
        .from('crm_companies')
        .select()
        .eq('organization_id', orgId)
        .eq('name', name)
        .maybeSingle();
    return result != null ? BcCompany.fromJson(result) : null;
  }

  @override
  Future<BcCompany> createCompany(Map<String, dynamic> data) async {
    final orgId = await _getOrganizationId();
    final result = await _client
        .from('crm_companies')
        .insert({...data, 'organization_id': orgId, 'created_by': _userId})
        .select()
        .single();
    return BcCompany.fromJson(result);
  }

  @override
  Future<void> updateCompany(String id, Map<String, dynamic> data) async {
    await _client.from('crm_companies').update(data).eq('id', id);
  }

  @override
  Future<void> deleteCompany(String id) async {
    await _client.from('crm_companies').delete().eq('id', id);
  }

  // ==========================================================
  // 連絡先
  // ==========================================================

  @override
  Future<List<BcContact>> getContacts({
    String? query,
    String? companyId,
  }) async {
    final orgId = await _getOrganizationId();
    var q = _client
        .from('crm_contacts')
        .select('*, crm_companies(*)')
        .eq('organization_id', orgId);

    if (companyId != null) {
      q = q.eq('company_id', companyId);
    }
    if (query != null && query.isNotEmpty) {
      q = q.or(
        'last_name.ilike.%$query%,first_name.ilike.%$query%,'
        'email.ilike.%$query%,last_name_kana.ilike.%$query%',
      );
    }

    final data = await q.order('last_name');
    return data.map((e) => BcContact.fromJson(e)).toList();
  }

  @override
  Future<BcContact?> getContact(String id) async {
    final result = await _client
        .from('crm_contacts')
        .select('*, crm_companies(*)')
        .eq('id', id)
        .maybeSingle();
    return result != null ? BcContact.fromJson(result) : null;
  }

  @override
  Future<BcContact?> findContactByEmail(String email) async {
    final orgId = await _getOrganizationId();
    final result = await _client
        .from('crm_contacts')
        .select('*, crm_companies(*)')
        .eq('organization_id', orgId)
        .eq('email', email)
        .maybeSingle();
    return result != null ? BcContact.fromJson(result) : null;
  }

  @override
  Future<BcContact> createContact(Map<String, dynamic> data) async {
    final orgId = await _getOrganizationId();
    final result = await _client
        .from('crm_contacts')
        .insert({...data, 'organization_id': orgId, 'created_by': _userId})
        .select('*, crm_companies(*)')
        .single();
    return BcContact.fromJson(result);
  }

  @override
  Future<void> updateContact(String id, Map<String, dynamic> data) async {
    await _client.from('crm_contacts').update(data).eq('id', id);
  }

  @override
  Future<void> deleteContact(String id) async {
    await _client.from('crm_contacts').delete().eq('id', id);
  }

  // ==========================================================
  // 商談
  // ==========================================================

  @override
  Future<List<BcDeal>> getDeals({String? companyId, String? contactId}) async {
    final orgId = await _getOrganizationId();
    var q = _client
        .from('crm_deals')
        .select('*, crm_companies(*), crm_contacts(*)')
        .eq('organization_id', orgId);

    if (companyId != null) q = q.eq('company_id', companyId);
    if (contactId != null) q = q.eq('contact_id', contactId);

    final data = await q.order('created_at', ascending: false);
    return data.map((e) => BcDeal.fromJson(e)).toList();
  }

  @override
  Future<BcDeal?> getDeal(String id) async {
    final result = await _client
        .from('crm_deals')
        .select('*, crm_companies(*), crm_contacts(*)')
        .eq('id', id)
        .maybeSingle();
    return result != null ? BcDeal.fromJson(result) : null;
  }

  @override
  Future<BcDeal> createDeal(Map<String, dynamic> data) async {
    final orgId = await _getOrganizationId();
    final result = await _client
        .from('crm_deals')
        .insert({...data, 'organization_id': orgId, 'created_by': _userId})
        .select('*, crm_companies(*), crm_contacts(*)')
        .single();
    return BcDeal.fromJson(result);
  }

  @override
  Future<void> updateDeal(String id, Map<String, dynamic> data) async {
    await _client.from('crm_deals').update(data).eq('id', id);
  }

  @override
  Future<void> deleteDeal(String id) async {
    await _client.from('crm_deals').delete().eq('id', id);
  }

  // ==========================================================
  // 活動
  // ==========================================================

  @override
  Future<List<BcActivity>> getActivities({
    String? companyId,
    String? contactId,
    String? dealId,
  }) async {
    final orgId = await _getOrganizationId();
    var q = _client
        .from('crm_activities')
        .select()
        .eq('organization_id', orgId);

    if (companyId != null) q = q.eq('company_id', companyId);
    if (contactId != null) q = q.eq('contact_id', contactId);
    if (dealId != null) q = q.eq('deal_id', dealId);

    final data = await q.order('created_at', ascending: false);
    return data.map((e) => BcActivity.fromJson(e)).toList();
  }

  @override
  Future<BcActivity> createActivity(Map<String, dynamic> data) async {
    final orgId = await _getOrganizationId();
    final result = await _client
        .from('crm_activities')
        .insert({...data, 'organization_id': orgId, 'created_by': _userId})
        .select()
        .single();
    return BcActivity.fromJson(result);
  }

  @override
  Future<void> updateActivity(String id, Map<String, dynamic> data) async {
    await _client.from('crm_activities').update(data).eq('id', id);
  }

  @override
  Future<void> deleteActivity(String id) async {
    await _client.from('crm_activities').delete().eq('id', id);
  }

  // ==========================================================
  // TODO
  // ==========================================================

  @override
  Future<List<BcTodo>> getTodos({bool includeCompleted = false}) async {
    final orgId = await _getOrganizationId();
    var q = _client
        .from('crm_todos')
        .select(
          '*, crm_companies(name), crm_contacts(last_name, first_name), crm_deals(title)',
        )
        .eq('organization_id', orgId);

    if (!includeCompleted) {
      q = q.eq('is_completed', false);
    }

    final data = await q.order('due_date', ascending: true);
    return data.map((e) => BcTodo.fromJson(e)).toList();
  }

  @override
  Future<List<BcTodo>> getMyTodos({bool includeCompleted = false}) async {
    var q = _client
        .from('crm_todos')
        .select(
          '*, crm_companies(name), crm_contacts(last_name, first_name), crm_deals(title)',
        )
        .eq('assigned_to', _userId);

    if (!includeCompleted) {
      q = q.eq('is_completed', false);
    }

    final data = await q.order('due_date', ascending: true);
    return data.map((e) => BcTodo.fromJson(e)).toList();
  }

  @override
  Future<BcTodo> createTodo(Map<String, dynamic> data) async {
    final orgId = await _getOrganizationId();
    final result = await _client
        .from('crm_todos')
        .insert({...data, 'organization_id': orgId, 'created_by': _userId})
        .select(
          '*, crm_companies(name), crm_contacts(last_name, first_name), crm_deals(title)',
        )
        .single();
    return BcTodo.fromJson(result);
  }

  @override
  Future<void> updateTodo(String id, Map<String, dynamic> data) async {
    await _client.from('crm_todos').update(data).eq('id', id);
  }

  @override
  Future<void> toggleTodoComplete(String id, bool isCompleted) async {
    await _client
        .from('crm_todos')
        .update({
          'is_completed': isCompleted,
          'completed_at': isCompleted ? DateTime.now().toIso8601String() : null,
        })
        .eq('id', id);
  }

  @override
  Future<void> deleteTodo(String id) async {
    await _client.from('crm_todos').delete().eq('id', id);
  }

  // ==========================================================
  // 名刺画像
  // ==========================================================

  @override
  Future<List<BcCard>> getCards({String? contactId}) async {
    final orgId = await _getOrganizationId();
    var q = _client.from('crm_cards').select().eq('organization_id', orgId);

    if (contactId != null) q = q.eq('contact_id', contactId);

    final data = await q.order('scanned_at', ascending: false);
    return data.map((e) => BcCard.fromJson(e)).toList();
  }

  // ==========================================================
  // 検索
  // ==========================================================

  @override
  Future<List<BcContact>> searchContacts(String query) async {
    final orgId = await _getOrganizationId();
    final data = await _client
        .from('crm_contacts')
        .select('*, crm_companies(*)')
        .eq('organization_id', orgId)
        .or(
          'last_name.ilike.%$query%,first_name.ilike.%$query%,'
          'email.ilike.%$query%,last_name_kana.ilike.%$query%,'
          'first_name_kana.ilike.%$query%',
        )
        .order('last_name')
        .limit(20);
    return data.map((e) => BcContact.fromJson(e)).toList();
  }

  @override
  Future<List<BcCompany>> searchCompanies(String query) async {
    final orgId = await _getOrganizationId();
    final data = await _client
        .from('crm_companies')
        .select()
        .eq('organization_id', orgId)
        .or('name.ilike.%$query%,name_kana.ilike.%$query%')
        .order('name')
        .limit(20);
    return data.map((e) => BcCompany.fromJson(e)).toList();
  }
}
