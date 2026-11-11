const PROFILE_KEY = "rotinamed.profile";
const DEFAULT_NAME = "Meu perfil";
import { persistPlannerPatch } from "./sync.js";

const readProfile = () => {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") || {};
  } catch {
    return {};
  }
};

function readImage(file) {
  if (!file) return Promise.resolve(null);
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Cada imagem precisa ter até 5 MB.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const image = new Image();
        image.onload = () => {
          const scale = Math.min(1, 640 / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/webp", 0.72));
        };
        image.onerror = () => reject(new Error("Não foi possível processar a imagem."));
        image.src = String(reader.result);
      } catch (error) { reject(error); }
    };
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function applyProfile(profile) {
  const name = profile.name?.trim() || DEFAULT_NAME;
  const nameNode = document.querySelector("#profileName");
  const avatar = document.querySelector("#profileAvatar");
  const card = document.querySelector("#openProfile");
  if (nameNode) nameNode.textContent = name;
  if (avatar) {
    avatar.textContent = profile.photo ? "" : "◉";
    avatar.style.backgroundImage = profile.photo ? `url("${profile.photo}")` : "";
    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";
    avatar.setAttribute("aria-label", profile.photo ? `Foto de ${name}` : "Foto de perfil não definida");
  }
  if (card) {
    card.classList.toggle("has-cover", Boolean(profile.cover));
    card.style.backgroundImage = profile.cover
      ? `linear-gradient(90deg,rgba(15,26,20,.68),rgba(15,26,20,.18)),url("${profile.cover}")`
      : "";
    card.style.backgroundSize = "cover";
    card.style.backgroundPosition = "center";
  }
  const greeting = document.querySelector("#welcomeHeading");
  if (greeting) greeting.textContent = `Oi, ${name.split(/\s+/)[0]}! Como está sua semana?`;
}

export function initProfile() {
  const dialog = document.querySelector("#profileDialog");
  const form = document.querySelector("#profileForm");
  const nameInput = document.querySelector("#profileNameInput");
  const photoInput = document.querySelector("#profilePhotoInput");
  const coverInput = document.querySelector("#profileBackgroundInput");
  const photoLabel = document.querySelector("#profilePhotoName");
  const coverLabel = document.querySelector("#profileBackgroundName");
  let profile = readProfile();

  applyProfile(profile);
  document.querySelector("#openProfile").addEventListener("click", () => {
    nameInput.value = profile.name || DEFAULT_NAME;
    photoInput.value = "";
    coverInput.value = "";
    photoLabel.textContent = "Nenhum arquivo selecionado";
    coverLabel.textContent = "Nenhum arquivo selecionado";
    dialog.showModal();
  });
  document.querySelector("[data-close-profile]").addEventListener("click", () => dialog.close());
  photoInput.addEventListener("change", () => { photoLabel.textContent = photoInput.files[0]?.name || "Nenhum arquivo selecionado"; });
  coverInput.addEventListener("change", () => { coverLabel.textContent = coverInput.files[0]?.name || "Nenhum arquivo selecionado"; });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      profile = {
        name: nameInput.value.trim() || DEFAULT_NAME,
        photo: (await readImage(photoInput.files[0])) || profile.photo || "",
        cover: (await readImage(coverInput.files[0])) || profile.cover || "",
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      persistPlannerPatch({ profile });
      applyProfile(profile);
      dialog.close();
    } catch (error) {
      alert(error.message || "Não foi possível salvar seu perfil.");
    }
  });

  document.querySelector("#resetProfile").addEventListener("click", () => {
    profile = {};
    localStorage.removeItem(PROFILE_KEY);
    persistPlannerPatch({ profile: {} });
    nameInput.value = DEFAULT_NAME;
    photoInput.value = "";
    coverInput.value = "";
    photoLabel.textContent = "Nenhum arquivo selecionado";
    coverLabel.textContent = "Nenhum arquivo selecionado";
    applyProfile(profile);
  });
}
