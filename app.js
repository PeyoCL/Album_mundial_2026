import { globalState, loadStore, saveStore, getActiveAlbum, createNewAlbum, deleteActiveAlbum, getFamilyNameString, syncWithCloud, claimFriendCode, getFriendBox } from './store.js?v=69';
import { auth, provider, signInWithPopup, signOut, onAuthStateChanged } from './firebase-config.js?v=69';
import { getGlobalMinifiedData, compareGlobalTrades, executeGlobalTrade, lastMatchResult } from './match.js?v=69';

window.onerror = function(msg, url, line) { console.error("🚨 ERROR EN LA APP:\n" + msg + "\nLínea: " + line); return false; };

let activeSearch = { text: '', team: 'all', group: 'all', sort: 'all' };
let currentOpenTeam = null;
let html5QrcodeScanner = null;

function loadQRLibraries(cb) {
    const p = []; const ls = (src) => new Promise((r, j) => { const s = document.createElement('script'); s.src = src; s.onload = r; s.onerror = j; document.head.appendChild(s); });
    if (typeof QRCode === 'undefined') p.push(ls('https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js'));
    if (typeof jsQR === 'undefined') p.push(ls('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'));
    if (typeof Html5Qrcode === 'undefined') p.push(ls('https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js'));
    if (typeof LZString === 'undefined') p.push(ls('https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js'));
    if (p.length > 0) Promise.all(p).then(cb).catch(()=>alert("Error cargando librerías QR")); else if(cb) cb();
}

function formatCode(n) { if (!n) return '??'; return String(n) === '00' ? '00' : String(n).replace(/^([A-Z]+)(\d+)$/, '$1 $2'); }

async function init() {
    try {
        let retries = 0;
        while (!window.DATA && retries < 15) { await new Promise(r => setTimeout(r, 200)); retries++; }
        if (!window.DATA) return alert("🚨 La base de datos de la FIFA no cargó.");

        await loadStore();
        
        if (!getActiveAlbum()) { if (typeof createNewAlbum === 'function') createNewAlbum('Mi Álbum'); }
        const active = getActiveAlbum();
        if (active) {
            if (!active.profile) active.profile = { name: active.name || 'Mi Álbum' };
            if (!active.stickers) active.stickers = {};
            saveStore(); 
        }

        loadTheme();
        checkIOSInstall();
        observeHeaderOffset();

        renderAlbumSelector();
        updateUIForActiveAlbum();
        bindEvents(); 
        
        onAuthStateChanged(auth, async (user) => {
            updateAuthUI(user);
            if (user) {
                const wasUpdatedFromCloud = await syncWithCloud(user, false);
                if (wasUpdatedFromCloud) { renderAlbumSelector(); updateUIForActiveAlbum(); }
            } else { syncWithCloud(null, false); }
        });

        const urlParams = new URLSearchParams(window.location.search);
        const matchCode = urlParams.get('match');
        if (matchCode) {
            setTimeout(() => {
                const inputElement = document.getElementById('input-friend-code');
                if(inputElement) {
                    inputElement.value = matchCode;
                    window.openOnlineMatchModal();
                    window.handleSearchFriend();
                }
            }, 1500); 
        }
    } catch (error) { alert("Error en arranque: " + error.message); }
}

function renderAlbumSelector() {
    const sel = document.getElementById('select-album-global'); if(!sel) return;
    sel.innerHTML = '';
    for (let id in globalState.albums) {
        let opt = document.createElement('option');
        opt.value = id; opt.innerText = globalState.albums[id].profile.name;
        if (id === globalState.activeAlbumId) opt.selected = true;
        sel.appendChild(opt);
    }
    sel.onchange = (e) => { globalState.activeAlbumId = e.target.value; saveStore(); updateUIForActiveAlbum(); };
    const btnManage = document.getElementById('btn-manage-albums'); if (btnManage) btnManage.onclick = () => window.showModal('modal-manage-albums');
}

