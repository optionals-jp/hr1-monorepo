import '../../../../shared/domain/entities/page_section.dart';
import '../../domain/entities/application.dart';
import '../../domain/entities/application_status.dart';
import '../../domain/entities/application_step.dart';
import '../../domain/entities/job.dart';
import '../../domain/entities/job_step.dart';
import '../../domain/repositories/applications_repository.dart';

/// ApplicationsRepository のモック実装
class MockApplicationsRepository implements ApplicationsRepository {
  final List<Application> _applications = List.of(_initialApplications);
  int _idCounter = 100;

  @override
  List<Application> getApplications(String organizationId) {
    return _applications
        .where((a) => a.organizationId == organizationId)
        .toList();
  }

  @override
  Application? getApplication(String applicationId) {
    return _applications
        .where((a) => a.id == applicationId)
        .firstOrNull;
  }

  @override
  List<Job> getJobs(String organizationId) {
    return _mockJobs
        .where((j) => j.organizationId == organizationId)
        .toList();
  }

  @override
  Job? getJob(String jobId) {
    return _mockJobs.where((j) => j.id == jobId).firstOrNull;
  }

  @override
  Future<List<Application>> getApplicationsAsync(String organizationId) async {
    return getApplications(organizationId);
  }

  @override
  Future<Application?> getApplicationAsync(String applicationId) async {
    return getApplication(applicationId);
  }

  @override
  Future<List<Job>> getJobsAsync(String organizationId) async {
    return getJobs(organizationId);
  }

  @override
  Future<Job?> getJobAsync(String jobId) async {
    return getJob(jobId);
  }

  @override
  Future<Application> applyAsync({
    required String jobId,
    required String applicantId,
    required String organizationId,
  }) async {
    final job = getJob(jobId);
    if (job == null) {
      throw StateError('求人が見つかりません: $jobId');
    }

    final appId = 'app-mock-${_idCounter++}';

    // job_steps を application_steps にコピー
    final steps = job.selectionSteps.asMap().entries.map((entry) {
      final index = entry.key;
      final jobStep = entry.value;
      return ApplicationStep(
        id: '$appId-step-${jobStep.stepOrder}',
        applicationId: appId,
        stepType: StepType.fromString(jobStep.stepType),
        stepOrder: jobStep.stepOrder,
        status: index == 0 ? StepStatus.inProgress : StepStatus.pending,
        label: jobStep.label,
        startedAt: index == 0 ? DateTime.now() : null,
      );
    }).toList();

    final application = Application(
      id: appId,
      jobId: jobId,
      applicantId: applicantId,
      organizationId: organizationId,
      status: ApplicationStatus.active,
      appliedAt: DateTime.now(),
      job: job,
      steps: steps,
    );

    _applications.add(application);
    return application;
  }
}

// ---------------------------------------------------------------------------
// モックデータ
// ---------------------------------------------------------------------------

