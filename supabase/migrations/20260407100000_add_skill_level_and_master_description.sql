-- スキルに5段階レベルを追加
alter table employee_skills
  add column if not exists level smallint not null default 3
    check (level between 1 and 5);

-- スキルマスタに説明文を追加
alter table skill_masters
  add column if not exists description text;

-- employee_skills に skill_master_id 外部キーを追加（既存のフリーテキストとの互換性維持）
alter table employee_skills
  add column if not exists skill_master_id uuid references skill_masters(id) on delete set null;

create index if not exists idx_employee_skills_master on employee_skills(skill_master_id);

notify pgrst, 'reload schema';
