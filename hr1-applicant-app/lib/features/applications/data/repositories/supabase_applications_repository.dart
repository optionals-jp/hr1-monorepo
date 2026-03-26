import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/application.dart';
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
        .select('*, jobs(*), application_steps(*)')
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
        .select('*, jobs(*), application_steps(*)')
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
    // 1. application を作成
    final appId = 'app-${DateTime.now().millisecondsSinceEpoch}';
    await _client.from('applications').insert({
      'id': appId,
      'job_id': jobId,
      'applicant_id': applicantId,
      'organization_id': organizationId,
      'status': 'active',
    });

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
          'id': '$appId-step-${s['step_order']}',
          'application_id': appId,
          'step_type': s['step_type'],
          'step_order': s['step_order'],
          'label': s['label'],
          'related_id': s['related_id'],
          'status': isFirst ? 'in_progress' : 'pending',
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
    // 1. 現在のステップを完了にする
    final now = DateTime.now().toIso8601String();
    await _client
        .from('application_steps')
        .update({
          'status': 'completed',
          'completed_at': now,
          'applicant_action_at': now,
        })
        .eq('id', stepId);

    // 2. このアプリケーションの全ステップを取得
    final allSteps = await _client
        .from('application_steps')
        .select()
        .eq('application_id', applicationId)
        .order('step_order', ascending: true);

    // 3. 完了したステップの次のpendingステップを in_progress にする
    final completedStep = (allSteps as List).firstWhere(
      (s) => s['id'] == stepId,
    );
    final completedOrder = completedStep['step_order'] as int;

    final pendingSteps =
        allSteps.cast<Map<String, dynamic>>().where((s) {
          return (s['step_order'] as int) > completedOrder &&
              s['status'] == 'pending';
        }).toList()..sort(
          (a, b) => (a['step_order'] as int).compareTo(b['step_order'] as int),
        );
    final nextStep = pendingSteps.firstOrNull;

    if (nextStep != null) {
      await _client
          .from('application_steps')
          .update({
            'status': 'in_progress',
            'started_at': DateTime.now().toIso8601String(),
          })
          .eq('id', nextStep['id']);
    }
  }

  @override
  Future<void> withdraw(String applicationId) async {
    await _client
        .from('applications')
        .update({'status': 'withdrawn'})
        .eq('id', applicationId);
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
