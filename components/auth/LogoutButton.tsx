import { signOut } from "@/lib/auth";

export function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-primary px-3.5 py-1.5 text-brand hover:bg-primary/10"
      >
        ログアウト
      </button>
    </form>
  );
}
