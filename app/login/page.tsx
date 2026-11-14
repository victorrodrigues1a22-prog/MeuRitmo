import { getAuthenticatedUser } from "../auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const errorMessages: Record<string, string> = {
  google_not_configured: "O login Google ainda não foi configurado no servidor.",
  google_cancelled: "O login foi cancelado. Você pode tentar novamente.",
  google_invalid_state: "A validação do login expirou. Tente novamente.",
  google_token_failed: "O Google não concluiu a autorização. Tente novamente.",
  google_profile_failed: "Não foi possível confirmar sua conta Google.",
  google_connection_failed: "Não foi possível conectar ao Google. Tente novamente.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getAuthenticatedUser();
  if (user) redirect("/");
  const isDevelopment = process.env.NODE_ENV !== "production";
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const params = await searchParams;
  const errorCode = typeof params.error === "string" ? params.error : "";
  const errorMessage = errorMessages[errorCode];

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-mark" aria-hidden="true">✳</div>
        <p className="login-eyebrow">SEU ESPAÇO DE ESTUDO</p>
        <h1 id="login-title">Entre no seu ritmo.</h1>
        <p className="login-description">
          Entre com sua conta Google para acessar suas tarefas, seu calendário e seus dados salvos em qualquer dispositivo.
        </p>
        {errorMessage ? (
          <p className="login-error" role="alert">{errorMessage}</p>
        ) : !googleConfigured ? (
          <p className="login-error" role="status">
            {isDevelopment
              ? "O Google ainda não foi configurado nesta cópia. Use a conta demonstrativa ou configure as credenciais no arquivo .env."
              : "O login Google ainda não foi configurado no servidor. Adicione GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nas variáveis de ambiente."}
          </p>
        ) : null}
        {googleConfigured && (
          <a className="login-button" href="/api/auth/google">
            <span aria-hidden="true">G</span>
            Entrar com Google
          </a>
        )}
        {googleConfigured && (
          <p className="login-account-help">
            Use a mesma conta Google em todos os seus dispositivos para manter seus dados sincronizados.
          </p>
        )}
        <p className="login-footnote">Seus dados de planejamento ficam separados por conta.</p>
        {isDevelopment && (
          <a className={googleConfigured ? "login-dev-link" : "login-button"} href="/api/auth/dev-login">
            {googleConfigured ? "Entrar com conta local de demonstração" : "Entrar com conta de demonstração"}
          </a>
        )}
      </section>
      <footer className="login-footer">Meu Ritmo · rotina e planejamento</footer>
    </main>
  );
}
