#!/bin/bash
# HR1 社員アプリ ビルドスクリプト
#
# 使い方:
#   ./scripts/build.sh           # Dev 環境で実行（デフォルト）
#   ./scripts/build.sh prod      # Prod 環境で実行
#   ./scripts/build.sh dev ipa   # Dev 環境で IPA ビルド
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

# dev → Dev, prod → Prod（macOS 互換）
case "$FLAVOR" in
  dev)  FLAVOR_CAP="Dev" ;;
  prod) FLAVOR_CAP="Prod" ;;
esac

# xcconfig をデフォルト（Debug=Dev, Release=Prod）に復元する関数
restore_xcconfig() {
  local release="$PROJECT_DIR/ios/Flutter/Release.xcconfig"
  local debug="$PROJECT_DIR/ios/Flutter/Debug.xcconfig"
  sed -i '' "s/#include \"Dev.xcconfig\"/#include \"Prod.xcconfig\"/" "$release" 2>/dev/null
  sed -i '' "s/#include \"Prod.xcconfig\"/#include \"Dev.xcconfig\"/" "$debug" 2>/dev/null
}
trap restore_xcconfig EXIT

# iOS: Release.xcconfig / Debug.xcconfig の include を環境に合わせて書き換え
for cfg in Release.xcconfig Debug.xcconfig; do
  CFG_PATH="$PROJECT_DIR/ios/Flutter/$cfg"
  if [[ -f "$CFG_PATH" ]]; then
    sed -i '' "s/#include \"Dev.xcconfig\"/#include \"${FLAVOR_CAP}.xcconfig\"/" "$CFG_PATH"
    sed -i '' "s/#include \"Prod.xcconfig\"/#include \"${FLAVOR_CAP}.xcconfig\"/" "$CFG_PATH"
    echo "iOS: $cfg → ${FLAVOR_CAP}.xcconfig を適用"
  fi
done

# iOS: GoogleService-Info.plist をコピー
FIREBASE_SRC="$PROJECT_DIR/env/$FLAVOR/GoogleService-Info.plist"
FIREBASE_DST="$PROJECT_DIR/ios/Runner/GoogleService-Info.plist"

if [[ -f "$FIREBASE_SRC" ]]; then
  cp "$FIREBASE_SRC" "$FIREBASE_DST"
  echo "iOS: $FLAVOR 環境の GoogleService-Info.plist を適用"
fi

# エントリポイント決定（dev=main.dart, prod=main_prod.dart）
if [[ "$FLAVOR" == "prod" ]]; then
  TARGET="-t lib/main_prod.dart"
else
  TARGET=""
fi

echo "環境: $FLAVOR / コマンド: $COMMAND"

cd "$PROJECT_DIR"

# Flutter コマンド実行
case "$COMMAND" in
  run)
    flutter run $TARGET
    ;;
  apk)
    flutter build apk $TARGET
    ;;
  ipa)
    flutter build ipa $TARGET --export-options-plist="$PROJECT_DIR/ios/ExportOptions.plist"
    echo ""
    echo "=== ビルド完了 ==="
    echo "IPA: $PROJECT_DIR/build/ios/ipa/"
    echo "Xcode Organizer を開いています..."
    ARCHIVE=$(find "$PROJECT_DIR/build/ios/archive" -name "*.xcarchive" -maxdepth 1 | head -1)
    if [[ -n "$ARCHIVE" ]]; then
      open "$ARCHIVE"
    fi
    ;;
  *)
    echo "Unknown command: $COMMAND"
    echo "Usage: $0 [dev|prod] [run|apk|ipa]"
    exit 1
    ;;
esac
