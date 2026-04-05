"""組織・部署管理ツール"""

from __future__ import annotations

import json

from mcp.server.fastmcp import FastMCP

from hr1_mcp.config import settings
from hr1_mcp.supabase_client import OrgScopedClient


def register(mcp: FastMCP, client: OrgScopedClient) -> None:

    @mcp.tool()
    def get_organization() -> str:
        """自社の組織情報を取得します。"""
        resp = (
            client.query("organizations")
            .eq("id", client.org_id)
            .single()
            .execute()
        )
        return json.dumps(resp.data, ensure_ascii=False, default=str)

    @mcp.tool()
    def list_departments(
        limit: int = settings.default_limit,
        offset: int = 0,
    ) -> str:
        """自社の部署一覧を取得します。

        Args:
            limit: 取得件数（デフォルト50、最大500）
            offset: オフセット
        """
        limit = min(limit, settings.max_limit)
        resp = (
            client.query("departments")
            .order("name")
            .range(offset, offset + limit - 1)
            .execute()
        )
        return json.dumps(resp.data, ensure_ascii=False, default=str)
