-- サーバ側の現在時刻を返す関数（打刻用）
CREATE OR REPLACE FUNCTION get_server_now()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT now();
$$;
