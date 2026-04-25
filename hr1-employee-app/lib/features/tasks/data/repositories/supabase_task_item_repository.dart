import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item_page.dart';
import 'package:hr1_employee_app/features/tasks/domain/repositories/task_item_repository.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Supabase 実装の TaskItem リポジトリ。
///
/// 一覧取得は `task_items` + 子テーブル 4 種（checklist / attachments /
/// comments / relations）を `task_id IN (...)` で個別 SELECT し、Dart 側で
/// マージして組み立てる。複数行 fetch はすべて [_hydrateMany] を経由するので
/// 子テーブルへの SELECT は 1 ページあたり 4 回（4 子 × 1 IN クエリ）に
/// 抑えられる。
class SupabaseTaskItemRepository implements TaskItemRepository {
  SupabaseTaskItemRepository(
    this._client, {
    required this.activeOrganizationId,
  });

  final SupabaseClient _client;
  final String activeOrganizationId;

  // ===========================================================================
  // Read
  // ===========================================================================

  @override
  Future<TaskItemPage> fetchPage({
    required bool showDone,
    TaskSource? source,
    Set<String> assignees = const {},
    int offset = 0,
    int limit = 30,
  }) async {
    // ソートキーは `(due ASC NULLS LAST, id DESC)`。
    // `updated_at` を入れない: ステータス更新で順序が変わると、ページ境界で
    // タスクがズレて重複/欠落して表示される drift が発生するため。
    var query = _client
        .from('task_items')
        .select(_taskItemSelect)
        .eq('organization_id', activeOrganizationId);
    if (showDone) {
      query = query.eq('status', _statusToDb(TaskStatus.done));
    } else {
      query = query.neq('status', _statusToDb(TaskStatus.done));
    }
    if (source != null) {
      query = query.eq('source', _sourceToDb(source));
    }
    if (assignees.isNotEmpty) {
      query = query.inFilter('assignee_id', assignees.toList(growable: false));
    }
    final rows = await query
        .order('due', ascending: true, nullsFirst: false)
        .order('id', ascending: false)
        // PostgREST の range は inclusive。`limit + 1` 件取得して hasMore を
        // 判定するのではなく、limit 件 + 別途 count exact を出すと往復が
        // 増えるため、limit 件取れたら hasMore=true と推定。
        .range(offset, offset + limit - 1);
    final hydrated = await _hydrateMany(List<Map<String, dynamic>>.from(rows));
    return TaskItemPage(
      items: hydrated,
      hasMore: hydrated.length == limit,
      offset: offset + hydrated.length,
    );
  }

