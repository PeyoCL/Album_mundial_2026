const STORAGE_KEY = 'album_mundial_2026_data';
let state = { profile: { name: 'Mi Álbum', photo: null }, stickers: {}, lastUpdated: Date.now(), milestones: {} };
let activeSearch = { text: '', team: 'all', group: 'all', sort: 'all' };
let currentOpenTeam = null;
let html5QrcodeScanner = null; 

// FUNCIÓN AUTO-REPARABLE: Si el HTML falló, inyectamos los scripts a la fuerza
function loadQRLibraries() {
    if (typeof QRCode === 'undefined') {
        const s1 = document.createElement('script');
        s1.src = 'https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js';
        document.head.appendChild(s1);
    }
    if (typeof Html5Qrcode === 'undefined') {
        const s2 = document.createElement('script');
        s2.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
        document.head.appendChild(s2);
    }
}

function formatCode(name) {
    if(name === '00') return '00';
    return name.replace(/^([A-Z]+)(\d+)$/, '$1 $2');
}

function init() {
    try {
        loadQRLibraries(); // Intentamos cargar forzosamente las librerías
        loadTheme(); loadState(); migrateStickerCodes(); updateProfileName(state.profile?.name);
        const title = document.getElementById('album-title');
        if(title) {
            title.addEventListener('blur', () => { updateProfileName(title.innerText); });
            title.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } });
        }
        const inputProfile = document.getElementById('input-profile-name');
        if(inputProfile) { inputProfile.addEventListener('input', (e) => { updateProfileName(e.target.value, false); }); }
        populateTeamFilter(); populateGroupFilter(); bindEvents(); observeHeaderOffset(); renderHome(); updateTradeExportButtons(); checkIOSInstall();
    } catch (error) { console.error("Error en init():", error); bindEvents(); }
}

function checkIOSInstall() {
    const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isStandalone = () => ('standalone' in window.navigator) && window.navigator.standalone;
    if (isIos() && !isStandalone()) {
        const prompt = document.getElementById('ios-install-prompt');
        if (prompt && !localStorage.getItem('ios_prompt_dismissed')) {
            prompt.style.display = 'block';
            prompt.querySelector('.close-ios-prompt').onclick = () => { prompt.style.display = 'none'; localStorage.setItem('ios_prompt_dismissed', 'true'); };
        }
    }
}

function updateProfileName(newName, updateInput = true) {
    let name = 'Mi Álbum';
    if (newName && typeof newName === 'string') name = newName.trim() || 'Mi Álbum';
    if (!state.profile) state.profile = {};
    state.profile.name = name;
    const titleEl = document.getElementById('album-title');
    if (titleEl) titleEl.innerText = name;
    if (updateInput) {
        const inputEl = document.getElementById('input-profile-name');
        if (inputEl) inputEl.value = name === 'Mi Álbum' ? '' : name;
    }
    saveState();
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved); state = { ...state, ...parsed };
            if (!state.profile) state.profile = { name: 'Mi Álbum' };
            if (!state.stickers) state.stickers = {};
        } catch(e) { console.warn("Error leyendo state."); }
    }
}

