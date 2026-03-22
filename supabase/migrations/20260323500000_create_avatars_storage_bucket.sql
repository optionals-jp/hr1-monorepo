-- アバター画像用ストレージバケットを作成

-- バケット作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 認証ユーザーが自分のアバターをアップロード可能
CREATE POLICY "認証ユーザーが自分のアバターをアップロード"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 認証ユーザーが自分のアバターを更新可能
CREATE POLICY "認証ユーザーが自分のアバターを更新"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 認証ユーザーが自分のアバターを削除可能
CREATE POLICY "認証ユーザーが自分のアバターを削除"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 全員がアバターを閲覧可能（パブリック）
CREATE POLICY "アバターをパブリックに閲覧"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
