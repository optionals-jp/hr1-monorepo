-- 管理者がプロフィールを更新できる RLS ポリシーを追加
-- （内定者の入社確定時に role を 'employee' に変更するため）

CREATE POLICY "管理者がプロフィールを更新"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()::text
        AND p.role = 'admin'
    )
  );
