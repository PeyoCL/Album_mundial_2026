// app.js v49.1 - Controlador de UI (Completo y Refactorizado)
import { globalState, loadStore, saveStore, getActiveAlbum, createNewAlbum, deleteActiveAlbum } from './store.js';
import { getGlobalMinifiedData, compareGlobalTrades, executeGlobalTrade, lastMatchResult } from './match.js';

window.onerror = function(msg, url, line) { alert("🚨 ERROR EN LA APP:\n" + msg + "\nLínea: " + line); return false; };

let activeSearch = { text: '', team: 'all', group: 'all', sort: 'all' };
let currentOpenTeam = null;
let html5QrcodeScanner = null;

function loadQRLibraries(cb) {
    const p = []; const ls = (src) => new Promise((r, j) => { const s = document.createElement('script'); s.src = src; s.onload = r; s.onerror = j; document.head.appendChild(s); });
    if (typeof QRCode === 'undefined') p.push(ls('https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js'));
    if (typeof jsQR === 'undefined') p.push(ls('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'));
    if (typeof Html5Qrcode === 'undefined') p.push(ls('https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js'));
    if (p.length > 0) Promise.all(p).then(cb).catch(()=>alert("Error cargando librerías QR")); else if(cb) cb();
}

function formatCode(n) { return n === '00' ? '00' : n.replace(/^([A-Z]+)(\d+)$/, '$1 $2'); }

async function init() {
    try {
        if (window.LOAD_DATA) await window.LOAD_DATA();
        loadStore();
        loadTheme();
        
        const title = document.getElementById('album-title');
        if(title) { 
            title.addEventListener('blur', () => updateProfileName(title.innerText)); 
            title.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } }); 
        }
        const inputProfile = document.getElementById('input-profile-name'); 
        if(inputProfile) inputProfile.addEventListener('input', (e) => updateProfileName(e.target.value, false));
        
        const displaySelect = document.getElementById('setting-display-mode');
        if (displaySelect) {
            displaySelect.value = globalState.displayMode || 'code';
            displaySelect.addEventListener('change', (e) => { globalState.displayMode = e.target.value; saveStore(); applyCollectionSearch(); if(currentOpenTeam) renderStickersGrid(currentOpenTeam); });
        }

        renderAlbumSelector();
        updateUIForActiveAlbum();
        
        populateTeamFilter(); populateGroupFilter(); bindEvents(); observeHeaderOffset(); checkIOSInstall();
    } catch (error) { alert("Error en init: " + error.message); }
}

function renderAlbumSelector() {
    const sel = document.getElementById('select-album-global');
    if(!sel) return;
    sel.innerHTML = '';
    for (let id in globalState.albums) {
        let opt = document.createElement('option');
        opt.value = id; opt.innerText = globalState.albums[id].profile.name;
        if (id === globalState.activeAlbumId) opt.selected = true;
        sel.appendChild(opt);
    }
    sel.onchange = (e) => {
        globalState.activeAlbumId = e.target.value;
        saveStore(); updateUIForActiveAlbum();
    };
    
    const btnManage = document.getElementById('btn-manage-albums');
    if (btnManage) {
        btnManage.onclick = () => {
            let action = prompt("Escribe 'NUEVO' para crear un álbum, o 'BORRAR' para eliminar el actual.");
            if(action === 'NUEVO') { let n = prompt("Nombre del nuevo álbum:"); if(n) { createNewAlbum(n); renderAlbumSelector(); updateUIForActiveAlbum(); } }
            else if (action === 'BORRAR') { deleteActiveAlbum(); }
        };
    }
}

function updateProfileName(newName, updateInput = true) {
    let name = newName ? newName.trim() : 'Mi Álbum';
    getActiveAlbum().profile.name = name;
    const titleEl = document.getElementById('album-title'); if (titleEl) titleEl.innerText = name;
    if (updateInput) { const inputEl = document.getElementById('input-profile-name'); if (inputEl) inputEl.value = name; }
    saveStore(); renderAlbumSelector();
}

