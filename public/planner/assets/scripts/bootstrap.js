const screenNames = ["dashboard", "tasks", "calendar", "rotations"];

const [screens, taskDialog, noticeDialog, profileDialog, spotifyConfig, profileWidget, spotifyPlayer] = await Promise.all([
  Promise.all(
    screenNames.map(async (name) => {
      const response = await fetch(`./views/${name}.html`);
      if (!response.ok) throw new Error(`Falha ao carregar a tela ${name}`);
      return response.text();
    }),
  ),
  fetch("./components/task-dialog.html").then((response) => response.text()),
  fetch("./components/notice-dialog.html").then((response) => response.text()),
  fetch("./components/profile-dialog.html").then((response) => response.text()),
  fetch("./components/spotify-config.html").then((response) => response.text()),
  fetch("./components/profile-widget.html").then((response) => response.text()),
  fetch("./components/spotify-player.html").then((response) => response.text()),
]);

document.querySelector("#screens").innerHTML = screens.join("");
document.querySelector("#dialogs").innerHTML = taskDialog + noticeDialog + profileDialog + spotifyConfig;
document.querySelector("#widgets").innerHTML = profileWidget + spotifyPlayer;

const { initializePlannerSync, importSubjectsFromPhotosIfRequested } = await import("./sync.js");
await initializePlannerSync();
importSubjectsFromPhotosIfRequested();
await import("./app.js");
const [{ initProfile }, { initSpotify }] = await Promise.all([
  import("./profile.js"),
  import("./spotify.js"),
]);
initProfile();
initSpotify();
