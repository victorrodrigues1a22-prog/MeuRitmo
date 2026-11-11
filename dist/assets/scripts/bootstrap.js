const screenNames = ["dashboard", "tasks", "calendar", "rotations"];

const [screens, taskDialog, noticeDialog] = await Promise.all([
  Promise.all(
    screenNames.map(async (name) => {
      const response = await fetch(`./views/${name}.html`);
      if (!response.ok) throw new Error(`Falha ao carregar a tela ${name}`);
      return response.text();
    }),
  ),
  fetch("./components/task-dialog.html").then((response) => response.text()),
  fetch("./components/notice-dialog.html").then((response) => response.text()),
]);

document.querySelector("#screens").innerHTML = screens.join("");
document.querySelector("#dialogs").innerHTML = taskDialog + noticeDialog;

await import("./app.js");
