let dictionaryData = {};
let currentLang = "vjosa";
let activeQuery = "";

document.addEventListener("DOMContentLoaded", async () => {
    await loadDictionary();
    setupLanguageSwitcher();
    setupSearchInput();
    filterAndRenderWords("");
});

async function loadDictionary() {
    try {
        const response = await fetch ("mikava.json");
        if (!response.ok) throw new Error("Could not load mikava.json");
        dictionaryData = await response.json();
    } catch (error) {
        console.error("Load error:", error);
        dictionaryData = {};
    }
}

function setupLanguageSwitcher() {
    const langButtons = document.querySelectorAll(".lang-btn");

    langButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            langButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentLang = btn.getAttribute("data-lang");

            const searchInput = document.getElementById("search-input");
            filterAndRenderWords(searchInput.value);
        });
    });
}

function setupSearchInput() {
    const searchInput = document.getElementById("search-input");

    searchInput.addEventListener("input", (e) => {
        activeQuery = e.target.value.trim().toLowerCase();
        filterAndRenderWords(activeQuery);
    });
}

function filterAndRenderWords(query) {
    const koGaje = document.getElementById("kogaje");
    const meta = document.getElementById("meta");
    koGaje.innerHTML = "";

    const matchingWords = [];

    for (const [key, entry] of Object.entries(dictionaryData)) {
        const entryObj = Array.isArray(entry) ? entry[0] : entry;
        if (!entryObj) continue;

        if (entryObj.kara && entryObj.kara !== currentLang) continue;

        const glavna = (entryObj.glavna || key).toLowerCase();
        const andr = entryObj.andr ? entryObj.andr.map(a => a.toLowerCase()) : [];
        const klani = entryObj.klani ? entryObj.klani.map(k => k.toLowerCase()) : [];

        if (!query || glavna.includes(query) || andr.some(a => a.includes(query)) || klani.some(k => k.includes(query))) {
            matchingWords.push({ key, entry: entryObj, glavna});
        }
    }

    meta.textContent = `${matchingWords.length} koto pofina`;

    matchingWords.forEach(({ entry, glavna }) => {
        const tamba = document.createElement("button");
        tamba.className = "kotamba";
        tamba.textContent = glavna;

        tamba.addEventListener("click", () => {
            document.querySelectorAll(".kotamba").forEach(p => p.classList.remove("active"));
            tamba.classList.add("active");

            renderImi(entry);
        });

        koGaje.appendChild(tamba);
    });
}

function renderImi(entry) {
    const displayPane = document.querySelector(".display-pane");
    if (!displayPane) return;

    const validSenses = entry.imi ? entry.imi.filter(sense => {
        const tekst = sense.imi || sense.tekst || sense.imi1 || "";
        return tekst && tekst.trim() !== "";
    }) : [];

    let sensesHTML = "";
    validSenses.forEach((sense, index) => {
        const tekstValue = sense.imi || sense.tekst || sense.imi || "";
        const kofalValue = sense.kofal ? `<h4 style="margin: 0 0 0.4rem 0; color: var(--text-main); font-size: 1.1rem; font-weight: 600;">${sense.kofal}</h4>` : "";

        sensesHTML += `<div class="sense-item" style="margin-bottom: 1.2rem; text-align: left;">
            ${kofalValue}
            <div style="display: flex; gap: 0.5rem; align-items: baseline; color: var(--text-muted); line-height: 1.6;">
                <span style="color: var(--text-subtle); min-width: 1.2rem;">${validSenses.length > 1 ? (index + 1) + '.' : ''}</span>
                <p style="margin: 0; flex-grow: 1;">${tekstValue}</p>
            </div>
        </div>`;
    });

    let klaniHTML = "";
    if (entry.klani && entry.klani.length > 0) {
        klaniHTML = `<div class="meta-row" style="margin-top: 1rem; font-size: 0.8rem; display: flex; gap: 0.4rem; align-items: center; text-align: left;">
            <span style="color: var(--text-subtle);">klani:</span>
            <div style="display: flex; gap: 0.3rem; flex-wrap: wrap;">
                ${entry.klani.map(tag => `<span style="background: var(--bg-surface-alt); border: 1px solid var(--border-subtle); padding: 0.1rem 0.4rem; border-radius: 4px; color: var(--text-subtle);">${tag}</span>`).join('')}
            </div>
        </div>`;
    }

    let andrHTML = "";
    if (entry.andr && entry.andr.length > 0) {
        andrHTML = `<div class="meta-row" style="margin-top: 0.5rem; font-size: 0.8rem; color: var(--text-subtle); text-align: left;">
            <span>andr kakutropos:</span> <span>${entry.andr.join(", ")}</span>
        </div>`;
    }

    const mzaValue = entry.mza || (validSenses[0] && validSenses[0].mza) || "";
    let mzaHTML = mzaValue ? `<span style="font-size: 0.95rem; color: var(--text-accent); font-style: italic; font-weight: normal;">${mzaValue}</span>` : "";

    displayPane.innerHTML = `<div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
        <div style="flex-shrink: 0; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <div style="display: flex; align-items: baseline; gap: 0.75rem;">
                    <h2 style="margin: 0; color: var(--text-main); font-size: 1.6rem;">${entry.glavna}</h2>
                    ${mzaHTML}
                </div>
                <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-accent); background: rgba(0, 175, 240, 0.1); padding: 0.25rem 0.75rem; border-radius: 999px;">${entry.kara}</span>
            </div>
        </div>

        <div class="senses-scroll-container" style="overflow-y: auto; flex-grow: 1; padding-right: 0.5rem; scrollbar-width: thin; scrollbar-color: var(--border-subtle) transparent;">
            ${sensesHTML}
        </div>

        <div style="flex-shrink: 0; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem; margin-top: 1rem;">
            ${klaniHTML}
            ${andrHTML}
        </div>
    </div>`;
}