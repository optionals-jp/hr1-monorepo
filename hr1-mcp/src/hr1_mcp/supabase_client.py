"""テナントスコープ付きSupabaseクライアント"""

from __future__ import annotations

from supabase import Client, create_client

from hr1_mcp.config import settings


class OrgScopedClient:
    """全クエリにorganization_idフィルタを自動適用するラッパー。

    ORGANIZATION_ID は起動時に固定され、ツール呼び出し側からは変更不可能。
    これにより、テナント間のデータ漏洩を構造的に防止する。
    """

    def __init__(self, client: Client, org_id: str) -> None:
        self._client = client
        self._org_id = org_id

    @property
    def org_id(self) -> str:
        return self._org_id

    def query(self, table: str, select: str = "*"):
        """organization_idフィルタ付きSELECTクエリを返す"""
        return (
            self._client.table(table)
            .select(select)
            .eq("organization_id", self._org_id)
        )

    def query_no_org(self, table: str, select: str = "*"):
        """organization_idカラムを持たないテーブル用クエリ。
        organization_idによる間接フィルタは呼び出し側で実施すること。
        """
        return self._client.table(table).select(select)

    def count(self, table: str, filters: dict | None = None):
        """件数のみ取得するクエリ"""
        q = (
            self._client.table(table)
            .select("*", count="exact", head=True)
            .eq("organization_id", self._org_id)
        )
        if filters:
            for k, v in filters.items():
                q = q.eq(k, v)
        return q


_client_instance: OrgScopedClient | None = None


def get_client() -> OrgScopedClient:
    global _client_instance
    if _client_instance is None:
        raw_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
        _client_instance = OrgScopedClient(raw_client, settings.organization_id)
    return _client_instance
