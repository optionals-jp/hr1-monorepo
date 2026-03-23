/// API呼び出し結果を表す汎用クラス
/// 成功時はdataを、失敗時はerrorMessageを保持する
sealed class Result<T> {
  const Result();

  /// 成功
  factory Result.success(T data) = Success<T>;

  /// 失敗
  factory Result.failure(String message) = Failure<T>;
}

/// 成功結果
class Success<T> extends Result<T> {
  const Success(this.data);

  /// 成功時のデータ
  final T data;
}

/// 失敗結果
class Failure<T> extends Result<T> {
  const Failure(this.message);

  /// エラーメッセージ
  final String message;
}
