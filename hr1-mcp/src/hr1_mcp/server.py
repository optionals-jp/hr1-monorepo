"""HR1 MCP Server - テナント企業向けHRデータアクセス"""

from mcp.server.fastmcp import FastMCP

from hr1_mcp.supabase_client import get_client

mcp = FastMCP("hr1-mcp")


def _register_all_tools() -> None:
    client = get_client()

    from hr1_mcp.tools.organizations import register as reg_orgs
    from hr1_mcp.tools.employees import register as reg_employees
    from hr1_mcp.tools.recruitment import register as reg_recruitment
    from hr1_mcp.tools.attendance import register as reg_attendance
    from hr1_mcp.tools.crm import register as reg_crm
    from hr1_mcp.tools.dashboard import register as reg_dashboard

    reg_orgs(mcp, client)
    reg_employees(mcp, client)
    reg_recruitment(mcp, client)
    reg_attendance(mcp, client)
    reg_crm(mcp, client)
    reg_dashboard(mcp, client)


_register_all_tools()


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
