"use client";

import { useRef, useState } from "react";

export function DataTransfer() {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function exportData() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/planner", { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível carregar os dados da conta.");
      const result = await response.json() as { data?: unknown; localOnly?: boolean };
      const data = result.localOnly ? readBrowserData() : result.data ?? {};
      const file = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `meu-ritmo-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Backup baixado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao baixar o backup.");
    } finally {
      setBusy(false);
    }
  }

  async function importData(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      if (file.size > 900_000) throw new Error("O arquivo excede o limite de 900 KB.");
      const parsed: unknown = JSON.parse(await file.text());
      const container = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
      const data = container && "data" in container ? container.data : parsed;
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Este arquivo não contém um backup válido.");
      if (!window.confirm("Importar este backup substituirá os dados atuais desta conta. Deseja continuar?")) return;
      const response = await fetch("/api/planner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; localOnly?: boolean };
      if (!response.ok) throw new Error(result.error || "Não foi possível importar o backup.");
      if (result.localOnly) writeBrowserData(data as Record<string, unknown>);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao importar o backup.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <details className="planner-transfer">
      <summary aria-label="Backup e migração de dados">Dados</summary>
      <div className="planner-transfer-menu">
        <button type="button" disabled={busy} onClick={exportData}>Baixar backup</button>
        <label>
          Importar backup
          <input ref={input} type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])} />
        </label>
        {message && <p role="status">{message}</p>}
      </div>
    </details>
  );
}

function readBrowserData() {
  const data: Record<string, unknown> = {};
  for (const [field, key] of Object.entries({
    tasks: "rotinamed.tasks",
    studied: "rotinamed.studied",
    notices: "rotinamed.notices",
    profile: "rotinamed.profile",
    theme: "rotinamed.theme",
  })) {
    const raw = localStorage.getItem(key);
    if (raw === null) continue;
    try { data[field] = JSON.parse(raw); } catch { /* ignora valores locais inválidos no backup */ }
  }
  return data;
}

function writeBrowserData(data: Record<string, unknown>) {
  const keys: Record<string, string> = {
    tasks: "rotinamed.tasks",
    studied: "rotinamed.studied",
    notices: "rotinamed.notices",
    profile: "rotinamed.profile",
    theme: "rotinamed.theme",
  };
  for (const [field, key] of Object.entries(keys)) {
    if (field in data) localStorage.setItem(key, JSON.stringify(data[field]));
    else localStorage.removeItem(key);
  }
}