function updateProfileName(newName, updateInput = true) {
    let name = newName ? newName.trim() : 'Mi Álbum';
    getActiveAlbum().profile.name = name;
    const titleEl = document.getElementById('album-title'); if (titleEl) titleEl.innerText = name;
    if (updateInput) { const inputEl = document.getElementById('input-profile-name'); if (inputEl) inputEl.value = name; }
    saveStore(); renderAlbumSelector();
}

function updateUIForActiveAlbum() {
    const album = getActiveAlbum(); if (!album) return;
    const titleEl = document.getElementById('album-title'); if (titleEl) titleEl.innerText = album.profile.name;
    const inputProfile = document.getElementById('input-profile-name'); if(inputProfile) inputProfile.value = album.profile.name;
    
    applyCollectionSearch();
    renderDashboardCards();
    renderTrades();
    if(currentOpenTeam) openTeamDetail(currentOpenTeam);
}

// --- LÓGICA DE STICKERS ---
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
    try {
        const p = getTotalProgress(); const rep = getRepeatedTotal();
        const pctEl = document.getElementById('main-percentage'); if (pctEl) pctEl.innerText = `${p.percentage}%`;
        const textEl = document.getElementById('main-progress-text'); if (textEl) textEl.innerText = `Tienes ${p.have} de ${p.total} láminas únicas.`;
        const barEl = document.getElementById('main-linear-bar'); if (barEl) barEl.style.width = `${p.percentage}%`;
        const ringEl = document.getElementById('main-progress-ring'); if (ringEl) ringEl.style.background = `conic-gradient(var(--blue-accent) ${p.percentage * 3.6}deg, var(--bg-surface) 0deg)`;
        const advEl = document.getElementById('metric-advance'); if (advEl) advEl.innerText = `${p.percentage}%`;
        const uniEl = document.getElementById('metric-unique'); if (uniEl) uniEl.innerText = `${p.have} / ${p.total}`;
        const repEl = document.getElementById('metric-repeated'); if (repEl) repEl.innerText = `${rep} rep.`;
    } catch (e) { console.error("Error visual stats:", e); }
}

function makeTeamCard(team) {
    try {
        const prog = getTeamProgress(team.code); let pct = Math.round((prog.have / prog.total) * 100) || 0; if (pct === 100 && prog.have < prog.total) pct = 99;
        const div = document.createElement('div'); div.className = `team-card ${prog.have === prog.total && prog.total > 0 ? 'completed' : ''}`; div.id = `team-card-${team.code}`; div.onclick = () => openTeamDetail(team);
        let iconHtml = ''; let iconStr = team.icon ? String(team.icon) : '';
        if (iconStr.endsWith('.svg')) { iconHtml = `<img src="${iconStr}" class="team-icon section-logo" alt="${team.name}" style="object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)); padding: 2px;">`; } 
        else if (iconStr) { iconHtml = `<div class="team-icon emoji-icon" style="font-size:24px; display:flex; align-items:center; justify-content:center;">${iconStr}</div>`; } 
        else { iconHtml = `<div class="team-icon placeholder">?</div>`; }
        div.innerHTML = `<div class="team-card-header">${iconHtml}<div class="team-info"><h3>${team.name || 'Equipo'}</h3><span>${team.group || ''}</span></div></div><div class="team-stats"><span>Progreso</span><span id="card-count-${team.code}">${prog.have}/${prog.total} (${pct}%)</span></div><div class="linear-progress"><div class="linear-bar" id="card-bar-${team.code}" style="width: ${pct}%;"></div></div>`; 
        return div;
    } catch (e) { return document.createElement('div'); }
}

