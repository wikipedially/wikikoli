let dictionaryData = {};
let currentLang = "vjosa";
let activeQuery = "";
let wordHistory = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadDictionary();
    setupLanguageSwitcher();
    setupSearchInput();
    setupDefinitionWordClicks();

    const params = new URLSearchParams(window.location.search);
    const initialWord = params.get("t");

    if (initialWord) {
        wordHistory = [initialWord.trim().toLowerCase()];
        openWordFromUrl(initialWord, false);
    } else {
        filterAndRenderWords("");
    }
});

window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    const word = params.get("t");
    if (word) {
        const lower = word.trim().toLowerCase();
        const existingIndex = wordHistory.lastIndexOf(lower);
        if (existingIndex !== -1) {
            wordHistory = wordHistory.slice(0, existingIndex + 1);
        } else {
            wordHistory.push(lower);
        }
        openWordFromUrl(word, false);
    } else {
        wordHistory = [];
        resetDisplayPane();
    }
});

async function loadDictionary() {
    try {
        const response = await fetch("mikava.json");
        if (!response.ok) throw new Error("Could not load mikava.json");
        dictionaryData = await response.json();
    } catch (error) {
        console.error("Load error:", error);
        dictionaryData = {};
    }
}

function updateUrlParam(word) {
    const url = new URL(window.location);
    if (word) {
        url.searchParams.set("t", word);
    } else {
        url.searchParams.delete("t");
    }
    window.history.pushState({}, "", url);
}

function goBackInHistory() {
    if (wordHistory.length <= 1) return;
    wordHistory.pop();
    const previousWord = wordHistory[wordHistory.length - 1];
    updateUrlParam(previousWord);
    openWordFromUrl(previousWord, false);
}

function getBackButtonHTML() {
    if (wordHistory.length <= 1) return "";
    return `<button type="button" class="back-btn" id="def-back-btn" title="${escapeHTML(wordHistory[wordHistory.length - 2])} made" aria-label="Suruk">&#8592;</button>`;
}

function resetDisplayPane() {
    const displayPane = document.querySelector(".display-pane");
    if (!displayPane) return;

    document.querySelectorAll(".kotamba").forEach(p => p.classList.remove("active"));
    displayPane.innerHTML = `
        <div class="placeholder">
            <p class="placeholder-text">kap kotoba per imi umdaws.</p>
        </div>
    `;
}

