#!/bin/bash
# HR1 全アプリ IPA 一括ビルドスクリプト
#
# 使い方:
#   ./scripts/build-all-ipa.sh        # Dev 環境（デフォルト）
#   ./scripts/build-all-ipa.sh prod   # Prod 環境

set -e

FLAVOR="${1:-dev}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== HR1 全アプリ IPA ビルド（${FLAVOR}） ==="
echo ""

# 社員アプリ
echo "▶ 社員アプリをビルド中..."
"$ROOT_DIR/hr1-employee-app/scripts/build.sh" "$FLAVOR" ipa
echo ""

# 応募者アプリ
echo "▶ 応募者アプリをビルド中..."
"$ROOT_DIR/hr1-applicant-app/scripts/build.sh" "$FLAVOR" ipa
echo ""

echo "=== 全アプリ ビルド完了 ==="
