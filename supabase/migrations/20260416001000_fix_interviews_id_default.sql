-- interviews.id / interview_slots.id に DEFAULT を追加
-- フロントから id を渡さず DB 側で UUID を採番する
ALTER TABLE public.interviews
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE public.interview_slots
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
