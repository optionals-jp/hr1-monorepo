-- application_steps に書類URLカラムを追加
ALTER TABLE "public"."application_steps"
    ADD COLUMN "document_url" "text";

COMMENT ON COLUMN "public"."application_steps"."document_url" IS '書類選考で提出されたファイルのStorage URL';

-- screening-documents バケットを作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('screening-documents', 'screening-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: 応募者は自分の応募に紐づくファイルのみアップロード可能
CREATE POLICY "screening_docs_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'screening-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- RLS: 応募者は自分のファイルを読み取り可能
CREATE POLICY "screening_docs_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'screening-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- RLS: 組織メンバーは全ファイルを読み取り可能（管理画面用）
CREATE POLICY "screening_docs_select_org" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'screening-documents'
        AND public.get_my_role() IN ('admin', 'employee')
    );
