# Rotina Med

Painel estático para planejamento do internato da 47ª turma, 1º ano, Grupo 01.

## Estrutura

- `dist/index.html`: estrutura global, navegação e pontos de montagem das telas.
- `dist/views/`: uma tela por arquivo (`dashboard`, `tasks`, `calendar` e `rotations`).
- `dist/components/`: diálogos reutilizados para atividades e lembretes.
- `dist/assets/styles/`: estilos separados por tema, layout, componentes, telas e responsividade.
- `dist/assets/scripts/bootstrap.js`: carrega telas e diálogos.
- `dist/assets/scripts/app.js`: navegação e interações do painel.
- `dist/assets/scripts/data.js`: cronograma de rodízios e atividades iniciais.

O Site é servido como arquivos estáticos. Tarefas, lembretes e tema ficam no `localStorage` do navegador.