function applyCollectionSearch() {
    try {
        if (!window.DATA || !window.DATA.TEAMS) return;
        let filtered = window.DATA.TEAMS.filter(t => {
            let matchText = true;
            if (activeSearch.text) { let txt = activeSearch.text.toLowerCase(); let hasSticker = t.stickers.some(s => (s.name||'').toLowerCase().includes(txt) || ((s.playerName||'').toLowerCase().includes(txt))); matchText = (t.name||'').toLowerCase().includes(txt) || (t.group||'').toLowerCase().includes(txt) || hasSticker; }
            return matchText && (activeSearch.team === 'all' || t.code === activeSearch.team) && (activeSearch.group === 'all' || t.group === activeSearch.group);
        });
        if (activeSearch.sort === 'most') { filtered.sort((a,b) => (getTeamProgress(b.code).have / b.stickers.length) - (getTeamProgress(a.code).have / a.stickers.length)); }
        else if (activeSearch.sort === 'least') { filtered.sort((a,b) => (getTeamProgress(a.code).have / a.stickers.length) - (getTeamProgress(b.code).have / b.stickers.length)); }
        else if (activeSearch.sort === 'az') { filtered.sort((a,b) => (a.name||'').localeCompare(b.name||'')); }
        
        const grid = document.getElementById('teams-grid'); if(!grid) return; grid.innerHTML = '';
        const counterEl = document.getElementById('results-counter'); if(counterEl) counterEl.innerText = `${filtered.length} resultados`;
        filtered.forEach(team => { grid.appendChild(makeTeamCard(team)); });
    } catch (e) { console.error("Error dibujando países", e); }
}

function renderTrades() {
    try {
        const reps = getRepeatedList(); const total = getRepeatedTotal();
        const totalText = document.getElementById('trades-total-text'); if (totalText) totalText.innerText = `Total repetidas: ${total}`; 
        const list = document.getElementById('trades-list'); if(!list) return; list.innerHTML = '';
        if (reps.length === 0) { list.innerHTML = '<p style="color: var(--text-muted); text-align:center; padding: 2rem;">No tienes láminas repetidas aún.</p>'; }
        else { reps.forEach(group => { const grpDiv = document.createElement('div'); grpDiv.className = 'trade-group'; let itemsHtml = group.items.map(i => `<span class="trade-item">${formatCode(i.name)} (x${i.count})</span>`).join(''); grpDiv.innerHTML = `<h3>${group.team}</h3><div class="trade-items">${itemsHtml}</div>`; list.appendChild(grpDiv); }); }
        updateTradeExportButtons(total > 0);
    } catch (e) { console.error("Error listando cambios:", e); }
}

function makeStickerCard(sticker) {
    const st = getStickerState(sticker.code); const div = document.createElement('div'); const isSpecial = sticker.type === 'special' || sticker.type === 'shield' || sticker.type === 'group'; div.className = `sticker ${st.have ? 'have animate-pop' : ''} ${isSpecial ? 'special' : ''}`; div.onclick = (e) => window.toggleSticker(sticker.code, e);
    let badge = st.count > 1 ? `<span class="sticker-badge">+${st.count - 1}</span>` : ''; let codeText = formatCode(sticker.name); let playerText = sticker.playerName || ''; let displayText = codeText; 
    if (globalState.displayMode === 'name' && playerText !== '') { displayText = `<span style="font-size: 0.85em; line-height: 1.1; text-align: center;">${playerText}</span>`; } else if (globalState.displayMode === 'both' && playerText !== '') { displayText = `<span style="font-size: 0.7em; opacity: 0.8; display: block; margin-bottom: 2px;">${codeText}</span><span style="font-size: 0.8em; line-height: 1.1; display: block; text-align: center;">${playerText}</span>`; }
    div.innerHTML = `<span class="sticker-name" style="${isSpecial ? 'color: var(--gold)' : ''}; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; padding: 0 4px;">${displayText}</span>${badge}<button class="btn-minus" onclick="window.decrementSticker('${sticker.code}', event)">-</button>`; return div;
}

function openTeamDetail(team) {
    currentOpenTeam = team; document.getElementById('modal-team-name').innerText = team.name; document.getElementById('modal-team-group').innerText = team.group;
    const iconEl = document.getElementById('modal-team-icon'); let emojiEl = document.getElementById('modal-team-emoji');
    if (!emojiEl) { emojiEl = document.createElement('div'); emojiEl.id = 'modal-team-emoji'; emojiEl.className = 'modal-icon emoji-icon'; emojiEl.style.fontSize = '2.5rem'; emojiEl.style.display = 'flex'; emojiEl.style.alignItems = 'center'; emojiEl.style.justifyContent = 'center'; iconEl.parentNode.insertBefore(emojiEl, iconEl); }
    if (team.icon && String(team.icon).endsWith('.svg')) { iconEl.src = team.icon; iconEl.style.display = 'block'; iconEl.style.objectFit = 'contain'; iconEl.style.padding = '2px'; emojiEl.style.display = 'none'; } else if (team.icon) { iconEl.style.display = 'none'; emojiEl.innerText = team.icon; emojiEl.style.display = 'flex'; } else { iconEl.style.display = 'none'; emojiEl.style.display = 'none'; }
    renderStickersGrid(team); window.showModal('modal-team');
}