function updateUIForActiveAlbum() {
    const album = getActiveAlbum();
    document.getElementById('album-title').innerText = album.profile.name;
    const inputProfile = document.getElementById('input-profile-name'); if(inputProfile) inputProfile.value = album.profile.name;
    
    applyCollectionSearch();
    renderDashboardCards();
    renderTrades();
    if(currentOpenTeam) openTeamDetail(currentOpenTeam);
}

// --- LOGICA STICKERS ---
function getStickerState(code) { return getActiveAlbum().stickers[code] || { have: false, count: 0 }; }

window.toggleSticker = function(code, ev) {
    if(ev) ev.stopPropagation(); let s = getStickerState(code);
    if (!s.have) { s.have = true; s.count = 1; triggerConfetti(ev?.clientX || window.innerWidth/2, ev?.clientY || window.innerHeight/2); } else { s.count++; }
    getActiveAlbum().stickers[code] = s; saveStore(); checkMilestones(); updateUIForActiveAlbum();
}

window.decrementSticker = function(code, ev) {
    if(ev) ev.stopPropagation(); let s = getStickerState(code);
    if (s.have && s.count > 0) { s.count--; if(s.count === 0) s.have = false; getActiveAlbum().stickers[code] = s; saveStore(); updateUIForActiveAlbum(); }
}

function getHaveCount() { return Object.values(getActiveAlbum().stickers).filter(s => s.have).length; }
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
function getRepeatedTotal() { return Object.values(getActiveAlbum().stickers).reduce((sum, s) => s.have && s.count > 1 ? sum + (s.count - 1) : sum, 0); }

function getRepeatedList() {
    let repeated = []; if (!window.DATA || !window.DATA.TEAMS) return repeated;
    window.DATA.TEAMS.forEach(team => { let teamReps = []; team.stickers.forEach(s => { let st = getStickerState(s.code); if (st.have && st.count > 1) { teamReps.push({ name: s.name, count: st.count - 1, code: s.code }); } }); if (teamReps.length > 0) repeated.push({ team: team.name, items: teamReps }); }); return repeated;
}
function getMissingList() {
    let missing = []; if (!window.DATA || !window.DATA.TEAMS) return missing; window.DATA.TEAMS.forEach(team => { team.stickers.forEach(s => { if (!getStickerState(s.code).have) missing.push({ team: team.name, name: s.name, code: s.code }); }); }); return missing;
}

function checkMilestones() {
    const p = getTotalProgress().percentage; const targets = [25, 50, 75, 100]; 
    let m = getActiveAlbum().milestones; if(!m) { m = {}; getActiveAlbum().milestones = m; }
    for (let t of targets) { if (p >= t && !m[`m${t}`]) { m[`m${t}`] = true; saveStore(); shootBigConfetti(); setTimeout(() => alert(`¡Felicidades! Has completado el ${t}% de este álbum.`), 500); } }
}

// --- RENDER UI ---
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

function makeTeamCard(team) {
    const prog = getTeamProgress(team.code); let pct = Math.round((prog.have / prog.total) * 100) || 0; if (pct === 100 && prog.have < prog.total) pct = 99;
    const div = document.createElement('div'); div.className = `team-card ${prog.have === prog.total && prog.total > 0 ? 'completed' : ''}`; div.id = `team-card-${team.code}`; div.onclick = () => openTeamDetail(team);
    let iconHtml = '';
    if (team.icon && team.icon.endsWith('.svg')) { iconHtml = `<img src="${team.icon}" class="team-icon section-logo" alt="${team.name}" style="object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)); padding: 2px;">`; } else if (team.icon) { iconHtml = `<div class="team-icon emoji-icon" style="font-size:24px; display:flex; align-items:center; justify-content:center;">${team.icon}</div>`; } else { iconHtml = `<div class="team-icon placeholder">?</div>`; }
    div.innerHTML = `<div class="team-card-header">${iconHtml}<div class="team-info"><h3>${team.name}</h3><span>${team.group}</span></div></div><div class="team-stats"><span>Progreso</span><span id="card-count-${team.code}">${prog.have}/${prog.total} (${pct}%)</span></div><div class="linear-progress"><div class="linear-bar" id="card-bar-${team.code}" style="width: ${pct}%;"></div></div>`; return div;
}

