import 'core/config/app_config.dart';
import 'main.dart' as app;

void main() {
  AppConfig.current = AppConfig.prod;
  app.main();
}
