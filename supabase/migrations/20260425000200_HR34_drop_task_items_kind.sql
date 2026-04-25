-- HR-34: task_items.kind カラム撤去。
-- 開発タスク特化機能（dev kind, branch/PR/env, repro 等）の UI 撤去に伴い、
-- biz/dev 区分が不要になったためカラムごと削除。CHECK 制約はカラム削除で同時に消える。

ALTER TABLE public.task_items DROP COLUMN IF EXISTS kind;
