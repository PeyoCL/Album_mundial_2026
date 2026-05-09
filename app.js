const STORAGE_KEY = 'album_mundial_2026_data';
let state = { profile: { name: 'Mi Álbum', photo: null }, stickers: {}, lastUpdated: Date.now(), milestones: {} };
let activeSearch = { text: '', team: 'all', group: 'all', sort: 'all' };
let currentOpenTeam = null;

/* ==== Ciclo de Vida y Estado ==== */
function init() {
    loadTheme();
    loadState();
    migrateStickerCodes();
    
    const title = document.getElementById('album-title');
    title.innerText = state.profile.name;
    title.addEventListener('blur', () => { state.profile.name = title.innerText; saveState(); });

    populateTeamFilter();
    populateGroupFilter();
    bindEvents();
    
    observeHeaderOffset();
    
    renderHome();
    updateTradeExportButtons();
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) state = { ...state, ...JSON.parse(saved) };
}

function saveState() {
    state.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function migrateStickerCodes() {
    let migrated = false;
    const newStickers = {};
    
    for (const [key, value] of Object.entries(state.stickers)) {
        if (!value.have) continue;
        let newKey = key.replace(/-(0?)(\d+)/, '$2'); 
        if (newKey !== key) migrated = true;
        
        if (newStickers[newKey]) {
            newStickers[newKey].count += value.count;
        } else {
            newStickers[newKey] = { have: true, count: value.count };
        }
    }
    
    if (migrated) {
        state.stickers = newStickers;
        saveState();
    }
}

/* ==== Lógica del Álbum ==== */
function getStickerState(code) {
    return state.stickers[code] || { have: false, count: 0 };
}

function toggleSticker(code, ev) {
    if(ev) ev.stopPropagation();
    let s = getStickerState(code);
    if (!s.have) {
        s.have = true;
        s.count = 1;
        triggerConfetti(ev.clientX, ev.clientY);
    } else {
        s.count++;
    }
    state.stickers[code] = s;
    saveState();
    
    checkMilestones();
    if(currentOpenTeam) renderStickersGrid(currentOpenTeam);
    updateHomeProgress();
}

function decrementSticker(code, ev) {
    if(ev) ev.stopPropagation();
    let s = getStickerState(code);
    if (s.have && s.count > 0) {
        s.count--;
        if (s.count === 0) s.have = false;
        state.stickers[code] = s;
        saveState();
        if(currentOpenTeam) renderStickersGrid(currentOpenTeam);
        updateHomeProgress();
    }
}

function getHaveCount() {
    return Object.values(state.stickers).filter(s => s.have).length;
}

function getTeamProgress(teamCode) {
    const team = window.DATA.TEAMS.find(t => t.code === teamCode);
    if(!team) return { have: 0, total: 0 };
    let have = team.stickers.filter(s => getStickerState(s.code).have).length;
    return { have, total: team.stickers.length };
}

function getTotalProgress() {
    let have = getHaveCount();
    let total = window.DATA.TOTAL_STICKERS;
    return { have, total, percentage: Math.round((have / total) * 100) || 0 };
}

function checkMilestones() {
    const p = getTotalProgress().percentage;
    const targets = [25, 50, 75, 100];
    for (let t of targets) {
        if (p >= t && !state.milestones[`m${t}`]) {
            state.milestones[`m${t}`] = true;
            saveState();
            shootBigConfetti();
            setTimeout(() => alert(`¡Felicidades! Has completado el ${t}% del álbum.`), 500);
        }
    }
}

/* ==== Lógica de Cambios ==== */
function getRepeatedList() {
    let repeated = [];
    window.DATA.TEAMS.forEach(team => {
        let teamReps = [];
        team.stickers.forEach(s => {
            let st = getStickerState(s.code);
            if (st.have && st.count > 1) {
                teamReps.push({ name: s.name, count: st.count - 1 });
            }
        });
        if (teamReps.length > 0) repeated.push({ team: team.name, items: teamReps });
    });
    return repeated;
}

function getRepeatedTotal() {
    return Object.values(state.stickers).reduce((sum, s) => s.have && s.count > 1 ? sum + (s.count - 1) : sum, 0);
}

function getMissingList() {
    let missing = [];
    window.DATA.TEAMS.forEach(team => {
        team.stickers.forEach(s => {
            if (!getStickerState(s.code).have) {
                missing.push({ team: team.name, name: s.name });
            }
        });
    });
    return missing;
}

/* ==== Renderizado UI ==== */
function renderHome() {
    renderDashboardCards();
    applyCollectionSearch();
}

function renderDashboardCards() {
    const p = getTotalProgress();
    const rep = getRepeatedTotal();
    
    document.getElementById('main-percentage').innerText = `${p.percentage}%`;
    document.getElementById('main-progress-text').innerText = `Tienes ${p.have} de ${p.total} láminas únicas.`;
    document.getElementById('main-linear-bar').style.width = `${p.percentage}%`;
    document.getElementById('main-progress-ring').style.background = `conic-gradient(var(--blue-accent) ${p.percentage * 3.6}deg, var(--bg-surface) 0deg)`;
    
    document.getElementById('metric-advance').innerText = `${p.percentage}%`;
    document.getElementById('metric-unique').innerText = `${p.have} / ${p.total}`;
    document.getElementById('metric-repeated').innerText = `${rep} rep.`;
}

function renderTeamsGrid(teams) {
    const grid = document.getElementById('teams-grid');
    grid.innerHTML = '';
    
    let toRender = teams || window.DATA.TEAMS;
    document.getElementById('results-counter').innerText = `${toRender.length} resultados`;

    toRender.forEach(team => {
        const card = makeTeamCard(team);
        grid.appendChild(card);
    });
}

function makeTeamCard(team) {
    const prog = getTeamProgress(team.code);
    const pct = Math.round((prog.have / prog.total) * 100);
    
    const div = document.createElement('div');
    div.className = `team-card ${prog.have === prog.total ? 'completed' : ''}`;
    div.id = `team-card-${team.code}`;
    div.onclick = () => openTeamDetail(team);
    
    const iconHtml = team.flag ? `<img src="${team.flag}" class="team-icon">` : `<div class="team-icon" style="font-size:24px; display:flex; align-items:center; justify-content:center;">${team.icon}</div>`;
    
    div.innerHTML = `
        <div class="team-card-header">
            ${iconHtml}
            <div class="team-info">
                <h3>${team.name}</h3>
                <span>${team.group}</span>
            </div>
        </div>
        <div class="team-stats">
            <span>Progreso</span>
            <span id="card-count-${team.code}">${prog.have}/${prog.total} (${pct}%)</span>
        </div>
        <div class="linear-progress">
            <div class="linear-bar" id="card-bar-${team.code}" style="width: ${pct}%;"></div>
        </div>
    `;
    return div;
}

function makeStickerCard(sticker) {
    const st = getStickerState(sticker.code);
    const div = document.createElement('div');
    div.className = `sticker ${st.have ? 'have animate-pop' : ''} ${sticker.type === 'special' ? 'special' : ''}`;
    div.onclick = (e) => toggleSticker(sticker.code, e);
    
    let badge = st.count > 1 ? `<span class="sticker-badge">+${st.count - 1}</span>` : '';
    let isGold = sticker.type === 'special' || sticker.type === 'shield';
    
    div.innerHTML = `
        <span class="sticker-name" style="${isGold ? 'color: var(--gold)' : ''}">Lám. ${sticker.name.replace(/[A-Z]+/, '') || sticker.name}</span>
        ${badge}
        <button class="btn-minus" onclick="decrementSticker('${sticker.code}', event)">-</button>
    `;
    return div;
}

function openTeamDetail(team) {
    currentOpenTeam = team;
    document.getElementById('modal-team-name').innerText = team.name;
    document.getElementById('modal-team-group').innerText = team.group;
    
    const iconEl = document.getElementById('modal-team-icon');
    if (team.flag) {
        iconEl.src = team.flag;
        iconEl.style.display = 'block';
    } else {
        iconEl.style.display = 'none';
    }
    
    renderStickersGrid(team);
    showModal('modal-team');
}

function renderStickersGrid(team) {
    const grid = document.getElementById('modal-stickers-grid');
    grid.innerHTML = '';
    team.stickers.forEach(s => {
        grid.appendChild(makeStickerCard(s));
    });
    updateTeamCount(team.code);
}

function updateTeamCount(teamCode) {
    const p = getTeamProgress(teamCode);
    document.getElementById('modal-team-count').innerText = `${p.have}/${p.total}`;
    
    const cardCount = document.getElementById(`card-count-${teamCode}`);
    const cardBar = document.getElementById(`card-bar-${teamCode}`);
    const card = document.getElementById(`team-card-${teamCode}`);
    if (cardCount) {
        const pct = Math.round((p.have / p.total) * 100);
        cardCount.innerText = `${p.have}/${p.total} (${pct}%)`;
        cardBar.style.width = `${pct}%`;
        if (p.have === p.total) {
            card.classList.add('completed');
            if(!state.milestones[`team_${teamCode}`]) {
                state.milestones[`team_${teamCode}`] = true;
                shootBigConfetti();
            }
        } else {
            card.classList.remove('completed');
        }
    }
}

function updateHomeProgress() {
    renderDashboardCards();
}

/* ==== Búsqueda, Filtros y Orden ==== */
function applyCollectionSearch() {
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

    if (activeSearch.sort === 'most') {
        filtered.sort((a,b) => (getTeamProgress(b.code).have / b.stickers.length) - (getTeamProgress(a.code).have / a.stickers.length));
    } else if (activeSearch.sort === 'least') {
        filtered.sort((a,b) => (getTeamProgress(a.code).have / a.stickers.length) - (getTeamProgress(b.code).have / b.stickers.length));
    } else if (activeSearch.sort === 'az') {
        filtered.sort((a,b) => a.name.localeCompare(b.name));
    }

    renderTeamsGrid(filtered);
}

function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('filter-team').value = 'all';
    document.getElementById('filter-group').value = 'all';
    activeSearch = { ...activeSearch, text: '', team: 'all', group: 'all' };
    applyCollectionSearch();
}