function makeStickerCard(sticker) {
    const st = getStickerState(sticker.code); const div = document.createElement('div'); const isSpecial = sticker.type === 'special' || sticker.type === 'shield' || sticker.type === 'group'; div.className = `sticker ${st.have ? 'have animate-pop' : ''} ${isSpecial ? 'special' : ''}`; div.onclick = (e) => window.toggleSticker(sticker.code, e);
    let badge = st.count > 1 ? `<span class="sticker-badge">+${st.count - 1}</span>` : '';
    let codeText = formatCode(sticker.name); let playerText = sticker.playerName || ''; let displayText = codeText; 
    if (globalState.displayMode === 'name' && playerText !== '') { displayText = `<span style="font-size: 0.85em; line-height: 1.1; text-align: center;">${playerText}</span>`; } else if (globalState.displayMode === 'both' && playerText !== '') { displayText = `<span style="font-size: 0.7em; opacity: 0.8; display: block; margin-bottom: 2px;">${codeText}</span><span style="font-size: 0.8em; line-height: 1.1; display: block; text-align: center;">${playerText}</span>`; }
    div.innerHTML = `<span class="sticker-name" style="${isSpecial ? 'color: var(--gold)' : ''}; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; padding: 0 4px;">${displayText}</span>${badge}<button class="btn-minus" onclick="window.decrementSticker('${sticker.code}', event)">-</button>`; return div;
}

function openTeamDetail(team) {
    currentOpenTeam = team; 
    document.getElementById('modal-team-name').innerText = team.name; 
    document.getElementById('modal-team-group').innerText = team.group;
    
    const iconEl = document.getElementById('modal-team-icon');
    let emojiEl = document.getElementById('modal-team-emoji');
    if (!emojiEl) { emojiEl = document.createElement('div'); emojiEl.id = 'modal-team-emoji'; emojiEl.className = 'modal-icon emoji-icon'; emojiEl.style.fontSize = '2.5rem'; emojiEl.style.display = 'flex'; emojiEl.style.alignItems = 'center'; emojiEl.style.justifyContent = 'center'; iconEl.parentNode.insertBefore(emojiEl, iconEl); }

    if (team.icon && team.icon.endsWith('.svg')) { iconEl.src = team.icon; iconEl.style.display = 'block'; iconEl.style.objectFit = 'contain'; iconEl.style.padding = '2px'; emojiEl.style.display = 'none'; } else if (team.icon) { iconEl.style.display = 'none'; emojiEl.innerText = team.icon; emojiEl.style.display = 'flex'; } else { iconEl.style.display = 'none'; emojiEl.style.display = 'none'; }
    
    renderStickersGrid(team); showModal('modal-team');
}

function renderStickersGrid(team) { const grid = document.getElementById('modal-stickers-grid'); grid.innerHTML = ''; team.stickers.forEach(s => { grid.appendChild(makeStickerCard(s)); }); updateTeamCount(team.code); }

function updateTeamCount(teamCode) {
    const p = getTeamProgress(teamCode); 
    const countEl = document.getElementById('modal-team-count'); if(countEl) countEl.innerText = `${p.have}/${p.total}`;
    let pct = Math.round((p.have / p.total) * 100) || 0; if (pct === 100 && p.have < p.total) pct = 99;
    const cardCount = document.getElementById(`card-count-${teamCode}`); const cardBar = document.getElementById(`card-bar-${teamCode}`); const card = document.getElementById(`team-card-${teamCode}`);
    if (cardCount) { cardCount.innerText = `${p.have}/${p.total} (${pct}%)`; cardBar.style.width = `${pct}%`; if (p.have === p.total && p.total > 0) { card.classList.add('completed'); } else { card.classList.remove('completed'); } }
}

