import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { BackLink } from "@/components/layout/BackLink";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { auth } from "@/lib/auth";
import { roleLabel } from "@/lib/role-label";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4 text-sm">
        <span className="font-semibold">業務経歴書</span>
        <div className="flex items-center gap-3">
          <span>
            {session.user.name}（{session.user.employeeId} /{" "}
            {roleLabel(session.user.role)}）
          </span>
          <LogoutButton />
        </div>
      </header>
      <Breadcrumbs />
      <div className="flex flex-1 flex-col">
        <div className="px-6 pt-4">
          <BackLink />
        </div>
        {children}
      </div>
    </div>
  );
}