function populateTeamFilter() {
    const sel = document.getElementById('filter-team');
    window.DATA.TEAMS.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.code;
        opt.innerText = t.name;
        sel.appendChild(opt);
    });
}

function populateGroupFilter() {
    const sel = document.getElementById('filter-group');
    const groups = new Set(window.DATA.TEAMS.map(t => t.group));
    groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g;
        opt.innerText = g;
        sel.appendChild(opt);
    });
}

/* ==== Render Pestaña Cambios ==== */
function renderTrades() {
    const reps = getRepeatedList();
    const total = getRepeatedTotal();
    document.getElementById('trades-total-text').innerText = `Total repetidas: ${total}`;
    
    const list = document.getElementById('trades-list');
    list.innerHTML = '';
    
    if (reps.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align:center; padding: 2rem;">No tienes láminas repetidas aún.</p>';
    } else {
        reps.forEach(group => {
            const grpDiv = document.createElement('div');
            grpDiv.className = 'trade-group';
            let itemsHtml = group.items.map(i => `<span class="trade-item">Lám. ${i.name.replace(/[A-Z]+/, '') || i.name} (x${i.count})</span>`).join('');
            grpDiv.innerHTML = `<h3>${group.team}</h3><div class="trade-items">${itemsHtml}</div>`;
            list.appendChild(grpDiv);
        });
    }
    updateTradeExportButtons(total > 0);
}

