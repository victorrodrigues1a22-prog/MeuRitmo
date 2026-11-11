const CLIENT_KEY = "rotinamed.spotify.clientId";
const ACCESS_KEY = "rotinamed.spotify.accessToken";
const EXPIRY_KEY = "rotinamed.spotify.expiresAt";
const REFRESH_KEY = "rotinamed.spotify.refreshToken";
const REDIRECT_URI = window.location.origin + window.location.pathname;

const $ = (selector) => document.querySelector(selector);
const setStatus = (message) => { $("#spotifyStatus").textContent = message; };
const setTrackText = (title, artist = "") => {
  $("#spotifyTrack").textContent = title;
  $("#spotifyArtist").textContent = artist;
};
const clearToken = () => {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(EXPIRY_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
};
const clearOAuthAttempt = () => {
  sessionStorage.removeItem("rotinamed.spotify.verifier");
  sessionStorage.removeItem("rotinamed.spotify.state");
};

function cleanCallbackUrl() {
  const callback = new URL(window.location.href);
  ["code", "state", "error", "error_description"].forEach((key) => callback.searchParams.delete(key));
  history.replaceState({}, "", callback.pathname + callback.search + callback.hash);
}

function restoreConnectionPage(error) {
  clearToken();
  clearOAuthAttempt();
  cleanCallbackUrl();
  const dialog = $("#spotifyConfigDialog");
  if (dialog.open) dialog.close();
  setTrackText("Conexão não concluída", "Você pode tentar novamente");
  const detail = error?.message || "O Spotify não concluiu a conexão.";
  setStatus(`${detail} Confira a configuração ou tente novamente.`);
  $("#spotifyConnect").textContent = localStorage.getItem(CLIENT_KEY) ? "Tentar novamente" : "Conectar Spotify";
  $("#spotifyConnect").hidden = false;
}

function base64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

function openSetup() {
  $("#spotifyClientId").value = localStorage.getItem(CLIENT_KEY) || "";
  $("#spotifyRedirectUri").textContent = REDIRECT_URI;
  $("#spotifyCopyStatus").textContent = "";
  $("#spotifyConfigDialog").showModal();
}

async function authorize() {
  const clientId = localStorage.getItem(CLIENT_KEY);
  if (!clientId) {
    openSetup();
    return;
  }
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(64)));
  const state = base64Url(crypto.getRandomValues(new Uint8Array(24)));
  setStatus("Abrindo o Spotify para autorizar a conexão…");
  sessionStorage.setItem("rotinamed.spotify.verifier", verifier);
  sessionStorage.setItem("rotinamed.spotify.state", state);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: "user-read-currently-playing",
    state,
    code_challenge_method: "S256",
    code_challenge: await sha256(verifier),
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
}

async function completeAuthorization() {
  const query = new URLSearchParams(window.location.search);
  const code = query.get("code");
  if (query.get("error")) {
    throw new Error(query.get("error_description") || "A autorização foi cancelada.");
  }
  if (!code) return;
  const expectedState = sessionStorage.getItem("rotinamed.spotify.state");
  const returnedState = query.get("state");
  const verifier = sessionStorage.getItem("rotinamed.spotify.verifier");
  clearOAuthAttempt();
  cleanCallbackUrl();
  if (!expectedState || expectedState !== returnedState || !verifier) {
    throw new Error("A validação de segurança do Spotify falhou. Tente conectar novamente.");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: localStorage.getItem(CLIENT_KEY) || "",
    code_verifier: verifier,
  });
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error("O Spotify não autorizou a conexão. Confira o Client ID e o Redirect URI.");
  sessionStorage.setItem(ACCESS_KEY, result.access_token);
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + result.expires_in * 1000));
  if (result.refresh_token) sessionStorage.setItem(REFRESH_KEY, result.refresh_token);
}

async function refreshAccessToken() {
  const refreshToken = sessionStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: localStorage.getItem(CLIENT_KEY) || "",
  });
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) return false;
  sessionStorage.setItem(ACCESS_KEY, result.access_token);
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + result.expires_in * 1000));
  if (result.refresh_token) sessionStorage.setItem(REFRESH_KEY, result.refresh_token);
  return true;
}

