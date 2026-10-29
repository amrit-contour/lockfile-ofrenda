const ledgerEl = document.querySelector("#ledger");
const slipEl = document.querySelector("#slip");
const metaEl = document.querySelector("#scan-meta");
const dropEl = document.querySelector("#drop");
const fileEl = document.querySelector("#file");
const sampleBtn = document.querySelector("#sample");

let scan = null;
let filter = "ghosts";
let selected = null;
const snuffed = new Set();

function reasonLabel(reason) {
  return {
    unpublished: "unpublished",
    deprecated: "deprecated",
    silent: "quiet ≥ 2y",
    "no-maintainers": "no maintainers",
  }[reason];
}

function visibleOfferings() {
  if (!scan) return [];
  return scan.offerings.filter((o) => {
    if (snuffed.has(`${o.name}@${o.lockedVersion}`)) return false;
    if (filter === "ghosts") return o.isGhost;
    if (filter === "direct") return o.isDirect;
    return true;
  });
}

function renderLedger() {
  const rows = visibleOfferings();
  if (!scan) {
    ledgerEl.innerHTML = `<p class="empty">Nothing on the altar yet.</p>`;
    return;
  }
  if (!rows.length) {
    ledgerEl.innerHTML = `<p class="empty">No offerings match this filter. Try All, or light a snuffed candle from the slip.</p>`;
    return;
  }
  ledgerEl.replaceChildren(
    ...rows.map((o) => {
      const id = `${o.name}@${o.lockedVersion}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "offering";
      if (selected && selected.name === o.name && selected.lockedVersion === o.lockedVersion) {
        btn.classList.add("is-on");
      }
      btn.innerHTML = `
        <span class="flame" aria-hidden="true"></span>
        <span>
          <span class="name">${escapeHtml(o.name)}</span>
          <span class="sub">${escapeHtml(o.lockedVersion)}${o.isDirect ? " · direct" : " · nested"}</span>
        </span>
        <span class="marks">
          ${o.reasons
            .map(
              (r) =>
                `<span class="mark${r === "unpublished" || r === "deprecated" ? " danger" : ""}">${reasonLabel(r)}</span>`,
            )
            .join("")}
        </span>
      `;
      btn.addEventListener("click", () => selectOffering(o));
      btn.dataset.id = id;
      return btn;
    }),
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function factsBlock(o) {
  const lines = [
    `locked ${o.lockedVersion}`,
    o.latestVersion ? `latest ${o.latestVersion}` : "latest unknown",
    o.lastPublish ? `last publish ${o.lastPublish}` : "no publish time",
    o.maintainers.length ? `maintainers ${o.maintainers.join(", ")}` : "maintainers empty",
  ];
  if (o.unpublished) lines.push("registry 404");
  return lines.join(" · ");
}

async function selectOffering(o) {
  selected = o;
  renderLedger();
  slipEl.innerHTML = `
    <h2>${escapeHtml(o.name)}</h2>
    <p class="facts">${escapeHtml(factsBlock(o))}</p>
    <p class="body">The clerk is copying the record…</p>
    <div class="status-skel"></div>
    <div class="status-skel" style="width:70%"></div>
  `;
  try {
    const res = await fetch("/api/eulogy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(o),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "eulogy failed");
    const source =
      data.source === "gemma"
        ? `Spoken by ${escapeHtml(data.model)}, then checked against the record.`
        : `Gemma was silent or wandered. This is the registry record, copied.`;
    slipEl.innerHTML = `
      <h2>${escapeHtml(o.name)}</h2>
      <p class="facts">${escapeHtml(factsBlock(o))}</p>
      <p class="body">${escapeHtml(data.text)}</p>
      <p class="source">${source}</p>
      <div class="slip-actions">
        <button type="button" class="ghost" id="snuff">Snuff this candle</button>
      </div>
    `;
    document.querySelector("#snuff")?.addEventListener("click", () => {
      snuffed.add(`${o.name}@${o.lockedVersion}`);
      selected = null;
      renderLedger();
      slipEl.innerHTML = `
        <h2>Snuffed</h2>
        <p class="body">${escapeHtml(o.name)} is off the altar for this session. The model will not speak of it.</p>
      `;
    });
  } catch (error) {
    slipEl.innerHTML = `
      <h2>${escapeHtml(o.name)}</h2>
      <p class="body">${escapeHtml(error.message)}</p>
    `;
  }
}

function toast(message) {
  const el = document.createElement("div");
  el.className = "banner";
  el.setAttribute("role", "status");
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 4200);
}

async function runScan(payload) {
  metaEl.textContent = "Asking the registry…";
  ledgerEl.innerHTML = `<p class="empty">Lighting the altar…</p>`;
  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "scan failed");
  scan = data;
  selected = null;
  snuffed.clear();
  metaEl.textContent = `${data.projectName || "unnamed"} · ${data.packageCount} packages · ${data.ghostCount} quiet`;
  renderLedger();
}

async function runSample() {
  metaEl.textContent = "Loading demo lockfile…";
  const res = await fetch("/api/sample");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "sample failed");
  scan = data;
  selected = null;
  snuffed.clear();
  metaEl.textContent = `demo · ${data.packageCount} packages · ${data.ghostCount} quiet`;
  renderLedger();
}

fileEl.addEventListener("change", async () => {
  const file = fileEl.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    await runScan({ text });
  } catch (error) {
    toast(error.message);
  }
});

sampleBtn.addEventListener("click", async () => {
  try {
    await runSample();
  } catch (error) {
    toast(error.message);
  }
});

dropEl.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropEl.classList.add("is-hot");
});
dropEl.addEventListener("dragleave", () => dropEl.classList.remove("is-hot"));
dropEl.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropEl.classList.remove("is-hot");
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  try {
    await runScan({ text: await file.text() });
  } catch (error) {
    toast(error.message);
  }
});

for (const btn of document.querySelectorAll("[data-filter]")) {
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    for (const other of document.querySelectorAll("[data-filter]")) {
      const on = other === btn;
      other.setAttribute("aria-pressed", String(on));
      other.classList.toggle("ghost", !on);
    }
    renderLedger();
  });
}

renderLedger();
