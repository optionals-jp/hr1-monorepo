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
    // 同期APIのため、FutureProviderに移行するまでは未使用
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
        .select('*, jobs(*)')
        .eq('organization_id', organizationId)
        .order('applied_at', ascending: false);

    return (response as List).map((row) {
      final map = Map<String, dynamic>.from(row);
      // Supabase の join 結果を Application.fromJson 互換にマッピング
      if (map['jobs'] != null) {
        map['job'] = map['jobs'];
      }
      map.remove('jobs');
      return Application.fromJson(map);
    }).toList();
  }

  /// 応募IDから応募情報を非同期取得
  Future<Application?> getApplicationAsync(String applicationId) async {
    final response = await _client
        .from('applications')
        .select('*, jobs(*)')
        .eq('id', applicationId)
        .maybeSingle();

    if (response == null) return null;
    final map = Map<String, dynamic>.from(response);
    if (map['jobs'] != null) {
      map['job'] = map['jobs'];
    }
    map.remove('jobs');
    return Application.fromJson(map);
  }

  /// 企業IDに紐づく求人一覧を非同期取得
  Future<List<Job>> getJobsAsync(String organizationId) async {
    final response = await _client
        .from('jobs')
        .select('*, job_sections(*)')
        .eq('organization_id', organizationId)
        .order('posted_at', ascending: false);

    return (response as List).map((row) {
      final map = Map<String, dynamic>.from(row);
      final rawSections = (map['job_sections'] as List?) ?? [];
      map['sections'] = rawSections.map((s) {
        final sMap = Map<String, dynamic>.from(s);
        sMap['order'] = sMap['sort_order'];
        return sMap;
      }).toList()
        ..sort((a, b) => (a['order'] as int).compareTo(b['order'] as int));
      map.remove('job_sections');
      return Job.fromJson(map);
    }).toList();
  }

  /// 求人IDから求人情報を非同期取得
  Future<Job?> getJobAsync(String jobId) async {
    final response = await _client
        .from('jobs')
        .select('*, job_sections(*)')
        .eq('id', jobId)
        .maybeSingle();

    if (response == null) return null;
    final map = Map<String, dynamic>.from(response);
    final rawSections = (map['job_sections'] as List?) ?? [];
    map['sections'] = rawSections.map((s) {
      final sMap = Map<String, dynamic>.from(s);
      sMap['order'] = sMap['sort_order'];
      return sMap;
    }).toList()
      ..sort((a, b) => (a['order'] as int).compareTo(b['order'] as int));
    map.remove('job_sections');
    return Job.fromJson(map);
  }
}
