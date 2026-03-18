/// アプリ環境
enum AppEnvironment { dev, prod }

/// 環境別アプリ設定
class AppConfig {
  const AppConfig._({
    required this.environment,
    required this.appName,
    required this.supabaseUrl,
    required this.supabaseAnonKey,
  });

  final AppEnvironment environment;
  final String appName;
  final String supabaseUrl;
  final String supabaseAnonKey;

  bool get isDev => environment == AppEnvironment.dev;
  bool get isProd => environment == AppEnvironment.prod;

  /// Dev 環境
  static const dev = AppConfig._(
    environment: AppEnvironment.dev,
    appName: 'HR1 社員 Dev',
    supabaseUrl: 'https://xmwdtnzfuokgaaffpsay.supabase.co',
    supabaseAnonKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhtd2R0bnpmdW9rZ2FhZmZwc2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzIxMzgsImV4cCI6MjA4ODMwODEzOH0.d4iZRx8lESKODLPBXAX7oQ1FheQrhqkJZK1VJjFe5h8',
  );

  /// Prod 環境（暫定的に Dev の Supabase に接続）
  static const prod = AppConfig._(
    environment: AppEnvironment.prod,
    appName: 'HR1 社員',
    supabaseUrl: 'https://xmwdtnzfuokgaaffpsay.supabase.co',
    supabaseAnonKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhtd2R0bnpmdW9rZ2FhZmZwc2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzIxMzgsImV4cCI6MjA4ODMwODEzOH0.d4iZRx8lESKODLPBXAX7oQ1FheQrhqkJZK1VJjFe5h8',
  );

  /// 現在の設定（main_dev.dart / main_prod.dart で設定される）
  static AppConfig _current = dev;
  static AppConfig get current => _current;
  static set current(AppConfig config) => _current = config;
}
