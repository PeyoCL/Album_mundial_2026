const STORAGE_KEY = 'album_mundial_2026_data';
let state = { profile: { name: 'Mi Álbum', photo: null }, stickers: {}, lastUpdated: Date.now(), milestones: {} };
let activeSearch = { text: '', team: 'all', group: 'all', sort: 'all' };
let currentOpenTeam = null;

function init() {
    try {
        loadTheme();
        loadState();
        migrateStickerCodes();
        
        updateProfileName(state.profile?.name);

        const title = document.getElementById('album-title');
        if(title) {
            title.addEventListener('blur', () => { updateProfileName(title.innerText); });
            title.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } });
        }

        const inputProfile = document.getElementById('input-profile-name');
        if(inputProfile) {
            inputProfile.addEventListener('input', (e) => { updateProfileName(e.target.value, false); });
        }

        populateTeamFilter();
        populateGroupFilter();
        bindEvents();
        
        observeHeaderOffset();
        renderHome();
        updateTradeExportButtons();
    } catch (error) {
        console.error("Error crítico evitado en init():", error);
        // Si hay un error, nos aseguramos que los botones sigan funcionando
        bindEvents(); 
    }
}

function updateProfileName(newName, updateInput = true) {
    let name = 'Mi Álbum';
    if (newName && typeof newName === 'string') {
        name = newName.trim() || 'Mi Álbum';
    }
    
    if (!state.profile) state.profile = {};
    state.profile.name = name;
    
    const titleEl = document.getElementById('album-title');
    if (titleEl) titleEl.innerText = name;
    
    const btnCopy = document.getElementById('btn-copy-match');
    if (btnCopy) btnCopy.innerText = `1. Copiar mis datos (${name})`;
    
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
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
            if (!state.profile) state.profile = { name: 'Mi Álbum' };
            if (!state.stickers) state.stickers = {};
        } catch(e) { console.warn("Error leyendo state de localStorage."); }
    }
}

