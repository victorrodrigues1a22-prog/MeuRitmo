const API_URL = "/api/planner";
const OWNER_KEY = "rotinamed.ownerUserId";
const LOCAL_KEYS = {
  tasks: "rotinamed.tasks",
  studied: "rotinamed.studied",
  notices: "rotinamed.notices",
  profile: "rotinamed.profile",
  theme: "rotinamed.theme",
};

let plannerData = {};
let syncing = Promise.resolve();
let syncStatus;

function readLocalData() {
  const data = {};
  for (const [field, key] of Object.entries(LOCAL_KEYS)) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try {
      data[field] = JSON.parse(raw);
    } catch {
      // Preserve the original local value if it cannot be parsed here.
    }
  }
  return data;
}

function writeLocalData(data) {
  for (const [field, key] of Object.entries(LOCAL_KEYS)) {
    if (Object.hasOwn(data, field)) localStorage.setItem(key, JSON.stringify(data[field]));
    else localStorage.removeItem(key);
  }
}

async function shrinkLegacyProfile(profile) {
  if (!profile || typeof profile !== "object") return profile;
  const result = { ...profile };
  for (const key of ["photo", "cover"]) {
    const source = result[key];
    if (typeof source !== "string" || !source.startsWith("data:image/")) continue;
    result[key] = await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 640 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.68));
      };
      image.onerror = () => resolve(source);
      image.src = source;
    });
  }
  return result;
}

function setStatus(message, state = "ok") {
  if (!syncStatus) {
    syncStatus = document.createElement("span");
    syncStatus.id = "syncStatus";
    syncStatus.setAttribute("role", "status");
    syncStatus.className = "sync-status";
    document.querySelector(".top-actions")?.prepend(syncStatus);
  }
  syncStatus.textContent = message;
  syncStatus.dataset.state = state;
}

async function send(method, data) {
  const response = await fetch(API_URL, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || "Não foi possível salvar na sua conta.");
  }
}

export async function initializePlannerSync() {
  try {
    const response = await fetch(API_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível carregar os dados da sua conta.");
    const { userId, data } = await response.json();
    const previousUserId = localStorage.getItem(OWNER_KEY);
    if (data) {
      plannerData = data;
      writeLocalData(data);
    } else if (!previousUserId || previousUserId === userId) {
      plannerData = readLocalData();
      if (plannerData.profile) plannerData.profile = await shrinkLegacyProfile(plannerData.profile);
      if (Object.keys(plannerData).length) await send("PUT", plannerData);
      writeLocalData(plannerData);
    } else {
      plannerData = {};
      writeLocalData(plannerData);
    }
    localStorage.setItem(OWNER_KEY, userId);
    setStatus("Dados da conta carregados");
  } catch (error) {
    plannerData = readLocalData();
    setStatus(error.message || "Sincronização indisponível", "error");
  }
}

export function persistPlannerPatch(patch) {
  plannerData = { ...plannerData, ...patch };
  writeLocalData(plannerData);
  const snapshot = { ...plannerData };
  syncing = syncing.then(async () => {
    await send("PATCH", snapshot);
    setStatus("Alterações salvas na conta");
  }).catch((error) => {
    setStatus(error.message || "Falha ao sincronizar. Os dados continuam neste dispositivo.", "error");
  });
}

const PHOTO_IMPORT_TOKEN = "estudos-fotos-import-2026-11";
const photoStudyEntries = [
  ["Ultrassonografia em Obstetrícia", "Bloco 1"],
  ["Modificações do Organismo Materno", "Bloco 1"],
  ["Assistência ao Pré-Natal", "Bloco 1"],
  ["Assistência ao Parto", "Bloco 4"],
  ["Infecções e Gravidez", "Bloco 7"],
  ["Rotura Prematura de Membranas", "Bloco 7"],
  ["Gestação Ectópica", "Bloco 8"],
  ["Doença Trofoblástica Gestacional", "Bloco 8"],
  ["Abortamento", "Bloco 8"],
  ["Descolamento Prematuro de Placenta", "Bloco 9"],
  ["Placenta Prévia", "Bloco 9"],
  ["Outros sangramentos da segunda metade da gestação", "Bloco 9"],
  ["Síndromes Hipertensivas na Gestação", "Bloco 10"],
  ["Diabetes na Gestação", "Bloco 11"],
  ["Restrição de Crescimento Fetal", "Bloco 13"],
  ["Avaliação da Vitalidade Fetal", "Bloco 13"],
  ["Trabalho de Parto Prematuro", "Bloco 16"],
  ["Colo Curto e Incompetência Istmocervical", "Bloco 16"],
  ["Hemorragia Pós-Parto", "Bloco 17"],
  ["Puerpério", "Bloco 17"],
  ["Pneumonia: adquirida na comunidade", "Semana 1 · 05–11/10"],
  ["Derrame pleural", "Semana 1 · 05–11/10"],
  ["Tuberculose: clínica e diagnóstico", "Semana 2 · 12–18/10"],
  ["Asma", "Semana 2 · 12–18/10"],
  ["Doença Pulmonar Obstrutiva Crônica (DPOC)", "Semana 2 · 12–18/10"],
  ["Tuberculose: tratamento", "Semana 3 · 19–25/10"],
  ["Tromboembolismo Pulmonar", "Semana 3 · 19–25/10"],
  ["HIV e Doenças Oportunistas", "Semana 4 · 26/10–01/11"],
  ["Síndrome de Guillain-Barré", "Semana 4 · 26/10–01/11"],
];

export function importSubjectsFromPhotosIfRequested() {
  const url = new URL(window.location.href);
  if (url.searchParams.get("import-study-photos") !== PHOTO_IMPORT_TOKEN) return;
  const userId = localStorage.getItem(OWNER_KEY);
  if (!userId) return;
  const marker = `rotinamed.photo-import.${userId}`;
  if (localStorage.getItem(marker) === "done") return;
  const existing = Array.isArray(plannerData.studied) ? plannerData.studied : [];
  const known = new Set(existing.map((entry) => String(entry.subject || "").toLocaleLowerCase("pt-BR")));
  const additions = photoStudyEntries
    .filter(([subject]) => !known.has(subject.toLocaleLowerCase("pt-BR")))
    .map(([subject, reference]) => ({ id: crypto.randomUUID(), subject, reference, date: "" }));
  const studied = [...existing, ...additions];
  localStorage.setItem(marker, "done");
  persistPlannerPatch({ studied });
  url.searchParams.delete("import-study-photos");
  history.replaceState({}, "", url.pathname + url.search + url.hash);
}

window.addEventListener("online", () => {
  if (Object.keys(plannerData).length) persistPlannerPatch(plannerData);
});
