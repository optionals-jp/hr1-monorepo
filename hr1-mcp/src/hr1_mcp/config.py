"""HR1 MCP Server 設定モジュール"""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_role_key: str
    organization_id: str
    default_limit: int = 50
    max_limit: int = 500


def _load_settings() -> Settings:
    supabase_url = os.environ.get("SUPABASE_URL")
    if not supabase_url:
        raise ValueError("SUPABASE_URL 環境変数が設定されていません")

    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not service_role_key:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY 環境変数が設定されていません")

    organization_id = os.environ.get("ORGANIZATION_ID")
    if not organization_id:
        raise ValueError("ORGANIZATION_ID 環境変数が設定されていません")

    default_limit = int(os.environ.get("HR1_MCP_DEFAULT_LIMIT", "50"))

    return Settings(
        supabase_url=supabase_url,
        supabase_service_role_key=service_role_key,
        organization_id=organization_id,
        default_limit=default_limit,
    )


settings = _load_settings()
