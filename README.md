# Rotina Med

Painel estático para planejamento do internato da 47ª turma, 1º ano, Grupo 01.

## Estrutura

- `dist/index.html`: estrutura global, navegação e pontos de montagem das telas.
- `dist/views/`: uma tela por arquivo (`dashboard`, `tasks`, `calendar` e `rotations`).
- `dist/components/`: diálogos reutilizados para atividades e lembretes.
- `dist/assets/styles/`: estilos separados por tema, layout, componentes, telas e responsividade.
- `dist/assets/scripts/bootstrap.js`: carrega telas e diálogos.
- `dist/assets/scripts/app.js`: navegação, tarefas, calendário e interações do painel.
- `dist/assets/scripts/data.js`: cronograma de rodízios e atividades iniciais.
- `dist/assets/scripts/profile.js`: personalização local do perfil.
- `dist/assets/scripts/spotify.js`: autorização Spotify PKCE e faixa atual.

O Site é privado e usa o acesso da conta ChatGPT para autenticar visitantes. O cartão de perfil permite personalizar nome, foto e capa; esses dados, tarefas, lembretes e tema ficam neste navegador.

## Integrações

- **Login:** o acesso privado exige autenticação da conta ChatGPT na plataforma Sites. O link “Sair da conta” encerra essa sessão.
- **Spotify:** em “Conectar Spotify”, informe o Client ID do app criado no Spotify for Developers e cadastre o Redirect URI mostrado pelo painel. A autorização solicita apenas a leitura da faixa atual. O player pode ser minimizado.
- **ChatGPT:** o atalho abre o ChatGPT em outra aba. O site não acessa conversas nem sincroniza o histórico da conta; isso exige uma integração/API autorizada separadamente.
- **Perfil:** nome, foto e imagem de fundo são salvos localmente neste dispositivo.
