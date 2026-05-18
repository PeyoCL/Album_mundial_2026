if (!window.DATA) window.DATA = {};
window.DATA.TOTAL_STICKERS = 994;

const emojis = {'ARG':'🇦🇷','AUS':'🇦🇺','AUT':'🇦🇹','ALG':'🇩🇿','BEL':'🇧🇪','BIH':'🇧🇦','BRA':'🇧🇷','CAN':'🇨🇦','CPV':'🇨🇻','COL':'🇨🇴','COD':'🇨🇩','CRO':'🇭🇷','CUW':'🇨🇼','CZE':'🇨🇿','ECU':'🇪🇨','EGY':'🇪🇬','EGV':'🇪🇬','ENG':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','FRA':'🇫🇷','GER':'🇩🇪','GHA':'🇬🇭','HAI':'🇭🇹','IRN':'🇮🇷','IRQ':'🇮🇶','CIV':'🇨🇮','JPN':'🇯🇵','JOR':'🇯🇴','MEX':'🇲🇽','MAR':'🇲🇦','NED':'🇳🇱','NZL':'🇳🇿','NOR':'🇳🇴','PAN':'🇵🇦','PAR':'🇵🇾','POR':'🇵🇹','QAT':'🇶🇦','KSA':'🇸🇦','SCO':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','SEN':'🇸🇳','RSA':'🇿🇦','KOR':'🇰🇷','ESP':'🇪🇸','SWE':'🇸🇪','SUI':'🇨🇭','TUN':'🇹🇳','TUR':'🇹🇷','USA':'🇺🇸','URU':'🇺🇾','UZB':'🇺🇿'};

const nameMap = {
    'MEX': ['Mexico', 'Grupo A'], 'RSA': ['Sudáfrica', 'Grupo A'], 'KOR': ['Korea Republic', 'Grupo A'], 'CZE': ['Czechia', 'Grupo A'],
    'CAN': ['Canadá', 'Grupo B'], 'BIH': ['Bosnia y Herzegovina', 'Grupo B'], 'QAT': ['Qatar', 'Grupo B'], 'SUI': ['Suiza', 'Grupo B'],
    'BRA': ['Brasil', 'Grupo C'], 'MAR': ['Marruecos', 'Grupo C'], 'HAI': ['Haití', 'Grupo C'], 'SCO': ['Escocia', 'Grupo C'],
    'USA': ['Estados Unidos', 'Grupo D'], 'PAR': ['Paraguay', 'Grupo D'], 'AUS': ['Australia', 'Grupo D'], 'TUR': ['Turquía', 'Grupo D'],
    'GER': ['Alemania', 'Grupo E'], 'CUW': ['Curazao', 'Grupo E'], 'CIV': ['Costa de Marfil', 'Grupo E'], 'ECU': ['Ecuador', 'Grupo E'],
    'NED': ['Países Bajos', 'Grupo F'], 'JPN': ['Japón', 'Grupo F'], 'SWE': ['Suecia', 'Grupo F'], 'TUN': ['Túnez', 'Grupo F'],
    'BEL': ['Bélgica', 'Grupo G'], 'EGY': ['Egipto', 'Grupo G'], 'EGV': ['Egipto', 'Grupo G'], 'IRN': ['Irán', 'Grupo G'], 'NZL': ['Nueva Zelanda', 'Grupo G'],
    'ESP': ['España', 'Grupo H'], 'CPV': ['Cabo Verde', 'Grupo H'], 'KSA': ['Arabia Saudita', 'Grupo H'], 'URU': ['Uruguay', 'Grupo H'],
    'FRA': ['Francia', 'Grupo I'], 'SEN': ['Senegal', 'Grupo I'], 'IRQ': ['Irak', 'Grupo I'], 'NOR': ['Noruega', 'Grupo I'],
    'ARG': ['Argentina', 'Grupo J'], 'ALG': ['Algeria', 'Grupo J'], 'AUT': ['Austria', 'Grupo J'], 'JOR': ['Jordania', 'Grupo J'],
    'POR': ['Portugal', 'Grupo K'], 'COD': ['R.D. del Congo', 'Grupo K'], 'UZB': ['Uzbekistan', 'Grupo K'], 'COL': ['Colombia', 'Grupo K'],
    'ENG': ['Inglaterra', 'Grupo L'], 'CRO': ['Croacia', 'Grupo L'], 'GHA': ['Ghana', 'Grupo L'], 'PAN': ['Panamá', 'Grupo L']
};

