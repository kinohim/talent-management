import Link from "next/link";

import { auth, signOut } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <p className="text-zinc-600 dark:text-zinc-400">
        業務経歴書アプリ — 準備中
      </p>
      {session?.user ? (
        <div className="flex flex-col items-center gap-2 text-sm">
          <p>
            ログイン中: {session.user.name}({session.user.employeeId} /{" "}
            {session.user.role})
          </p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="underline">
              ログアウト
            </button>
          </form>
        </div>
      ) : (
        <Link href="/api/auth/signin" className="underline">
          ログイン(開発用)
        </Link>
      )}
    </main>
  );
}