function applyCollectionSearch() {
    if (!window.DATA || !window.DATA.TEAMS) return;
    let filtered = window.DATA.TEAMS.filter(t => {
        let matchText = true;
        if (activeSearch.text) { let txt = activeSearch.text.toLowerCase(); let hasSticker = t.stickers.some(s => s.name.toLowerCase().includes(txt) || (s.playerName && s.playerName.toLowerCase().includes(txt))); matchText = t.name.toLowerCase().includes(txt) || t.group.toLowerCase().includes(txt) || hasSticker; }
        return matchText && (activeSearch.team === 'all' || t.code === activeSearch.team) && (activeSearch.group === 'all' || t.group === activeSearch.group);
    });
    if (activeSearch.sort === 'most') { filtered.sort((a,b) => (getTeamProgress(b.code).have / b.stickers.length) - (getTeamProgress(a.code).have / a.stickers.length)); }
    else if (activeSearch.sort === 'least') { filtered.sort((a,b) => (getTeamProgress(a.code).have / a.stickers.length) - (getTeamProgress(b.code).have / b.stickers.length)); }
    else if (activeSearch.sort === 'az') { filtered.sort((a,b) => a.name.localeCompare(b.name)); }
    
    const grid = document.getElementById('teams-grid'); if(!grid) return; grid.innerHTML = '';
    const counterEl = document.getElementById('results-counter'); if(counterEl) counterEl.innerText = `${filtered.length} resultados`;
    filtered.forEach(team => { grid.appendChild(makeTeamCard(team)); });
}

// --- FILTROS ---
function clearFilters() { document.getElementById('search-input').value = ''; document.getElementById('filter-team').value = 'all'; document.getElementById('filter-group').value = 'all'; activeSearch = { ...activeSearch, text: '', team: 'all', group: 'all' }; applyCollectionSearch(); }
function populateTeamFilter() { const sel = document.getElementById('filter-team'); if(!sel || !window.DATA || !window.DATA.TEAMS) return; sel.innerHTML = '<option value="all">Todos los Equipos</option>'; window.DATA.TEAMS.forEach(t => { const opt = document.createElement('option'); opt.value = t.code; opt.innerText = t.name; sel.appendChild(opt); }); }
function populateGroupFilter() { const sel = document.getElementById('filter-group'); if(!sel || !window.DATA || !window.DATA.TEAMS) return; sel.innerHTML = '<option value="all">Todos los Grupos</option>'; const groups = new Set(window.DATA.TEAMS.map(t => t.group)); groups.forEach(g => { const opt = document.createElement('option'); opt.value = g; opt.innerText = g; sel.appendChild(opt); }); }

// --- CAMBIOS / EXPORTACIONES ---
function renderTrades() {
    const reps = getRepeatedList(); const total = getRepeatedTotal();
    const totalText = document.getElementById('trades-total-text'); if (totalText) totalText.innerText = `Total repetidas: ${total}`; 
    const list = document.getElementById('trades-list'); if(!list) return; list.innerHTML = '';
    if (reps.length === 0) { list.innerHTML = '<p style="color: var(--text-muted); text-align:center; padding: 2rem;">No tienes láminas repetidas aún.</p>'; }
    else { reps.forEach(group => { const grpDiv = document.createElement('div'); grpDiv.className = 'trade-group'; let itemsHtml = group.items.map(i => `<span class="trade-item">${formatCode(i.name)} (x${i.count})</span>`).join(''); grpDiv.innerHTML = `<h3>${group.team}</h3><div class="trade-items">${itemsHtml}</div>`; list.appendChild(grpDiv); }); }
    updateTradeExportButtons(total > 0);
}