window.DATA.TEAMS = [];

window.LOAD_DATA = async function() {
    const APP_VERSION = 46;
    
    // MEJORA 1: Inicialización de IndexedDB nativo del navegador
    const openDB = () => new Promise((resolve) => {
        const request = indexedDB.open('AlbumCacheDB', 1);
        request.onupgradeneeded = (e) => { e.target.result.createObjectStore('store'); };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = () => resolve(null);
    });

    const db = await openDB();
    if (db) {
        const cached = await new Promise((resolve) => {
            const tx = db.transaction('store', 'readonly');
            const req = tx.objectStore('store').get('teams_cache');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
        if (cached && cached.version === APP_VERSION) {
            window.DATA.TEAMS = cached.teams;
            console.log("⚡ [IndexedDB] Datos cargados instantáneamente desde la caché local.");
            return;
        }
    }

    try {
        const response = await fetch('./album_names_2026_v1.csv?v=46');
        if (!response.ok) throw new Error('CSV no encontrado');
        const text = await response.text();
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        
        const teamsDict = {}; const teamOrder = [];
        let startIndex = lines[0].toLowerCase().includes('codigo') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const row = lines[i]; const commaIdx = row.indexOf(',');
            if (commaIdx === -1) continue; // MEJORA 2: Omitir filas rotas sin romper la app
            
            let code = row.substring(0, commaIdx).trim().replace(/"/g, '').toUpperCase();
            let name = row.substring(commaIdx + 1).trim().replace(/"/g, '');
            if (!code || code === 'CODIGO') continue; // Sanitización de encabezados duplicados
            
            let prefix = '00';
            if (code !== '00') {
                const match = code.match(/^([A-Za-z\-]+)/);
                prefix = match ? match[1] : code;
            }
            if (prefix === 'EGY') prefix = 'EGV'; // Mapeo de compatibilidad de respaldo
            
            let teamId = prefix;
            if (prefix === '00') teamId = 'We Are Panini';
            else if (prefix === 'FWC') {
                const num = parseInt(code.replace('FWC', ''));
                if (num >= 1 && num <= 5) teamId = 'FIFA World Cup 2026';
                else if (num >= 6 && num <= 8) teamId = 'Host Countries and Cities';
                else teamId = 'FIFA World Cup History';
            } else if (prefix === 'CC') { teamId = 'Coca-Cola'; }
            
            if (!teamsDict[teamId]) {
                teamsDict[teamId] = { id: teamId, prefix: prefix, stickers: [] };
                teamOrder.push(teamId);
            }
            teamsDict[teamId].stickers.push({ c: code, n: name });
        }
        
        window.DATA.TEAMS = teamOrder.map(teamId => {
            const t = teamsDict[teamId];
            const isSp = teamId === 'We Are Panini' || teamId.includes('FIFA') || teamId.includes('Host') || teamId === 'Coca-Cola';
            
            let st = t.stickers.map((stk, idx) => {
                let num = idx + 1; let c = stk.c.replace('EGY', 'EGV'); let n = stk.n;
                let type = isSp ? 'special' : ((num === 1) ? 'shield' : (num === 13 ? 'group' : 'normal'));
                let nf = c === '00' ? '00' : c.replace(/^([A-Za-z\-]+)(\d+.*)$/, "$1 $2").toUpperCase();
                return { code: c.toUpperCase(), name: isSp ? nf : t.prefix + " " + num, playerName: n, type: type };
            });
            
            let tName = teamId; let tGroup = isSp ? "Especiales" : "Selección Nacional";
            if (!isSp && nameMap[t.prefix]) { tName = nameMap[t.prefix][0]; tGroup = nameMap[t.prefix][1]; }
            
            return {
                name: tName, code: isSp ? teamId.replace(/\s+/g, '') : t.prefix, group: tGroup, stickers: st, type: isSp ? "special" : "normal",
                icon: isSp ? (teamId.includes("Coca") ? "logo_coca_cola.svg" : "logo_fwc.svg") : (emojis[t.prefix] || "🏳️")
            };
        });

        // MEJORA 1: Guardar el resultado estructurado en IndexedDB para la siguiente carga
        if (db && window.DATA.TEAMS.length > 0) {
            const tx = db.transaction('store', 'readwrite');
            tx.objectStore('store').put({ version: APP_VERSION, teams: window.DATA.TEAMS }, 'teams_cache');
        }
        
    } catch (err) {
        console.error("Error procesando base de datos:", err);
    }
};
