import { getAuthenticatedUser } from "./auth";
import { DataTransfer } from "./components/DataTransfer";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach((entry) => search.append(key, entry));
    else if (value !== undefined) search.set(key, value);
  }
  const callbackQuery = search.size ? `?${search.toString()}` : "";

  return (
    <main className="planner-shell">
      <header className="planner-header">
        <div className="planner-brand">
          <span className="planner-mark">✳</span>
          <span>Meu Ritmo</span>
        </div>
        <div className="planner-account">
          <div className="planner-user" title={user.email}>
            <span className="planner-greeting">{user.displayName}</span>
            <span className="planner-user-email">{user.email}</span>
          </div>
          <DataTransfer />
          <a href="/api/auth/signout" className="planner-signout" title="Sair da conta Google neste site">
            Sair da conta
          </a>
        </div>
      </header>
      <iframe
        className="planner-frame"
        src={`/planner/index.html${callbackQuery}`}
        title="Meu Ritmo — rotina e planejamento"
      />
    </main>
  );
}