function renderStickersGrid(team) { const grid = document.getElementById('modal-stickers-grid'); grid.innerHTML = ''; team.stickers.forEach(s => { grid.appendChild(makeStickerCard(s)); }); updateTeamCount(team.code); }

function updateTeamCount(teamCode) {
    const p = getTeamProgress(teamCode); const countEl = document.getElementById('modal-team-count'); if(countEl) countEl.innerText = `${p.have}/${p.total}`;
    let pct = Math.round((p.have / p.total) * 100) || 0; if (pct === 100 && p.have < p.total) pct = 99;
    const cardCount = document.getElementById(`card-count-${teamCode}`); const cardBar = document.getElementById(`card-bar-${teamCode}`); const card = document.getElementById(`team-card-${teamCode}`);
    if (cardCount) { cardCount.innerText = `${p.have}/${p.total} (${pct}%)`; cardBar.style.width = `${pct}%`; if (p.have === p.total && p.total > 0) { card.classList.add('completed'); } else { card.classList.remove('completed'); } }
}

function clearFilters() { const searchEl = document.getElementById('search-input'); if(searchEl) searchEl.value = ''; const filterTeam = document.getElementById('filter-team'); if(filterTeam) filterTeam.value = 'all'; const filterGroup = document.getElementById('filter-group'); if(filterGroup) filterGroup.value = 'all'; activeSearch = { ...activeSearch, text: '', team: 'all', group: 'all' }; applyCollectionSearch(); }
function updateTradeExportButtons(hasRepeated) { const disabled = !hasRepeated; const btnShare = document.getElementById('btn-share-list'); if(btnShare) btnShare.disabled = disabled; const btnPdf = document.getElementById('btn-export-pdf'); if(btnPdf) btnPdf.disabled = disabled; const btnExcel = document.getElementById('btn-export-excel'); if(btnExcel) btnExcel.disabled = disabled; const btnMissing = document.getElementById('btn-download-missing'); if(btnMissing) btnMissing.disabled = (getTotalProgress().percentage === 100); }
function getTradeExportRows() { let rows = []; getRepeatedList().forEach(g => { let itemsStr = g.items.map(i => { let num = formatCode(i.name); return i.count > 1 ? `${num}(x${i.count})` : num; }).join(', '); rows.push({ section: g.team, text: itemsStr }); }); return rows; }
function getMissingExportRows() { let rows = []; let map = {}; getMissingList().forEach(m => { if(!map[m.team]) map[m.team] = []; map[m.team].push(formatCode(m.name)); }); for(let team in map){ rows.push({ section: team, text: map[team].join(', ') }); } return rows; }
function removeAccents(str) { if (!str) return ''; return str.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
window.exportTradesExcel = function() { let csv = 'Seccion,Laminas Repetidas\n'; getTradeExportRows().forEach(r => { csv += `"${removeAccents(r.section)}","${r.text}"\n`; }); downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'cambios_album.csv'); }
window.exportMissingExcel = function() { let csv = 'Seccion,Laminas Faltantes\n'; getMissingExportRows().forEach(r => { csv += `"${removeAccents(r.section)}","${r.text}"\n`; }); downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'faltantes_album.csv'); }
window.generateShareText = function() { const p = getTotalProgress(); let txt = `*${getActiveAlbum().profile.name}*\nProgreso: ${p.have}/${p.total} (${p.percentage}%)\nRepetidas: ${getRepeatedTotal()}\n\n`; getTradeExportRows().forEach(r => { txt += `${r.section}: ${r.text}\n`; }); const shareEl = document.getElementById('share-textarea'); if(shareEl) shareEl.value = txt; window.showModal('modal-share'); }
function downloadBlob(b, f) { const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = f; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u); }