final _mockJobs = [
  Job(
    id: 'job-001',
    organizationId: 'org-001',
    title: 'フロントエンドエンジニア',
    description: 'React/TypeScriptを用いたWebアプリケーション開発を担当していただきます。',
    department: '開発部',
    location: '東京都渋谷区',
    employmentType: '正社員',
    salaryRange: '500万〜800万円',
    postedAt: DateTime(2026, 2, 1),
    closingAt: DateTime(2026, 4, 30),
    selectionSteps: const [
      JobStep(id: 'js-001-1', jobId: 'job-001', stepType: 'screening', stepOrder: 1, label: '書類選考'),
      JobStep(id: 'js-001-2', jobId: 'job-001', stepType: 'form', stepOrder: 2, label: 'アンケート回答'),
      JobStep(id: 'js-001-3', jobId: 'job-001', stepType: 'interview', stepOrder: 3, label: '一次面接'),
      JobStep(id: 'js-001-4', jobId: 'job-001', stepType: 'interview', stepOrder: 4, label: '最終面接'),
      JobStep(id: 'js-001-5', jobId: 'job-001', stepType: 'offer', stepOrder: 5, label: 'オファー'),
    ],
    sections: [
      PageSection(
        id: 'j1-s1',
        type: SectionType.markdown,
        title: '',
        order: 1,
        content: '''
## 募集背景

HR Tech SaaS「HR1」の急成長に伴い、フロントエンドチームを増強します。
ユーザー体験を最重視する当社のプロダクト開発の中核を担っていただきます。

## 業務内容

- **HR1 Webアプリ** のフロントエンド開発・改善
- デザイナーと連携した **UI/UXの設計・実装**
- パフォーマンス最適化・アクセシビリティ対応
- コンポーネントライブラリの設計・メンテナンス
- コードレビュー・技術的意思決定への参加
''',
      ),
      PageSection(
        id: 'j1-s2',
        type: SectionType.markdown,
        title: '必須スキル',
        order: 2,
        content: '''
- React / TypeScript での **2年以上** の開発経験
- HTML / CSS の深い理解
- REST API / GraphQL との連携経験
- Git を用いたチーム開発経験
''',
      ),
      PageSection(
        id: 'j1-s3',
        type: SectionType.markdown,
        title: '歓迎スキル',
        order: 3,
        content: '''
- Next.js でのSSR/SSG経験
- デザインシステムの構築経験
- テスト自動化（Jest / Playwright 等）
- CI/CD パイプラインの構築経験
- OSSへのコントリビューション
''',
      ),
      PageSection(
        id: 'j1-s4',
        type: SectionType.stats,
        title: 'チーム情報',
        order: 4,
        items: [
          {'label': 'チーム人数', 'value': '8名'},
          {'label': '平均年齢', 'value': '29歳'},
          {'label': 'リモート率', 'value': '90%'},
        ],
      ),
      PageSection(
        id: 'j1-s5',
        type: SectionType.benefitList,
        title: 'このポジションの魅力',
        order: 5,
        items: [
          {'icon': '🚀', 'text': 'ARR20億円超のプロダクトの成長を牽引できる'},
          {'icon': '🛠️', 'text': '技術選定に主体的に関われる裁量の大きさ'},
          {'icon': '📚', 'text': 'カンファレンス登壇・OSS活動を会社が支援'},
          {'icon': '💰', 'text': 'SO（ストックオプション）付与あり'},
        ],
      ),
      PageSection(
        id: 'j1-s6',
        type: SectionType.markdown,
        title: '選考フロー',
        order: 6,
        content: '''
1. **カジュアル面談**（30分・オンライン）
2. **書類選考**
3. **技術面接**（60分・コーディング課題あり）
4. **カルチャー面接**（45分・チームメンバーと）
5. **オファー面談**

> 最短2週間で内定まで進むことが可能です。
''',
      ),
    ],
  ),
  Job(
    id: 'job-002',
    organizationId: 'org-001',
    title: 'バックエンドエンジニア',
    description: 'Go/PostgreSQLを用いたAPI開発を担当していただきます。',
    department: '開発部',
    location: '東京都渋谷区（リモート可）',
    employmentType: '正社員',
    salaryRange: '550万〜900万円',
    postedAt: DateTime(2026, 2, 15),
    closingAt: DateTime(2026, 5, 31),
    selectionSteps: const [
      JobStep(id: 'js-002-1', jobId: 'job-002', stepType: 'screening', stepOrder: 1, label: '書類選考'),
      JobStep(id: 'js-002-2', jobId: 'job-002', stepType: 'interview', stepOrder: 2, label: 'カジュアル面談'),
      JobStep(id: 'js-002-3', jobId: 'job-002', stepType: 'external_test', stepOrder: 3, label: '適性検査（外部）'),
      JobStep(id: 'js-002-4', jobId: 'job-002', stepType: 'interview', stepOrder: 4, label: '技術面接'),
      JobStep(id: 'js-002-5', jobId: 'job-002', stepType: 'offer', stepOrder: 5, label: 'オファー'),
    ],
    sections: [
      PageSection(
        id: 'j2-s1',
        type: SectionType.markdown,
        title: '',
        order: 1,
        content: '''
## 募集背景

HR1プラットフォームのAPI基盤を強化するため、バックエンドエンジニアを募集します。
マイクロサービスアーキテクチャの設計・実装を通じて、数百万ユーザーを支える基盤を構築していただきます。

## 業務内容

- Go によるAPI設計・開発
- PostgreSQL / Redis を用いたデータ層の設計
- Kubernetes 上でのサービス運用・監視
- パフォーマンスチューニング・負荷試験
- 技術ドキュメントの整備
''',
      ),
      PageSection(
        id: 'j2-s2',
        type: SectionType.markdown,
        title: '必須スキル',
        order: 2,
        content: '''
- Go または同等の静的型付け言語での **3年以上** の開発経験
- RDBMSの設計・チューニング経験
- REST API の設計・実装経験
- Docker / コンテナ技術の実務経験
''',
      ),
      PageSection(
        id: 'j2-s3',
        type: SectionType.markdown,
        title: '技術スタック',
        order: 3,
        content: '''
| カテゴリ | 技術 |
|---|---|
| 言語 | Go 1.22 |
| DB | PostgreSQL 16 / Redis 7 |
| インフラ | AWS (EKS, RDS, ElastiCache) |
| IaC | Terraform |
| CI/CD | GitHub Actions |
| 監視 | Datadog / PagerDuty |
''',
      ),
      PageSection(
        id: 'j2-s4',
        type: SectionType.faq,
        title: 'よくある質問',
        order: 4,
        items: [
          {
            'question': 'Go未経験でも応募できますか？',
            'answer':
                'はい。他の静的型付け言語（Java, Rust, C#等）の経験があれば、入社後にキャッチアップ期間を設けます。',
          },
          {
            'question': 'オンコール対応はありますか？',
            'answer':
                'ローテーション制で月1〜2回程度です。手当を別途支給しています。',
          },
        ],
      ),
    ],
  ),
  Job(
    id: 'job-003',
    organizationId: 'org-002',
    title: '人事コンサルタント',
    description: '企業の人事戦略策定を支援するコンサルティング業務です。',
    department: 'コンサルティング部',
    location: '大阪府大阪市',
    employmentType: '正社員',
    salaryRange: '450万〜700万円',
    postedAt: DateTime(2026, 1, 10),
    closingAt: DateTime(2026, 3, 31),
    selectionSteps: const [
      JobStep(id: 'js-003-1', jobId: 'job-003', stepType: 'screening', stepOrder: 1, label: '書類選考'),
      JobStep(id: 'js-003-2', jobId: 'job-003', stepType: 'form', stepOrder: 2, label: 'アンケート回答'),
      JobStep(id: 'js-003-3', jobId: 'job-003', stepType: 'interview', stepOrder: 3, label: '面接'),
      JobStep(id: 'js-003-4', jobId: 'job-003', stepType: 'offer', stepOrder: 4, label: 'オファー'),
    ],
    sections: [
      PageSection(
        id: 'j3-s1',
        type: SectionType.markdown,
        title: '',
        order: 1,
        content: '''
## 業務内容

クライアント企業の人事課題を分析し、最適なソリューションを提案・実行します。

- 人事制度の設計・改定コンサルティング
- 組織診断・エンゲージメント調査の実施
- 採用戦略の立案・実行支援
- 人材育成プログラムの設計

## 求める人物像

- 論理的思考力とコミュニケーション力を兼ね備えた方
- クライアントの課題に真摯に向き合える方
- チームで成果を出すことにやりがいを感じる方
''',
      ),
      PageSection(
        id: 'j3-s2',
        type: SectionType.benefitList,
        title: 'キャリアパス',
        order: 2,
        items: [
          {'icon': '1️⃣', 'text': 'コンサルタント（入社〜3年目）'},
          {'icon': '2️⃣', 'text': 'シニアコンサルタント（3〜5年目）'},
          {'icon': '3️⃣', 'text': 'マネージャー（5年目〜）'},
          {'icon': '4️⃣', 'text': 'パートナー'},
        ],
      ),
    ],
  ),
];

