# CLAUDE.md

## Project Structure

Monorepo with three apps:
- `hr1-console/` — Next.js (App Router) admin console (TypeScript)
- `hr1-applicant-app/` — Flutter applicant app (Dart)
- `hr1-employee-app/` — Flutter employee app (Dart)

Backend: Supabase (Auth, Database, Edge Functions)

## Commands

### hr1-console (run from `hr1-console/`)
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run format` — Prettier format (write)
- `npm run format:check` — Prettier format check
- `npm run test` — Vitest run
- `npm run test:watch` — Vitest watch

### Flutter apps (run from each app directory)
- `flutter run` — Run app
- `flutter build` — Build app
- `flutter test` — Run tests

## Code Style

- **Prettier** is enforced via CI. Always run `npm run format` in `hr1-console/` before finishing.
- **UI text and comments** are in Japanese where appropriate.
- Use `@supabase/ssr` (`createBrowserClient` / `createServerClient`) for Supabase clients — not `@supabase/supabase-js` directly.

## Flutter UI Guidelines

### 共通コンポーネント
- **ボタン**: 画面下部の主要アクション・フォーム送信には `CommonButton` を使用する。セカンダリアクション（再試行等）には `CommonButton.outline` を使用する。`FilledButton` / `ElevatedButton` を直接使わない。
- **テキストスタイル**: `AppTextStyles`（Noto Sans JP）のトークンを使用する。`TextStyle()` を直接使わない。
- **カラー**: セカンダリテキストには `AppColors.textSecondary(theme.brightness)` を使用する。`theme.colorScheme.onSurface.withValues(alpha: ...)` を直接使わない。
- **ローディング**: 全画面ローディングには `LoadingIndicator()` を使用する。インラインには `LoadingIndicator(size: 20)` を使用する。

## CI Pipeline (GitHub Actions)

`hr1-console` only:
1. `format:check` — Prettier
2. `lint` — ESLint
3. `test` — Vitest
4. `build` — Next.js build

## Task Completion Checklist

Before considering a task complete in `hr1-console/`:
1. `npm run format` — Apply Prettier formatting (also checked by stop hook)
2. `npm run lint` — Check for ESLint errors
3. `npm run build` — Verify production build succeeds
4. `npm run test` — Verify tests pass
