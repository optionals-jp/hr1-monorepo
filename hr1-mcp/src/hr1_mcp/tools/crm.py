"""CRM・営業管理ツール"""

from __future__ import annotations

import json

from mcp.server.fastmcp import FastMCP

from hr1_mcp.config import settings
from hr1_mcp.supabase_client import OrgScopedClient


def register(mcp: FastMCP, client: OrgScopedClient) -> None:

    @mcp.tool()
    def list_companies(
        limit: int = settings.default_limit,
        offset: int = 0,
    ) -> str:
        """自社の取引先企業一覧を取得します。

        Args:
            limit: 取得件数（デフォルト50、最大500）
            offset: オフセット
        """
        limit = min(limit, settings.max_limit)
        resp = (
            client.query("bc_companies")
            .order("name")
            .range(offset, offset + limit - 1)
            .execute()
        )
        return json.dumps(resp.data, ensure_ascii=False, default=str)

    @mcp.tool()
    def list_deals(
        status: str | None = None,
        stage: str | None = None,
        limit: int = settings.default_limit,
        offset: int = 0,
    ) -> str:
        """自社の商談一覧を取得します。

        Args:
            status: ステータスでフィルタ（任意）
            stage: ステージでフィルタ（任意）
            limit: 取得件数（デフォルト50、最大500）
            offset: オフセット
        """
        limit = min(limit, settings.max_limit)
        q = client.query(
            "bc_deals",
            "*, bc_companies(name), bc_contacts(last_name, first_name)",
        )
        if status:
            q = q.eq("status", status)
        if stage:
            q = q.eq("stage", stage)
        resp = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return json.dumps(resp.data, ensure_ascii=False, default=str)

    @mcp.tool()
    def list_leads(
        status: str | None = None,
        limit: int = settings.default_limit,
        offset: int = 0,
    ) -> str:
        """自社のリード（見込み顧客）一覧を取得します。

        Args:
            status: ステータスでフィルタ（new/contacted/qualified/converted）（任意）
            limit: 取得件数（デフォルト50、最大500）
            offset: オフセット
        """
        limit = min(limit, settings.max_limit)
        q = client.query("bc_leads")
        if status:
            q = q.eq("status", status)
        resp = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return json.dumps(resp.data, ensure_ascii=False, default=str)
