// ============================================================
// APP.JS — Álbum Panini Mundial 2026
// ============================================================

const STORAGE_KEY = 'album_mundial_2026_data';
let state = loadState();
let currentTab = 'home';
let currentTeamCode = null;
let sortMode = 'progress-desc';
let searchQuery = '';
let activeTeamFilter = '';
let activeGroupFilter = '';
let activePositionFilter = '';
let wantList = loadWantList();
let milestonesSeen = loadMilestones();
let progressObserver = null;

const TEAM_FLAG_CODES = {
  MEX: 'mx', RSA: 'za', KOR: 'kr', CZE: 'cz',
  CAN: 'ca', BIH: 'ba', QAT: 'qa', SUI: 'ch',
  BRA: 'br', MAR: 'ma', HAI: 'ht', SCO: 'gb-sct',
  USA: 'us', PAR: 'py', AUS: 'au', TUR: 'tr',
  GER: 'de', CUW: 'cw', CIV: 'ci', ECU: 'ec',
  NED: 'nl', JPN: 'jp', SWE: 'se', TUN: 'tn',
  BEL: 'be', EGV: 'eg', IRN: 'ir', NZL: 'nz',
  ESP: 'es', CPV: 'cv', KSA: 'sa', URU: 'uy',
  FRA: 'fr', SEN: 'sn', IRQ: 'iq', NOR: 'no',
  ARG: 'ar', ALG: 'dz', AUT: 'at', JOR: 'jo',
  POR: 'pt', COD: 'cd', UZB: 'uz', COL: 'co',
  ENG: 'gb-eng', CRO: 'hr', GHA: 'gh', PAN: 'pa'
};

function getAlbumSections() {
  return [...ADDITIONAL_SECTIONS, ...TEAMS_DATA];
}

function getSectionVisual(section) {
  const flagCode = TEAM_FLAG_CODES[section.code];
  if (flagCode) {
    return {
      code: flagCode.startsWith('gb-') ? section.code : flagCode.toUpperCase(),
      src: `https://flagcdn.com/w80/${flagCode}.png`,
      alt: `Bandera de ${section.name}`
    };
  }

  const label = section.icon || section.code;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="56" viewBox="0 0 80 56"><rect width="80" height="56" rx="8" fill="#1a2235"/><rect x="3" y="3" width="74" height="50" rx="6" fill="none" stroke="#f6c90e" stroke-width="2"/><text x="40" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#f6c90e">${label}</text></svg>`;
  return {
    code: label,
    src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    alt: section.name
  };
}

function getSectionGroupLabel(section) {
  return /^[A-L]$/.test(section.group) ? `Grupo ${section.group}` : section.group;
}

function getGroupSortValue(section) {
  if (/^[A-L]$/.test(section.group)) return section.group;
  return `0-${section.group}`;
}

// ── STATE MANAGEMENT ──────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrateStickerCodes(JSON.parse(raw));
  } catch (e) {}
  return { profile: { name: 'Mi Álbum', photo: null }, stickers: {}, lastUpdated: Date.now() };
}

function migrateStickerCodes(data) {
  if (!data?.stickers) return data;
  const migrated = {};
  Object.entries(data.stickers).forEach(([code, value]) => {
    const match = code.match(/^([A-Z]{3})-(\d{2})$/);
    const nextCode = match ? `${match[1]}${Number(match[2])}` : code;
    if (migrated[nextCode]) {
      migrated[nextCode].count += value.count || 0;
      migrated[nextCode].have = migrated[nextCode].have || value.have;
    } else {
      migrated[nextCode] = { ...value };
    }
  });
  data.stickers = migrated;
  return data;
}

