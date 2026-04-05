"""従業員管理ツール"""

from __future__ import annotations

import json

from mcp.server.fastmcp import FastMCP

from hr1_mcp.config import settings
from hr1_mcp.supabase_client import OrgScopedClient


def register(mcp: FastMCP, client: OrgScopedClient) -> None:

    @mcp.tool()
    def list_employees(
        department: str | None = None,
        role: str | None = None,
        limit: int = settings.default_limit,
        offset: int = 0,
    ) -> str:
        """自社の従業員一覧を取得します。

        Args:
            department: 部署名でフィルタ（任意）
            role: 役割でフィルタ（admin/employee）（任意）
            limit: 取得件数（デフォルト50、最大500）
            offset: オフセット
        """
        limit = min(limit, settings.max_limit)
        q = client.query(
            "user_organizations",
            "user_id, profiles(id, email, display_name, name_kana, role, department, position, hire_date, avatar_url)",
        )
        if role:
            q = q.eq("profiles.role", role)
        resp = q.range(offset, offset + limit - 1).execute()

        employees = []
        for row in resp.data:
            profile = row.get("profiles")
            if profile:
                if department and profile.get("department") != department:
                    continue
                employees.append(profile)

        return json.dumps(employees, ensure_ascii=False, default=str)

    @mcp.tool()
    def get_employee(user_id: str) -> str:
        """従業員の詳細情報を取得します（スキル・資格含む）。

        Args:
            user_id: 従業員のユーザーID
        """
        # 自社の従業員であることを確認
        membership = (
            client.query("user_organizations")
            .eq("user_id", user_id)
            .execute()
        )
        if not membership.data:
            return json.dumps({"error": "指定された従業員は自社に所属していません"}, ensure_ascii=False)

        # プロフィール取得
        profile_resp = (
            client.query_no_org("profiles")
            .eq("id", user_id)
            .single()
            .execute()
        )

        # スキル取得
        skills_resp = (
            client.query("employee_skills")
            .eq("user_id", user_id)
            .order("sort_order")
            .execute()
        )

        # 資格取得
        certs_resp = (
            client.query("employee_certifications")
            .eq("user_id", user_id)
            .order("sort_order")
            .execute()
        )

        result = {
            "profile": profile_resp.data,
            "skills": skills_resp.data,
            "certifications": certs_resp.data,
        }
        return json.dumps(result, ensure_ascii=False, default=str)