// ---------------------------------------------------------------------------
// 初期モック応募データ（ステップ付き）
// ---------------------------------------------------------------------------

final _initialApplications = [
  Application(
    id: 'app-001',
    jobId: 'job-001',
    applicantId: 'dev-user-001',
    organizationId: 'org-001',
    status: ApplicationStatus.active,
    appliedAt: DateTime(2026, 2, 20),
    job: _mockJobs[0],
    steps: const [
      ApplicationStep(
        id: 'app-001-step-1',
        applicationId: 'app-001',
        stepType: StepType.screening,
        stepOrder: 1,
        status: StepStatus.completed,
        label: '書類選考',
        startedAt: null,
        completedAt: null,
      ),
      ApplicationStep(
        id: 'app-001-step-2',
        applicationId: 'app-001',
        stepType: StepType.form,
        stepOrder: 2,
        status: StepStatus.inProgress,
        label: 'アンケート回答',
        relatedId: 'form-mock-001',
      ),
      ApplicationStep(
        id: 'app-001-step-3',
        applicationId: 'app-001',
        stepType: StepType.interview,
        stepOrder: 3,
        status: StepStatus.pending,
        label: '一次面接',
      ),
      ApplicationStep(
        id: 'app-001-step-4',
        applicationId: 'app-001',
        stepType: StepType.interview,
        stepOrder: 4,
        status: StepStatus.pending,
        label: '最終面接',
      ),
      ApplicationStep(
        id: 'app-001-step-5',
        applicationId: 'app-001',
        stepType: StepType.offer,
        stepOrder: 5,
        status: StepStatus.pending,
        label: 'オファー',
      ),
    ],
  ),
  Application(
    id: 'app-002',
    jobId: 'job-002',
    applicantId: 'dev-user-001',
    organizationId: 'org-001',
    status: ApplicationStatus.active,
    appliedAt: DateTime(2026, 3, 1),
    job: _mockJobs[1],
    steps: const [
      ApplicationStep(
        id: 'app-002-step-1',
        applicationId: 'app-002',
        stepType: StepType.screening,
        stepOrder: 1,
        status: StepStatus.completed,
        label: '書類選考',
      ),
      ApplicationStep(
        id: 'app-002-step-2',
        applicationId: 'app-002',
        stepType: StepType.interview,
        stepOrder: 2,
        status: StepStatus.inProgress,
        label: 'カジュアル面談',
        relatedId: 'interview-mock-001',
      ),
      ApplicationStep(
        id: 'app-002-step-3',
        applicationId: 'app-002',
        stepType: StepType.externalTest,
        stepOrder: 3,
        status: StepStatus.pending,
        label: '適性検査（外部）',
      ),
      ApplicationStep(
        id: 'app-002-step-4',
        applicationId: 'app-002',
        stepType: StepType.interview,
        stepOrder: 4,
        status: StepStatus.pending,
        label: '技術面接',
      ),
      ApplicationStep(
        id: 'app-002-step-5',
        applicationId: 'app-002',
        stepType: StepType.offer,
        stepOrder: 5,
        status: StepStatus.pending,
        label: 'オファー',
      ),
    ],
  ),
  Application(
    id: 'app-003',
    jobId: 'job-003',
    applicantId: 'dev-user-001',
    organizationId: 'org-002',
    status: ApplicationStatus.active,
    appliedAt: DateTime(2026, 3, 5),
    job: _mockJobs[2],
    steps: const [
      ApplicationStep(
        id: 'app-003-step-1',
        applicationId: 'app-003',
        stepType: StepType.screening,
        stepOrder: 1,
        status: StepStatus.inProgress,
        label: '書類選考',
      ),
      ApplicationStep(
        id: 'app-003-step-2',
        applicationId: 'app-003',
        stepType: StepType.form,
        stepOrder: 2,
        status: StepStatus.pending,
        label: 'アンケート回答',
      ),
      ApplicationStep(
        id: 'app-003-step-3',
        applicationId: 'app-003',
        stepType: StepType.interview,
        stepOrder: 3,
        status: StepStatus.pending,
        label: '面接',
      ),
      ApplicationStep(
        id: 'app-003-step-4',
        applicationId: 'app-003',
        stepType: StepType.offer,
        stepOrder: 4,
        status: StepStatus.pending,
        label: 'オファー',
      ),
    ],
  ),
];
