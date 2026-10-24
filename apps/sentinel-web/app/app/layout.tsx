import { AppShell } from "@/components/app/shell";
import { requireCtx } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { org, member } = await requireCtx();
  return <AppShell org={org.name} user={member.email.split("@")[0] || "You"}>{children}</AppShell>;
}
