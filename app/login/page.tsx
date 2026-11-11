import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getChatGPTUser();
  if (user) redirect("/");

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-mark" aria-hidden="true">✳</div>
        <p className="login-eyebrow">SEU ESPAÇO DE ESTUDO</p>
        <h1 id="login-title">Entre no seu ritmo.</h1>
        <p className="login-description">
          Entre com sua conta ChatGPT para acessar suas tarefas, seu calendário e os dados salvos da sua conta.
        </p>
        <a className="login-button" href={chatGPTSignInPath("/")} target="_top">
          <span aria-hidden="true">↗</span>
          Entrar com ChatGPT
        </a>
        <p className="login-footnote">Seus dados de planejamento ficam separados por conta.</p>
      </section>
      <footer className="login-footer">Meu Ritmo · rotina e planejamento</footer>
    </main>
  );
}
