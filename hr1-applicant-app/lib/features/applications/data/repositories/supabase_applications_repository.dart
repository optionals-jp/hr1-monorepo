import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/application.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/application_status.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/application_step.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/job.dart';
import 'package:hr1_applicant_app/features/applications/domain/repositories/applications_repository.dart';

/// ApplicationsRepository の Supabase 実装
class SupabaseApplicationsRepository implements ApplicationsRepository {
  SupabaseApplicationsRepository(this._client);

  final SupabaseClient _client;

  @override
  Future<List<Application>> getApplications(
    String organizationId,
    String applicantId,
  ) async {
    final response = await _client
        .from('applications')
        .select(
          'id, job_id, applicant_id, organization_id, status, source, applied_at, updated_at, jobs(*), application_steps(*)',
        )
        .eq('organization_id', organizationId)
        .eq('applicant_id', applicantId)
        .order('applied_at', ascending: false);

    return (response as List).map((row) {
      return _mapApplication(Map<String, dynamic>.from(row));
    }).toList();
  }

  @override
  Future<Application?> getApplication(String applicationId) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return null;

    final response = await _client
        .from('applications')
        .select(
          'id, job_id, applicant_id, organization_id, status, source, applied_at, updated_at, jobs(*), application_steps(*)',
        )
        .eq('id', applicationId)
        .eq('applicant_id', userId)
        .maybeSingle();

    if (response == null) return null;
    return _mapApplication(Map<String, dynamic>.from(response));
  }

  @override
  Future<Application> apply({
    required String jobId,
    required String applicantId,
    required String organizationId,
  }) async {
    // 1. application を作成（IDはDBのgen_random_uuid()で自動生成）
    final appResponse = await _client
        .from('applications')
        .insert({
          'job_id': jobId,
          'applicant_id': applicantId,
          'organization_id': organizationId,
          'status': ApplicationStatus.active.value,
          'source': 'app',
        })
        .select('id')
        .single();
    final appId = appResponse['id'] as String;

    // 2. job_steps を取得してコピー
    final jobSteps = await _client
        .from('job_steps')
        .select()
        .eq('job_id', jobId)
        .order('step_order', ascending: true);

    if ((jobSteps as List).isNotEmpty) {
      final minOrder = jobSteps
          .map((s) => s['step_order'] as int)
          .reduce((a, b) => a < b ? a : b);

      final steps = jobSteps.map((s) {
        final isFirst = (s['step_order'] as int) == minOrder;
        return {
          'application_id': appId,
          'step_type': s['step_type'],
          'step_order': s['step_order'],
          'label': s['label'],
          'form_id': s['form_id'],
          'interview_id': s['interview_id'],
          'template_id': s['template_id'],
          'screening_type': s['screening_type'],
          'requires_review': s['requires_review'] ?? false,
          'status': isFirst
              ? StepStatus.inProgress.value
              : StepStatus.pending.value,
          'started_at': isFirst ? DateTime.now().toIso8601String() : null,
        };
      }).toList();

      await _client.from('application_steps').insert(steps);
    }

    // 3. 作成した application を返す
    return (await getApplication(appId))!;
  }

  @override
  Future<void> completeStep(String stepId, String applicationId) async {
    await _client.rpc(
      'applicant_complete_step',
      params: {'p_step_id': stepId, 'p_application_id': applicationId},
    );
  }

  @override
  Future<String> uploadScreeningDocument({
    required String stepId,
    required String applicationId,
    required String userId,
    required String filePath,
    required String fileName,
  }) async {
    final fileExt = fileName.split('.').last.toLowerCase();
    final storagePath =
        '$userId/$applicationId/${DateTime.now().millisecondsSinceEpoch}.$fileExt';

    await _client.storage
        .from('screening-documents')
        .upload(storagePath, File(filePath));

    // 署名付きURL: 管理者が確認するため長期間有効（1年）
    const signedUrlExpirySeconds = 365 * 24 * 60 * 60;
    final url = await _client.storage
        .from('screening-documents')
        .createSignedUrl(storagePath, signedUrlExpirySeconds);

    await _client
        .from('application_steps')
        .update({'document_url': url})
        .eq('id', stepId);

    await completeStep(stepId, applicationId);

    return url;
  }

  @override
  Future<void> withdraw(String applicationId) async {
    await _client
        .from('applications')
        .update({'status': 'withdrawn'})
        .eq('id', applicationId);
  }

  @override
  Future<void> respondToOffer(
    String applicationId, {
    required bool accept,
  }) async {
    await _client.rpc(
      'applicant_respond_to_offer',
      params: {'p_application_id': applicationId, 'p_accept': accept},
    );
  }

  Application _mapApplication(Map<String, dynamic> map) {
    if (map['jobs'] != null) {
      map['job'] = map['jobs'];
    }
    map.remove('jobs');

    // application_steps → steps にマッピング
    map['steps'] = map['application_steps'] ?? [];
    map.remove('application_steps');

    return Application.fromJson(map);
  }

  @override
  Future<List<Job>> getJobs(String organizationId) async {
    final response = await _client
        .from('jobs')
        .select('*, job_sections(*), job_steps(*)')
        .eq('organization_id', organizationId)
        .order('posted_at', ascending: false);

    return (response as List).map((row) {
      return _mapJob(Map<String, dynamic>.from(row));
    }).toList();
  }

  @override
  Future<Job?> getJob(String jobId) async {
    final response = await _client
        .from('jobs')
        .select('*, job_sections(*), job_steps(*)')
        .eq('id', jobId)
        .maybeSingle();

    if (response == null) return null;
    return _mapJob(Map<String, dynamic>.from(response));
  }

  Job _mapJob(Map<String, dynamic> map) {
    final rawSections = (map['job_sections'] as List?) ?? [];
    map['sections'] =
        rawSections.map((s) {
            final sMap = Map<String, dynamic>.from(s);
            sMap['order'] = sMap['sort_order'];
            return sMap;
          }).toList()
          ..sort((a, b) => (a['order'] as int).compareTo(b['order'] as int));
    map.remove('job_sections');

    // job_steps → selection_steps にマッピング
    map['selection_steps'] = map['job_steps'] ?? [];
    map.remove('job_steps');

    return Job.fromJson(map);
  }
}