function renderMissingWord(word) {
    const displayPane = document.querySelector(".display-pane");
    if (!displayPane) return;

    document.querySelectorAll(".kotamba").forEach(p => p.classList.remove("active"));

    const backBtnHTML = getBackButtonHTML();

    displayPane.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column;">
           <div style="flex-shrink: 0; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 0.65rem;">
                        ${backBtnHTML}
                        <h2 style="margin: 0; color: var(--text-main); font-size: 1.6rem;">${escapeHTML(word)}</h2>
                    </div>
                </div>
            </div>
            <div class="placeholder" style="flex-grow: 1; display: flex; align-items: center; justify-content: center;">
                <p class="placeholder-text">"${escapeHTML(word)}" ima jamnaj imi.</p>
            </div>
        </div>
    `;
}

function escapeHTML(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function linkifyText(text) {
    return text.replace(/([a-zA-ZÀ-ž]+)(?:\[(-?[a-zA-ZÀ-ž]+-?)\])?/g, (match, root, part) => {
        const rootTarget = root.toLowerCase();

        if (!part) {
            return `<span class="def-word" data-word="${rootTarget}">${root}</span>`;
        }

        const hasLeadingHyphen = part.startsWith("-");
        const cleanPart = part.replace(/^-+/, "");
        const partTarget = hasLeadingHyphen ? `-${cleanPart.toLowerCase()}` : cleanPart.toLowerCase();

        const lastChar = root.slice(-1);
        const firstChar = cleanPart.charAt(0);

        if (lastChar.toLowerCase() === firstChar.toLowerCase()) {
            const trimmedRoot = root.slice(0, -1);
            const dottedChar = (firstChar + "\u0323").normalize("NFC");
            const restOfPart = cleanPart.slice(1);

            return `<span class="def-compound"><span class="def-word def-root" data-word="${rootTarget}">${trimmedRoot}</span><span class="def-word def-affix" data-word="${partTarget}"><span class="def-shared">${dottedChar}</span>${restOfPart}</span></span>`;
        }

        return `<span class="def-compound"><span class="def-word def-root" data-word="${rootTarget}">${root}</span><span class="def-word def-affix" data-word="${partTarget}">${cleanPart}</span></span>`;
    });
}

function setupDefinitionWordClicks() {
    const displayPane = document.querySelector(".display-pane");
    if (!displayPane) return;

    displayPane.addEventListener("click", (e) => {
        if (e.target.closest("#def-back-btn")) {
            goBackInHistory();
            return;
        }

        const wordEl = e.target.closest(".def-word");
        if (!wordEl) return;

        const targetWord = wordEl.getAttribute("data-word");
        if (targetWord) {
            const lower = targetWord.toLowerCase();
            if (wordHistory[wordHistory.length - 1] !== lower) {
                wordHistory.push(lower);
            }
            openWordFromUrl(targetWord, true);
        }
    });
}

function openWordFromUrl(targetWord, pushHistory = false) {
    const trimmed = targetWord.trim();
    const query = targetWord.toLowerCase();
    let matchedEntry = null;
    let matchedKey = null;

    for (const [key, entry] of Object.entries(dictionaryData)) {
        const entryObj = Array.isArray(entry) ? entry[0] : entry;
        if (!entryObj) continue;

        const glavna = (entryObj.glavna || key).toLowerCase();
        if (key.toLowerCase() === query || glavna === query) {
            if (entryObj.kara === currentLang || !matchedEntry) {
                matchedEntry = entryObj;
                matchedKey = glavna;
                if (entryObj.kara === currentLang) break;
            }
        }
    }

    if (pushHistory) {
        updateUrlParam(matchedKey || trimmed);
    }

    if (matchedEntry) {
        if (matchedEntry.kara && matchedEntry.kara !== currentLang) {
            currentLang = matchedEntry.kara;
            document.querySelectorAll(".lang-btn").forEach(btn => {
                btn.classList.toggle("active", btn.getAttribute("data-lang") === currentLang);
            });
        }

        filterAndRenderWords(document.getElementById("search-input").value);
        renderImi(matchedEntry);

        document.querySelectorAll(".kotamba").forEach(btn => {
            if (btn.textContent.toLowerCase() === matchedKey) {
                btn.classList.add("active");
            }
        });
    } else {
        filterAndRenderWords(document.getElementById("search-input").value);
        renderMissingWord(trimmed);
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
            matchingWords.push({ key, entry: entryObj, glavna });
        }
    }

    meta.textContent = `${matchingWords.length} koto jam`;

    const currentUrlWord = new URLSearchParams(window.location.search).get("t")?.toLowerCase();

    matchingWords.forEach(({ entry, glavna }) => {
        const tamba = document.createElement("button");
        tamba.className = "kotamba";
        tamba.textContent = glavna;

        if (currentUrlWord && glavna === currentUrlWord) {
            tamba.classList.add("active");
        }

        tamba.addEventListener("click", () => {
            const isAlreadyActive = tamba.classList.contains("active");

            if (isAlreadyActive) {
                wordHistory = [];
                resetDisplayPane();
                updateUrlParam(null);
            } else {
                wordHistory = [glavna.toLowerCase()];
                document.querySelectorAll(".kotamba").forEach(p => p.classList.remove("active"));
                tamba.classList.add("active");
                renderImi(entry);
                updateUrlParam(glavna);
            }
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
        const rawTekst = sense.imi || sense.tekst || "";
        const linkedTekst = linkifyText(rawTekst)
        const kofalValue = sense.kofal ? `<h4 style="margin: 0 0 0.4rem 0; color: var(--text-main); font-size: 1.1rem; font-weight: 600;">${sense.kofal}</h4>` : "";

        sensesHTML += `<div class="sense-item" style="margin-bottom: 1.2rem; text-align: left;">
            ${kofalValue}
            <div style="display: flex; gap: 0.5rem; align-items: baseline; color: var(--text-muted); line-height: 1.6;">
                <span style="color: var(--text-subtle); min-width: 1.2rem;">${validSenses.length > 1 ? (index + 1) + '.' : ''}</span>
                <p style="margin: 0; flex-grow: 1;">${linkedTekst}</p>
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

    const backBtnHTML = getBackButtonHTML();

    displayPane.innerHTML = `<div style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
        <div style="flex-shrink: 0; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.75rem; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 0.65rem;">
                    ${backBtnHTML}
                    <div style="display: flex; align-items: baseline; gap: 0.75rem;">
                        <h2 style="margin: 0; color: var(--text-main); font-size: 1.6rem;">${entry.glavna}</h2>
                        ${mzaHTML}
                    </div>
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