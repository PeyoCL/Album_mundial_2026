// app.js v49 - Controlador de UI y Exportación (Refactored)
import { globalState, loadStore, saveStore, getActiveAlbum, createNewAlbum, deleteActiveAlbum } from './store.js';
import { getGlobalMinifiedData, compareGlobalTrades, executeGlobalTrade, lastMatchResult } from './match.js';

let activeSearch = { text: '', team: 'all', group: 'all', sort: 'all' };
let currentOpenTeam = null;

// LIBRERIAS QR
function loadQRLibraries(cb) {
    const p = []; const ls = (src) => new Promise((r, j) => { const s = document.createElement('script'); s.src = src; s.onload = r; s.onerror = j; document.head.appendChild(s); });
    if (typeof QRCode === 'undefined') p.push(ls('https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js'));
    if (typeof jsQR === 'undefined') p.push(ls('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'));
    if (p.length > 0) Promise.all(p).then(cb).catch(()=>alert("Error cargando QR")); else if(cb) cb();
}

async function init() {
    try {
        if (window.LOAD_DATA) await window.LOAD_DATA(); // Espera al CSV (data.js)
        loadStore();
        renderAlbumSelector();
        updateUIForActiveAlbum();
        
        populateTeamFilter(); populateGroupFilter(); bindEvents();
    } catch (error) { alert("Error: " + error.message); }
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
    
    document.getElementById('btn-manage-albums').onclick = () => {
        let action = prompt("Escribe 'NUEVO' para crear un álbum, o 'BORRAR' para eliminar el actual.");
        if(action === 'NUEVO') { let n = prompt("Nombre del álbum:"); if(n) { createNewAlbum(n); renderAlbumSelector(); updateUIForActiveAlbum(); } }
        else if (action === 'BORRAR') { deleteActiveAlbum(); }
    };
}

function updateUIForActiveAlbum() {
    const album = getActiveAlbum();
    document.getElementById('album-title').innerText = album.profile.name;
    applyCollectionSearch();
    if(currentOpenTeam) openTeamDetail(currentOpenTeam);
}

// LOGICA DE STICKERS (Apunta al Active Album)
function getStickerState(code) { return getActiveAlbum().stickers[code] || { have: false, count: 0 }; }
function toggleSticker(code, ev) {
    if(ev) ev.stopPropagation(); let s = getStickerState(code);
    if (!s.have) { s.have = true; s.count = 1; } else { s.count++; }
    getActiveAlbum().stickers[code] = s; saveStore(); updateUIForActiveAlbum();
}
window.toggleSticker = toggleSticker; // Global exposure for HTML inline onclick

function decrementSticker(code, ev) {
    if(ev) ev.stopPropagation(); let s = getStickerState(code);
    if (s.have && s.count > 1) { s.count--; getActiveAlbum().stickers[code] = s; saveStore(); updateUIForActiveAlbum(); }
    else if (s.have && s.count === 1) { s.count = 0; s.have = false; getActiveAlbum().stickers[code] = s; saveStore(); updateUIForActiveAlbum(); }
}
window.decrementSticker = decrementSticker;

function getTotalProgress() {
    let have = Object.values(getActiveAlbum().stickers).filter(s => s.have).length;
    let total = window.DATA ? window.DATA.TOTAL_STICKERS : 994;
    let percentage = Math.round((have / total) * 100) || 0; 
    return { have, total, percentage };
}

// RENDERIZADO UI (Resumido por espacio)
function applyCollectionSearch() {
    if (!window.DATA || !window.DATA.TEAMS) return;
    const grid = document.getElementById('teams-grid'); grid.innerHTML = '';
    window.DATA.TEAMS.forEach(team => {
        const div = document.createElement('div'); div.className = `team-card`; 
        div.innerHTML = `<h3>${team.name}</h3>`; 
        div.onclick = () => openTeamDetail(team);
        grid.appendChild(div);
    });
    renderDashboardCards();
}