function saveState() {
  state.lastUpdated = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadWantList() {
  try { return JSON.parse(localStorage.getItem('album_want_2026') || '{}'); } catch { return {}; }
}
function saveWantList() { localStorage.setItem('album_want_2026', JSON.stringify(wantList)); }

function loadMilestones() {
  try { return JSON.parse(localStorage.getItem('album_milestones_2026') || '[]'); } catch { return []; }
}
function saveMilestones() { localStorage.setItem('album_milestones_2026', JSON.stringify(milestonesSeen)); }

function getStickerState(code) {
  return state.stickers[code] || { have: false, count: 0 };
}

function toggleSticker(code, clickEvent) {
  const s = getStickerState(code);
  if (!s.have) {
    state.stickers[code] = { have: true, count: 1 };
    spawnParticles(clickEvent);
  } else {
    state.stickers[code] = { have: true, count: s.count + 1 };
  }
  saveState();
  checkMilestones();
}

function decrementSticker(code) {
  const s = getStickerState(code);
  if (!s.have) return;
  if (s.count <= 1) {
    state.stickers[code] = { have: false, count: 0 };
  } else {
    state.stickers[code] = { have: true, count: s.count - 1 };
  }
  saveState();
}

// ── STATS HELPERS ─────────────────────────────────────────

function getHaveCount(codes) {
  return codes.filter(c => getStickerState(c).have).length;
}

function getTeamProgress(teamCode) {
  const team = TEAMS[teamCode];
  if (!team) return { have: 0, total: 0 };
  const codes = team.stickers.map(s => s.code);
  return { have: getHaveCount(codes), total: team.stickers.length };
}

function getTotalProgress() {
  let have = 0;
  getAlbumSections().forEach(section => {
    section.stickers.forEach(s => { if (getStickerState(s.code).have) have++; });
  });
  return have;
}

function getSpecialProgress() {
  return ADDITIONAL_SECTIONS[0].stickers.filter(s => getStickerState(s.code).have).length;
}

function getExtraProgress() {
  return EXTRA_STICKERS.filter(s => getStickerState(s.code).have).length;
}

function getRepeatedList() {
  const list = [];
  getAlbumSections().forEach(section => {
    section.stickers.forEach(s => {
      const st = getStickerState(s.code);
      if (st.have && st.count > 1) {
        list.push({ ...s, teamName: section.name, teamFlag: section.flag || section.icon || section.code, extra: st.count - 1 });
      }
    });
  });
  return list;
}

function getRepeatedTotal() {
  return getRepeatedList().reduce((sum, sticker) => sum + sticker.extra, 0);
}

function getMissingList() {
  const list = [];
  getAlbumSections().forEach(section => {
    section.stickers.forEach(s => {
      if (!getStickerState(s.code).have) list.push({ ...s, teamName: section.name, teamFlag: section.flag || section.icon || section.code });
    });
  });
  return list;
}

// ── MILESTONES ────────────────────────────────────────────

function checkMilestones() {
  const total = getTotalProgress();
  const pct = (total / TOTAL_ALBUM_STICKERS) * 100;
  const milestones = [25, 50, 75, 100];
  milestones.forEach(m => {
    if (pct >= m && !milestonesSeen.includes(m)) {
      milestonesSeen.push(m);
      saveMilestones();
      showMilestoneCelebration(m);
    }
  });

  // Section complete check
  getAlbumSections().forEach(team => {
    const p = getTeamProgress(team.code);
    const key = `team_${team.code}`;
    if (p.total > 0 && p.have === p.total && !milestonesSeen.includes(key)) {
      milestonesSeen.push(key);
      saveMilestones();
      showTeamComplete(team);
    }
  });
}

function showMilestoneCelebration(pct) {
  launchConfetti();
  showModal('celebration-modal');
  document.getElementById('celebration-text').textContent =
    pct === 100 ? '¡ÁLBUM COMPLETO! 🏆' : `¡${pct}% completado!`;
  document.getElementById('celebration-sub').textContent =
    pct === 100
      ? '¡Felicitaciones! Completaste el álbum completo.'
      : `Llevas ${getTotalProgress()} láminas. ¡Sigue así!`;
}

function showTeamComplete(team) {
  launchConfetti();
  showModal('celebration-modal');
  document.getElementById('celebration-text').textContent = `¡${team.flag || team.icon || ''} ${team.name} COMPLETO!`;
  document.getElementById('celebration-sub').textContent = `¡Coleccionaste las ${team.stickers.length} láminas de esta sección!`;
}

// ── TAB NAVIGATION ────────────────────────────────────────

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  const content = document.getElementById(`tab-${tab}`);
  if (content) { content.classList.add('active'); content.classList.add('slide-in'); }
  const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  renderTab(tab);
}

function renderTab(tab) {
  if (tab === 'home') renderHome();
  if (tab === 'trades') renderTrades();
}

// ── TAB 1: HOME ───────────────────────────────────────────

function renderHome() {
  renderProfile();
  renderProgressCircle();
  renderDashboardCards();
  renderTeamsGrid();
}

function renderProfile() {
  document.getElementById('profile-name-display').textContent = state.profile.name;
}

function renderProgressCircle() {
  renderDashboardCards();
}

function renderDashboardCards() {
  const have = getTotalProgress();
  const repeated = getRepeatedTotal();
  const pct = Math.round((have / TOTAL_ALBUM_STICKERS) * 100);

  const ring = document.getElementById('dashboard-ring');
  if (ring) ring.style.setProperty('--progress', `${pct}%`);
  const circle = document.getElementById('dashboard-circle-fill');
  if (circle) {
    const radius = 74;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference - (circumference * pct / 100);
  }
  document.getElementById('dashboard-percent').textContent = pct + '%';
  document.getElementById('dashboard-summary').textContent =
    `Tienes ${have} de ${TOTAL_ALBUM_STICKERS} fichas únicas.`;
  document.getElementById('dashboard-linear-fill').style.width = pct + '%';
  document.getElementById('dashboard-progress-card').textContent = pct + '%';
  document.getElementById('dashboard-owned').textContent = have;
  document.getElementById('dashboard-duplicates').textContent = repeated;
}

