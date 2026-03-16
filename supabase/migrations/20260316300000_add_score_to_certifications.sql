-- employee_certifications に score カラム追加
alter table employee_certifications add column if not exists score int;

-- certification_masters に has_score フラグ追加
alter table certification_masters add column if not exists has_score boolean not null default false;

-- TOEIC の重複エントリを統合: 1つの「TOEIC」に置き換え
delete from certification_masters
where organization_id is null
  and name in ('TOEIC 600点以上', 'TOEIC 730点以上', 'TOEIC 860点以上', 'TOEIC 900点以上');

insert into certification_masters (organization_id, name, category, has_score)
values
  (null, 'TOEIC', '語学', true),
  (null, 'TOEFL iBT', '語学', true);

notify pgrst, 'reload schema';
