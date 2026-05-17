const STORAGE_KEY = 'album_mundial_2026_data';
let state = { profile: { name: 'Mi Álbum', photo: null }, stickers: {}, lastUpdated: Date.now(), milestones: {} };
let activeSearch = { text: '', team: 'all', group: 'all', sort: 'all' };
let currentOpenTeam = null;
let html5QrcodeScanner = null;

function loadQRLibraries(callback) {
    const promises = [];
    const loadScript = (src) => new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src; script.onload = resolve; script.onerror = reject;
        document.head.appendChild(script);
    });

    if (typeof QRCode === 'undefined') promises.push(loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js'));
    if (typeof jsQR === 'undefined') promises.push(loadScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'));
    if (typeof Html5Qrcode === 'undefined') promises.push(loadScript('https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js'));

    if (promises.length > 0) {
        Promise.all(promises).then(() => { if (callback) callback(); }).catch(() => alert("No se pudo cargar el módulo QR. Verifica tu internet."));
    } else {
        if (callback) callback();
    }
}

function formatCode(name) { if(name === '00') return '00'; return name.replace(/^([A-Z]+)(\d+)$/, '$1 $2'); }

function init() {
    try {
        loadTheme(); loadState(); migrateStickerCodes(); updateProfileName(state.profile?.name);
        const title = document.getElementById('album-title');
        if(title) { title.addEventListener('blur', () => updateProfileName(title.innerText)); title.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } }); }
        const inputProfile = document.getElementById('input-profile-name');
        if(inputProfile) { inputProfile.addEventListener('input', (e) => updateProfileName(e.target.value, false)); }
        populateTeamFilter(); populateGroupFilter(); bindEvents(); observeHeaderOffset(); renderHome(); updateTradeExportButtons(); checkIOSInstall();
    } catch (error) { console.error("Error en init:", error); bindEvents(); }
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
    let name = 'Mi Álbum'; if (newName && typeof newName === 'string') name = newName.trim() || 'Mi Álbum';
    if (!state.profile) state.profile = {}; state.profile.name = name;
    const titleEl = document.getElementById('album-title'); if (titleEl) titleEl.innerText = name;
    if (updateInput) { const inputEl = document.getElementById('input-profile-name'); if (inputEl) inputEl.value = name === 'Mi Álbum' ? '' : name; }
    saveState();
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) { try { const parsed = JSON.parse(saved); state = { ...state, ...parsed }; if (!state.profile) state.profile = { name: 'Mi Álbum' }; if (!state.stickers) state.stickers = {}; } catch(e) {} }
}