function renderTeamsGrid() {
  const container = document.getElementById('teams-grid');
  container.innerHTML = '';
  const teamsList = [...TEAMS_DATA];
  const additionalSections = [...ADDITIONAL_SECTIONS];

  if (sortMode === 'progress-asc') {
    teamsList.sort((a, b) => getTeamProgress(a.code).have - getTeamProgress(b.code).have);
  } else if (sortMode === 'progress-desc') {
    // progress-desc: más completos primero (default)
    teamsList.sort((a, b) => getTeamProgress(b.code).have - getTeamProgress(a.code).have);
  } else if (sortMode === 'team-az') {
    additionalSections.sort((a, b) => a.name.localeCompare(b.name));
    teamsList.sort((a, b) => a.name.localeCompare(b.name));
  }

  additionalSections.forEach(t => container.appendChild(makeTeamCard(t)));
  teamsList.forEach(t => container.appendChild(makeTeamCard(t)));
  applyCollectionSearch();
  observeProgressBars();
  updateSortIndicator();
}

function makeTeamCards(teams, showGroup) {
  const frag = document.createDocumentFragment();
  teams.forEach(t => frag.appendChild(makeTeamCard(t)));
  return frag;
}

function makeTeamCard(team) {
  const p = getTeamProgress(team.code);
  const pct = p.total ? (p.have / p.total) * 100 : 0;
  const complete = p.have === p.total;
  const visual = getSectionVisual(team);
  const displayCode = visual.code;
  const groupLabel = getSectionGroupLabel(team);
  const stickerSearch = team.stickers
    .map(s => `${s.code} ${s.name} ${s.position || ''} ${s.type || ''}`)
    .join(' ');
  const searchable = `${displayCode} ${team.code} ${team.name} ${groupLabel} ${stickerSearch}`.toLowerCase();
  const positions = [...new Set(team.stickers.map(s => s.position).filter(Boolean))];

  const card = document.createElement('div');
  card.className = 'country-card';
  card.dataset.search = searchable;
  card.dataset.team = team.code;
  card.dataset.group = team.group;
  card.dataset.positions = positions.join('|');
  card.innerHTML = `
    <div class="country-card-header">
      <span class="country-code">${displayCode}</span>
      <img
        class="country-flag"
        src="${visual.src}"
        width="28"
        height="20"
        alt="${visual.alt}"
        loading="lazy"
      />
      <span class="country-name">${team.name}</span>
      ${team.debutant ? '<span class="debutant-badge">DEBUT</span>' : ''}
    </div>
    <div class="country-progress-row">
      <span class="country-count"><strong>${p.have}</strong>/${p.total}</span>
      <span class="country-percent">${Math.round(pct)}%</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill ${complete ? 'complete' : ''}" data-width="${pct}%"></div>
    </div>
  `;
  card.addEventListener('click', () => openTeamDetail(team.code));
  return card;
}

// ── TAB 2: FILL ───────────────────────────────────────────

function applyCollectionSearch() {
  const cards = document.querySelectorAll('.country-card');
  let matches = 0;
  cards.forEach(card => {
    const textMatch = !searchQuery || card.dataset.search.includes(searchQuery);
    const teamMatch = !activeTeamFilter || card.dataset.team === activeTeamFilter;
    const groupMatch = !activeGroupFilter || card.dataset.group === activeGroupFilter;
    const isMatch = textMatch && teamMatch && groupMatch;
    card.hidden = !isMatch;
    card.classList.toggle('dimmed', false);
    if (isMatch) matches++;
  });
  const clearBtn = document.getElementById('clear-filters');
  if (clearBtn) clearBtn.disabled = !searchQuery && !activeTeamFilter && !activeGroupFilter;
  const counter = document.getElementById('results-count');
  if (counter) {
    counter.textContent = `${matches} de ${cards.length} secciones`;
  }
}

function clearFilters() {
  searchQuery = '';
  activeTeamFilter = '';
  activeGroupFilter = '';
  activePositionFilter = '';

  const searchInput = document.getElementById('collection-search');
  const teamSelect = document.getElementById('filter-team');
  const groupSelect = document.getElementById('filter-group');
  if (searchInput) searchInput.value = '';
  if (teamSelect) teamSelect.value = '';
  if (groupSelect) groupSelect.value = '';

  applyCollectionSearch();
}

function observeProgressBars() {
  if (progressObserver) progressObserver.disconnect();
  progressObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const fill = entry.target;
      fill.style.width = fill.dataset.width || '0%';
      progressObserver.unobserve(fill);
    });
  }, { threshold: 0.35 });
  document.querySelectorAll('.progress-fill').forEach(fill => {
    fill.style.width = '0%';
    progressObserver.observe(fill);
  });
}

function updateSortIndicator() {
  const bar = document.getElementById('sort-bar');
  const indicator = document.getElementById('sort-indicator');
  const active = bar?.querySelector('.sort-btn.active');
  if (!bar || !indicator || !active) return;
  indicator.style.left = `${active.offsetLeft}px`;
  indicator.style.width = `${active.offsetWidth}px`;
}

function populateTeamFilter() {
  const select = document.getElementById('filter-team');
  if (!select || select.options.length > 1) return;
  getAlbumSections().forEach(team => {
    const option = document.createElement('option');
    option.value = team.code;
    option.textContent = team.name;
    select.appendChild(option);
  });
}