// --- UTILIDADES RECUPERADAS ---
window.forceUpdateCache = function() { 
    if ('caches' in window) { 
        caches.keys().then(names => { for (let n of names) caches.delete(n); })
        .then(() => { alert("Caché borrada."); window.location.href = window.location.pathname + '?v=' + new Date().getTime(); }); 
    } else { 
        window.location.reload(true); 
    } 
}

function checkIOSInstall() {
    const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()); const isStandalone = () => ('standalone' in window.navigator) && window.navigator.standalone;
    if (isIos() && !isStandalone()) { const prompt = document.getElementById('ios-install-prompt'); if (prompt && !localStorage.getItem('ios_prompt_dismissed')) { prompt.style.display = 'block'; prompt.querySelector('.close-ios-prompt').onclick = () => { prompt.style.display = 'none'; localStorage.setItem('ios_prompt_dismissed', 'true'); }; } }
}

function loadTheme() { if (localStorage.getItem('album_theme_2026') === 'light') document.documentElement.setAttribute('data-theme', 'light'); }
function updateHeaderOffset() { const h = document.querySelector('.app-header'); if(h) document.documentElement.style.setProperty('--header-offset', `${h.offsetHeight + 18}px`); }
function observeHeaderOffset() { updateHeaderOffset(); window.addEventListener('resize', updateHeaderOffset); window.addEventListener('orientationchange', () => setTimeout(updateHeaderOffset, 150)); if(document.fonts) document.fonts.ready.then(updateHeaderOffset); }

window.toggleTheme = function() { const root = document.documentElement; if (root.getAttribute('data-theme') === 'light') { root.removeAttribute('data-theme'); localStorage.setItem('album_theme_2026', 'dark'); } else { root.setAttribute('data-theme', 'light'); localStorage.setItem('album_theme_2026', 'light'); } }
window.showModal = function(id) { const m = document.getElementById(id); if(m) m.style.display = 'flex'; }
window.closeModal = function(id) { const m = document.getElementById(id); if(m) { m.style.display = 'none'; } currentOpenTeam = null; }
window.exportData = function() { downloadBlob(new Blob([JSON.stringify(globalState, null, 2)], { type: 'application/json' }), 'album_mundial_2026_backup.json'); }
window.confirmReset = function() { if (confirm('¿Borrar el progreso actual?')) { getActiveAlbum().stickers = {}; getActiveAlbum().milestones = {}; saveStore(); window.closeModal('modal-settings'); updateUIForActiveAlbum(); } }

window.importData = function(e) { 
    const f = e.target.files[0]; if (!f) return; const r = new FileReader(); 
    r.onload = (ev) => { 
        try { 
            const d = JSON.parse(ev.target.result); 
            if (d.albums) { 
                let action = prompt("Este archivo contiene un gestor Multi-Álbum.\n\nEscribe 'REEMPLAZAR' o 'FUSIONAR'.");
                if (action && action.toUpperCase() === 'REEMPLAZAR') { localStorage.setItem('albumStore', ev.target.result); alert('Base de datos reemplazada.'); window.location.reload(); } 
                else if (action && action.toUpperCase() === 'FUSIONAR') { for (let id in d.albums) { globalState.albums['album_imported_' + Date.now() + Math.random()] = d.albums[id]; } saveStore(); alert(`Álbumes fusionados.`); window.location.reload(); }
            } else if (d.stickers) { 
                let importedName = d.profile?.name || 'Álbum Importado'; 
                let action = prompt(`Se detectó el álbum: "${importedName}".\n\nEscribe 'REEMPLAZAR' o 'AGREGAR'.`);
                if (action && action.toUpperCase() === 'REEMPLAZAR') { globalState.albums[globalState.activeAlbumId] = { profile: d.profile || { name: importedName }, stickers: d.stickers || {}, milestones: d.milestones || {} }; saveStore(); alert(`Álbum reemplazado.`); window.location.reload(); } 
                else if (action && action.toUpperCase() === 'AGREGAR') { const newId = 'album_' + Date.now(); globalState.albums[newId] = { profile: d.profile || { name: importedName }, stickers: d.stickers || {}, milestones: d.milestones || {} }; globalState.activeAlbumId = newId; saveStore(); alert(`Álbum importado.`); window.location.reload(); }
            } else { alert('Archivo JSON no reconocido.'); }
        } catch (err) { alert('Archivo JSON inválido.'); } 
    }; r.readAsText(f); e.target.value = ''; 
}

