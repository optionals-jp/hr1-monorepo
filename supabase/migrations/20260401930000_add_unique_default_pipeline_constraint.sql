-- 組織ごとにデフォルトパイプラインは1つだけ
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_pipelines_unique_default
  ON crm_pipelines (organization_id) WHERE is_default = true;
