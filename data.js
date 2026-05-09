const GROUPS = {
    A: ['MEX', 'RSA', 'KOR', 'CZE'],
    B: ['CAN', 'BIH', 'QAT', 'SUI'],
    C: ['BRA', 'MAR', 'HAI', 'SCO'],
    D: ['USA', 'PAR', 'AUS', 'TUR'],
    E: ['GER', 'CUW', 'CIV', 'ECU'],
    F: ['NED', 'JPN', 'SWE', 'TUN'],
    G: ['BEL', 'EGV', 'IRN', 'NZL'],
    H: ['ESP', 'CPV', 'KSA', 'URU'],
    I: ['FRA', 'SEN', 'IRQ', 'NOR'],
    J: ['ARG', 'ALG', 'AUT', 'JOR'],
    K: ['POR', 'COD', 'UZB', 'COL'],
    L: ['ENG', 'CRO', 'GHA', 'PAN']
};

const FLAG_MAP = {
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

const TEAM_NAMES = {
    MEX: 'México', RSA: 'Sudáfrica', KOR: 'Korea Republic', CZE: 'Czechia',
    CAN: 'Canadá', BIH: 'Bosnia y Herzegovina', QAT: 'Qatar', SUI: 'Suiza',
    BRA: 'Brasil', MAR: 'Marruecos', HAI: 'Haití', SCO: 'Escocia',
    USA: 'Estados Unidos', PAR: 'Paraguay', AUS: 'Australia', TUR: 'Turquía',
    GER: 'Alemania', CUW: 'Curazao', CIV: 'Costa de Marfil', ECU: 'Ecuador',
    NED: 'Países Bajos', JPN: 'Japón', SWE: 'Suecia', TUN: 'Túnez',
    BEL: 'Bélgica', EGV: 'Egipto', IRN: 'Irán', NZL: 'Nueva Zelanda',
    ESP: 'España', CPV: 'Cabo Verde', KSA: 'Arabia Saudita', URU: 'Uruguay',
    FRA: 'Francia', SEN: 'Senegal', IRQ: 'Irak', NOR: 'Noruega',
    ARG: 'Argentina', ALG: 'Algeria', AUT: 'Austria', JOR: 'Jordania',
    POR: 'Portugal', COD: 'R.D. del Congo', UZB: 'Uzbekistán', COL: 'Colombia',
    ENG: 'Inglaterra', CRO: 'Croacia', GHA: 'Ghana', PAN: 'Panamá'
};

function getFlagUrl(code) {
    if (code === 'FWC' || code === 'CC') return '';
    return `https://flagcdn.com/w40/${FLAG_MAP[code]}.png`;
}

function makeTeam(code, name, flag, group, debutant = false, players = []) {
    let stickers = [];
    for (let i = 1; i <= 20; i++) {
        let type = 'sticker';
        if (i === 1) type = 'shield';
        if (i === 13) type = 'group';
        stickers.push({
            code: `${code}${i}`,
            name: `${code}${i}`,
            type: type
        });
    }
    return { code, name, flag, group, stickers };
}

const TEAMS = [];

// Especiales
TEAMS.push({
    code: 'FWC', name: 'FIFA World Cup', flag: '', group: 'Especiales', icon: '🏆',
    stickers: ['00', ...Array.from({length: 19}, (_, i) => `FWC${i+1}`)].map(c => ({ code: c, name: c, type: 'special' }))
});

TEAMS.push({
    code: 'CC', name: 'Coca-Cola', flag: '', group: 'Coca-Cola', icon: '🥤',
    stickers: Array.from({length: 14}, (_, i) => `CC${i+1}`).map(c => ({ code: c, name: c, type: 'special' }))
});

// Generar equipos oficiales
for (const [groupName, teamCodes] of Object.entries(GROUPS)) {
    for (const code of teamCodes) {
        TEAMS.push(makeTeam(code, TEAM_NAMES[code], getFlagUrl(code), `Grupo ${groupName}`));
    }
}

window.DATA = {
    TOTAL_STICKERS: 994,
    TEAMS: TEAMS
};