function renderRepeated() { renderTrades(); }

function updateTradeExportButtons(hasRepeated) {
    const disabled = !hasRepeated;
    document.getElementById('btn-share-list').disabled = disabled;
    document.getElementById('btn-export-pdf').disabled = disabled;
    document.getElementById('btn-export-excel').disabled = disabled;
    updateMissingExportButton();
}

function updateMissingExportButton() {
    const complete = getTotalProgress().percentage === 100;
    document.getElementById('btn-download-missing').disabled = complete;
}

function generateShareText() {
    const p = getTotalProgress();
    const reps = getRepeatedList();
    let txt = `*${state.profile.name}*\nProgreso: ${p.have}/${p.total} (${p.percentage}%)\nRepetidas: ${getRepeatedTotal()}\n\n`;
    
    reps.forEach(group => {
        txt += `${group.team}: `;
        txt += group.items.map(i => `${i.name.replace(/[A-Z]+/, '') || i.name}(${i.count})`).join(', ');
        txt += '\n';
    });
    
    document.getElementById('share-textarea').value = txt;
    showModal('modal-share');
}

function getTradeExportRows() {
    let rows = [];
    getRepeatedList().forEach(g => {
        g.items.forEach(i => {
            rows.push({ section: g.team, lam: i.name.replace(/[A-Z]+/, '') || i.name, qty: i.count });
        });
    });
    return rows;
}