function updateTradeExportButtons(hasRepeated) { const disabled = !hasRepeated; document.getElementById('btn-share-list').disabled = disabled; document.getElementById('btn-export-pdf').disabled = disabled; document.getElementById('btn-export-excel').disabled = disabled; document.getElementById('btn-download-missing').disabled = (getTotalProgress().percentage === 100); }
function getTradeExportRows() { let rows = []; getRepeatedList().forEach(g => { let itemsStr = g.items.map(i => { let num = formatCode(i.name); return i.count > 1 ? `${num}(x${i.count})` : num; }).join(', '); rows.push({ section: g.team, text: itemsStr }); }); return rows; }
function getMissingExportRows() { let rows = []; let map = {}; getMissingList().forEach(m => { if(!map[m.team]) map[m.team] = []; map[m.team].push(formatCode(m.name)); }); for(let team in map){ rows.push({ section: team, text: map[team].join(', ') }); } return rows; }
function removeAccents(str) { if (!str) return ''; return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

window.exportTradesExcel = function() { let csv = 'Seccion,Laminas Repetidas\n'; getTradeExportRows().forEach(r => { csv += `"${removeAccents(r.section)}","${r.text}"\n`; }); downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'cambios_album.csv'); }
window.exportMissingExcel = function() { let csv = 'Seccion,Laminas Faltantes\n'; getMissingExportRows().forEach(r => { csv += `"${removeAccents(r.section)}","${r.text}"\n`; }); downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'faltantes_album.csv'); }

window.exportTradesPdf = function() {
    const p = getTotalProgress(); 
    let html = `<h1>Láminas Repetidas - ${getActiveAlbum().profile.name}</h1><p>Progreso del Álbum: ${p.have}/${p.total} (${p.percentage}%) | Total de cambios listos: ${getRepeatedTotal()}</p><table><thead><tr><th style="width:180px; background-color:#f5f5f5;">Sección / Equipo</th><th style="background-color:#f5f5f5;">Láminas Disponibles para Cambio</th></tr></thead><tbody>`;
    getTradeExportRows().forEach(r => { html += `<tr><td><strong>${r.section}</strong></td><td>${r.text}</td></tr>`; }); html += `</tbody></table>`;

    const printContainer = document.createElement('div'); printContainer.className = 'print-only-section'; printContainer.innerHTML = html; document.body.appendChild(printContainer);
    const printStyle = document.createElement('style'); printStyle.id = 'dynamic-print-style'; printStyle.innerHTML = `@media print { body > *:not(.print-only-section) { display: none !important; } .print-only-section { display: block !important; position: absolute; left: 0; top: 0; width: 100%; font-family: sans-serif; color: #000; } table { width: 100%; border-collapse: collapse; margin-top: 15px; } th, td { border: 1px solid #111; padding: 10px; text-align: left; font-size: 14px; } h1 { font-size: 22px; margin-bottom: 4px; font-family: sans-serif; } p { color: #444; font-size: 13px; margin-top: 0; font-family: sans-serif; } } @media screen { .print-only-section { display: none !important; } }`; document.head.appendChild(printStyle);

    const cleanup = () => { if (document.body.contains(printContainer)) document.body.removeChild(printContainer); if (document.head.contains(printStyle)) document.head.removeChild(printStyle); window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => { window.print(); setTimeout(cleanup, 3000); }, 300);
};

window.generateShareText = function() { const p = getTotalProgress(); let txt = `*${getActiveAlbum().profile.name}*\nProgreso: ${p.have}/${p.total} (${p.percentage}%)\nRepetidas: ${getRepeatedTotal()}\n\n`; getTradeExportRows().forEach(r => { txt += `${r.section}: ${r.text}\n`; }); document.getElementById('share-textarea').value = txt; showModal('modal-share'); }
function downloadBlob(b, f) { const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = f; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u); }

// --- MATCH GLOBAL Y QR ---
window.showMyQR = function() { loadQRLibraries(() => {
    const jsonStr = getGlobalMinifiedData(); if (jsonStr.length > 2500) { alert("⚠️ Tienes demasiadas láminas repetidas. Usa el botón 'Copiar Texto'."); return; }
    const imgEl = document.getElementById('qr-image');
    try { QRCode.toDataURL(jsonStr, { width: 800, margin: 2, errorCorrectionLevel: 'L', color: { dark: '#000', light: '#fff' } }, function (error, url) { if (error) { alert("Error interno."); } else { imgEl.src = url; showModal('modal-my-qr'); } }); } catch (e) { alert("Error al generar QR."); }
}); };