function saveState() { state.lastUpdated = Date.now(); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function migrateStickerCodes() {
    let migrated = false; const newStickers = {};
    for (const [key, value] of Object.entries(state.stickers || {})) {
        if (!value || !value.have) continue;
        let newKey = key.replace(/-(0?)(\d+)/, '$2'); 
        if (newKey !== key) migrated = true;
        if (newStickers[newKey]) newStickers[newKey].count += value.count;
        else newStickers[newKey] = { have: true, count: value.count };
    }
    if (migrated) { state.stickers = newStickers; saveState(); }
}

function getStickerState(code) { return state.stickers[code] || { have: false, count: 0 }; }

function toggleSticker(code, ev) {
    if(ev) ev.stopPropagation();
    let s = getStickerState(code);
    if (!s.have) { s.have = true; s.count = 1; triggerConfetti(ev.clientX, ev.clientY); } else { s.count++; }
    state.stickers[code] = s; saveState(); checkMilestones();
    if(currentOpenTeam) renderStickersGrid(currentOpenTeam);
    updateHomeProgress();
}

function decrementSticker(code, ev) {
    if(ev) ev.stopPropagation();
    let s = getStickerState(code);
    if (s.have && s.count > 0) {
        s.count--; if (s.count === 0) s.have = false;
        state.stickers[code] = s; saveState();
        if(currentOpenTeam) renderStickersGrid(currentOpenTeam);
        updateHomeProgress();
    }
}

function getHaveCount() { return Object.values(state.stickers || {}).filter(s => s.have).length; }
function getTeamProgress(teamCode) {
    if (!window.DATA || !window.DATA.TEAMS) return { have: 0, total: 0 };
    const team = window.DATA.TEAMS.find(t => t.code === teamCode);
    if(!team) return { have: 0, total: 0 };
    let have = team.stickers.filter(s => getStickerState(s.code).have).length;
    return { have, total: team.stickers.length };
}

function getTotalProgress() {
    let have = getHaveCount(); let total = window.DATA ? window.DATA.TOTAL_STICKERS : 994;
    let percentage = Math.round((have / total) * 100) || 0;
    if (percentage === 100 && have < total) percentage = 99;
    return { have, total, percentage };
}

function checkMilestones() {
    const p = getTotalProgress().percentage; const targets = [25, 50, 75, 100];
    if(!state.milestones) state.milestones = {};
    for (let t of targets) {
        if (p >= t && !state.milestones[`m${t}`]) {
            state.milestones[`m${t}`] = true; saveState();
            shootBigConfetti(); setTimeout(() => alert(`¡Felicidades! Has completado el ${t}% del álbum.`), 500);
        }
    }
}

function getRepeatedList() {
    let repeated = [];
    if (!window.DATA || !window.DATA.TEAMS) return repeated;
    window.DATA.TEAMS.forEach(team => {
        let teamReps = [];
        team.stickers.forEach(s => {
            let st = getStickerState(s.code);
            if (st.have && st.count > 1) { teamReps.push({ name: s.name, count: st.count - 1 }); }
        });
        if (teamReps.length > 0) repeated.push({ team: team.name, items: teamReps });
    });
    return repeated;
}

function getRepeatedTotal() { return Object.values(state.stickers || {}).reduce((sum, s) => s.have && s.count > 1 ? sum + (s.count - 1) : sum, 0); }
function getMissingList() {
    let missing = [];
    if (!window.DATA || !window.DATA.TEAMS) return missing;
    window.DATA.TEAMS.forEach(team => {
        team.stickers.forEach(s => { if (!getStickerState(s.code).have) missing.push({ team: team.name, name: s.name }); });
    });
    return missing;
}

function renderHome() { renderDashboardCards(); applyCollectionSearch(); }
function updateHomeProgress() { renderDashboardCards(); }

function renderDashboardCards() {
    const p = getTotalProgress(); const rep = getRepeatedTotal();
    const pctEl = document.getElementById('main-percentage'); if (pctEl) pctEl.innerText = `${p.percentage}%`;
    const textEl = document.getElementById('main-progress-text'); if (textEl) textEl.innerText = `Tienes ${p.have} de ${p.total} láminas únicas.`;
    const barEl = document.getElementById('main-linear-bar'); if (barEl) barEl.style.width = `${p.percentage}%`;
    const ringEl = document.getElementById('main-progress-ring'); if (ringEl) ringEl.style.background = `conic-gradient(var(--blue-accent) ${p.percentage * 3.6}deg, var(--bg-surface) 0deg)`;
    const advEl = document.getElementById('metric-advance'); if (advEl) advEl.innerText = `${p.percentage}%`;
    const uniEl = document.getElementById('metric-unique'); if (uniEl) uniEl.innerText = `${p.have} / ${p.total}`;
    const repEl = document.getElementById('metric-repeated'); if (repEl) repEl.innerText = `${rep} rep.`;
}

function renderTeamsGrid(teams) {
    const grid = document.getElementById('teams-grid'); if(!grid) return;
    grid.innerHTML = ''; let toRender = teams || (window.DATA ? window.DATA.TEAMS : []);
    const counterEl = document.getElementById('results-counter'); if(counterEl) counterEl.innerText = `${toRender.length} resultados`;
    toRender.forEach(team => { grid.appendChild(makeTeamCard(team)); });
}

function makeTeamCard(team) {
    const prog = getTeamProgress(team.code);
    let pct = Math.round((prog.have / prog.total) * 100) || 0;
    if (pct === 100 && prog.have < prog.total) pct = 99;
    
    const div = document.createElement('div');
    div.className = `team-card ${prog.have === prog.total ? 'completed' : ''}`;
    div.id = `team-card-${team.code}`; div.onclick = () => openTeamDetail(team);
    const iconHtml = team.flag ? `<img src="${team.flag}" class="team-icon">` : `<div class="team-icon" style="font-size:24px; display:flex; align-items:center; justify-content:center;">${team.icon}</div>`;
    div.innerHTML = `<div class="team-card-header">${iconHtml}<div class="team-info"><h3>${team.name}</h3><span>${team.group}</span></div></div>
        <div class="team-stats"><span>Progreso</span><span id="card-count-${team.code}">${prog.have}/${prog.total} (${pct}%)</span></div>
        <div class="linear-progress"><div class="linear-bar" id="card-bar-${team.code}" style="width: ${pct}%;"></div></div>`;
    return div;
}

function makeStickerCard(sticker) {
    const st = getStickerState(sticker.code); const div = document.createElement('div');
    const isSpecial = sticker.type === 'special' || sticker.type === 'shield' || sticker.type === 'group';
    div.className = `sticker ${st.have ? 'have animate-pop' : ''} ${isSpecial ? 'special' : ''}`;
    div.onclick = (e) => toggleSticker(sticker.code, e);
    let badge = st.count > 1 ? `<span class="sticker-badge">+${st.count - 1}</span>` : '';
    div.innerHTML = `<span class="sticker-name" style="${isSpecial ? 'color: var(--gold)' : ''}">${formatCode(sticker.name)}</span>
        ${badge}<button class="btn-minus" onclick="decrementSticker('${sticker.code}', event)">-</button>`;
    return div;
}

function openTeamDetail(team) {
    currentOpenTeam = team;
    document.getElementById('modal-team-name').innerText = team.name;
    document.getElementById('modal-team-group').innerText = team.group;
    const iconEl = document.getElementById('modal-team-icon');
    if (team.flag) { iconEl.src = team.flag; iconEl.style.display = 'block'; } else { iconEl.style.display = 'none'; }
    renderStickersGrid(team); showModal('modal-team');
}

function renderStickersGrid(team) {
    const grid = document.getElementById('modal-stickers-grid'); grid.innerHTML = '';
    team.stickers.forEach(s => { grid.appendChild(makeStickerCard(s)); }); updateTeamCount(team.code);
}
function updateTeamCount(teamCode) {
    const p = getTeamProgress(teamCode);
    const countEl = document.getElementById('modal-team-count'); if(countEl) countEl.innerText = `${p.have}/${p.total}`;
    const cardCount = document.getElementById(`card-count-${teamCode}`);
    const cardBar = document.getElementById(`card-bar-${teamCode}`);
    const card = document.getElementById(`team-card-${teamCode}`);
    if (cardCount) {
        let pct = Math.round((p.have / p.total) * 100) || 0;
        if (pct === 100 && p.have < p.total) pct = 99;
        cardCount.innerText = `${p.have}/${p.total} (${pct}%)`; cardBar.style.width = `${pct}%`;
        if (p.have === p.total && p.total > 0) {
            card.classList.add('completed');
            if(!state.milestones) state.milestones = {};
            if(!state.milestones[`team_${teamCode}`]) { state.milestones[`team_${teamCode}`] = true; shootBigConfetti(); }
        } else { card.classList.remove('completed'); }
    }
}

function applyCollectionSearch() {
    if (!window.DATA || !window.DATA.TEAMS) return;
    let filtered = window.DATA.TEAMS.filter(t => {
        let matchText = true;
        if (activeSearch.text) {
            let txt = activeSearch.text.toLowerCase();
            let hasSticker = t.stickers.some(s => s.name.toLowerCase().includes(txt));
            matchText = t.name.toLowerCase().includes(txt) || t.group.toLowerCase().includes(txt) || hasSticker;
        }
        let matchTeam = activeSearch.team === 'all' || t.code === activeSearch.team;
        let matchGroup = activeSearch.group === 'all' || t.group === activeSearch.group;
        return matchText && matchTeam && matchGroup;
    });

    if (activeSearch.sort === 'most') { filtered.sort((a,b) => (getTeamProgress(b.code).have / b.stickers.length) - (getTeamProgress(a.code).have / a.stickers.length)); }
    else if (activeSearch.sort === 'least') { filtered.sort((a,b) => (getTeamProgress(a.code).have / a.stickers.length) - (getTeamProgress(b.code).have / b.stickers.length)); }
    else if (activeSearch.sort === 'az') { filtered.sort((a,b) => a.name.localeCompare(b.name)); }
    renderTeamsGrid(filtered);
}

function clearFilters() {
    const searchInput = document.getElementById('search-input'); if(searchInput) searchInput.value = '';
    const filterTeam = document.getElementById('filter-team'); if(filterTeam) filterTeam.value = 'all';
    const filterGroup = document.getElementById('filter-group'); if(filterGroup) filterGroup.value = 'all';
    activeSearch = { ...activeSearch, text: '', team: 'all', group: 'all' };
    applyCollectionSearch();
}

function populateTeamFilter() {
    const sel = document.getElementById('filter-team'); if(!sel || !window.DATA || !window.DATA.TEAMS) return;
    window.DATA.TEAMS.forEach(t => { const opt = document.createElement('option'); opt.value = t.code; opt.innerText = t.name; sel.appendChild(opt); });
}

function populateGroupFilter() {
    const sel = document.getElementById('filter-group'); if(!sel || !window.DATA || !window.DATA.TEAMS) return;
    const groups = new Set(window.DATA.TEAMS.map(t => t.group));
    groups.forEach(g => { const opt = document.createElement('option'); opt.value = g; opt.innerText = g; sel.appendChild(opt); });
}

function renderTrades() {
    const reps = getRepeatedList(); const total = getRepeatedTotal();
    const textEl = document.getElementById('trades-total-text'); if(textEl) textEl.innerText = `Total repetidas: ${total}`;
    const list = document.getElementById('trades-list'); if(!list) return;
    list.innerHTML = '';
    if (reps.length === 0) { list.innerHTML = '<p style="color: var(--text-muted); text-align:center; padding: 2rem;">No tienes láminas repetidas aún.</p>'; }
    else {
        reps.forEach(group => {
            const grpDiv = document.createElement('div'); grpDiv.className = 'trade-group';
            let itemsHtml = group.items.map(i => `<span class="trade-item">${formatCode(i.name)} (x${i.count})</span>`).join('');
            grpDiv.innerHTML = `<h3>${group.team}</h3><div class="trade-items">${itemsHtml}</div>`;
            list.appendChild(grpDiv);
        });
    }
    updateTradeExportButtons(total > 0);
}

function updateTradeExportButtons(hasRepeated) {
    const disabled = !hasRepeated;
    const btnShare = document.getElementById('btn-share-list'); if(btnShare) btnShare.disabled = disabled;
    const btnPdf = document.getElementById('btn-export-pdf'); if(btnPdf) btnPdf.disabled = disabled;
    const btnExcel = document.getElementById('btn-export-excel'); if(btnExcel) btnExcel.disabled = disabled;
    const complete = getTotalProgress().percentage === 100;
    const btnMissing = document.getElementById('btn-download-missing'); if(btnMissing) btnMissing.disabled = complete;
}

function getTradeExportRows() {
    let rows = [];
    getRepeatedList().forEach(g => {
        let itemsStr = g.items.map(i => { let num = formatCode(i.name); return i.count > 1 ? `${num}(x${i.count})` : num; }).join(', ');
        rows.push({ section: g.team, text: itemsStr });
    });
    return rows;
}

function getMissingExportRows() {
    let rows = []; let map = {};
    getMissingList().forEach(m => { if(!map[m.team]) map[m.team] = []; map[m.team].push(formatCode(m.name)); });
    for(let team in map){ rows.push({ section: team, text: map[team].join(', ') }); }
    return rows;
}

function generateShareText() {
    const p = getTotalProgress();
    let txt = `*${state.profile.name}*\nProgreso: ${p.have}/${p.total} (${p.percentage}%)\nRepetidas: ${getRepeatedTotal()}\n\n`;
    getTradeExportRows().forEach(r => { txt += `${r.section}: ${r.text}\n`; });
    const shareText = document.getElementById('share-textarea'); if(shareText) shareText.value = txt;
    showModal('modal-share');
}

function removeAccents(str) { if (!str) return ''; return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

function exportTradesExcel() {
    let csv = 'Seccion,Laminas Repetidas\n';
    getTradeExportRows().forEach(r => { csv += `"${removeAccents(r.section)}","${r.text}"\n`; });
    const encoder = new TextEncoder(); const csvBytes = encoder.encode(csv); const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const finalBlobBytes = new Uint8Array(bom.byteLength + csvBytes.byteLength);
    finalBlobBytes.set(bom, 0); finalBlobBytes.set(csvBytes, bom.byteLength);
    const blob = new Blob([finalBlobBytes], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, 'cambios_album_mundial_2026.csv');
}

function exportMissingExcel() {
    let csv = 'Seccion,Laminas Faltantes\n';
    getMissingExportRows().forEach(r => { csv += `"${removeAccents(r.section)}","${r.text}"\n`; });
    const encoder = new TextEncoder(); const csvBytes = encoder.encode(csv); const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const finalBlobBytes = new Uint8Array(bom.byteLength + csvBytes.byteLength);
    finalBlobBytes.set(bom, 0); finalBlobBytes.set(csvBytes, bom.byteLength);
    const blob = new Blob([finalBlobBytes], { type: 'text/csv;charset=utf-8' });
    downloadBlob(blob, 'faltantes_album_mundial_2026.csv');
}

function exportTradesPdf() {
    const p = getTotalProgress();
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cambios Álbum 2026</title><style>body{font-family:sans-serif; padding: 20px;} table{width:100%;border-collapse:collapse; margin-top: 20px;} th,td{border:1px solid #ccc;padding:8px;text-align:left;}</style></head><body>`;
    html += `<h1>Cambios - ${state.profile.name}</h1><p>Progreso: ${p.have}/${p.total} (${p.percentage}%) | Total repetidas: ${getRepeatedTotal()}</p>`;
    html += `<table><tr><th style="width:150px">Sección</th><th>Láminas Repetidas</th></tr>`;
    getTradeExportRows().forEach(r => { html += `<tr><td>${r.section}</td><td>${r.text}</td></tr>`; });
    html += `</table></body></html>`;
    const iframe = document.createElement('iframe'); iframe.style.position = 'absolute'; iframe.style.width = '0px'; iframe.style.height = '0px'; iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow || iframe.contentDocument.document || iframe.contentDocument;
    doc.document.open(); doc.document.write(html); doc.document.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
        try { iframe.contentWindow.print(); } catch (err) { alert('Bloqueado por el dispositivo. Usa Exportar Excel.'); }
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
}

// ==== LÓGICA QR Y MATCH V30 ====

function loadQRLibraries(callback) {
    if (typeof QRCode !== 'undefined' && typeof jsQR !== 'undefined') {
        if (callback) callback();
        return;
    }
    const loadScript = (src) => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src; script.onload = resolve; script.onerror = reject;
        document.head.appendChild(script);
    });
    Promise.all([
        typeof QRCode === 'undefined' ? loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js') : Promise.resolve(),
        typeof jsQR === 'undefined' ? loadScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js') : Promise.resolve()
    ]).then(() => { if (callback) callback(); })
    .catch((e) => { alert("No se pudo conectar con el servidor de códigos QR. Verifica tu internet y usa 'Copiar Texto'."); });
}

function getMinifiedTradeData() {
    const minified = { n: state.profile.name, s: {} };
    for (const [code, sticker] of Object.entries(state.stickers)) {
        if (sticker.have && sticker.count > 1) { minified.s[code] = sticker.count; }
    }
    return JSON.stringify(minified);
}

function showMyQR() {
    if (typeof QRCode === 'undefined') { loadQRLibraries(() => executeShowMyQR()); } else { executeShowMyQR(); }
}

function executeShowMyQR() {
    if (state.profile.name === 'Mi Álbum') {
        const userName = prompt('Antes de generar el QR, ¿Cómo te llamas?');
        if (userName) updateProfileName(userName);
    }
    const jsonStr = getMinifiedTradeData();
    if (jsonStr.length > 2500) {
        alert("⚠️ Tienes demasiadas láminas repetidas. El código QR superó el límite de la cámara. Por favor, usa el botón 'Copiar Texto' y envíalo por WhatsApp.");
        return;
    }
    const canvas = document.getElementById('qr-canvas');
    try {
        // 🔥 ALTA DEFINICIÓN: width 800px para evitar el anti-aliasing borroso en QRs muy densos
        QRCode.toCanvas(canvas, jsonStr, { width: 800, margin: 2, errorCorrectionLevel: 'L', color: { dark: '#000', light: '#fff' } }, function (error) {
            if (error) { console.error(error); alert("Error interno al dibujar el QR. Por favor, usa 'Copiar Texto'."); } 
            else { showModal('modal-my-qr'); }
        });
    } catch (e) { console.error(e); alert("Tu dispositivo bloqueó la generación del QR. Usa 'Copiar Texto'."); }
}

function downloadQR() {
    const canvas = document.getElementById('qr-canvas'); if (!canvas) return;
    const imageUrl = canvas.toDataURL("image/png");
    const safeName = (state.profile.name || 'Mi_Album').replace(/\s+/g, '_');
    const a = document.createElement('a'); a.href = imageUrl; a.download = `QR_Album_2026_${safeName}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function copyMyJsonForTrade() {
    if (state.profile.name === 'Mi Álbum') {
        const userName = prompt('Antes de compartir, ¿Cómo te llamas?');
        if (userName) updateProfileName(userName);
    }
    navigator.clipboard.writeText(getMinifiedTradeData()).then(() => { alert(`¡Copiado! Envíalo a tu contacto.`); });
}

function uploadQRImage(event) {
    const file = event.target.files[0]; if (!file) return;
    if (typeof jsQR === 'undefined') {
        loadQRLibraries(() => executeUploadQRImage(file));
        event.target.value = ''; return;
    }
    executeUploadQRImage(file);
    event.target.value = ''; 
}

function executeUploadQRImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.getElementById('hidden-qr-canvas');
            const context = canvas.getContext('2d', { willReadFrequently: true });
            
            // Limitamos a 2000px solo para que no colapsen celulares de gama baja
            const maxSize = 2000;
            let width = img.width; let height = img.height;
            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width = width * ratio; height = height * ratio;
            }
            
            canvas.width = width; canvas.height = height;
            context.fillStyle = '#FFFFFF'; context.fillRect(0, 0, width, height);
            context.drawImage(img, 0, 0, width, height);
            
            const imageData = context.getImageData(0, 0, width, height);
            // attemptBoth es un método mucho más agresivo para leer códigos complicados
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "attemptBoth",
            });

            if (code) {
                document.getElementById('match-input').value = code.data;
                compareTradesFromText();
            } else {
                alert('No se pudo leer el código QR en la imagen. Por favor, pide que generen el QR usando esta nueva versión para que esté en Alta Definición.');
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

let lastMatchResult = null;

function clearMatchInput() {
    const matchInput = document.getElementById('match-input'); if(matchInput) matchInput.value = '';
    const resultsContainer = document.getElementById('match-results-container'); if(resultsContainer) resultsContainer.style.display = 'none';
    lastMatchResult = null;
}

function compareTradesFromText() {
    const inputEl = document.getElementById('match-input'); if(!inputEl) return;
    const input = inputEl.value.trim();
    if (!input) { alert('No hay datos. Pega un texto válido o sube un QR.'); return; }
    try {
        const parsed = JSON.parse(input);
        let friendState = { profile: { name: 'Tu contacto' }, stickers: {} };
        if (parsed.s) {
            friendState.profile.name = parsed.n || 'Tu contacto';
            for (const [code, count] of Object.entries(parsed.s)) { friendState.stickers[code] = { have: true, count: count }; }
        } else if (parsed.stickers) { friendState = parsed; } else { throw new Error(); }

        let iReceive = {}; let iGive = {};    
        if (!window.DATA || !window.DATA.TEAMS) return;

        window.DATA.TEAMS.forEach(team => {
            team.stickers.forEach(s => {
                const code = s.code; const mySticker = getStickerState(code);
                const friendSticker = friendState.stickers[code] || { have: false, count: 0 };
                const myName = formatCode(s.name);

                if (!mySticker.have && friendSticker.have && friendSticker.count > 1) {
                    if(!iReceive[team.name]) iReceive[team.name] = []; iReceive[team.name].push(myName);
                }

                if (!friendSticker.have && mySticker.have && mySticker.count > 1) {
                    if(!iGive[team.name]) iGive[team.name] = []; iGive[team.name].push(myName);
                }
            });
        });

        lastMatchResult = { iReceive, iGive, friendName: friendState.profile?.name || 'Tu contacto' };
        renderMatchResults();
    } catch(e) { alert('Los datos leídos no son válidos. Comprueba que el texto esté completo.'); }
}

function renderMatchResults() {
    const container = document.getElementById('match-results'); const wrap = document.getElementById('match-results-container');
    if(!lastMatchResult || !container || !wrap) return;

    let totalRec = 0; for(let team in lastMatchResult.iReceive) totalRec += lastMatchResult.iReceive[team].length;
    let totalGive = 0; for(let team in lastMatchResult.iGive) totalGive += lastMatchResult.iGive[team].length;
    let optimal = Math.min(totalRec, totalGive); let bottleneck = "";
    if (totalRec < totalGive) bottleneck = `(Menos repetidas: ${lastMatchResult.friendName})`;
    else if (totalGive < totalRec) bottleneck = `(Menos repetidas: Tú)`; else bottleneck = `(Ambos ofrecen igual)`;

    let html = `<p style="text-align:center; color:var(--text-secondary); margin-bottom:1rem;">Comparación con: <strong style="color:var(--text-primary); font-size:1.1rem;">${lastMatchResult.friendName}</strong></p>`;
    
    html += `<div style="background: rgba(59,130,246,0.1); border: 1px dashed var(--blue-accent); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: center;">
        <p style="margin-bottom: 0.5rem; color: var(--text-primary);"><strong>📊 Resumen del Match</strong></p>
        <p style="font-size: 0.9rem; margin-bottom: 0.2rem; color: var(--text-secondary);">Recibes: <strong style="color:var(--green-complete)">${totalRec}</strong> láminas</p>
        <p style="font-size: 0.9rem; margin-bottom: 0.8rem; color: var(--text-secondary);">Entregas: <strong style="color:var(--gold)">${totalGive}</strong> láminas</p>
        <div style="background: var(--blue-accent); color: white; padding: 0.4rem 0.8rem; border-radius: 6px; display: inline-block;">
            <strong>Máx. cambios: ${optimal}</strong> <span style="font-size: 0.8rem; opacity: 0.9;">${bottleneck}</span>
        </div>
    </div>`;

    html += `<div class="match-columns">`;
    html += '<div class="match-col"><h3>⬇️ Me puede dar</h3>';
    let recCount = 0;
    for(let team in lastMatchResult.iReceive) { html += `<strong>${team}</strong><span>${lastMatchResult.iReceive[team].join(', ')}</span>`; recCount++; }
    if(recCount === 0) html += '<p class="text-muted">Ninguna :(</p>';
    html += '</div><div class="match-col"><h3>⬆️ Le puedo dar</h3>';
    let giveCount = 0;
    for(let team in lastMatchResult.iGive) { html += `<strong>${team}</strong><span>${lastMatchResult.iGive[team].join(', ')}</span>`; giveCount++; }
    if(giveCount === 0) html += '<p class="text-muted">Ninguna :(</p>';
    html += '</div></div>';

    container.innerHTML = html; wrap.style.display = 'block';
}

function shareMatchWhatsApp() {
    if(!lastMatchResult) return;
    let totalRec = 0; for(let team in lastMatchResult.iReceive) totalRec += lastMatchResult.iReceive[team].length;
    let totalGive = 0; for(let team in lastMatchResult.iGive) totalGive += lastMatchResult.iGive[team].length;
    let optimal = Math.min(totalRec, totalGive); let bottleneck = "";
    if (totalRec < totalGive) bottleneck = `(Menos repetidas: ${lastMatchResult.friendName})`;
    else if (totalGive < totalRec) bottleneck = `(Menos repetidas: Yo)`; else bottleneck = `(Ambos igual)`;

    let text = `*¡Hola ${lastMatchResult.friendName}! He revisado las láminas para intercambiar:*\n\n*📊 RESUMEN:*\n- Recibo de ti: ${totalRec}\n- Te entrego: ${totalGive}\n*🔥 Cambios posibles: ${optimal}* ${bottleneck}\n\n*⬇️ Me puedes dar:*\n`;
    let recCount = 0;
    for(let team in lastMatchResult.iReceive) { text += `- ${team}: ${lastMatchResult.iReceive[team].join(', ')}\n`; recCount++; }
    if(recCount === 0) text += 'Ninguna\n';
    text += `\n*⬆️ Yo te puedo dar:*\n`;
    let giveCount = 0;
    for(let team in lastMatchResult.iGive) { text += `- ${team}: ${lastMatchResult.iGive[team].join(', ')}\n`; giveCount++; }
    if(giveCount === 0) text += 'Ninguna\n';

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`; window.open(url, '_blank');
}

function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
function exportData() { const json = JSON.stringify(state, null, 2); const blob = new Blob([json], { type: 'application/json' }); downloadBlob(blob, 'album_mundial_2026.json'); }
function importData(e) { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { try { const data = JSON.parse(event.target.result); if (data.stickers) { state = data; saveState(); init(); closeModal('modal-settings'); alert('Álbum restaurado.'); } } catch (err) { alert('Archivo JSON inválido.'); } }; reader.readAsText(file); }
function confirmReset() { if (confirm('¿Seguro que deseas reiniciar el álbum?')) { state.stickers = {}; state.milestones = {}; saveState(); closeModal('modal-settings'); init(); } }
function forceUpdateCache() { if ('caches' in window) { caches.keys().then(function(names) { for (let name of names) caches.delete(name); }).then(() => { alert("Caché borrada. La app se recargará."); window.location.href = window.location.pathname + '?v=' + new Date().getTime(); }); } else { window.location.reload(true); } }
function toggleTheme() { const root = document.documentElement; if (root.getAttribute('data-theme') === 'light') { root.removeAttribute('data-theme'); localStorage.setItem('album_theme_2026', 'dark'); } else { root.setAttribute('data-theme', 'light'); localStorage.setItem('album_theme_2026', 'light'); } }
function loadTheme() { const theme = localStorage.getItem('album_theme_2026'); if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light'); }
function showModal(id) { const modal = document.getElementById(id); if(modal) modal.style.display = 'flex'; }
function closeModal(id) { const modal = document.getElementById(id); if(modal) modal.style.display = 'none'; currentOpenTeam = null; }
function updateHeaderOffset() { const header = document.querySelector('.app-header'); if(header) document.documentElement.style.setProperty('--header-offset', `${header.offsetHeight + 18}px`); }
function observeHeaderOffset() { updateHeaderOffset(); if(window.ResizeObserver) new ResizeObserver(() => updateHeaderOffset()).observe(document.querySelector('.app-header')); window.addEventListener('resize', updateHeaderOffset); window.addEventListener('orientationchange', () => { setTimeout(updateHeaderOffset, 150); }); if(document.fonts) document.fonts.ready.then(updateHeaderOffset); }

function bindEvents() {
    const addClick = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
    const addInput = (id, fn) => { const el = document.getElementById(id); if(el) { if(el.tagName === 'SELECT') el.onchange = fn; else el.oninput = fn; } };
    addClick('btn-theme', toggleTheme); addClick('btn-settings', () => showModal('modal-settings')); addClick('btn-clear-filters', clearFilters); addClick('btn-share-list', generateShareText); addClick('btn-export-excel', exportTradesExcel); addClick('btn-export-pdf', exportTradesPdf); addClick('btn-download-missing', exportMissingExcel);
    addInput('search-input', (e) => { activeSearch.text = e.target.value; applyCollectionSearch(); }); addInput('filter-team', (e) => { activeSearch.team = e.target.value; applyCollectionSearch(); }); addInput('filter-group', (e) => { activeSearch.group = e.target.value; applyCollectionSearch(); }); addInput('sort-select', (e) => { activeSearch.sort = e.target.value; applyCollectionSearch(); });
    document.querySelectorAll('.nav-btn').forEach(btn => { btn.onclick = () => { document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active')); btn.classList.add('active'); const target = btn.getAttribute('data-target'); const targetEl = document.getElementById(target); if(targetEl) targetEl.classList.add('active'); if (target === 'tab-trades') renderTrades(); window.scrollTo(0, 0); }; });
}

function triggerConfetti(x, y) {
    const canvas = document.getElementById('confetti-canvas'); if(!canvas) return; const ctx = canvas.getContext('2d'); canvas.width = window.innerWidth; canvas.height = window.innerHeight; let particles = [];
    for(let i=0; i<30; i++) particles.push({ x: x, y: y, r: Math.random() * 4 + 2, dx: Math.random() * 6 - 3, dy: Math.random() * -6 - 2, color: `hsl(${Math.random() * 360}, 100%, 50%)` });
    function animate() { ctx.clearRect(0,0,canvas.width,canvas.height); let active = false; particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.dy += 0.2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fillStyle = p.color; ctx.fill(); if(p.y < canvas.height) active = true; }); if(active) requestAnimationFrame(animate); else ctx.clearRect(0,0,canvas.width,canvas.height); } animate();
}
function shootBigConfetti() { triggerConfetti(window.innerWidth/2, window.innerHeight/2); setTimeout(() => triggerConfetti(window.innerWidth/3, window.innerHeight/2), 200); setTimeout(() => triggerConfetti((window.innerWidth/3)*2, window.innerHeight/2), 400); }
document.addEventListener('DOMContentLoaded', init);