function populateGroupFilter() {
  const select = document.getElementById('filter-group');
  if (!select || select.options.length > 1) return;
  const groups = [...new Set(getAlbumSections().map(section => section.group))]
    .sort((a, b) => getGroupSortValue({ group: a }).localeCompare(getGroupSortValue({ group: b })));
  groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group;
    option.textContent = getSectionGroupLabel({ group });
    select.appendChild(option);
  });
}

function makeStickerCard(sticker, st, onAfterToggle) {
  const repeated = st.have && st.count > 1;
  const card = document.createElement('div');
  card.className = [
    'sticker-card',
    st.have ? 'owned' : '',
    repeated ? 'repeated' : '',
    sticker.type === 'shield' || sticker.type === 'group' || sticker.type === 'album-special' || sticker.type === 'sponsor' ? 'special' : ''
  ].filter(Boolean).join(' ');
  card.dataset.code = sticker.code;

  let posClass = '';
  let posLabel = '';
  if (sticker.position) {
    const posKey = Object.keys(POSITIONS).find(k => POSITIONS[k] === sticker.position);
    posClass = posKey || '';
    posLabel = sticker.position;
  }

  let typeLabel = '';
  if (sticker.type === 'shield') typeLabel = '🛡️ Escudo';
  if (sticker.type === 'group') typeLabel = '📸 Grupal';
  if (sticker.type === 'album-special') typeLabel = 'FWC';
  if (sticker.type === 'sponsor') typeLabel = 'Coca-Cola';

  card.innerHTML = `
    ${typeLabel ? `<span class="sticker-type-badge">${typeLabel}</span>` : ''}
    <span class="sticker-name">${sticker.name}</span>
    ${posLabel ? `<span class="sticker-pos ${posClass}">${posLabel}</span>` : ''}
    ${repeated ? `<span class="repeat-badge">+${st.count - 1}</span>` : ''}
    <button class="minus-btn" data-code="${sticker.code}">−</button>
  `;

  function refreshCardVisual() {
    const newSt = getStickerState(sticker.code);
    const newRepeated = newSt.have && newSt.count > 1;
    card.className = [
      'sticker-card',
      newSt.have ? 'owned' : '',
      newRepeated ? 'repeated' : '',
      sticker.type === 'shield' || sticker.type === 'group' || sticker.type === 'album-special' || sticker.type === 'sponsor' ? 'special' : ''
    ].filter(Boolean).join(' ');
    const badge = card.querySelector('.repeat-badge');
    const minus = card.querySelector('.minus-btn');
    if (newRepeated) {
      if (badge) badge.textContent = `+${newSt.count - 1}`;
      else {
        const b = document.createElement('span');
        b.className = 'repeat-badge'; b.textContent = `+${newSt.count - 1}`;
        card.appendChild(b);
      }
    } else if (badge) badge.remove();
    if (minus) minus.style.display = newSt.have ? 'flex' : 'none';
    if (onAfterToggle) onAfterToggle();
    else updateTeamCount();
    updateHomeProgress();
  }

  card.addEventListener('click', (e) => {
    if (e.target.classList.contains('minus-btn')) return;
    toggleSticker(sticker.code, e);
    card.classList.add('marking');
    setTimeout(() => card.classList.remove('marking'), 300);
    refreshCardVisual();
  });

  const minusBtn = card.querySelector('.minus-btn');
  if (minusBtn) {
    minusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      decrementSticker(sticker.code);
      refreshCardVisual();
    });
  }

  return card;
}

function updateTeamCount() {
  if (!currentTeamCode) return;
  const p = getTeamProgress(currentTeamCode);
  const counter = document.getElementById('sticker-team-count');
  if (counter) counter.textContent = `${p.have} / ${p.total}`;
}

function updateHomeProgress() {
  if (currentTab === 'home') {
    renderProgressCircle();
    renderDashboardCards();
    renderTeamsGrid();
  }
}

// ── TAB 3: TRADES ─────────────────────────────────────────

function renderTrades() {
  const repeated = getRepeatedList();
  const missing = getMissingList();
  document.getElementById('trades-repeated-count').textContent = getRepeatedTotal();
  updateTradeExportButtons(repeated.length > 0);
  updateMissingExportButton(missing.length > 0);
  renderRepeated(repeated);
}

function updateTradeExportButtons(hasRepeated) {
  ['export-trades-pdf', 'export-trades-excel', 'share-fab'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !hasRepeated;
  });
}

function updateMissingExportButton(hasMissing) {
  const btn = document.getElementById('export-missing-excel');
  if (btn) btn.disabled = !hasMissing;
}