window.openCameraScanner = function() { loadQRLibraries(() => { showModal('modal-scanner'); html5QrcodeScanner = new Html5Qrcode("qr-reader"); html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, (decodedText) => { closeScannerModal(); document.getElementById('match-input').value = decodedText; processQRText(); }, (errorMessage) => {} ).catch(err => { alert("No se pudo iniciar la cámara."); closeScannerModal(); }); }); }
window.closeScannerModal = function() { if (html5QrcodeScanner) { html5QrcodeScanner.stop().then(() => { html5QrcodeScanner.clear(); closeModal('modal-scanner'); }).catch(e => closeModal('modal-scanner')); } else { closeModal('modal-scanner'); } }

window.uploadQRImage = function(event) { const file = event.target.files[0]; if (!file) return; loadQRLibraries(() => {
    const reader = new FileReader();
    reader.onload = (e) => { const img = new Image(); img.onload = () => {
            const canvas = document.getElementById('hidden-qr-canvas'); const context = canvas.getContext('2d', { willReadFrequently: true }); const maxSize = 2000; let w = img.width; let h = img.height;
            if (w > maxSize || h > maxSize) { const r = Math.min(maxSize / w, maxSize / h); w *= r; h *= r; }
            canvas.width = w; canvas.height = h; context.fillStyle = '#FFFFFF'; context.fillRect(0, 0, w, h); context.drawImage(img, 0, 0, w, h);
            const data = context.getImageData(0, 0, w, h); const code = jsQR(data.data, data.width, data.height, { inversionAttempts: "attemptBoth" });
            if (code) { document.getElementById('match-input').value = code.data; processQRText(); } else { alert('No se pudo leer el código QR.'); }
        }; img.src = e.target.result; }; reader.readAsDataURL(file); event.target.value = ''; 
}); };

function processQRText() {
    const input = document.getElementById('match-input').value.trim();
    if(!input) { clearMatchInput(); return; }
    if(compareGlobalTrades(input)) renderMatchResultsUI();
}

function clearMatchInput() { document.getElementById('match-input').value = ''; document.getElementById('match-results-container').style.display = 'none'; }

function renderMatchResultsUI() {
    if(!lastMatchResult) return;
    let totalRec = 0; for(let team in lastMatchResult.iReceive) totalRec += lastMatchResult.iReceive[team].length;
    let totalGive = 0; for(let team in lastMatchResult.iGive) totalGive += lastMatchResult.iGive[team].length;
    let optimal = Math.min(totalRec, totalGive); let bottleneck = totalRec < totalGive ? `(Menos repetidas: ${lastMatchResult.friendName})` : totalGive < totalRec ? `(Menos repetidas: Familia)` : `(Ambos ofrecen igual)`;
    
    let html = `<p style="text-align:center; color:var(--text-secondary); margin-bottom:1rem;">Comparación Global con: <strong style="color:var(--text-primary); font-size:1.1rem;">${lastMatchResult.friendName}</strong></p>`;
    html += `<div style="background: rgba(59,130,246,0.1); border: 1px dashed var(--blue-accent); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: center;"><p style="margin-bottom: 0.5rem; color: var(--text-primary);"><strong>📊 Resumen Familiar</strong></p><p style="font-size: 0.9rem; margin-bottom: 0.2rem; color: var(--text-secondary);">Familia Recibe: <strong style="color:var(--green-complete)">${totalRec}</strong> láminas</p><p style="font-size: 0.9rem; margin-bottom: 0.8rem; color: var(--text-secondary);">Familia Entrega: <strong style="color:var(--gold)">${totalGive}</strong> láminas</p><div style="background: var(--blue-accent); color: white; padding: 0.4rem 0.8rem; border-radius: 6px; display: inline-block; margin-bottom: 1rem;"><strong>Máx. cambios: ${optimal}</strong> <span style="font-size: 0.8rem; opacity: 0.9;">${bottleneck}</span></div><button class="btn" style="background:var(--green-complete); width:100%; max-width:280px; margin:5px auto 0; display:block; font-size:0.85rem;" onclick="window.applyInterchangeAutomatic()">⚡ Aplicar Intercambio en 1-Clic</button></div><div class="match-columns"><div class="match-col"><h3>⬇️ Familia Recibe</h3>`;
    
    let recCount = 0; for(let team in lastMatchResult.iReceive) { html += `<strong>${team}</strong><span>${lastMatchResult.iReceive[team].join(', ')}</span>`; recCount++; }
    if(recCount === 0) html += '<p class="text-muted">Ninguna :(</p>'; html += '</div><div class="match-col"><h3>⬆️ Familia Entrega</h3>';
    let giveCount = 0; for(let team in lastMatchResult.iGive) { html += `<strong>${team}</strong><span>${lastMatchResult.iGive[team].join(', ')}</span>`; giveCount++; }
    if(giveCount === 0) html += '<p class="text-muted">Ninguna :(</p>'; html += '</div></div>';
    document.getElementById('match-results').innerHTML = html; document.getElementById('match-results-container').style.display = 'block';
}

