import { chatGPTSignOutPath, requireChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const user = await requireChatGPTUser("/");
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
          <span className="planner-greeting">{user.displayName}</span>
          <a href={chatGPTSignOutPath("/")} target="_top" className="planner-signout">
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