function renderRepeated(list) {
  const container = document.getElementById('trades-repeated-list');
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🃏</div>Aún no tienes láminas repetidas</div>`;
    return;
  }

  const byTeam = {};
  list.forEach(s => {
    const key = s.teamName;
    if (!byTeam[key]) byTeam[key] = { flag: s.teamFlag, name: s.teamName, stickers: [] };
    byTeam[key].stickers.push(s);
  });

  Object.values(byTeam).forEach(({ flag, name, stickers }) => {
    const block = document.createElement('div');
    block.className = 'trades-team-block';
    block.innerHTML = `<div class="trades-team-name">${flag} ${name}</div>`;
    stickers.forEach(s => {
      const row = document.createElement('div');
      row.className = 'repeated-sticker-row';
      row.innerHTML = `
        <span class="repeated-sticker-name">${s.name}</span>
        <span class="repeated-qty">+${s.extra}</span>
        <button class="repeated-minus" data-code="${s.code}">−</button>
      `;
      row.querySelector('.repeated-minus').addEventListener('click', () => {
        decrementSticker(s.code);
        renderTrades();
      });
      block.appendChild(row);
    });
    container.appendChild(block);
  });
}

function renderWantList(missing) {
  const container = document.getElementById('trades-want-list');
  container.innerHTML = '';

  if (missing.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div>¡Álbum completo!</div>`;
    return;
  }

  const byTeam = {};
  missing.forEach(s => {
    const key = s.teamName;
    if (!byTeam[key]) byTeam[key] = { flag: s.teamFlag, name: s.teamName, stickers: [] };
    byTeam[key].stickers.push(s);
  });

  Object.values(byTeam).slice(0, 12).forEach(({ flag, name, stickers }) => {
    const block = document.createElement('div');
    block.className = 'trades-team-block';
    block.innerHTML = `<div class="trades-team-name">${flag} ${name}</div>`;
    stickers.slice(0, 5).forEach(s => {
      const isWanted = !!wantList[s.code];
      const row = document.createElement('div');
      row.className = 'want-sticker-row' + (isWanted ? ' marked' : '');
      row.innerHTML = `
        <div class="want-check">${isWanted ? '✓' : ''}</div>
        <span class="repeated-sticker-name">${s.name}</span>
      `;
      row.addEventListener('click', () => {
        if (wantList[s.code]) delete wantList[s.code];
        else wantList[s.code] = true;
        saveWantList();
        row.classList.toggle('marked');
        const check = row.querySelector('.want-check');
        check.textContent = wantList[s.code] ? '✓' : '';
      });
      block.appendChild(row);
    });
    if (stickers.length > 5) {
      const more = document.createElement('div');
      more.style.cssText = 'padding:4px 0;font-size:11px;color:var(--text2)';
      more.textContent = `+${stickers.length - 5} más...`;
      block.appendChild(more);
    }
    container.appendChild(block);
  });
}

function generateShareText() {
  const repeated = getRepeatedList();
  let text = `🏆 MI ÁLBUM MUNDIAL 2026 — ${state.profile.name}\n`;
  text += `📊 Progreso: ${getTotalProgress()}/${TOTAL_ALBUM_STICKERS} (${Math.round(getTotalProgress()/TOTAL_ALBUM_STICKERS*100)}%)\n\n`;

  if (repeated.length > 0) {
    text += `🔄 TENGO PARA CAMBIO:\n`;
    repeated.forEach(s => { text += `  ${s.name} (+${s.extra})\n`; });
  } else {
    text += `No tengo láminas repetidas por ahora.\n`;
  }

  text += `\n📱 Álbum Mundial 2026 App`;
  return text;
}

// ── TAB 4: STATS ──────────────────────────────────────────

function getTradeExportRows() {
  return getRepeatedList().map(s => ({
    section: s.teamName,
    name: s.name,
    repeated: s.extra
  }));
}