  @override
  Future<TaskItemCounts> fetchCounts({
    TaskSource? source,
    Set<String> assignees = const {},
  }) async {
    // 1 RPC で active / done / overdue / today を取得。
    // RPC は SECURITY INVOKER で task_items の RLS が呼出ユーザに対し評価される。
    final params = <String, dynamic>{
      if (source != null) 'p_source': _sourceToDb(source),
      if (assignees.isNotEmpty)
        'p_assignees': assignees.toList(growable: false),
    };
    final rows = await _client.rpc<List<dynamic>>(
      'task_item_counts',
      params: params,
    );
    if (rows.isEmpty) return TaskItemCounts.zero;
    final r = rows.first as Map<String, dynamic>;
    return TaskItemCounts(
      active: (r['active'] as num?)?.toInt() ?? 0,
      done: (r['done'] as num?)?.toInt() ?? 0,
      overdue: (r['overdue'] as num?)?.toInt() ?? 0,
      todayCount: (r['today_count'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  Future<List<TaskItem>> fetchByIds(List<String> ids) async {
    if (ids.isEmpty) return const [];
    // optimistic id 等の uuid 違反を弾く（PostgREST 22P02 を避ける）。
    final validIds = ids.where(_uuidPattern.hasMatch).toList(growable: false);
    if (validIds.isEmpty) return const [];
    final rows = await _client
        .from('task_items')
        .select(_taskItemSelect)
        .eq('organization_id', activeOrganizationId)
        .inFilter('id', validIds);
    return _hydrateMany(List<Map<String, dynamic>>.from(rows));
  }

  @override
  Future<List<TaskItem>> searchByTitle({
    required String query,
    Set<String> excludeIds = const {},
    int limit = 50,
  }) async {
    final q = query.trim();
    var query0 = _client
        .from('task_items')
        .select(_taskItemSelect)
        .eq('organization_id', activeOrganizationId);
    if (q.isNotEmpty) {
      // ILIKE のメタ文字 (\, %, _) は SQL レベルでエスケープして literal 化する。
      final ilikeEscaped = q
          .replaceAll(r'\', r'\\')
          .replaceAll('%', r'\%')
          .replaceAll('_', r'\_');
      final pattern = '%$ilikeEscaped%';
      // 数値 / `#数値` 入力時は seq 列も等価検索する。bigint カラムだが Dart の
      // int は 64bit なので tryParse で OK（過剰桁は null フォールバック）。
      final seqMatch = RegExp(r'^#?(\d+)$').firstMatch(q);
      final seq = seqMatch != null ? int.tryParse(seqMatch.group(1)!) : null;
      query0 = query0.or(
        seq != null
            ? 'title.ilike.$pattern,seq.eq.$seq'
            : 'title.ilike.$pattern',
      );
    }
    final rows = await query0
        .order('updated_at', ascending: false)
        // excludeIds が長いと URL サイズに影響するため、クライアント側で
        // フィルタする方針（limit を少し多めに取って後で削る）。
        .limit(limit + excludeIds.length);
    final hydrated = await _hydrateMany(List<Map<String, dynamic>>.from(rows));
    if (excludeIds.isEmpty) {
      return hydrated.length > limit ? hydrated.sublist(0, limit) : hydrated;
    }
    final filtered = hydrated.where((t) => !excludeIds.contains(t.id)).toList();
    return filtered.length > limit ? filtered.sublist(0, limit) : filtered;
  }

  @override
  Future<TaskItem?> fetchById(String id) async {
    // optimistic id（楽観 ID）が混入した場合は即 null を返す。`task_items.id` は
    // uuid 型のため、フォーマット不一致な値を eq に渡すと PostgREST が 22P02
    // を返してしまう。
    if (!_uuidPattern.hasMatch(id)) return null;
    final row = await _client
        .from('task_items')
        .select(_taskItemSelect)
        .eq('id', id)
        .eq('organization_id', activeOrganizationId)
        .maybeSingle();
    if (row == null) return null;
    final hydrated = await _hydrateMany([row]);
    return hydrated.isEmpty ? null : hydrated.first;
  }

  static final _uuidPattern = RegExp(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    caseSensitive: false,
  );

  // ===========================================================================
  // Mutate
  // ===========================================================================

  @override
  Future<TaskItem> updateStatus(String id, TaskStatus status) async {
    await _client
        .from('task_items')
        .update({'status': _statusToDb(status)})
        .eq('id', id)
        .eq('organization_id', activeOrganizationId);
    return _requireById(id);
  }

  @override
  Future<TaskItem> toggleChecklistItem(String taskId, String itemId) async {
    // done を反転 UPDATE。同一行の done は SELECT → UPDATE で取り直す。
    final current = await _client
        .from('task_item_checklist_items')
        .select('done')
        .eq('id', itemId)
        .eq('task_id', taskId)
        .single();
    final done = current['done'] as bool;
    await _client
        .from('task_item_checklist_items')
        .update({'done': !done})
        .eq('id', itemId);
    return _requireById(taskId);
  }

  @override
  Future<TaskItem> create(TaskItem task) async {
    final inserted = await _client
        .from('task_items')
        .insert(_taskItemToInsert(task))
        .select('id')
        .single();
    final id = inserted['id'] as String;
    if (task.checklist.isNotEmpty) {
      await _client.from('task_item_checklist_items').insert([
        for (var i = 0; i < task.checklist.length; i++)
          {
            'task_id': id,
            'organization_id': activeOrganizationId,
            'label': task.checklist[i].label,
            'done': task.checklist[i].done,
            'sort_order': i,
          },
      ]);
    }
    return _requireById(id);
  }

  @override
  Future<TaskItem> addRelation(String taskId, TaskRelation rel) async {
    // (task_id, related_task_id) の UNIQUE で UPSERT。kind は属性として更新。
    // 反対側は DB トリガが同期する。
    await _client.from('task_item_relations').upsert({
      'task_id': taskId,
      'related_task_id': rel.id,
      'kind': _relationKindToDb(rel.kind),
      'organization_id': activeOrganizationId,
    }, onConflict: 'task_id,related_task_id');
    return _requireById(taskId);
  }

  @override
  Future<TaskItem> removeRelation(String taskId, String targetId) async {
    await _client
        .from('task_item_relations')
        .delete()
        .eq('task_id', taskId)
        .eq('related_task_id', targetId);
    return _requireById(taskId);
  }

  @override
  Future<TaskItem> updateDue(String taskId, {required String? due}) async {
    await _client
        .from('task_items')
        .update({'due': due})
        .eq('id', taskId)
        .eq('organization_id', activeOrganizationId);
    return _requireById(taskId);
  }

  @override
  Future<TaskItem> updateAssignee(String taskId, TaskUser? assignee) async {
    await _client
        .from('task_items')
        .update({'assignee_id': assignee?.id})
        .eq('id', taskId)
        .eq('organization_id', activeOrganizationId);
    return _requireById(taskId);
  }

  @override
  Future<TaskItem> updateDesc(String taskId, String desc) async {
    await _client
        .from('task_items')
        .update({'description': desc})
        .eq('id', taskId)
        .eq('organization_id', activeOrganizationId);
    return _requireById(taskId);
  }

  @override
  Future<TaskItem> addSubtask(String parentId, TaskItem subtask) async {
    final payload = _taskItemToInsert(subtask)
      ..['parent_id'] = parentId
      ..['type'] = _typeToDb(DevTaskType.subtask);
    final inserted = await _client
        .from('task_items')
        .insert(payload)
        .select('id')
        .single();
    final newId = inserted['id'] as String;
    if (subtask.checklist.isNotEmpty) {
      await _client.from('task_item_checklist_items').insert([
        for (var i = 0; i < subtask.checklist.length; i++)
          {
            'task_id': newId,
            'organization_id': activeOrganizationId,
            'label': subtask.checklist[i].label,
            'done': subtask.checklist[i].done,
            'sort_order': i,
          },
      ]);
    }
    return _requireById(parentId);
  }

  @override
  Future<TaskItem> addComment(String taskId, String text) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) {
      throw StateError('addComment requires an authenticated user');
    }
    await _client.from('task_item_comments').insert({
      'task_id': taskId,
      'organization_id': activeOrganizationId,
      'author_id': userId,
      'text': text,
    });
    return _requireById(taskId);
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  Future<TaskItem> _requireById(String id) async {
    final task = await fetchById(id);
    if (task == null) {
      throw StateError('task_items not found after mutation: $id');
    }
    return task;
  }

  /// `task_items` を 1 件以上受け取り、子テーブル 4 種をまとめて取得して
  /// 完全な [TaskItem] を組み立てる。
  Future<List<TaskItem>> _hydrateMany(List<Map<String, dynamic>> rows) async {
    if (rows.isEmpty) return const [];
    final ids = rows.map((r) => r['id'] as String).toList(growable: false);

    final results = await Future.wait([
      _client
          .from('task_item_checklist_items')
          .select('id,task_id,label,done,sort_order')
          .inFilter('task_id', ids)
          .order('sort_order'),
      _client
          .from('task_item_attachments')
          .select('id,task_id,name,storage_path,mime_type,size_bytes')
          .inFilter('task_id', ids),
      _client
          .from('task_item_comments')
          .select(
            'id,task_id,text,created_at,'
            'author:profiles!author_id(id,display_name,avatar_color)',
          )
          .inFilter('task_id', ids)
          .order('created_at'),
      _client
          .from('task_item_relations')
          .select('task_id,related_task_id,kind')
          .inFilter('task_id', ids),
      _client
          .from('task_items')
          .select('id,parent_id')
          .inFilter('parent_id', ids),
    ]);

    final checklistByTask = _groupBy(
      List<Map<String, dynamic>>.from(results[0]),
      'task_id',
    );
    final attachmentsByTask = _groupBy(
      List<Map<String, dynamic>>.from(results[1]),
      'task_id',
    );
    final commentsByTask = _groupBy(
      List<Map<String, dynamic>>.from(results[2]),
      'task_id',
    );
    final relationsByTask = _groupBy(
      List<Map<String, dynamic>>.from(results[3]),
      'task_id',
    );
    final subtasksByParent = <String, List<String>>{};
    for (final r in List<Map<String, dynamic>>.from(results[4])) {
      final parent = r['parent_id'] as String?;
      if (parent == null) continue;
      subtasksByParent.putIfAbsent(parent, () => []).add(r['id'] as String);
    }

    return rows
        .map(
          (r) => _rowToTaskItem(
            r,
            checklist: checklistByTask[r['id']] ?? const [],
            attachments: attachmentsByTask[r['id']] ?? const [],
            comments: commentsByTask[r['id']] ?? const [],
            relations: relationsByTask[r['id']] ?? const [],
            subtaskIds: subtasksByParent[r['id']] ?? const [],
          ),
        )
        .toList(growable: false);
  }

  Map<String, List<Map<String, dynamic>>> _groupBy(
    List<Map<String, dynamic>> rows,
    String key,
  ) {
    final map = <String, List<Map<String, dynamic>>>{};
    for (final r in rows) {
      final k = r[key] as String;
      map.putIfAbsent(k, () => []).add(r);
    }
    return map;
  }

  // PostgREST embedded resource select。assigner / assignee / reporter を
  // それぞれ FK 名でエイリアス指定して JOIN する。
  static const _taskItemSelect = '''
id, seq, organization_id, type, title, description, priority, status, source,
due, related_name, parent_id, sprint_id, sp, labels, branch, pr_num, env, repro,
comment_count, created_at, updated_at,
assigner:profiles!assigner_id(id, display_name, avatar_color),
assignee:profiles!assignee_id(id, display_name, avatar_color),
reporter:profiles!reporter_id(id, display_name, avatar_color)
''';

  TaskItem _rowToTaskItem(
    Map<String, dynamic> row, {
    required List<Map<String, dynamic>> checklist,
    required List<Map<String, dynamic>> attachments,
    required List<Map<String, dynamic>> comments,
    required List<Map<String, dynamic>> relations,
    required List<String> subtaskIds,
  }) {
    final assignerJson = row['assigner'] as Map<String, dynamic>?;
    final assigneeJson = row['assignee'] as Map<String, dynamic>?;
    final reporterJson = row['reporter'] as Map<String, dynamic>?;
    return TaskItem(
      id: row['id'] as String,
      seq: (row['seq'] as num).toInt(),
      type: _typeFromDb(row['type'] as String),
      title: row['title'] as String,
      desc: (row['description'] as String?) ?? '',
      priority: _priorityFromDb(row['priority'] as String),
      status: _statusFromDb(row['status'] as String),
      source: _sourceFromDb(row['source'] as String),
      assigner:
          _profileJsonToTaskUser(assignerJson) ??
          // 退職等で assigner が NULL の場合のフォールバック表示。
          const TaskUser(id: '', name: '不明', avatar: '?', argb: 0xFF6B7280),
      assignee: _profileJsonToTaskUser(assigneeJson),
      reporter: _profileJsonToTaskUser(reporterJson),
      due: row['due'] as String?,
      relatedName: row['related_name'] as String?,
      parent: row['parent_id'] as String?,
      sprint: row['sprint_id'] as String?,
      sp: row['sp'] as int?,
      labels: List<String>.from((row['labels'] as List?) ?? const []),
      branch: row['branch'] as String?,
      prNum: row['pr_num'] as int?,
      env: row['env'] as String?,
      repro: List<String>.from((row['repro'] as List?) ?? const []),
      checklist: [
        for (final c in checklist)
          TaskChecklistItem(
            id: c['id'] as String,
            label: c['label'] as String,
            done: c['done'] as bool,
          ),
      ],
      attachments: [
        for (final a in attachments)
          TaskAttachment(
            id: a['id'] as String,
            name: a['name'] as String,
            sizeBytes: (a['size_bytes'] as num?)?.toInt() ?? 0,
            mimeType: a['mime_type'] as String?,
            storagePath: a['storage_path'] as String?,
          ),
      ],
      subtasks: subtaskIds,
      relations: [
        for (final r in relations)
          TaskRelation(
            id: r['related_task_id'] as String,
            kind: _relationKindFromDb(r['kind'] as String),
          ),
      ],
      comments: [
        for (final c in comments)
          TaskComment(
            id: c['id'] as String,
            user:
                _profileJsonToTaskUser(c['author'] as Map<String, dynamic>?) ??
                const TaskUser(
                  id: '',
                  name: '不明',
                  avatar: '?',
                  argb: 0xFF6B7280,
                ),
            text: c['text'] as String,
            createdAt: DateTime.parse(c['created_at'] as String),
          ),
      ],
      commentCount: (row['comment_count'] as num?)?.toInt() ?? 0,
    );
  }

  TaskUser? _profileJsonToTaskUser(Map<String, dynamic>? json) {
    if (json == null) return null;
    return TaskUser.fromProfile(
      id: json['id'] as String? ?? '',
      displayName: json['display_name'] as String?,
      avatarColorHex: json['avatar_color'] as String?,
    );
  }

  Map<String, dynamic> _taskItemToInsert(TaskItem t) => {
    'organization_id': activeOrganizationId,
    'type': _typeToDb(t.type),
    'title': t.title,
    'description': t.desc,
    'priority': _priorityToDb(t.priority),
    'status': _statusToDb(t.status),
    'source': _sourceToDb(t.source),
    // 「不明」フォールバック（id 空）の TaskUser がそのまま流れた場合は
    // FK 違反を避けるため null にする。
    'assigner_id': t.assigner.id.isEmpty ? null : t.assigner.id,
    if (t.assignee != null && t.assignee!.id.isNotEmpty)
      'assignee_id': t.assignee!.id,
    if (t.reporter != null && t.reporter!.id.isNotEmpty)
      'reporter_id': t.reporter!.id,
    if (t.due != null) 'due': t.due,
    if (t.parent != null) 'parent_id': t.parent,
    if (t.sprint != null) 'sprint_id': t.sprint,
    if (t.sp != null) 'sp': t.sp,
    if (t.labels.isNotEmpty) 'labels': t.labels,
    if (t.branch != null) 'branch': t.branch,
    if (t.prNum != null) 'pr_num': t.prNum,
    if (t.env != null) 'env': t.env,
    if (t.repro.isNotEmpty) 'repro': t.repro,
    if (t.relatedName != null) 'related_name': t.relatedName,
  };

  // ---------------------------------------------------------------------------
  // Enum codecs
  // ---------------------------------------------------------------------------

  static String _typeToDb(DevTaskType t) => t.name;
  static DevTaskType _typeFromDb(String s) =>
      DevTaskType.values.firstWhere((t) => t.name == s);

  static String _priorityToDb(TaskPriority p) => p.name;
  static TaskPriority _priorityFromDb(String s) =>
      TaskPriority.values.firstWhere((p) => p.name == s);

  static String _statusToDb(TaskStatus s) => s.name;
  static TaskStatus _statusFromDb(String s) =>
      TaskStatus.values.firstWhere((v) => v.name == s);

  static String _sourceToDb(TaskSource s) => s.name;
  static TaskSource _sourceFromDb(String s) =>
      TaskSource.values.firstWhere((v) => v.name == s);

  static String _relationKindToDb(RelationKind k) => k.name;
  static RelationKind _relationKindFromDb(String s) =>
      RelationKind.values.firstWhere((v) => v.name == s);
}
