"""勤怠・休暇管理ツール"""

from __future__ import annotations

import json

from mcp.server.fastmcp import FastMCP

from hr1_mcp.config import settings
from hr1_mcp.supabase_client import OrgScopedClient


def register(mcp: FastMCP, client: OrgScopedClient) -> None:

    @mcp.tool()
    def list_attendance_records(
        user_id: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int = settings.default_limit,
        offset: int = 0,
    ) -> str:
        """自社の勤怠記録一覧を取得します。

        Args:
            user_id: 従業員IDでフィルタ（任意）
            date_from: 開始日（YYYY-MM-DD）でフィルタ（任意）
            date_to: 終了日（YYYY-MM-DD）でフィルタ（任意）
            limit: 取得件数（デフォルト50、最大500）
            offset: オフセット
        """
        limit = min(limit, settings.max_limit)
        q = client.query("attendance_records")
        if user_id:
            q = q.eq("user_id", user_id)
        if date_from:
            q = q.gte("date", date_from)
        if date_to:
            q = q.lte("date", date_to)
        resp = q.order("date", desc=True).range(offset, offset + limit - 1).execute()
        return json.dumps(resp.data, ensure_ascii=False, default=str)

    @mcp.tool()
    def get_leave_balances(
        user_id: str | None = None,
        fiscal_year: int | None = None,
    ) -> str:
        """自社の有給休暇残高を取得します。

        Args:
            user_id: 従業員IDでフィルタ（任意）
            fiscal_year: 年度でフィルタ（任意）
        """
        q = client.query("leave_balances")
        if user_id:
            q = q.eq("user_id", user_id)
        if fiscal_year:
            q = q.eq("fiscal_year", fiscal_year)
        resp = q.order("fiscal_year", desc=True).execute()
        return json.dumps(resp.data, ensure_ascii=False, default=str)
