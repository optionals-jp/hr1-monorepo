import { redirect } from "next/navigation";

export default function DashboardEditRedirect() {
  redirect("/settings/dashboard");
}