function triggerConfetti(x, y) { const canvas = document.getElementById('confetti-canvas'); if(!canvas) return; const ctx = canvas.getContext('2d'); canvas.width = window.innerWidth; canvas.height = window.innerHeight; let particles = []; for(let i=0; i<30; i++) particles.push({ x, y, r: Math.random()*4+2, dx: Math.random()*6-3, dy: Math.random()*-6-2, color: `hsl(${Math.random()*360}, 100%, 50%)` }); function animate() { ctx.clearRect(0,0,canvas.width,canvas.height); let active = false; particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.dy += 0.2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fillStyle = p.color; ctx.fill(); if(p.y < canvas.height) active = true; }); if(active) requestAnimationFrame(animate); else ctx.clearRect(0,0,canvas.width,canvas.height); } animate(); }
function shootBigConfetti() { triggerConfetti(window.innerWidth/2, window.innerHeight/2); setTimeout(() => triggerConfetti(window.innerWidth/3, window.innerHeight/2), 200); setTimeout(() => triggerConfetti((window.innerWidth/3)*2, window.innerHeight/2), 400); }

function bindEvents() {
    const click = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
    const input = (id, fn) => { const el = document.getElementById(id); if(el) el.oninput = fn; };
    const change = (id, fn) => { const el = document.getElementById(id); if(el) el.onchange = fn; };

    click('btn-theme', window.toggleTheme); click('btn-settings', () => window.showModal('modal-settings')); click('btn-clear-filters', clearFilters); click('btn-share-list', window.generateShareText); click('btn-export-excel', window.exportTradesExcel); click('btn-export-pdf', window.exportTradesPdf); click('btn-download-missing', window.exportMissingExcel);
    input('search-input', (e) => { activeSearch.text = e.target.value; applyCollectionSearch(); }); change('filter-team', (e) => { activeSearch.team = e.target.value; applyCollectionSearch(); }); change('filter-group', (e) => { activeSearch.group = e.target.value; applyCollectionSearch(); }); change('sort-select', (e) => { activeSearch.sort = e.target.value; applyCollectionSearch(); });
    
    document.querySelectorAll('.close-modal').forEach(btn => { btn.onclick = () => { const modal = btn.closest('.modal'); if(modal) modal.style.display = 'none'; currentOpenTeam = null; }; });
    document.querySelectorAll('.nav-btn').forEach(btn => { btn.onclick = () => { document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active')); btn.classList.add('active'); const t = btn.getAttribute('data-target'); const targetPane = document.getElementById(t); if(targetPane) targetPane.classList.add('active'); if (t === 'tab-trades') renderTrades(); window.scrollTo(0, 0); }; });
    
    click('btn-modal-create-album', () => { const input = document.getElementById('new-album-input'); if (input && input.value.trim() !== '') { createNewAlbum(input.value.trim()); input.value = ''; renderAlbumSelector(); updateUIForActiveAlbum(); window.closeModal('modal-manage-albums'); } });
    click('btn-modal-delete-album', () => { window.closeModal('modal-manage-albums'); deleteActiveAlbum(); });
}

window.loginGoogle = function() { signInWithPopup(auth, provider).then(() => { alert("¡Sesión iniciada!"); }).catch(err => alert("Error: " + err.message)); };
window.logoutGoogle = function() { signOut(auth).then(() => { alert("Sesión cerrada."); }).catch(err => alert("Error: " + err)); };

function updateAuthUI(user) {
    const btnLogin = document.getElementById('btn-login-google'); const authInfo = document.getElementById('auth-user-info'); const authText = document.getElementById('auth-status-text'); const emailText = document.getElementById('auth-user-email');
    if (user) { if(btnLogin) btnLogin.style.display = 'none'; if(authInfo) authInfo.style.display = 'flex'; if(authText) authText.innerText = "Sincronizando automáticamente en la nube."; if(emailText) emailText.innerText = `👋 Hola, ${user.displayName || user.email}`; } 
    else { if(btnLogin) btnLogin.style.display = 'flex'; if(authInfo) authInfo.style.display = 'none'; if(authText) authText.innerText = "Inicia sesión para sincronizar automáticamente."; if(emailText) emailText.innerText = ""; }
}

window.openOnlineMatchModal = function() { const modal = document.getElementById('modal-online-match'); if (!modal) return; if (!auth || !auth.currentUser) { alert("Debes iniciar sesión para usar esto."); return; } if (globalState.friendCode) { document.getElementById('online-match-setup').style.display = 'none'; document.getElementById('online-match-ready').style.display = 'block'; document.getElementById('display-my-code').innerText = globalState.friendCode; } else { document.getElementById('online-match-setup').style.display = 'block'; document.getElementById('online-match-ready').style.display = 'none'; } modal.style.display = 'flex'; }
window.closeOnlineMatchModal = function() { document.getElementById('modal-online-match').style.display = 'none'; }
window.handleClaimCode = async function() { const input = document.getElementById('input-claim-code'); const btn = document.getElementById('btn-claim-code'); const desiredCode = input.value; if (!desiredCode) return alert("Escribe un código."); btn.innerText = "Pensando..."; btn.disabled = true; try { await claimFriendCode(auth.currentUser, desiredCode); alert("¡Tu código es " + globalState.friendCode); window.openOnlineMatchModal(); } catch (error) { alert(error.message); } finally { btn.innerText = "Reclamar"; btn.disabled = false; } }
function getMagicLink() { return `${window.location.href.split('?')[0]}?match=${globalState.friendCode}`; }
window.shareViaWhatsApp = function() { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`¡Hola! Mi código es ${globalState.friendCode}. Revisa qué láminas cambiamos:\n\n${getMagicLink()}`)}`, '_blank'); }
window.copyMagicLink = function() { navigator.clipboard.writeText(getMagicLink()).then(() => alert("Copiado al portapapeles.")); }

window.handleSearchFriend = async function() {
    const input = document.getElementById('input-friend-code'); const btn = document.getElementById('btn-search-friend'); const friendCode = input.value; if (!friendCode) return alert("Escribe un código.");
    btn.innerText = "Buscando..."; btn.disabled = true;
    try {
        const compressedData = await getFriendBox(friendCode); window.closeOnlineMatchModal(); 
        const parts = compressedData.split('|'); const repArray = parts[1] ? parts[1].split(',') : []; const missingArray = parts[2] ? parts[2].split(',') : [];
        let fakeS = {}; if (window.DATA && window.DATA.TEAMS) { window.DATA.TEAMS.forEach(team => { team.stickers.forEach(s => { if (!missingArray.includes(s.code)) { fakeS[s.code] = repArray.includes(s.code) ? 2 : 1; } }); }); }
        const jsonForMatch = JSON.stringify({ n: friendCode, profile: { name: friendCode }, s: fakeS, m: [] });
        if (typeof compareGlobalTrades === 'function') {
            const matchResult = compareGlobalTrades(jsonForMatch);
            if (matchResult) { if (typeof renderMatchResultsUI === 'function') renderMatchResultsUI(); setTimeout(() => { const matchContainer = document.getElementById('match-results-container'); if(matchContainer) matchContainer.scrollIntoView({ behavior: 'smooth' }); }, 100); } 
            else { alert("Match calculó pero devolvió vacío."); }
        } else { alert("Función compareGlobalTrades no encontrada."); }
    } catch (error) { alert("Error: " + error.message); } finally { btn.innerText = "Buscar"; btn.disabled = false; }
}

// MOTOR DE ARRANQUE INFALIBLE
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init(); // Si el HTML ya cargó, lo forzamos a arrancar de inmediato
}