function getMissingExportRows() {
  return getMissingList().map(s => ({
    section: s.teamName,
    name: s.name
  }));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportTradesExcel() {
  const rows = getTradeExportRows();
  if (rows.length === 0) return;
  const tableRows = rows.map(row => `
    <tr>
      <td>${escapeHtml(row.section)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${row.repeated}</td>
    </tr>
  `).join('');
  const html = `
    <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1">
          <tr>
            <th>Seccion</th>
            <th>Lamina</th>
            <th>Repetidas</th>
          </tr>
          ${tableRows}
        </table>
      </body>
    </html>
  `;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  downloadBlob(blob, 'cambios_album_mundial_2026.xls');
}

function exportMissingExcel() {
  const rows = getMissingExportRows();
  if (rows.length === 0) return;
  const tableRows = rows.map(row => `
    <tr>
      <td>${escapeHtml(row.section)}</td>
      <td>${escapeHtml(row.name)}</td>
    </tr>
  `).join('');
  const html = `
    <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1">
          <tr>
            <th>Seccion</th>
            <th>Lamina</th>
          </tr>
          ${tableRows}
        </table>
      </body>
    </html>
  `;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  downloadBlob(blob, 'faltantes_album_mundial_2026.xls');
}

function escapePdfText(value) {
  return String(value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildPdfPage(lines) {
  const commands = ['BT', '/F1 11 Tf', '50 780 Td'];
  lines.forEach((line, index) => {
    if (index > 0) commands.push('0 -16 Td');
    commands.push(`(${escapePdfText(line)}) Tj`);
  });
  commands.push('ET');
  return commands.join('\n');
}

function createSimplePdf(lines) {
  const pages = [];
  for (let i = 0; i < lines.length; i += 42) pages.push(lines.slice(i, i + 42));
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    `2 0 obj\n<< /Type /Pages /Kids [${pages.map((_, i) => `${(i * 2) + 3} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj`
  ];
  const fontObj = pages.length * 2 + 3;
  pages.forEach((pageLines, i) => {
    const pageObj = (i * 2) + 3;
    const contentObj = pageObj + 1;
    const stream = buildPdfPage(pageLines);
    objects.push(`${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${contentObj} 0 R >>\nendobj`);
    objects.push(`${contentObj} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`);
  });
  objects.push(`${fontObj} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach(obj => {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function exportTradesPdf() {
  const rows = getTradeExportRows();
  if (rows.length === 0) return;
  const lines = [
    'Album Mundial 2026 - Lista de cambios',
    `Coleccionista: ${state.profile.name}`,
    `Progreso: ${getTotalProgress()}/${TOTAL_ALBUM_STICKERS}`,
    `Total repetidas: ${getRepeatedTotal()}`,
    '',
    'Seccion | Lamina | Repetidas',
    '-----------------------------',
    ...rows.map(row => `${row.section} | ${row.name} | +${row.repeated}`)
  ];
  const blob = new Blob([createSimplePdf(lines)], { type: 'application/pdf' });
  downloadBlob(blob, 'cambios_album_mundial_2026.pdf');
}

const CONFED_COLORS = {
  'CONCACAF': '#E53935', 'CONMEBOL': '#43A047', 'UEFA': '#1E88E5',
  'CAF': '#F9A825', 'AFC': '#8E24AA', 'OFC': '#00ACC1'
};

const TEAM_CONFED = {
  MEX:'CONCACAF',RSA:'CAF',KOR:'AFC',CZE:'UEFA',
  CAN:'CONCACAF',BIH:'UEFA',QAT:'AFC',SUI:'UEFA',
  BRA:'CONMEBOL',MAR:'CAF',HAI:'CONCACAF',SCO:'UEFA',
  USA:'CONCACAF',PAR:'CONMEBOL',AUS:'AFC',TUR:'UEFA',
  GER:'UEFA',CUW:'CONCACAF',CIV:'CAF',ECU:'CONMEBOL',
  NED:'UEFA',JPN:'AFC',SWE:'UEFA',TUN:'CAF',
  BEL:'UEFA',EGV:'CAF',IRN:'AFC',NZL:'OFC',
  ESP:'UEFA',CPV:'CAF',KSA:'AFC',URU:'CONMEBOL',
  FRA:'UEFA',SEN:'CAF',IRQ:'AFC',NOR:'UEFA',
  ARG:'CONMEBOL',ALG:'CAF',AUT:'UEFA',JOR:'AFC',
  POR:'UEFA',COD:'CAF',UZB:'AFC',COL:'CONMEBOL',
  ENG:'UEFA',CRO:'UEFA',GHA:'CAF',PAN:'CONCACAF'
};

function renderStats() {
  renderConfedStats();
  renderTopTeams();
  renderEstimate();
  renderCompletedTeams();
  renderMilestoneBar();
}

function renderConfedStats() {
  const confeds = {};
  TEAMS_DATA.forEach(team => {
    const c = TEAM_CONFED[team.code] || 'Otro';
    if (!confeds[c]) confeds[c] = { have: 0, total: 0 };
    const p = getTeamProgress(team.code);
    confeds[c].have += p.have;
    confeds[c].total += p.total;
  });

  const container = document.getElementById('confed-bars');
  container.innerHTML = '';
  Object.entries(confeds).forEach(([name, { have, total }]) => {
    const pct = Math.round((have / total) * 100);
    const color = CONFED_COLORS[name] || '#999';
    const row = document.createElement('div');
    row.className = 'confed-bar-row';
    row.innerHTML = `
      <span class="confed-name">${name}</span>
      <div class="confed-track">
        <div class="confed-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <span class="confed-pct">${pct}%</span>
    `;
    container.appendChild(row);
  });
}

function renderTopTeams() {
  const sorted = TEAMS_DATA.map(t => ({ ...t, p: getTeamProgress(t.code) }))
    .sort((a, b) => b.p.have - a.p.have);

  const topContainer = document.getElementById('top-teams-list');
  const bottomContainer = document.getElementById('bottom-teams-list');
  topContainer.innerHTML = '';
  bottomContainer.innerHTML = '';

  sorted.slice(0, 5).forEach((t, i) => {
    topContainer.appendChild(makeTopRow(i + 1, t));
  });
  sorted.slice(-5).reverse().forEach((t, i) => {
    bottomContainer.appendChild(makeTopRow(sorted.length - i, t));
  });
}

function makeTopRow(rank, team) {
  const el = document.createElement('div');
  el.className = 'top-team-row';
  el.innerHTML = `
    <span class="top-rank">${rank}</span>
    <span class="top-flag">${team.flag}</span>
    <span class="top-name">${team.name}</span>
    <span class="top-val">${team.p.have}/${team.p.total}</span>
  `;
  return el;
}

function renderEstimate() {
  const total = getTotalProgress();
  const packs = Math.round(total / STICKERS_PER_PACK);
  document.getElementById('estimate-packs').textContent = packs;
  document.getElementById('estimate-cost').textContent =
    `≈ ${total} láminas obtenidas · ~${packs} sobres comprados`;
}

function renderCompletedTeams() {
  const container = document.getElementById('completed-teams');
  container.innerHTML = '';
  const completed = getAlbumSections().filter(t => {
    const p = getTeamProgress(t.code);
    return p.total > 0 && p.have === p.total;
  });
  if (completed.length === 0) {
    container.innerHTML = '<span style="font-size:13px;color:var(--text-secondary)">Aún no hay secciones completas</span>';
    return;
  }
  completed.forEach(t => {
    const chip = document.createElement('div');
    chip.className = 'completed-team-chip';
    chip.textContent = `${t.flag || t.icon || ''} ${t.name} OK`;
    container.appendChild(chip);
  });
}

function renderMilestoneBar() {
  const total = getTotalProgress();
  const pct = (total / TOTAL_ALBUM_STICKERS) * 100;
  [25, 50, 75, 100].forEach(m => {
    const dot = document.getElementById(`milestone-${m}`);
    if (dot) {
      if (pct >= m) dot.classList.add('reached');
      else dot.classList.remove('reached');
    }
  });
}

// ── CONFETTI ──────────────────────────────────────────────

function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -20,
    r: Math.random() * 8 + 4,
    d: Math.random() * 80 + 20,
    color: ['#C9A227','#F0D060','#4FC3F7','#66BB6A','#EF5350','#CE93D8'][Math.floor(Math.random()*6)],
    tilt: Math.random() * 10 - 10,
    tiltSpeed: Math.random() * 0.07 + 0.05,
    opacity: 1
  }));

  let frame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r / 2, p.tilt, 0, Math.PI * 2);
      ctx.fill();
      p.y += Math.cos(p.d) + 2 + p.r / 12;
      p.x += Math.sin(p.d) * 2;
      p.tilt += p.tiltSpeed;
      if (p.y > canvas.height) p.opacity -= 0.02;
    });
    ctx.globalAlpha = 1;
    if (pieces.some(p => p.opacity > 0)) frame = requestAnimationFrame(draw);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  cancelAnimationFrame(frame);
  draw();
}