function saveState() { state.lastUpdated = Date.now(); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function migrateStickerCodes() {
    let migrated = false; const newStickers = {};
    for (const [key, value] of Object.entries(state.stickers || {})) {
        if (!value || !value.have) continue;
        let newKey = key.replace(/-(0?)(\d+)/, '$2'); if (newKey !== key) migrated = true;
        if (newStickers[newKey]) newStickers[newKey].count += value.count; else newStickers[newKey] = { have: true, count: value.count };
    }
    if (migrated) { state.stickers = newStickers; saveState(); }
}
function getStickerState(code) { return state.stickers[code] || { have: false, count: 0 }; }

function toggleSticker(code, ev) {
    if(ev) ev.stopPropagation(); let s = getStickerState(code);
    if (!s.have) { s.have = true; s.count = 1; triggerConfetti(ev.clientX, ev.clientY); } else { s.count++; }
    state.stickers[code] = s; saveState(); checkMilestones();
    if(currentOpenTeam) renderStickersGrid(currentOpenTeam); updateHomeProgress();
}

function decrementSticker(code, ev) {
    if(ev) ev.stopPropagation(); let s = getStickerState(code);
    if (s.have && s.count > 0) { s.count--; if (s.count === 0) s.have = false; state.stickers[code] = s; saveState(); if(currentOpenTeam) renderStickersGrid(currentOpenTeam); updateHomeProgress(); }
}

function getHaveCount() { return Object.values(state.stickers || {}).filter(s => s.have).length; }
function getTeamProgress(teamCode) {
    if (!window.DATA || !window.DATA.TEAMS) return { have: 0, total: 0 };
    const team = window.DATA.TEAMS.find(t => t.code === teamCode); if(!team) return { have: 0, total: 0 };
    let have = team.stickers.filter(s => getStickerState(s.code).have).length; return { have, total: team.stickers.length };
}

function getTotalProgress() {
    let have = getHaveCount(); let total = window.DATA ? window.DATA.TOTAL_STICKERS : 994;
    let percentage = Math.round((have / total) * 100) || 0; if (percentage === 100 && have < total) percentage = 99;
    return { have, total, percentage };
}

function checkMilestones() {
    const p = getTotalProgress().percentage; const targets = [25, 50, 75, 100];
    if(!state.milestones) state.milestones = {};
    for (let t of targets) { if (p >= t && !state.milestones[`m${t}`]) { state.milestones[`m${t}`] = true; saveState(); shootBigConfetti(); setTimeout(() => alert(`¡Felicidades! Has completado el ${t}% del álbum.`), 500); } }
}

function getRepeatedList() {
    let repeated = []; if (!window.DATA || !window.DATA.TEAMS) return repeated;
    window.DATA.TEAMS.forEach(team => { let teamReps = []; team.stickers.forEach(s => { let st = getStickerState(s.code); if (st.have && st.count > 1) { teamReps.push({ name: s.name, count: st.count - 1 }); } }); if (teamReps.length > 0) repeated.push({ team: team.name, items: teamReps }); }); return repeated;
}

function getRepeatedTotal() { return Object.values(state.stickers || {}).reduce((sum, s) => s.have && s.count > 1 ? sum + (s.count - 1) : sum, 0); }
function getMissingList() { let missing = []; if (!window.DATA || !window.DATA.TEAMS) return missing; window.DATA.TEAMS.forEach(team => { team.stickers.forEach(s => { if (!getStickerState(s.code).have) missing.push({ team: team.name, name: s.name }); }); }); return missing; }

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

// === app.js (makeTeamCard ACTUALIZADA V37) ===
function makeTeamCard(team) {
    const prog = getTeamProgress(team.code); let pct = Math.round((prog.have / prog.total) * 100) || 0; if (pct === 100 && prog.have < prog.total) pct = 99;
    
    const div = document.createElement('div'); div.className = `team-card ${prog.have === prog.total ? 'completed' : ''}`; div.id = `team-card-${team.code}`; div.onclick = () => openTeamDetail(team);
    
    // NUEVA LÓGICA DE ÍCONO V37: Evita deformaciones y soporta SVG
    let iconHtml = '';
    if (team.flag) {
        // Es un país (Nación), usamos la bandera
        iconHtml = `<img src="${team.flag}" class="team-icon" alt="${team.name}" style="object-fit: cover;">`;
    } else if (team.icon) {
        // Es una sección especial
        if (team.icon.endsWith('.svg')) {
            // Es un logo SVG (NUEVO V37): Usamos 'contain' para no deformar
            iconHtml = `<img src="${team.icon}" class="team-icon section-logo" alt="${team.name}" style="object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)); padding: 2px;">`;
        } else {
            // Es un Emoji viejo (Legacy)
            iconHtml = `<div class="team-icon emoji-icon" style="font-size:24px; display:flex; align-items:center; justify-content:center;">${team.icon}</div>`;
        }
    } else {
        iconHtml = `<div class="team-icon placeholder">?</div>`;
    }
    
    div.innerHTML = `<div class="team-card-header">${iconHtml}<div class="team-info"><h3>${team.name}</h3><span>${team.group}</span></div></div><div class="team-stats"><span>Progreso</span><span id="card-count-${team.code}">${prog.have}/${prog.total} (${pct}%)</span></div><div class="linear-progress"><div class="linear-bar" id="card-bar-${team.code}" style="width: ${pct}%;"></div></div>`; return div;
}


function makeStickerCard(sticker) {
    const st = getStickerState(sticker.code); const div = document.createElement('div'); const isSpecial = sticker.type === 'special' || sticker.type === 'shield' || sticker.type === 'group'; div.className = `sticker ${st.have ? 'have animate-pop' : ''} ${isSpecial ? 'special' : ''}`; div.onclick = (e) => toggleSticker(sticker.code, e);
    let badge = st.count > 1 ? `<span class="sticker-badge">+${st.count - 1}</span>` : '';
    div.innerHTML = `<span class="sticker-name" style="${isSpecial ? 'color: var(--gold)' : ''}">${formatCode(sticker.name)}</span>${badge}<button class="btn-minus" onclick="decrementSticker('${sticker.code}', event)">-</button>`; return div;
}

// === app.js (openTeamDetail ACTUALIZADA V38) ===
function openTeamDetail(team) {
    currentOpenTeam = team; 
    document.getElementById('modal-team-name').innerText = team.name; 
    document.getElementById('modal-team-group').innerText = team.group;
    
    const iconEl = document.getElementById('modal-team-icon');
    
    // CORRECCIÓN V38: Permitir que los logotipos SVG se muestren en el detalle de la sección
    if (team.flag) {
        // Si es una selección nacional, muestra la bandera de forma normal
        iconEl.src = team.flag;
        iconEl.style.display = 'block';
        iconEl.style.objectFit = 'cover';
        iconEl.style.padding = '0';
    } else if (team.icon && team.icon.endsWith('.svg')) {
        // Si es una sección especial con logo SVG (NUEVO V38), inyecta el logo sin deformarlo
        iconEl.src = team.icon;
        iconEl.style.display = 'block';
        iconEl.style.objectFit = 'contain';
        iconEl.style.padding = '2px'; // Pequeña separación estética
    } else {
        // Si no cuenta con ningún elemento visual, se oculta el contenedor de la imagen
        iconEl.style.display = 'none';
    }
    
    renderStickersGrid(team); 
    showModal('modal-team');
}


function renderStickersGrid(team) { const grid = document.getElementById('modal-stickers-grid'); grid.innerHTML = ''; team.stickers.forEach(s => { grid.appendChild(makeStickerCard(s)); }); updateTeamCount(team.code); }

function updateTeamCount(teamCode) {
    const p = getTeamProgress(teamCode); const countEl = document.getElementById('modal-team-count'); if(countEl) countEl.innerText = `${p.have}/${p.total}`;
    const cardCount = document.getElementById(`card-count-${teamCode}`); const cardBar = document.getElementById(`card-bar-${teamCode}`); const card = document.getElementById(`team-card-${teamCode}`);
    if (cardCount) {
        let pct = Math.round((p.have / p.total) * 100) || 0; if (pct === 100 && p.have < p.total) pct = 99;
        cardCount.innerText = `${p.have}/${p.total} (${pct}%)`; cardBar.style.width = `${pct}%`;
        if (p.have === p.total && p.total > 0) { card.classList.add('completed'); if(!state.milestones) state.milestones = {}; if(!state.milestones[`team_${teamCode}`]) { state.milestones[`team_${teamCode}`] = true; shootBigConfetti(); } } else { card.classList.remove('completed'); }
    }
}
function applyCollectionSearch() {
    if (!window.DATA || !window.DATA.TEAMS) return;
    let filtered = window.DATA.TEAMS.filter(t => {
        let matchText = true;
        if (activeSearch.text) { let txt = activeSearch.text.toLowerCase(); let hasSticker = t.stickers.some(s => s.name.toLowerCase().includes(txt)); matchText = t.name.toLowerCase().includes(txt) || t.group.toLowerCase().includes(txt) || hasSticker; }
        return matchText && (activeSearch.team === 'all' || t.code === activeSearch.team) && (activeSearch.group === 'all' || t.group === activeSearch.group);
    });
    if (activeSearch.sort === 'most') { filtered.sort((a,b) => (getTeamProgress(b.code).have / b.stickers.length) - (getTeamProgress(a.code).have / a.stickers.length)); }
    else if (activeSearch.sort === 'least') { filtered.sort((a,b) => (getTeamProgress(a.code).have / a.stickers.length) - (getTeamProgress(b.code).have / b.stickers.length)); }
    else if (activeSearch.sort === 'az') { filtered.sort((a,b) => a.name.localeCompare(b.name)); }
    renderTeamsGrid(filtered);
}

function clearFilters() { document.getElementById('search-input').value = ''; document.getElementById('filter-team').value = 'all'; document.getElementById('filter-group').value = 'all'; activeSearch = { ...activeSearch, text: '', team: 'all', group: 'all' }; applyCollectionSearch(); }
function populateTeamFilter() { const sel = document.getElementById('filter-team'); if(!sel || !window.DATA || !window.DATA.TEAMS) return; window.DATA.TEAMS.forEach(t => { const opt = document.createElement('option'); opt.value = t.code; opt.innerText = t.name; sel.appendChild(opt); }); }
function populateGroupFilter() { const sel = document.getElementById('filter-group'); if(!sel || !window.DATA || !window.DATA.TEAMS) return; const groups = new Set(window.DATA.TEAMS.map(t => t.group)); groups.forEach(g => { const opt = document.createElement('option'); opt.value = g; opt.innerText = g; sel.appendChild(opt); }); }

function renderTrades() {
    const reps = getRepeatedList(); const total = getRepeatedTotal();
    document.getElementById('trades-total-text').innerText = `Total repetidas: ${total}`; const list = document.getElementById('trades-list'); if(!list) return; list.innerHTML = '';
    if (reps.length === 0) { list.innerHTML = '<p style="color: var(--text-muted); text-align:center; padding: 2rem;">No tienes láminas repetidas aún.</p>'; }
    else { reps.forEach(group => { const grpDiv = document.createElement('div'); grpDiv.className = 'trade-group'; let itemsHtml = group.items.map(i => `<span class="trade-item">${formatCode(i.name)} (x${i.count})</span>`).join(''); grpDiv.innerHTML = `<h3>${group.team}</h3><div class="trade-items">${itemsHtml}</div>`; list.appendChild(grpDiv); }); }
    updateTradeExportButtons(total > 0);
}

function updateTradeExportButtons(hasRepeated) { const disabled = !hasRepeated; document.getElementById('btn-share-list').disabled = disabled; document.getElementById('btn-export-pdf').disabled = disabled; document.getElementById('btn-export-excel').disabled = disabled; document.getElementById('btn-download-missing').disabled = (getTotalProgress().percentage === 100); }
function getTradeExportRows() { let rows = []; getRepeatedList().forEach(g => { let itemsStr = g.items.map(i => { let num = formatCode(i.name); return i.count > 1 ? `${num}(x${i.count})` : num; }).join(', '); rows.push({ section: g.team, text: itemsStr }); }); return rows; }
function getMissingExportRows() { let rows = []; let map = {}; getMissingList().forEach(m => { if(!map[m.team]) map[m.team] = []; map[m.team].push(formatCode(m.name)); }); for(let team in map){ rows.push({ section: team, text: map[team].join(', ') }); } return rows; }
function generateShareText() { const p = getTotalProgress(); let txt = `*${state.profile.name}*\nProgreso: ${p.have}/${p.total} (${p.percentage}%)\nRepetidas: ${getRepeatedTotal()}\n\n`; getTradeExportRows().forEach(r => { txt += `${r.section}: ${r.text}\n`; }); document.getElementById('share-textarea').value = txt; showModal('modal-share'); }
function removeAccents(str) { if (!str) return ''; return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

function exportTradesExcel() { let csv = 'Seccion,Laminas Repetidas\n'; getTradeExportRows().forEach(r => { csv += `"${removeAccents(r.section)}","${r.text}"\n`; }); downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'cambios_album_mundial_2026.csv'); }
function exportMissingExcel() { let csv = 'Seccion,Laminas Faltantes\n'; getMissingExportRows().forEach(r => { csv += `"${removeAccents(r.section)}","${r.text}"\n`; }); downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'faltantes_album_mundial_2026.csv'); }