function openTeamDetail(team) {
    currentOpenTeam = team;
    document.getElementById('modal-team-name').innerText = team.name;
    const grid = document.getElementById('modal-stickers-grid'); grid.innerHTML = '';
    team.stickers.forEach(s => {
        const st = getStickerState(s.code);
        const div = document.createElement('div'); div.className = `sticker ${st.have ? 'have' : ''}`;
        div.innerHTML = `<span>${s.code}</span> <button onclick="decrementSticker('${s.code}', event)">-</button>`;
        div.onclick = (e) => toggleSticker(s.code, e);
        grid.appendChild(div);
    });
    document.getElementById('modal-team').style.display = 'flex';
}

function renderDashboardCards() {
    const p = getTotalProgress();
    document.getElementById('main-percentage').innerText = `${p.percentage}%`;
    document.getElementById('main-progress-text').innerText = `Tienes ${p.have} de ${p.total}`;
}

// ---------------- EXPORTAR PDF (V48 NATIVO CSS) ----------------
function exportTradesPdf() {
    const p = getTotalProgress(); 
    let html = `<h1>Láminas Repetidas - ${getActiveAlbum().profile.name}</h1><p>Progreso: ${p.have}/${p.total} (${p.percentage}%)</p><table><tr><th>Sección</th><th>Láminas</th></tr>`;
    
    // Simplificación de repetidas para el PDF
    window.DATA.TEAMS.forEach(t => {
        let reps = t.stickers.filter(s => getStickerState(s.code).have && getStickerState(s.code).count > 1).map(s => s.code);
        if(reps.length > 0) html += `<tr><td>${t.name}</td><td>${reps.join(', ')}</td></tr>`;
    });
    html += `</table>`;

    const printContainer = document.createElement('div'); printContainer.className = 'print-only-section'; printContainer.innerHTML = html;
    document.body.appendChild(printContainer);

    const printStyle = document.createElement('style'); printStyle.id = 'dynamic-print-style';
    printStyle.innerHTML = `@media print { body > *:not(.print-only-section) { display: none !important; } .print-only-section { display: block !important; position: absolute; left: 0; top: 0; width: 100%; color: #000; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #111; padding: 10px; } } @media screen { .print-only-section { display: none !important; } }`;
    document.head.appendChild(printStyle);

    const cleanup = () => {
        if(document.body.contains(printContainer)) document.body.removeChild(printContainer);
        if(document.head.contains(printStyle)) document.head.removeChild(printStyle);
        window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => { window.print(); setTimeout(cleanup, 3000); }, 300);
}

// GLOBAL MATCH UI
function renderMatchResultsUI() {
    if(!lastMatchResult) return;
    let html = `<div style="text-align:center;"><h3>Match Global Familiar</h3><button id="btn-auto-trade" class="btn" style="background:green;">⚡ Aplicar Intercambio en 1-Clic</button></div><div style="display:flex;">`;
    html += `<div style="flex:1;"><h4>⬇️ Familia Recibe</h4>`;
    for(let t in lastMatchResult.iReceive) html += `<p>${t}: ${lastMatchResult.iReceive[t].join(', ')}</p>`;
    html += `</div><div style="flex:1;"><h4>⬆️ Familia Entrega</h4>`;
    for(let t in lastMatchResult.iGive) html += `<p>${t}: ${lastMatchResult.iGive[t].join(', ')}</p>`;
    html += `</div></div>`;
    document.getElementById('match-results').innerHTML = html;
    document.getElementById('match-results-container').style.display = 'block';
    
    document.getElementById('btn-auto-trade').onclick = () => {
        if(executeGlobalTrade()) { alert("¡Intercambio aplicado globalmente!"); document.getElementById('match-results-container').style.display = 'none'; updateUIForActiveAlbum(); }
    };
}

function processQRText() {
    const input = document.getElementById('match-input').value.trim();
    if(compareGlobalTrades(input)) renderMatchResultsUI();
}

function bindEvents() {
    document.getElementById('btn-export-pdf').onclick = exportTradesPdf;
    document.getElementById('match-input').oninput = processQRText;
    document.querySelector('.close-modal').onclick = () => { document.getElementById('modal-team').style.display = 'none'; currentOpenTeam = null; };
}

document.addEventListener('DOMContentLoaded', init);