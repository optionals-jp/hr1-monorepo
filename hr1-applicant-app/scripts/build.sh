#!/bin/bash
# HR1 応募者アプリ ビルドスクリプト
#
# 使い方:
#   ./scripts/build.sh           # Dev 環境で実行（デフォルト）
#   ./scripts/build.sh prod      # Prod 環境で実行
#   ./scripts/build.sh prod apk  # Prod 環境で APK ビルド
#   ./scripts/build.sh prod ipa  # Prod 環境で IPA ビルド

set -e

FLAVOR="${1:-dev}"
COMMAND="${2:-run}"

if [[ "$FLAVOR" != "dev" && "$FLAVOR" != "prod" ]]; then
  echo "Usage: $0 [dev|prod] [run|apk|ipa]"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# iOS: Env.xcconfig を切り替え
XCCONFIG_SRC="$PROJECT_DIR/ios/Flutter/${FLAVOR^}.xcconfig"
XCCONFIG_DST="$PROJECT_DIR/ios/Flutter/Env.xcconfig"

if [[ -f "$XCCONFIG_SRC" ]]; then
  cp "$XCCONFIG_SRC" "$XCCONFIG_DST"
  echo "iOS: $FLAVOR 環境の xcconfig を適用しました"
fi

# iOS: GoogleService-Info.plist をコピー
FIREBASE_SRC="$PROJECT_DIR/env/$FLAVOR/GoogleService-Info.plist"
FIREBASE_DST="$PROJECT_DIR/ios/Runner/GoogleService-Info.plist"

if [[ -f "$FIREBASE_SRC" ]]; then
  cp "$FIREBASE_SRC" "$FIREBASE_DST"
  echo "iOS: $FLAVOR 環境の GoogleService-Info.plist を適用しました"
fi

# エントリポイント決定（dev=main.dart, prod=main_prod.dart）
if [[ "$FLAVOR" == "prod" ]]; then
  TARGET="-t lib/main_prod.dart"
else
  TARGET=""
fi

# Flutter コマンド実行
case "$COMMAND" in
  run)
    flutter run $TARGET
    ;;
  apk)
    flutter build apk $TARGET --flavor "$FLAVOR"
    ;;
  ipa)
    flutter build ipa $TARGET --flavor "$FLAVOR"
    ;;
  *)
    echo "Unknown command: $COMMAND"
    echo "Usage: $0 [dev|prod] [run|apk|ipa]"
    exit 1
    ;;
esac
