# Meu Ritmo

Planner de estudos e internato com login do ChatGPT e dados persistidos por conta.

## Desenvolvimento local

Requer Node.js 22.13 ou mais recente.

```sh
npm run dev
```

No modo local, o starter oferece uma conta simulada de desenvolvimento em `/signin-with-chatgpt?return_to=/`.

## Dados e segurança

- A página principal exige login com ChatGPT e usa o fluxo de autenticação hospedado pelo Sites.
- Tarefas, lembretes, perfil e tema são salvos no D1, associados ao identificador estável daquela conta neste Site.
- As rotas de leitura e gravação conferem a identidade em cada solicitação; o navegador não escolhe o identificador da conta.
- Na primeira entrada após a atualização, dados existentes no `localStorage` são importados para a conta conectada. Ao trocar de conta, o cache local anterior não é importado para a outra conta.
- Preferências e tokens de acesso do Spotify continuam locais ao navegador; tokens não são enviados ao servidor.
- A interface permanece modular em `public/planner/views`, `public/planner/components`, `public/planner/assets/scripts` e `public/planner/assets/styles`.

## Persistência local

O Site usa D1 com a tabela `planner_data`. O esquema fica em `db/schema.ts`, com migrações em `drizzle/`.

Para gerar uma nova migração depois de mudar o esquema:

```sh
npm run db:generate
```

O deploy do Sites aplica as migrações hospedadas antes de publicar o Worker.
