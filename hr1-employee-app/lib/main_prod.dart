import 'package:hr1_employee_app/core/config/app_config.dart';
import 'package:hr1_employee_app/main.dart' as app;

void main() {
  AppConfig.current = AppConfig.prod;
  app.main();
}
