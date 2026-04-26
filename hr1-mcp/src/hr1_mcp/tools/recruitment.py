"""採用管理（ATS）ツール"""

from __future__ import annotations

import json

from mcp.server.fastmcp import FastMCP

from hr1_mcp.config import settings
from hr1_mcp.supabase_client import OrgScopedClient


def register(mcp: FastMCP, client: OrgScopedClient) -> None:

    @mcp.tool()
    def list_jobs(
        status: str | None = None,
        limit: int = settings.default_limit,
        offset: int = 0,
    ) -> str:
        """自社の求人一覧を取得します。

        Args:
            status: ステータスでフィルタ（open/closed/draft/archived）（任意）
            limit: 取得件数（デフォルト50、最大500）
            offset: オフセット
        """
        limit = min(limit, settings.max_limit)
        q = client.query("jobs")
        if status:
            q = q.eq("status", status)
        resp = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return json.dumps(resp.data, ensure_ascii=False, default=str)

    @mcp.tool()
    def list_applications(
        job_id: str | None = None,
        status: str | None = None,
        limit: int = settings.default_limit,
        offset: int = 0,
    ) -> str:
        """自社の応募一覧を取得します（求人タイトル・応募者名含む）。

        Args:
            job_id: 求人IDでフィルタ（任意）
            status: ステータスでフィルタ（active/offered/rejected/withdrawn）（任意）
            limit: 取得件数（デフォルト50、最大500）
            offset: オフセット
        """
        limit = min(limit, settings.max_limit)
        q = client.query(
            "applications",
            "*, jobs(title), profiles:applicant_id(display_name, email)",
        )
        if job_id:
            q = q.eq("job_id", job_id)
        if status:
            q = q.eq("status", status)
        resp = q.order("applied_at", desc=True).range(offset, offset + limit - 1).execute()
        return json.dumps(resp.data, ensure_ascii=False, default=str)

    @mcp.tool()
    def get_application(application_id: str) -> str:
        """応募の詳細情報を取得します（選考ステップ含む）。

        Args:
            application_id: 応募ID
        """
        resp = (
            client.query(
                "applications",
                "*, application_steps(*), jobs(title, department, location), profiles:applicant_id(display_name, email)",
            )
            .eq("id", application_id)
            .single()
            .execute()
        )
        return json.dumps(resp.data, ensure_ascii=False, default=str)
