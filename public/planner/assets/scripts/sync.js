const API_URL = "/api/planner";
const OWNER_KEY = "rotinamed.ownerUserId";
const LOCAL_KEYS = {
  tasks: "rotinamed.tasks",
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

window.addEventListener("online", () => {
  if (Object.keys(plannerData).length) persistPlannerPatch(plannerData);
});
