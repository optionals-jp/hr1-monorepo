# Flutter コーディングガイドライン

## Scaffold と AsyncValue (.when) の配置ルール

### ルール

**Scaffold + AppBar は `.when()` の外に配置し、`body` 内で状態ごとのコンテンツだけを切り替える。**

### 理由

- loading / error 時にも AppBar（戻るボタン含む）が常に表示され、ユーザーが画面遷移できる
- 状態が変わるたびに Scaffold が再構築されず、画面のちらつきを防げる
- シェル内の画面では不要な Scaffold のネストを避けられる

### Good

```dart
@override
Widget build(BuildContext context, WidgetRef ref) {
  final asyncData = ref.watch(someProvider);

  return Scaffold(
    appBar: AppBar(title: const Text('タイトル')),
    body: asyncData.when(
      data: (data) {
        if (data == null) {
          return const Center(child: Text('データが見つかりません'));
        }
        return ListView(...);
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => const Center(child: Text('エラーが発生しました')),
    ),
  );
}
```

### Bad

```dart
@override
Widget build(BuildContext context, WidgetRef ref) {
  final asyncData = ref.watch(someProvider);

  // NG: Scaffold が .when() の中に入っている
  return asyncData.when(
    data: (data) {
      return Scaffold(
        appBar: AppBar(title: const Text('タイトル')),
        body: ListView(...),
      );
    },
    loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
    error: (e, _) => const Scaffold(body: Center(child: Text('エラー'))),
  );
}
```

### 例外: SliverAppBar を使う画面

`CustomScrollView` + `SliverAppBar` を使う画面（例: 求人詳細）は、AppBar 自体がスクロールコンテンツの一部であるため、data 取得後にのみ表示される構成で問題ない。ただし loading / error 時には通常の AppBar 付き Scaffold を返すこと。

```dart
return asyncData.when(
  data: (data) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(...),  // データ依存のヘッダー
          ...
        ],
      ),
    );
  },
  loading: () => Scaffold(
    appBar: AppBar(title: const Text('読み込み中')),
    body: const Center(child: CircularProgressIndicator()),
  ),
  error: (e, _) => Scaffold(
    appBar: AppBar(title: const Text('エラー')),
    body: const Center(child: Text('エラーが発生しました')),
  ),
);
```

### シェル内の画面

`StatefulShellRoute` 内の画面（HomeScreen がAppBar を提供）では、子画面は Scaffold を持たず、直接 Widget を返す。

```dart
// シェル内の画面: Scaffold 不要
return asyncData.when(
  data: (data) => _PageBody(data: data),
  loading: () => const Center(child: CircularProgressIndicator()),
  error: (e, _) => const Center(child: Text('エラーが発生しました')),
);
```