function getMissingExportRows() {
    let rows = [];
    getMissingList().forEach(m => {
        rows.push({ section: m.team, lam: m.name.replace(/[A-Z]+/, '') || m.name });
    });
    return rows;
}

/* Corrección Excel: Genera CSV delimitado por comas */
function exportTradesExcel() {
    const rows = getTradeExportRows();
    let csv = '\uFEFFSección,Lámina,Repetidas\n';
    rows.forEach(r => { csv += `"${r.section}","${r.lam}","${r.qty}"\n`; });
    downloadBlob(csv, 'cambios_album_mundial_2026.csv', 'text/csv;charset=utf-8;');
}

function exportMissingExcel() {
    const rows = getMissingExportRows();
    let csv = '\uFEFFSección,Lámina\n';
    rows.forEach(r => { csv += `"${r.section}","${r.lam}"\n`; });
    downloadBlob(csv, 'faltantes_album_mundial_2026.csv', 'text/csv;charset=utf-8;');
}

/* Corrección PDF: Usar iframe invisible en lugar de popup */
function exportTradesPdf() {
    const p = getTotalProgress();
    let html = `<!DOCTYPE html><html><head><title>Cambios Álbum 2026</title><style>body{font-family:sans-serif; padding: 20px;} table{width:100%;border-collapse:collapse; margin-top: 20px;} th,td{border:1px solid #ccc;padding:8px;text-align:left;}</style></head><body>`;
    html += `<h1>Cambios - ${state.profile.name}</h1>`;
    html += `<p>Progreso: ${p.have}/${p.total} (${p.percentage}%) | Total repetidas: ${getRepeatedTotal()}</p>`;
    html += `<table><tr><th>Sección</th><th>Lámina</th><th>Repetidas</th></tr>`;
    
    getTradeExportRows().forEach(r => {
        html += `<tr><td>${r.section}</td><td>${r.lam}</td><td>${r.qty}</td></tr>`;
    });
    
    html += `</table></body></html>`;
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow || iframe.contentDocument.document || iframe.contentDocument;
    doc.document.open();
    doc.document.write(html);
    doc.document.close();
    
    iframe.contentWindow.focus();
    setTimeout(() => {
        try {
            iframe.contentWindow.print();
        } catch (err) {
            alert('Tu dispositivo bloquea la impresión automática. Por favor usa la opción Exportar Excel (CSV) o Compartir Lista.');
        }
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
}

function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* ==== Ajustes y Utilidades ==== */
function exportData() {
    const json = JSON.stringify(state, null, 2);
    downloadBlob(json, 'album_mundial_2026.json', 'application/json');
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (data.stickers) {
                state = data;
                saveState();
                init();
                closeModal('modal-settings');
                alert('Álbum restaurado con éxito.');
            }
        } catch (err) { alert('Archivo JSON inválido.'); }
    };
    reader.readAsText(file);
}