function saveState() {
    state.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function migrateStickerCodes() {
    let migrated = false;
    const newStickers = {};
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
    if (!s.have) {
        s.have = true; s.count = 1;
        triggerConfetti(ev.clientX, ev.clientY);
    } else { s.count++; }
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

function getHaveCount() { return Object.values(state.stickers || {}).filter(s => s.have).length; }

function getTeamProgress(teamCode) {
    if (!window.DATA || !window.DATA.TEAMS) return { have: 0, total: 0 };
    const team = window.DATA.TEAMS.find(t => t.code === teamCode);
    if(!team) return { have: 0, total: 0 };
    let have = team.stickers.filter(s => getStickerState(s.code).have).length;
    return { have, total: team.stickers.length };
}

function getTotalProgress() {
    let have = getHaveCount(); 
    let total = window.DATA ? window.DATA.TOTAL_STICKERS : 994;
    return { have, total, percentage: Math.round((have / total) * 100) || 0 };
}

function checkMilestones() {
    const p = getTotalProgress().percentage;
    const targets = [25, 50, 75, 100];
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

function renderDashboardCards() {
    const p = getTotalProgress(); const rep = getRepeatedTotal();
    
    const pctEl = document.getElementById('main-percentage');
    if (pctEl) pctEl.innerText = `${p.percentage}%`;
    
    const textEl = document.getElementById('main-progress-text');
    if (textEl) textEl.innerText = `Tienes ${p.have} de ${p.total} láminas únicas.`;
    
    const barEl = document.getElementById('main-linear-bar');
    if (barEl) barEl.style.width = `${p.percentage}%`;
    
    const ringEl = document.getElementById('main-progress-ring');
    if (ringEl) ringEl.style.background = `conic-gradient(var(--blue-accent) ${p.percentage * 3.6}deg, var(--bg-surface) 0deg)`;
    
    const advEl = document.getElementById('metric-advance');
    if (advEl) advEl.innerText = `${p.percentage}%`;
    
    const uniEl = document.getElementById('metric-unique');
    if (uniEl) uniEl.innerText = `${p.have} / ${p.total}`;
    
    const repEl = document.getElementById('metric-repeated');
    if (repEl) repEl.innerText = `${rep} rep.`;
}

function renderTeamsGrid(teams) {
    const grid = document.getElementById('teams-grid'); 
    if(!grid) return;
    grid.innerHTML = '';
    let toRender = teams || (window.DATA ? window.DATA.TEAMS : []);
    
    const counterEl = document.getElementById('results-counter');
    if(counterEl) counterEl.innerText = `${toRender.length} resultados`;
    
    toRender.forEach(team => { grid.appendChild(makeTeamCard(team)); });
}

function makeTeamCard(team) {
    const prog = getTeamProgress(team.code);
    const pct = Math.round((prog.have / prog.total) * 100) || 0;
    const div = document.createElement('div');
    div.className = `team-card ${prog.have === prog.total ? 'completed' : ''}`;
    div.id = `team-card-${team.code}`;
    div.onclick = () => openTeamDetail(team);
    const iconHtml = team.flag ? `<img src="${team.flag}" class="team-icon">` : `<div class="team-icon" style="font-size:24px; display:flex; align-items:center; justify-content:center;">${team.icon}</div>`;
    
    div.innerHTML = `
        <div class="team-card-header">${iconHtml}<div class="team-info"><h3>${team.name}</h3><span>${team.group}</span></div></div>
        <div class="team-stats"><span>Progreso</span><span id="card-count-${team.code}">${prog.have}/${prog.total} (${pct}%)</span></div>
        <div class="linear-progress"><div class="linear-bar" id="card-bar-${team.code}" style="width: ${pct}%;"></div></div>
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
        ${badge}<button class="btn-minus" onclick="decrementSticker('${sticker.code}', event)">-</button>
    `;
    return div;
}

function openTeamDetail(team) {
    currentOpenTeam = team;
    document.getElementById('modal-team-name').innerText = team.name;
    document.getElementById('modal-team-group').innerText = team.group;
    const iconEl = document.getElementById('modal-team-icon');
    if (team.flag) { iconEl.src = team.flag; iconEl.style.display = 'block'; } else { iconEl.style.display = 'none'; }
    renderStickersGrid(team);
    showModal('modal-team');
}

function renderStickersGrid(team) {
    const grid = document.getElementById('modal-stickers-grid'); grid.innerHTML = '';
    team.stickers.forEach(s => { grid.appendChild(makeStickerCard(s)); });
    updateTeamCount(team.code);
}

function updateTeamCount(teamCode) {
    const p = getTeamProgress(teamCode);
    
    const countEl = document.getElementById('modal-team-count');
    if(countEl) countEl.innerText = `${p.have}/${p.total}`;
    
    const cardCount = document.getElementById(`card-count-${teamCode}`);
    const cardBar = document.getElementById(`card-bar-${teamCode}`);
    const card = document.getElementById(`team-card-${teamCode}`);
    if (cardCount) {
        const pct = Math.round((p.have / p.total) * 100) || 0;
        cardCount.innerText = `${p.have}/${p.total} (${pct}%)`;
        cardBar.style.width = `${pct}%`;
        if (p.have === p.total && p.total > 0) {
            card.classList.add('completed');
            if(!state.milestones) state.milestones = {};
            if(!state.milestones[`team_${teamCode}`]) { state.milestones[`team_${teamCode}`] = true; shootBigConfetti(); }
        } else { card.classList.remove('completed'); }
    }
}

function updateHomeProgress() { renderDashboardCards(); }

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
    const searchInput = document.getElementById('search-input');
    if(searchInput) searchInput.value = '';
    
    const filterTeam = document.getElementById('filter-team');
    if(filterTeam) filterTeam.value = 'all';
    
    const filterGroup = document.getElementById('filter-group');
    if(filterGroup) filterGroup.value = 'all';
    
    activeSearch = { ...activeSearch, text: '', team: 'all', group: 'all' };
    applyCollectionSearch();
}

function populateTeamFilter() {
    const sel = document.getElementById('filter-team');
    if(!sel || !window.DATA || !window.DATA.TEAMS) return;
    window.DATA.TEAMS.forEach(t => { const opt = document.createElement('option'); opt.value = t.code; opt.innerText = t.name; sel.appendChild(opt); });
}

function populateGroupFilter() {
    const sel = document.getElementById('filter-group');
    if(!sel || !window.DATA || !window.DATA.TEAMS) return;
    const groups = new Set(window.DATA.TEAMS.map(t => t.group));
    groups.forEach(g => { const opt = document.createElement('option'); opt.value = g