function spawnParticles(e) {
  if (!e || !e.clientX) return;
  const colors = ['#C9A227','#F0D060','#4FC3F7','#1E88E5'];
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 8 + 4;
    const tx = (Math.random() - 0.5) * 80 + 'px';
    const ty = -(Math.random() * 60 + 20) + 'px';
    p.style.cssText = `
      width:${size}px;height:${size}px;
      background:${colors[i % colors.length]};
      left:${e.clientX}px;top:${e.clientY}px;
      --tx:${tx};--ty:${ty};
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

// ── MODALS ────────────────────────────────────────────────

function showModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function openTeamDetail(teamCode) {
  const team = TEAMS[teamCode];
  if (!team) return;
  currentTeamCode = teamCode;
  const p = getTeamProgress(teamCode);
  const visual = getSectionVisual(team);
  const flag = document.getElementById('team-detail-flag');
  flag.src = visual.src;
  flag.alt = visual.alt;
  document.getElementById('team-detail-name').textContent = team.name;
  document.getElementById('team-detail-group').textContent = `${getSectionGroupLabel(team)} · ${p.have}/${p.total}`;

  const updateHeader = () => {
    const current = getTeamProgress(teamCode);
    document.getElementById('team-detail-group').textContent =
      `${getSectionGroupLabel(team)} · ${current.have}/${current.total}`;
  };

  const grid = document.getElementById('team-detail-grid');
  grid.innerHTML = '';
  const hasPositions = team.stickers.some(s => s.position);
  team.stickers.forEach((s, index) => {
    if (activePositionFilter && hasPositions && s.position && s.position !== activePositionFilter) return;
    if (activePositionFilter && hasPositions && !s.position) return;
    const st = getStickerState(s.code);
    const card = makeStickerCard(s, st, updateHeader);
    card.style.animationDelay = `${index * 30}ms`;
    grid.appendChild(card);
  });

  showModal('team-detail-modal');
}

// ── SEARCH & FILTER ───────────────────────────────────────

function handleSearch(q) {
  if (!q) return;
  q = q.toLowerCase();
  const results = [];
  TEAMS_DATA.forEach(team => {
    if (team.name.toLowerCase().includes(q)) {
      currentTeamCode = team.code;
      return;
    }
    team.stickers.forEach(s => {
      if (s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)) {
        results.push({ team, sticker: s });
      }
    });
  });
  if (results.length > 0) {
    const grid = document.getElementById('stickers-grid');
    grid.innerHTML = '';
    results.forEach(({ sticker }) => {
      const st = getStickerState(sticker.code);
      grid.appendChild(makeStickerCard(sticker, st));
    });
  }
}

// ── PROFILE ───────────────────────────────────────────────

function openEditName() {
  const name = prompt('Nombre del coleccionista:', state.profile.name);
  if (name && name.trim()) {
    state.profile.name = name.trim();
    saveState();
    renderProfile();
  }
}

function handleAvatarUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    state.profile.photo = e.target.result;
    saveState();
    renderProfile();
  };
  reader.readAsDataURL(file);
}

// ── IMPORT / EXPORT ───────────────────────────────────────

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'album_mundial_2026.json';
  a.click(); URL.revokeObjectURL(url);
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.stickers) {
        state = data;
        saveState();
        renderTab(currentTab);
        alert('✅ Datos importados correctamente');
      }
    } catch { alert('❌ Archivo inválido'); }
  };
  reader.readAsText(file);
}

function resetAlbum() {
  showModal('reset-modal');
}

function confirmReset() {
  state.stickers = {};
  milestonesSeen = [];
  saveState();
  saveMilestones();
  closeModal('reset-modal');
  renderTab(currentTab);
}

// ── DARK MODE ─────────────────────────────────────────────

function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next === 'dark' ? '' : 'light';
  localStorage.setItem('album_theme_2026', next);
  document.getElementById('theme-btn').textContent = next === 'dark' ? '☀️' : '🌙';
}

function loadTheme() {
  const saved = localStorage.getItem('album_theme_2026');
  if (saved === 'light') {
    document.documentElement.dataset.theme = 'light';
    document.getElementById('theme-btn').textContent = '🌙';
  }
}

// ── INIT ──────────────────────────────────────────────────

function setThemeButtonIcon() {
  document.getElementById('theme-btn').textContent =
    document.documentElement.dataset.theme === 'light' ? '☀' : '☾';
}

function updateHeaderOffset() {
  const header = document.querySelector('.app-header');
  if (!header) return;
  document.documentElement.style.setProperty('--header-offset', `${header.offsetHeight + 18}px`);
}

function observeHeaderOffset() {
  const header = document.querySelector('.app-header');
  if (!header) return;
  updateHeaderOffset();
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(() => {
      updateHeaderOffset();
      updateSortIndicator();
    });
    observer.observe(header);
  }
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      updateHeaderOffset();
      updateSortIndicator();
    });
  }
}

function toggleTheme() {
  if (document.documentElement.dataset.theme === 'light') {
    delete document.documentElement.dataset.theme;
    localStorage.setItem('album_theme_2026', 'dark');
  } else {
    document.documentElement.dataset.theme = 'light';
    localStorage.setItem('album_theme_2026', 'light');
  }
  setThemeButtonIcon();
}

function loadTheme() {
  if (localStorage.getItem('album_theme_2026') === 'light') {
    document.documentElement.dataset.theme = 'light';
  } else {
    delete document.documentElement.dataset.theme;
  }
  setThemeButtonIcon();
}

function init() {
  loadTheme();
  populateTeamFilter();
  populateGroupFilter();
  observeHeaderOffset();

  // Nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Theme toggle
  document.getElementById('theme-btn').addEventListener('click', toggleTheme);

  // Profile
  document.getElementById('profile-name-display').addEventListener('click', openEditName);

  document.getElementById('collection-search').addEventListener('input', e => {
    searchQuery = e.target.value.trim().toLowerCase();
    applyCollectionSearch();
  });
  document.getElementById('filter-team').addEventListener('change', e => {
    activeTeamFilter = e.target.value;
    applyCollectionSearch();
  });
  document.getElementById('filter-group').addEventListener('change', e => {
    activeGroupFilter = e.target.value;
    applyCollectionSearch();
  });
  document.getElementById('clear-filters').addEventListener('click', clearFilters);

  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sortMode = btn.dataset.sort;
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTeamsGrid();
      updateSortIndicator();
    });
  });

  // Modal closes (click overlay)
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Settings modal
  document.getElementById('settings-btn').addEventListener('click', () => showModal('settings-modal'));
  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('import-file').addEventListener('change', e => importData(e.target.files[0]));
  document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
  document.getElementById('reset-btn').addEventListener('click', resetAlbum);
  document.getElementById('confirm-reset').addEventListener('click', confirmReset);
  document.getElementById('cancel-reset').addEventListener('click', () => closeModal('reset-modal'));

  // Share
  document.getElementById('share-fab').addEventListener('click', () => {
    const text = generateShareText();
    document.getElementById('share-text').value = text;
    showModal('share-modal');
  });
  document.getElementById('export-trades-pdf').addEventListener('click', exportTradesPdf);
  document.getElementById('export-trades-excel').addEventListener('click', exportTradesExcel);
  document.getElementById('export-missing-excel').addEventListener('click', exportMissingExcel);
  document.getElementById('copy-share').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('share-text').value)
      .then(() => { document.getElementById('copy-share').textContent = '✅ Copiado'; setTimeout(() => { document.getElementById('copy-share').textContent = '📋 Copiar'; }, 2000); });
  });

  // Celebration close
  document.getElementById('close-celebration').addEventListener('click', () => closeModal('celebration-modal'));

  // Start on home
  switchTab('home');
  window.addEventListener('resize', () => {
    updateHeaderOffset();
    updateSortIndicator();
  });
}

document.addEventListener('DOMContentLoaded', init);