function confirmReset() {
    if (confirm('¿Estás seguro de reiniciar todo el álbum? Perderás todo el progreso.')) {
        resetAlbum();
    }
}

function resetAlbum() {
    state.stickers = {};
    state.milestones = {};
    saveState();
    closeModal('modal-settings');
    init();
}

function toggleTheme() {
    const root = document.documentElement;
    if (root.getAttribute('data-theme') === 'light') {
        root.removeAttribute('data-theme');
        localStorage.setItem('album_theme_2026', 'dark');
    } else {
        root.setAttribute('data-theme', 'light');
        localStorage.setItem('album_theme_2026', 'light');
    }
}

function loadTheme() {
    const theme = localStorage.getItem('album_theme_2026');
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
}

/* ==== Interfaz y Modales ==== */
function showModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; currentOpenTeam = null; }

function updateHeaderOffset() {
    const header = document.querySelector('.app-header');
    if(header) {
        document.documentElement.style.setProperty('--header-offset', `${header.offsetHeight + 18}px`);
    }
}

function observeHeaderOffset() {
    updateHeaderOffset();
    if(window.ResizeObserver) {
        new ResizeObserver(() => updateHeaderOffset()).observe(document.querySelector('.app-header'));
    }
    window.addEventListener('resize', updateHeaderOffset);
    if(document.fonts) document.fonts.ready.then(updateHeaderOffset);
}

function bindEvents() {
    document.getElementById('btn-theme').onclick = toggleTheme;
    document.getElementById('btn-settings').onclick = () => showModal('modal-settings');
    document.getElementById('btn-clear-filters').onclick = clearFilters;
    
    document.getElementById('search-input').oninput = (e) => { activeSearch.text = e.target.value; applyCollectionSearch(); };
    document.getElementById('filter-team').onchange = (e) => { activeSearch.team = e.target.value; applyCollectionSearch(); };
    document.getElementById('filter-group').onchange = (e) => { activeSearch.group = e.target.value; applyCollectionSearch(); };
    document.getElementById('sort-select').onchange = (e) => { activeSearch.sort = e.target.value; applyCollectionSearch(); };
    
    document.getElementById('btn-share-list').onclick = generateShareText;
    document.getElementById('btn-export-excel').onclick = exportTradesExcel;
    document.getElementById('btn-export-pdf').onclick = exportTradesPdf;
    document.getElementById('btn-download-missing').onclick = exportMissingExcel;

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.getAttribute('data-target');
            document.getElementById(target).classList.add('active');
            if (target === 'tab-trades') renderTrades();
            window.scrollTo(0, 0);
        };
    });
}

/* ==== Confetti ==== */
function triggerConfetti(x, y) {
    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    let particles = [];
    for(let i=0; i<30; i++) {
        particles.push({
            x: x, y: y,
            r: Math.random() * 4 + 2,
            dx: Math.random() * 6 - 3,
            dy: Math.random() * -6 - 2,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`
        });
    }
    
    function animate() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        let active = false;
        particles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            p.dy += 0.2; // gravity
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
            ctx.fillStyle = p.color;
            ctx.fill();
            if(p.y < canvas.height) active = true;
        });
        if(active) requestAnimationFrame(animate);
        else ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    animate();
}

function shootBigConfetti() {
    triggerConfetti(window.innerWidth/2, window.innerHeight/2);
    setTimeout(() => triggerConfetti(window.innerWidth/3, window.innerHeight/2), 200);
    setTimeout(() => triggerConfetti((window.innerWidth/3)*2, window.innerHeight/2), 400);
}

document.addEventListener('DOMContentLoaded', init);
