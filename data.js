// data.js v44 - Fetch Dinámico de CSV
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
    try {
        const response = await fetch('./album_names_2026_v1.csv?v=44');
        if (!response.ok) throw new Error('Archivo CSV no encontrado en el servidor');
        const text = await response.text();
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        
        const teamsDict = {};
        const teamOrder = [];
        
        // Detecta si la primera línea es el encabezado y la salta
        let startIndex = lines[0].toLowerCase().includes('codigo') ? 1 : 0;

        for (let i = startIndex; i < lines.length; i++) {
            const row = lines[i];
            const commaIdx = row.indexOf(',');
            if (commaIdx === -1) continue;
            
            const code = row.substring(0, commaIdx).trim().replace(/"/g, '');
            const name = row.substring(commaIdx + 1).trim().replace(/"/g, '');
            if (!code) continue;
            
            let prefix = '00';
            if (code !== '00') {
                const match = code.match(/^([A-Za-z\-]+)/);
                if (match) prefix = match[1];
                else prefix = code;
            }
            if (prefix === 'EGY') prefix = 'EGV';
            
            let teamId = prefix;
            if (prefix === '00') teamId = 'We Are Panini';
            else if (prefix === 'FWC') {
                const num = parseInt(code.replace('FWC', ''));
                if (num >= 1 && num <= 5) teamId = 'FIFA World Cup 2026';
                else if (num >= 6 && num <= 8) teamId = 'Host Countries and Cities';
                else teamId = 'FIFA World Cup History';
            } else if (prefix === 'CC') {
                teamId = 'Coca-Cola';
            }
            
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
                let num = idx + 1;
                let c = stk.c; let n = stk.n;
                let type = isSp ? 'special' : ((num === 1) ? 'shield' : (num === 13 ? 'group' : 'normal'));
                let nf = c === '00' ? '00' : c.replace(/^([A-Za-z\-]+)(\d+.*)$/, "$1 $2").toUpperCase();
                return { code: c.toUpperCase(), name: isSp ? nf : t.prefix + " " + num, playerName: n, type: type };
            });
            
            let tName = teamId; let tGroup = isSp ? "Especiales" : "Selección Nacional";
            if (!isSp && nameMap[t.prefix]) {
                tName = nameMap[t.prefix][0];
                tGroup = nameMap[t.prefix][1];
            }
            
            return {
                name: tName, code: isSp ? teamId.replace(/\s+/g, '') : t.prefix, group: tGroup, stickers: st, type: isSp ? "special" : "normal",
                icon: isSp ? (teamId.includes("Coca") ? "logo_coca_cola.svg" : "logo_fwc.svg") : (emojis[t.prefix] || "🏳️")
            };
        });
        
    } catch (err) {
        console.error("Error cargando CSV:", err);
        alert("Error al cargar la base de datos de láminas. Verifica que 'album_names_2026_v1.csv' esté subido a tu repositorio.");
    }
};
