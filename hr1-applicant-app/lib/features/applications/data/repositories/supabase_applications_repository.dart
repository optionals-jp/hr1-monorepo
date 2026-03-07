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

  /// 企業IDに紐づく応募一覧を非同期取得
  Future<List<Application>> getApplicationsAsync(String organizationId) async {
    final response = await _client
        .from('applications')
        .select('*, jobs(*), application_steps(*)')
        .eq('organization_id', organizationId)
        .order('applied_at', ascending: false);

    return (response as List).map((row) {
      return _mapApplication(Map<String, dynamic>.from(row));
    }).toList();
  }

  /// 応募IDから応募情報を非同期取得
  Future<Application?> getApplicationAsync(String applicationId) async {
    final response = await _client
        .from('applications')
        .select('*, jobs(*), application_steps(*)')
        .eq('id', applicationId)
        .maybeSingle();

    if (response == null) return null;
    return _mapApplication(Map<String, dynamic>.from(response));
  }

  /// 求人に応募（application + application_steps を作成）
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

  /// 企業IDに紐づく求人一覧を非同期取得
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

  /// 求人IDから求人情報を非同期取得
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