window.applyInterchangeAutomatic = function() {
    if(executeGlobalTrade()) { 
        alert("¡Intercambio aplicado globalmente en tus álbumes!"); 
        clearMatchInput(); 
        updateUIForActiveAlbum(); 
    }
};

window.shareMatchWhatsApp = function() {
    if(!lastMatchResult) return;
    let tRec = 0; for(let team in lastMatchResult.iReceive) tRec += lastMatchResult.iReceive[team].length;
    let tGive = 0; for(let team in lastMatchResult.iGive) tGive += lastMatchResult.iGive[team].length;
    let opt = Math.min(tRec, tGive);
    let text = `*¡Hola ${lastMatchResult.friendName}! He revisado las láminas para intercambiar:*\n\n*📊 RESUMEN:*\n- Recibo de ti: ${tRec}\n- Te entrego: ${tGive}\n*🔥 Cambios posibles: ${opt}*\n\n*⬇️ Me puedes dar:*\n`;
    for(let team in lastMatchResult.iReceive) { text += `- ${team}: ${lastMatchResult.iReceive[team].join(', ')}\n`; }
    text += `\n*⬆️ Yo te puedo dar:*\n`;
    for(let team in lastMatchResult.iGive) { text += `- ${team}: ${lastMatchResult.iGive[team].join(', ')}\n`; }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

// --- UTILIDADES ---
function checkIOSInstall() {
    const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()); const isStandalone = () => ('standalone' in window.navigator) && window.navigator.standalone;
    if (isIos() && !isStandalone()) { const prompt = document.getElementById('ios-install-prompt'); if (prompt && !localStorage.getItem('ios_prompt_dismissed')) { prompt.style.display = 'block'; prompt.querySelector('.close-ios-prompt').onclick = () => { prompt.style.display = 'none'; localStorage.setItem('ios_prompt_dismissed', 'true'); }; } }
}