async function loadCurrentTrack() {
  let token = sessionStorage.getItem(ACCESS_KEY);
  const expiry = Number(sessionStorage.getItem(EXPIRY_KEY) || 0);
  if (token && expiry <= Date.now()) {
    try {
      if (await refreshAccessToken()) token = sessionStorage.getItem(ACCESS_KEY);
    } catch {
      token = null;
    }
  }
  if (!token) {
    clearToken();
    setTrackText("Conecte sua conta", "Seu Spotify fica aqui");
    setStatus("A autorização acontece com o Spotify.");
    $("#spotifyConnect").textContent = localStorage.getItem(CLIENT_KEY) ? "Tentar novamente" : "Conectar Spotify";
    $("#spotifyConnect").hidden = false;
    return;
  }

  $("#spotifyConnect").hidden = true;
  try {
    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 204) {
      setTrackText("Nada tocando agora", "Abra o Spotify para começar");
      setStatus("Atualizando automaticamente enquanto conectado.");
      $("#spotifyCover").style.backgroundImage = "";
      $("#spotifyOpen").href = "https://open.spotify.com/";
      return;
    }
    if (response.status === 401) {
      clearToken();
      setTrackText("Reconecte o Spotify", "A sessão de reprodução expirou");
      setStatus("Conecte novamente para continuar.");
      $("#spotifyConnect").textContent = "Conectar novamente";
      $("#spotifyConnect").hidden = false;
      return;
    }
    if (!response.ok) throw new Error(response.status === 403 ? "Permissão de reprodução não concedida." : "Não foi possível ler a reprodução agora.");
    const playback = await response.json();
    const item = playback.item;
    if (!item) {
      setTrackText("Nada tocando agora", "Abra o Spotify para começar");
      return;
    }
    setTrackText(item.name || "Faixa em reprodução", (item.artists || []).map((artist) => artist.name).join(", "));
    const cover = item.album?.images?.[0]?.url;
    $("#spotifyCover").style.backgroundImage = cover ? `url("${cover}")` : "";
    const url = item.external_urls?.spotify;
    $("#spotifyOpen").href = url?.startsWith("https://open.spotify.com/") ? url : "https://open.spotify.com/";
    setStatus(playback.is_playing ? "Reproduzindo agora" : "Pausada no Spotify");
  } catch (error) {
    setStatus(error.message || "Falha ao consultar o Spotify.");
    $("#spotifyConnect").textContent = "Tentar novamente";
    $("#spotifyConnect").hidden = false;
  }
}

async function retryOrAuthorize() {
  if (sessionStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(REFRESH_KEY)) {
    await loadCurrentTrack();
    return;
  }
  await authorize();
}

export function initSpotify() {
  const widget = $("#spotifyWidget");
  const wasMinimized = localStorage.getItem("rotinamed.spotify.minimized") === "true";
  if (wasMinimized) widget.classList.add("is-minimized");
  $("#spotifyMinimize").textContent = wasMinimized ? "+" : "−";
  $("#spotifyRedirectUri").textContent = REDIRECT_URI;
  $("#spotifyConnect").addEventListener("click", () => {
    retryOrAuthorize().catch(restoreConnectionPage);
  });
  $("#spotifySettings").addEventListener("click", openSetup);
  $("[data-close-spotify-config]").addEventListener("click", () => $("#spotifyConfigDialog").close());
  $("#copySpotifyRedirect").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(REDIRECT_URI);
      $("#spotifyCopyStatus").textContent = "Endereço copiado.";
    } catch {
      $("#spotifyCopyStatus").textContent = "Selecione o endereço acima e copie manualmente.";
    }
  });
  $("#spotifyMinimize").addEventListener("click", () => {
    const minimized = widget.classList.toggle("is-minimized");
    localStorage.setItem("rotinamed.spotify.minimized", String(minimized));
    $("#spotifyMinimize").textContent = minimized ? "＋" : "−";
    $("#spotifyMinimize").setAttribute("aria-label", minimized ? "Expandir player" : "Minimizar player");
  });
  $("#spotifyConfigForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const clientId = $("#spotifyClientId").value.trim();
    if (!clientId) return;
    localStorage.setItem(CLIENT_KEY, clientId);
    $("#spotifyConfigDialog").close();
    try {
      await authorize();
    } catch (error) {
      restoreConnectionPage(error);
    }
  });
  completeAuthorization().then(loadCurrentTrack).catch(restoreConnectionPage);
  window.setInterval(loadCurrentTrack, 30000);
}
