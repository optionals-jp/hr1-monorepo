import '../../../../shared/domain/entities/page_section.dart';
import '../../domain/entities/company_page_config.dart';
import '../../domain/repositories/company_repository.dart';

/// CompanyRepository のモック実装
class MockCompanyRepository implements CompanyRepository {
  @override
  Future<CompanyPageConfig?> getPageConfig(String organizationId) async {
    return _mockConfigs[organizationId];
  }
}

// ---------------------------------------------------------------------------
// モックデータ: 企業ごとに異なるページ構成
// ---------------------------------------------------------------------------

final _mockConfigs = <String, CompanyPageConfig>{
  // テックコープ: エンジニア向けにリッチな構成
  'org-001': CompanyPageConfig(
    organizationId: 'org-001',
    tabs: [
      PageTab(label: '概要', sections: [
        PageSection(
          id: 's1',
          type: SectionType.markdown,
          title: '',
          order: 1,
          content: '''
## 私たちについて

株式会社テックコープは **2015年** に設立された、企業のDX推進を支援するテクノロジーカンパニーです。

クラウドネイティブなSaaS開発を中心に、**AI/ML**、データ基盤構築など幅広い領域でソリューションを提供しています。

> 「テクノロジーの力で、すべての人の働き方をアップデートする」

### 事業領域

- **HR Tech** — 人事・採用領域のSaaS開発
- **Data Platform** — データ基盤の設計・構築・運用
- **AI/ML** — 自然言語処理・レコメンドエンジン

---

累計導入社数 **500社以上**、ARR **20億円** を突破し、急成長を続けています。
''',
        ),
        PageSection(
          id: 's2',
          type: SectionType.stats,
          title: '数字で見るテックコープ',
          order: 2,
          items: [
            {'label': '設立', 'value': '2015年'},
            {'label': '従業員数', 'value': '250名'},
            {'label': '平均年齢', 'value': '31.2歳'},
            {'label': '導入社数', 'value': '500社+'},
            {'label': 'リモート率', 'value': '85%'},
            {'label': '有休取得率', 'value': '82%'},
          ],
        ),
      ]),
      PageTab(label: '求人', sections: [
        PageSection(
          id: 's3',
          type: SectionType.markdown,
          title: '',
          order: 1,
          content:
              '現在募集中のポジションです。カジュアル面談も随時受け付けています。',
        ),
        PageSection(
          id: 's4',
          type: SectionType.jobList,
          title: '募集中のポジション',
          order: 2,
        ),
      ]),
      PageTab(label: '働く環境', sections: [
        PageSection(
          id: 's5',
          type: SectionType.markdown,
          title: '',
          order: 1,
          content: '''
## エンジニアが最高のパフォーマンスを発揮できる環境

私たちは **「開発者体験（DX）」** を最も大切にしています。

エンジニアが技術に集中できるよう、制度・文化・ツールの3つの軸で環境を整えています。
''',
        ),
        PageSection(
          id: 's6',
          type: SectionType.valueList,
          title: 'カルチャー',
          order: 2,
          items: [
            {
              'title': 'エンジニアドリブン',
              'description':
                  '技術選定はエンジニア主導。新しい技術のPoC期間を四半期ごとに確保しています。',
            },
            {
              'title': 'OSSへの貢献',
              'description':
                  '業務時間の10%をOSS活動に充てることができます。社内ライブラリの公開も積極的に推進。',
            },
            {
              'title': '心理的安全性',
              'description':
                  'ポストモーテム文化を大切にし、失敗を責めるのではなく学びに変えるチーム運営を実践しています。',
            },
            {
              'title': 'ハッカソン',
              'description':
                  '四半期に1度、2日間のハッカソンを開催。プロダクトに採用されたアイデアも多数あります。',
            },
          ],
        ),
        PageSection(
          id: 's7',
          type: SectionType.benefitList,
          title: '福利厚生・制度',
          order: 3,
          items: [
            {'icon': '🏠', 'text': 'フルリモート・フレックス制'},
            {'icon': '📚', 'text': '書籍購入・カンファレンス参加補助（年15万円）'},
            {'icon': '📈', 'text': 'SO（ストックオプション）制度'},
            {'icon': '👶', 'text': '育児・介護休暇充実（男性取得率75%）'},
            {'icon': '💼', 'text': '副業OK'},
            {'icon': '🖥️', 'text': '開発マシン自由選択（Mac/Linux）'},
            {'icon': '🍱', 'text': 'ランチ補助（月1万円）'},
          ],
        ),
      ]),
      PageTab(label: 'FAQ', sections: [
        PageSection(
          id: 's8',
          type: SectionType.faq,
          title: 'よくある質問',
          order: 1,
          items: [
            {
              'question': '選考フローを教えてください',
              'answer':
                  'カジュアル面談 → 書類選考 → 技術面接（1回）→ カルチャー面接 → オファー\n\n最短2週間で内定まで進むことが可能です。',
            },
            {
              'question': 'リモートワークはどの程度可能ですか？',
              'answer':
                  'フルリモート勤務が可能です。月1回のオフサイトミーティングがありますが、参加は任意です。',
            },
            {
              'question': '使用している技術スタックは？',
              'answer':
                  'フロントエンド: React / TypeScript / Next.js\nバックエンド: Go / PostgreSQL / Redis\nインフラ: AWS / Terraform / Kubernetes',
            },
            {
              'question': '未経験でも応募できますか？',
              'answer':
                  '実務経験がなくても、個人開発やOSS活動の実績があれば歓迎しています。ポテンシャル採用枠もご用意しています。',
            },
          ],
        ),
      ]),
    ],
  ),

  // グローバルHR: コンサル系のシンプルな構成
  'org-002': CompanyPageConfig(
    organizationId: 'org-002',
    tabs: [
      PageTab(label: '会社紹介', sections: [
        PageSection(
          id: 's10',
          type: SectionType.markdown,
          title: '',
          order: 1,
          content: '''
## グローバルHR株式会社

人と組織の可能性を最大化する — それが私たちのミッションです。

企業の人事課題をテクノロジーとコンサルティングで解決する **HRTechカンパニー** として、採用から育成・評価まで、人事業務全般をワンストップでサポートしています。

### 強み

1. **データドリブンHR** — 人事データの可視化と意思決定支援
2. **グローバル対応** — 多言語・多拠点の人事制度設計
3. **伴走型コンサルティング** — 導入後のフォローアップまで一貫支援
''',
        ),
        PageSection(
          id: 's11',
          type: SectionType.stats,
          title: '',
          order: 2,
          items: [
            {'label': '設立', 'value': '2012年'},
            {'label': '従業員', 'value': '180名'},
            {'label': '支援実績', 'value': '300社+'},
            {'label': '拠点', 'value': '3都市'},
          ],
        ),
      ]),
      PageTab(label: '求人', sections: [
        PageSection(
          id: 's12',
          type: SectionType.jobList,
          title: '募集中のポジション',
          order: 1,
        ),
      ]),
      PageTab(label: '制度・文化', sections: [
        PageSection(
          id: 's13',
          type: SectionType.valueList,
          title: '大切にしていること',
          order: 1,
          items: [
            {
              'title': 'ダイバーシティ&インクルージョン',
              'description': '多様なバックグラウンドを持つメンバーが活躍できる環境づくりを推進しています。',
            },
            {
              'title': 'ナレッジシェア文化',
              'description': '週次の社内勉強会、月次のナレッジ共有会を開催。部門を越えた学びの場を大切にしています。',
            },
            {
              'title': 'フラットな組織',
              'description': '役職に関わらず意見を言い合えるオープンなコミュニケーションを実践しています。',
            },
          ],
        ),
        PageSection(
          id: 's14',
          type: SectionType.benefitList,
          title: '福利厚生',
          order: 2,
          items: [
            {'icon': '🏢', 'text': 'ハイブリッドワーク制度'},
            {'icon': '📖', 'text': '資格取得支援（全額補助）'},
            {'icon': '🔄', 'text': '社内公募制度'},
            {'icon': '🏥', 'text': '健康経営優良法人認定'},
          ],
        ),
      ]),
    ],
  ),

  // 未来建設: 建設会社らしいシンプル構成
  'org-003': CompanyPageConfig(
    organizationId: 'org-003',
    tabs: [
      PageTab(label: '概要', sections: [
        PageSection(
          id: 's20',
          type: SectionType.markdown,
          title: '',
          order: 1,
          content: '''
## 未来建設株式会社

**持続可能な社会基盤を創造する** — 1998年の設立以来、この理念のもと歩み続けています。

スマートシティ開発と環境配慮型建築を手掛ける総合建設会社として、ICTを活用した次世代の街づくりに取り組んでいます。

### 代表的なプロジェクト

- 横浜みなとみらいスマートタウン計画
- 大阪グリーンビルディング（LEED Platinum認証取得）
- 地方創生型サテライトオフィス開発
''',
        ),
        PageSection(
          id: 's21',
          type: SectionType.stats,
          title: '',
          order: 2,
          items: [
            {'label': '設立', 'value': '1998年'},
            {'label': '従業員', 'value': '800名'},
            {'label': '売上高', 'value': '320億円'},
            {'label': '拠点', 'value': '全国12拠点'},
          ],
        ),
      ]),
      PageTab(label: '求人', sections: [
        PageSection(
          id: 's22',
          type: SectionType.jobList,
          title: '募集中のポジション',
          order: 1,
        ),
      ]),
      PageTab(label: '社風', sections: [
        PageSection(
          id: 's23',
          type: SectionType.valueList,
          title: '私たちの価値観',
          order: 1,
          items: [
            {
              'title': 'チームワーク重視',
              'description': '大規模プロジェクトを成功に導くのはチームの力。部門横断の協働を大切にしています。',
            },
            {
              'title': '現場第一主義',
              'description': '現場の声を最優先し、デスクワークだけでは見えない課題に向き合います。',
            },
            {
              'title': 'ベテランと若手の協働',
              'description': 'メンター制度を通じて、経験豊富な先輩から若手への技術・知識の継承を推進しています。',
            },
          ],
        ),
        PageSection(
          id: 's24',
          type: SectionType.benefitList,
          title: '福利厚生',
          order: 2,
          items: [
            {'icon': '🏠', 'text': '社宅・住宅手当'},
            {'icon': '🏆', 'text': '資格取得報奨金'},
            {'icon': '💰', 'text': '財形貯蓄制度'},
            {'icon': '⛰️', 'text': '保養所利用可'},
          ],
        ),
      ]),
    ],
  ),
};
