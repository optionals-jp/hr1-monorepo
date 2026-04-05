"""ダッシュボード統計ツール"""

from __future__ import annotations

import json

from mcp.server.fastmcp import FastMCP

from hr1_mcp.supabase_client import OrgScopedClient


def register(mcp: FastMCP, client: OrgScopedClient) -> None:

    @mcp.tool()
    def get_dashboard_stats() -> str:
        """自社の統計情報を取得します（従業員数、求人数、応募数、商談数など）。"""
        stats = {}

        # 従業員数
        resp = client.count("user_organizations")
        stats["employee_count"] = resp.count or 0

        # 部署数
        resp = client.count("departments")
        stats["department_count"] = resp.count or 0

        # 求人数（ステータス別）
        resp = client.count("jobs", {"status": "open"})
        stats["open_jobs"] = resp.count or 0

        resp = client.count("jobs")
        stats["total_jobs"] = resp.count or 0

        # 応募数（ステータス別）
        resp = client.count("applications", {"status": "active"})
        stats["active_applications"] = resp.count or 0

        resp = client.count("applications")
        stats["total_applications"] = resp.count or 0

        # 商談数
        resp = client.count("bc_deals")
        stats["total_deals"] = resp.count or 0

        # リード数
        resp = client.count("bc_leads", {"status": "new"})
        stats["new_leads"] = resp.count or 0

        # 取引先企業数
        resp = client.count("bc_companies")
        stats["total_companies"] = resp.count or 0

        return json.dumps(stats, ensure_ascii=False, default=str)
