import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/application.dart';
import '../../domain/entities/job.dart';
import '../../domain/repositories/applications_repository.dart';

/// ApplicationsRepository の Supabase 実装
class SupabaseApplicationsRepository implements ApplicationsRepository {
  SupabaseApplicationsRepository(this._client);

  final SupabaseClient _client;

  @override
  List<Application> getApplications(String organizationId) {
    throw UnimplementedError('Use getApplicationsAsync instead');
  }

  @override
  Application? getApplication(String applicationId) {
    throw UnimplementedError('Use getApplicationAsync instead');
  }

  @override
  List<Job> getJobs(String organizationId) {
    throw UnimplementedError('Use getJobsAsync instead');
  }

  @override
  Job? getJob(String jobId) {
    throw UnimplementedError('Use getJobAsync instead');
  }

  @override
  Future<List<Application>> getApplicationsAsync(
      String organizationId, String applicantId) async {
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
  Future<Application?> getApplicationAsync(String applicationId) async {
    final response = await _client
        .from('applications')
        .select('*, jobs(*), application_steps(*)')
        .eq('id', applicationId)
        .maybeSingle();

    if (response == null) return null;
    return _mapApplication(Map<String, dynamic>.from(response));
  }

  @override
  Future<Application> applyAsync({
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
        .order('step_order');

    if ((jobSteps as List).isNotEmpty) {
      final steps = jobSteps.asMap().entries.map((entry) {
        final s = entry.value;
        return {
          'id': '$appId-step-${s['step_order']}',
          'application_id': appId,
          'step_type': s['step_type'],
          'step_order': s['step_order'],
          'label': s['label'],
          'status': entry.key == 0 ? 'in_progress' : 'pending',
          'started_at':
              entry.key == 0 ? DateTime.now().toIso8601String() : null,
        };
      }).toList();

      await _client.from('application_steps').insert(steps);
    }

    // 3. 作成した application を返す
    return (await getApplicationAsync(appId))!;
  }

  @override
  Future<void> completeStepAsync(String stepId, String applicationId) async {
    // 1. 現在のステップを完了にする
    await _client.from('application_steps').update({
      'status': 'completed',
      'completed_at': DateTime.now().toIso8601String(),
    }).eq('id', stepId);

    // 2. このアプリケーションの全ステップを取得
    final allSteps = await _client
        .from('application_steps')
        .select()
        .eq('application_id', applicationId)
        .order('step_order');

    // 3. 完了したステップの次のpendingステップを in_progress にする
    final completedStep =
        (allSteps as List).firstWhere((s) => s['id'] == stepId);
    final completedOrder = completedStep['step_order'] as int;

    final nextStep = allSteps.cast<Map<String, dynamic>>().where((s) {
      return (s['step_order'] as int) > completedOrder &&
          s['status'] == 'pending';
    }).firstOrNull;

    if (nextStep != null) {
      await _client.from('application_steps').update({
        'status': 'in_progress',
        'started_at': DateTime.now().toIso8601String(),
      }).eq('id', nextStep['id']);
    }
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
  Future<List<Job>> getJobsAsync(String organizationId) async {
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
  Future<Job?> getJobAsync(String jobId) async {
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
    map['sections'] = rawSections.map((s) {
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