function exportTradesPdf() {
    const p = getTotalProgress();
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cambios Álbum 2026</title><style>body{font-family:sans-serif; padding: 20px;} table{width:100%;border-collapse:collapse; margin-top: 20px;} th,td{border:1px solid #ccc;padding:8px;text-align:left;}</style></head><body><h1>Cambios - ${state.profile.name}</h1><p>Progreso: ${p.have}/${p.total} (${p.percentage}%) | Total repetidas: ${getRepeatedTotal()}</p><table><tr><th style="width:150px">Sección</th><th>Láminas Repetidas</th></tr>`;
    getTradeExportRows().forEach(r => { html += `<tr><td>${r.section}</td><td>${r.text}</td></tr>`; });
    html += `</table></body></html>`;
    const iframe = document.createElement('iframe'); iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
    document.body.appendChild(iframe);
    const win = iframe.contentWindow; win.document.open(); win.document.write(html); win.document.close();
    setTimeout(() => { win.focus(); try { win.print(); } catch (err) { alert('Bloqueado por el dispositivo. Usa Exportar Excel.'); } setTimeout(() => document.body.removeChild(iframe), 2000); }, 800);
}
// ==== LÓGICA QR Y MATCH V36 (PERFECCIÓN MATEMÁTICA Y BITMASK) ====

function getMinifiedTradeData() {
    const minified = { n: state.profile.name, s: {} };
    // 1. Exportar Repetidas
    for (const [code, sticker] of Object.entries(state.stickers)) {
        if (sticker.have && sticker.count > 1) { minified.s[code] = sticker.count; }
    }
    // 2. Comprimir faltantes en un mapa de bits Hexadecimal ultra-ligero
    let bitString = "";
    if (window.DATA && window.DATA.TEAMS) {
        window.DATA.TEAMS.forEach(team => {
            team.stickers.forEach(s => {
                bitString += getStickerState(s.code).have ? "0" : "1";
            });
        });
        while(bitString.length % 4 !== 0) bitString += "0";
        let hexString = "";
        for(let i=0; i<bitString.length; i+=4) {
            hexString += parseInt(bitString.substring(i, i+4), 2).toString(16);
        }
        minified.m = hexString;
    }
    return JSON.stringify(minified);
}

function showMyQR() { loadQRLibraries(() => {
    if (state.profile.name === 'Mi Álbum') { const userName = prompt('Antes de generar el QR, ¿Cómo te llamas?'); if (userName) updateProfileName(userName); }
    const jsonStr = getMinifiedTradeData();
    if (jsonStr.length > 2500) { alert("⚠️ Tienes demasiadas láminas repetidas. Usa el botón 'Copiar Texto'."); return; }
    const imgEl = document.getElementById('qr-image');
    try { QRCode.toDataURL(jsonStr, { width: 800, margin: 2, errorCorrectionLevel: 'L', color: { dark: '#000', light: '#fff' } }, function (error, url) { if (error) { alert("Error interno. Usa 'Copiar Texto'."); } else { imgEl.src = url; showModal('modal-my-qr'); } }); } catch (e) { alert("Error al generar QR."); }
}); }

function downloadQR() { const imgEl = document.getElementById('qr-image'); if (!imgEl || !imgEl.src) return; const a = document.createElement('a'); a.href = imgEl.src; a.download = `QR_Album_${(state.profile.name || 'Mi_Album').replace(/\s+/g, '_')}.png`; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
function copyMyJsonForTrade() { if (state.profile.name === 'Mi Álbum') { const userName = prompt('¿Cómo te llamas?'); if (userName) updateProfileName(userName); } navigator.clipboard.writeText(getMinifiedTradeData()).then(() => alert(`¡Copiado!`)); }

function openCameraScanner() { loadQRLibraries(() => {
    showModal('modal-scanner'); html5QrcodeScanner = new Html5Qrcode("qr-reader");
    html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (decodedText) => { closeScannerModal(); document.getElementById('match-input').value = decodedText; compareTradesFromText(); }, (errorMessage) => {} ).catch(err => { alert("No se pudo iniciar la cámara."); closeScannerModal(); });
}); }

function closeScannerModal() { if (html5QrcodeScanner) { html5QrcodeScanner.stop().then(() => { html5QrcodeScanner.clear(); closeModal('modal-scanner'); }).catch(e => closeModal('modal-scanner')); } else { closeModal('modal-scanner'); } }

function uploadQRImage(event) { const file = event.target.files[0]; if (!file) return; loadQRLibraries(() => {
    const reader = new FileReader();
    reader.onload = (e) => { const img = new Image(); img.onload = () => {
            const canvas = document.getElementById('hidden-qr-canvas'); const context = canvas.getContext('2d', { willReadFrequently: true });
            const maxSize = 2000; let w = img.width; let h = img.height;
            if (w > maxSize || h > maxSize) { const r = Math.min(maxSize / w, maxSize / h); w *= r; h *= r; }
            canvas.width = w; canvas.height = h; context.fillStyle = '#FFFFFF'; context.fillRect(0, 0, w, h); context.drawImage(img, 0, 0, w, h);
            const data = context.getImageData(0, 0, w, h); const code = jsQR(data.data, data.width, data.height, { inversionAttempts: "attemptBoth" });
            if (code) { document.getElementById('match-input').value = code.data; compareTradesFromText(); } else { alert('No se pudo leer el código QR.'); }
        }; img.src = e.target.result; }; reader.readAsDataURL(file); event.target.value = ''; 
}); }

let lastMatchResult = null;
function clearMatchInput() { document.getElementById('match-input').value = ''; document.getElementById('match-results-container').style.display = 'none'; lastMatchResult = null; }
function compareTradesFromText() {
    const input = document.getElementById('match-input').value.trim(); if (!input) return;
    try {
        const parsed = JSON.parse(input);
        
        // Reconstrucción del álbum del amigo con precisión absoluta
        let friendState = { profile: { name: parsed.n || 'Tu contacto' }, stickers: {}, legacy: !parsed.m };
        let bitString = "";
        if (parsed.m) {
            for(let i=0; i<parsed.m.length; i++) {
                bitString += parseInt(parsed.m[i], 16).toString(2).padStart(4, '0');
            }
        }
        
        if (!window.DATA || !window.DATA.TEAMS) return;
        
        let index = 0;
        window.DATA.TEAMS.forEach(team => {
            team.stickers.forEach(s => {
                const code = s.code;
                // Si es versión vieja, asume falsamente que le faltan las no repetidas. Si es nueva, decodifica el Bitmask.
                let isMissing = friendState.legacy ? !(parsed.s && parsed.s[code]) : (bitString[index] === "1");
                let count = (parsed.s && parsed.s[code]) ? parsed.s[code] : (isMissing ? 0 : 1);
                friendState.stickers[code] = { have: !isMissing, count: count };
                index++;
            });
        });

        let iReceive = {}; let iGive = {};    
        window.DATA.TEAMS.forEach(team => {
            team.stickers.forEach(s => {
                const code = s.code; 
                const mySticker = getStickerState(code); 
                const friendSticker = friendState.stickers[code] || { have: false, count: 0 }; 
                const myName = formatCode(s.name);
                
                // Yo recibo: Él tiene >1 y a mí me falta
                if (!mySticker.have && friendSticker.have && friendSticker.count > 1) { 
                    if(!iReceive[team.name]) iReceive[team.name] = []; iReceive[team.name].push(myName); 
                }
                // Yo doy: Yo tengo >1 y a él le falta (ahora es 100% real)
                if (!friendSticker.have && mySticker.have && mySticker.count > 1) { 
                    if(!iGive[team.name]) iGive[team.name] = []; iGive[team.name].push(myName); 
                }
            }); 
        });
        
        lastMatchResult = { iReceive, iGive, friendName: friendState.profile?.name || 'Tu contacto', legacy: friendState.legacy }; 
        renderMatchResults();
    } catch(e) { alert('Los datos leídos no son válidos.'); }
}

function renderMatchResults() {
    if(!lastMatchResult) return;
    let totalRec = 0; for(let team in lastMatchResult.iReceive) totalRec += lastMatchResult.iReceive[team].length;
    let totalGive = 0; for(let team in lastMatchResult.iGive) totalGive += lastMatchResult.iGive[team].length;
    let optimal = Math.min(totalRec, totalGive); let bottleneck = totalRec < totalGive ? `(Menos repetidas: ${lastMatchResult.friendName})` : totalGive < totalRec ? `(Menos repetidas: Tú)` : `(Ambos ofrecen igual)`;
    
    let html = `<p style="text-align:center; color:var(--text-secondary); margin-bottom:1rem;">Comparación con: <strong style="color:var(--text-primary); font-size:1.1rem;">${lastMatchResult.friendName}</strong></p>`;
    
    if (lastMatchResult.legacy) {
        html += `<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; padding: 0.8rem; border-radius: 8px; margin-bottom: 1rem; color: #ef4444; font-size: 0.85rem; text-align: center;">⚠️ Tu contacto generó este código con una versión antigua. Las láminas que le puedes entregar no serán exactas. Pídele que actualice su app.</div>`;
    }

    html += `<div style="background: rgba(59,130,246,0.1); border: 1px dashed var(--blue-accent); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: center;">
        <p style="margin-bottom: 0.5rem; color: var(--text-primary);"><strong>📊 Resumen del Match</strong></p><p style="font-size: 0.9rem; margin-bottom: 0.2rem; color: var(--text-secondary);">Recibes: <strong style="color:var(--green-complete)">${totalRec}</strong> láminas</p><p style="font-size: 0.9rem; margin-bottom: 0.8rem; color: var(--text-secondary);">Entregas: <strong style="color:var(--gold)">${totalGive}</strong> láminas</p><div style="background: var(--blue-accent); color: white; padding: 0.4rem 0.8rem; border-radius: 6px; display: inline-block;"><strong>Máx. cambios: ${optimal}</strong> <span style="font-size: 0.8rem; opacity: 0.9;">${bottleneck}</span></div>
    </div><div class="match-columns"><div class="match-col"><h3>⬇️ Me puede dar</h3>`;
    
    let recCount = 0; for(let team in lastMatchResult.iReceive) { html += `<strong>${team}</strong><span>${lastMatchResult.iReceive[team].join(', ')}</span>`; recCount++; }
    if(recCount === 0) html += '<p class="text-muted">Ninguna :(</p>'; html += '</div><div class="match-col"><h3>⬆️ Le puedo dar</h3>';
    let giveCount = 0; for(let team in lastMatchResult.iGive) { html += `<strong>${team}</strong><span>${lastMatchResult.iGive[team].join(', ')}</span>`; giveCount++; }
    if(giveCount === 0) html += '<p class="text-muted">Ninguna :(</p>'; html += '</div></div>';
    
    document.getElementById('match-results').innerHTML = html; document.getElementById('match-results-container').style.display = 'block';
}

function shareMatchWhatsApp() {
    if(!lastMatchResult) return;
    let tRec = 0; for(let team in lastMatchResult.iReceive) tRec += lastMatchResult.iReceive[team].length;
    let tGive = 0; for(let team in lastMatchResult.iGive) tGive += lastMatchResult.iGive[team].length;
    let opt = Math.min(tRec, tGive); let bot = tRec < tGive ? `(Menos repetidas: ${lastMatchResult.friendName})` : tGive < tRec ? `(Menos repetidas: Yo)` : `(Ambos igual)`;
    let text = `*¡Hola ${lastMatchResult.friendName}! He revisado las láminas para intercambiar:*\n\n*📊 RESUMEN:*\n- Recibo de ti: ${tRec}\n- Te entrego: ${tGive}\n*🔥 Cambios posibles: ${opt}* ${bot}\n\n*⬇️ Me puedes dar:*\n`;
    let recCount = 0; for(let team in lastMatchResult.iReceive) { text += `- ${team}: ${lastMatchResult.iReceive[team].join(', ')}\n`; recCount++; } if(recCount===0) text += 'Ninguna\n';
    text += `\n*⬆️ Yo te puedo dar:*\n`; let giveCount = 0; for(let team in lastMatchResult.iGive) { text += `- ${team}: ${lastMatchResult.iGive[team].join(', ')}\n`; giveCount++; } if(giveCount===0) text += 'Ninguna\n';
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

// UTILIDADES Y EVENTOS
function downloadBlob(b, f) { const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = f; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u); }
function exportData() { downloadBlob(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), 'album_mundial_2026.json'); }
function importData(e) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { try { const d = JSON.parse(ev.target.result); if (d.stickers) { state = d; saveState(); init(); closeModal('modal-settings'); alert('Álbum restaurado.'); } } catch (err) { alert('Archivo JSON inválido.'); } }; r.readAsText(f); }
function confirmReset() { if (confirm('¿Seguro que deseas reiniciar el álbum?')) { state.stickers = {}; state.milestones = {}; saveState(); closeModal('modal-settings'); init(); } }
function forceUpdateCache() { if ('caches' in window) { caches.keys().then(names => { for (let n of names) caches.delete(n); }).then(() => { alert("Caché borrada."); window.location.href = window.location.pathname + '?v=' + new Date().getTime(); }); } else { window.location.reload(true); } }
function toggleTheme() { const root = document.documentElement; if (root.getAttribute('data-theme') === 'light') { root.removeAttribute('data-theme'); localStorage.setItem('album_theme_2026', 'dark'); } else { root.setAttribute('data-theme', 'light'); localStorage.setItem('album_theme_2026', 'light'); } }
function loadTheme() { if (localStorage.getItem('album_theme_2026') === 'light') document.documentElement.setAttribute('data-theme', 'light'); }
function showModal(id) { const m = document.getElementById(id); if(m) m.style.display = 'flex'; }
function closeModal(id) { const m = document.getElementById(id); if(m) m.style.display = 'none'; currentOpenTeam = null; }
function updateHeaderOffset() { const h = document.querySelector('.app-header'); if(h) document.documentElement.style.setProperty('--header-offset', `${h.offsetHeight + 18}px`); }
function observeHeaderOffset() { updateHeaderOffset(); window.addEventListener('resize', updateHeaderOffset); window.addEventListener('orientationchange', () => setTimeout(updateHeaderOffset, 150)); if(document.fonts) document.fonts.ready.then(updateHeaderOffset); }