window.exportData = function() { downloadBlob(new Blob([JSON.stringify(globalState, null, 2)], { type: 'application/json' }), 'album_mundial_2026_backup.json'); }
window.importData = function(e) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev) => { try { const d = JSON.parse(ev.target.result); if (d.albums || d.stickers) { localStorage.setItem('album_mundial_2026_data', ev.target.result); alert('Álbum restaurado.'); window.location.reload(); } } catch (err) { alert('Archivo JSON inválido.'); } }; r.readAsText(f); }
window.confirmReset = function() { if (confirm('¿Seguro que deseas borrar el progreso del álbum actual?')) { getActiveAlbum().stickers = {}; getActiveAlbum().milestones = {}; saveStore(); closeModal('modal-settings'); updateUIForActiveAlbum(); } }
window.forceUpdateCache = function() { if ('caches' in window) { caches.keys().then(names => { for (let n of names) caches.delete(n); }).then(() => { alert("Caché borrada."); window.location.href = window.location.pathname + '?v=' + new Date().getTime(); }); } else { window.location.reload(true); } }
window.toggleTheme = function() { const root = document.documentElement; if (root.getAttribute('data-theme') === 'light') { root.removeAttribute('data-theme'); localStorage.setItem('album_theme_2026', 'dark'); } else { root.setAttribute('data-theme', 'light'); localStorage.setItem('album_theme_2026', 'light'); } }
function loadTheme() { if (localStorage.getItem('album_theme_2026') === 'light') document.documentElement.setAttribute('data-theme', 'light'); }
window.showModal = function(id) { const m = document.getElementById(id); if(m) m.style.display = 'flex'; }
window.closeModal = function(id) { const m = document.getElementById(id); if(m) m.style.display = 'none'; currentOpenTeam = null; }
function updateHeaderOffset() { const h = document.querySelector('.app-header'); if(h) document.documentElement.style.setProperty('--header-offset', `${h.offsetHeight + 18}px`); }
function observeHeaderOffset() { updateHeaderOffset(); window.addEventListener('resize', updateHeaderOffset); window.addEventListener('orientationchange', () => setTimeout(updateHeaderOffset, 150)); if(document.fonts) document.fonts.ready.then(updateHeaderOffset); }

function triggerConfetti(x, y) {
    const canvas = document.getElementById('confetti-canvas'); if(!canvas) return; const ctx = canvas.getContext('2d'); canvas.width = window.innerWidth; canvas.height = window.innerHeight; let particles = [];
    for(let i=0; i<30; i++) particles.push({ x, y, r: Math.random()*4+2, dx: Math.random()*6-3, dy: Math.random()*-6-2, color: `hsl(${Math.random()*360}, 100%, 50%)` });
    function animate() { ctx.clearRect(0,0,canvas.width,canvas.height); let active = false; particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.dy += 0.2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fillStyle = p.color; ctx.fill(); if(p.y < canvas.height) active = true; }); if(active) requestAnimationFrame(animate); else ctx.clearRect(0,0,canvas.width,canvas.height); } animate();
}
function shootBigConfetti() { triggerConfetti(window.innerWidth/2, window.innerHeight/2); setTimeout(() => triggerConfetti(window.innerWidth/3, window.innerHeight/2), 200); setTimeout(() => triggerConfetti((window.innerWidth/3)*2, window.innerHeight/2), 400); }

function bindEvents() {
    document.getElementById('btn-theme').onclick = window.toggleTheme;
    document.getElementById('btn-settings').onclick = () => window.showModal('modal-settings');
    document.getElementById('btn-clear-filters').onclick = clearFilters;
    document.getElementById('btn-share-list').onclick = window.generateShareText;
    document.getElementById('btn-export-excel').onclick = window.exportTradesExcel;
    document.getElementById('btn-export-pdf').onclick = window.exportTradesPdf;
    document.getElementById('btn-download-missing').onclick = window.exportMissingExcel;
    
    document.getElementById('search-input').oninput = (e) => { activeSearch.text = e.target.value; applyCollectionSearch(); }; 
    document.getElementById('filter-team').onchange = (e) => { activeSearch.team = e.target.value; applyCollectionSearch(); }; 
    document.getElementById('filter-group').onchange = (e) => { activeSearch.group = e.target.value; applyCollectionSearch(); }; 
    document.getElementById('sort-select').onchange = (e) => { activeSearch.sort = e.target.value; applyCollectionSearch(); };
    
    document.querySelectorAll('.nav-btn').forEach(btn => { 
        btn.onclick = () => { 
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active')); 
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active')); 
            btn.classList.add('active'); 
            const t = btn.getAttribute('data-target'); document.getElementById(t).classList.add('active'); 
            if (t === 'tab-trades') renderTrades(); 
            window.scrollTo(0, 0); 
        }; 
    });
    document.getElementById('match-input').oninput = processQRText;
    document.querySelector('.close-modal').onclick = () => { document.getElementById('modal-team').style.display = 'none'; currentOpenTeam = null; };
}

document.addEventListener('DOMContentLoaded', init);