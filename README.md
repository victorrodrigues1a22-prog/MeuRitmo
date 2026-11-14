# Meu Ritmo

Planner de estudos e internato com login Google e sincronização dos dados por conta.

## Requisitos

- Node.js 22.13 ou mais recente
- PostgreSQL persistente para produção no Render (opcional para a demonstração local)
- Aplicativo OAuth do tipo **Web application** no Google Cloud Console

## Rodar no VS Code

1. Instale as dependências com `npm ci`.
2. Copie `.env.example` para `.env`.
3. Execute `npm run dev` e abra `http://localhost:5173`. Sem `DATABASE_URL`, o modo de demonstração salva os dados apenas neste navegador.

Para testar a sincronização local entre navegadores, configure uma instância PostgreSQL em `DATABASE_URL` e execute `npm run db:migrate` antes de iniciar o site.

No modo local, a tela de entrada oferece uma conta de demonstração. O login Google também funciona localmente quando o callback `http://localhost:5173/api/auth/callback/google` estiver cadastrado no Google Cloud e as duas variáveis `GOOGLE_CLIENT_*` estiverem preenchidas.

## Publicar no Render

O `render.yaml` configura um Web Service Node.js. Antes de publicar:

Para subir o código ao GitHub, crie um repositório vazio e execute na pasta do projeto:

```sh
git add .
git commit -m "Prepare Meu Ritmo for Render"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

Não envie `.env`: ele está ignorado pelo Git. O arquivo `.env.example` contém apenas nomes e exemplos de configuração.

1. Crie um PostgreSQL persistente no Render; mantenha o banco e o Web Service na mesma região.
2. Envie este repositório ao GitHub e conecte-o ao Render como Blueprint. Informe a URL interna do banco como `DATABASE_URL` quando o Render solicitar a variável.
3. Após o Render informar o domínio do serviço, crie uma credencial OAuth do Google do tipo **Web application**.
4. No Google Cloud, adicione como **Authorized redirect URI** o endereço do serviço seguido de `/api/auth/callback/google`. Exemplo: `https://seu-servico.onrender.com/api/auth/callback/google`.
5. Cadastre `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` nas variáveis de ambiente do Web Service no Render e faça novo deploy.
6. O Render gera `AUTH_SECRET` pelo Blueprint. Mantenha-o privado e não o troque depois da publicação, pois ele valida as sessões existentes.

Se usar um domínio próprio, defina também `APP_URL` com o endereço público e adicione o callback correspondente no Google Cloud. O valor deve ser a origem do domínio, sem caminho, por exemplo `https://estudos.seudominio.com`.

O serviço executa `npm ci && npm run build` e inicia com `npm start`. A migração da tabela é aplicada na inicialização; o endpoint `/api/health` verifica o banco. O endereço OAuth deve corresponder exatamente ao endereço público do serviço.

## Levar dados do site antigo

Os dados que estão no D1 do Site antigo não são copiados automaticamente para o PostgreSQL. A versão antiga continua disponível para exportar os dados por conta:

1. Entre no site antigo com a conta ChatGPT que possui os dados.
2. Abra o Console do navegador nessa página e execute:

```js
fetch("/api/planner")
  .then(async (response) => {
    if (!response.ok) throw new Error("Entre no site antigo antes de exportar.");
    return response.json();
  })
  .then(({ data }) => {
    const file = new Blob([JSON.stringify({ version: 1, data }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "meu-ritmo-backup.json";
    link.click();
    URL.revokeObjectURL(link.href);
  });
```

3. Entre no novo site com a conta Google que deve receber os dados.
4. Abra **Dados → Importar backup** e selecione o JSON. A importação substitui os dados da conta atual após confirmação.

O site também oferece **Dados → Baixar backup** para exportar os dados atuais. Os arquivos de backup podem conter tarefas e informações pessoais; guarde-os em local privado.

## Login e dados

- O login do Render usa Google OAuth com PKCE, validação de `state` e sessão assinada em cookie `HttpOnly`, `Secure` em produção e `SameSite=Lax`.
- O identificador Google estável separa os registros de cada conta; o cliente nunca escolhe o ID gravado pelo servidor.
- `DATABASE_URL`, `GOOGLE_CLIENT_SECRET` e `AUTH_SECRET` são variáveis privadas. Não coloque valores reais no GitHub.
- Tarefas, assuntos estudados, lembretes, perfil e tema ficam no PostgreSQL. Tokens do Spotify permanecem no navegador e não são enviados ao servidor.
- A conta local de demonstração só está disponível fora de produção e não é uma conta Google.

## Estrutura

- `app/`: páginas, OAuth e API autenticada
- `db/`: conexão PostgreSQL
- `public/planner/`: telas e módulos do planner
- `scripts/`: inicialização e migração do banco
- `render.yaml`: configuração do Web Service no Render