function bindEvents() {
    const click = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
    const input = (id, fn) => { const el = document.getElementById(id); if(el) el.oninput = fn; };
    click('btn-theme', toggleTheme); click('btn-settings', () => showModal('modal-settings')); click('btn-clear-filters', clearFilters); click('btn-share-list', generateShareText); click('btn-export-excel', exportTradesExcel); click('btn-export-pdf', exportTradesPdf); click('btn-download-missing', exportMissingExcel);
    input('search-input', (e) => { activeSearch.text = e.target.value; applyCollectionSearch(); }); document.getElementById('filter-team').onchange = (e) => { activeSearch.team = e.target.value; applyCollectionSearch(); }; document.getElementById('filter-group').onchange = (e) => { activeSearch.group = e.target.value; applyCollectionSearch(); }; document.getElementById('sort-select').onchange = (e) => { activeSearch.sort = e.target.value; applyCollectionSearch(); };
    document.querySelectorAll('.nav-btn').forEach(btn => { btn.onclick = () => { document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active')); btn.classList.add('active'); const t = btn.getAttribute('data-target'); document.getElementById(t).classList.add('active'); if (t === 'tab-trades') renderTrades(); window.scrollTo(0, 0); }; });
}

function triggerConfetti(x, y) {
    const canvas = document.getElementById('confetti-canvas'); if(!canvas) return; const ctx = canvas.getContext('2d'); canvas.width = window.innerWidth; canvas.height = window.innerHeight; let particles = [];
    for(let i=0; i<30; i++) particles.push({ x, y, r: Math.random()*4+2, dx: Math.random()*6-3, dy: Math.random()*-6-2, color: `hsl(${Math.random()*360}, 100%, 50%)` });
    function animate() { ctx.clearRect(0,0,canvas.width,canvas.height); let active = false; particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.dy += 0.2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fillStyle = p.color; ctx.fill(); if(p.y < canvas.height) active = true; }); if(active) requestAnimationFrame(animate); else ctx.clearRect(0,0,canvas.width,canvas.height); } animate();
}
function shootBigConfetti() { triggerConfetti(window.innerWidth/2, window.innerHeight/2); setTimeout(() => triggerConfetti(window.innerWidth/3, window.innerHeight/2), 200); setTimeout(() => triggerConfetti((window.innerWidth/3)*2, window.innerHeight/2), 400); }
document.addEventListener('DOMContentLoaded', init);
