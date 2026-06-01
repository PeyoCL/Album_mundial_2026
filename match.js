// match.js - Motor de Match Global
import { globalState, saveStore } from './store.js';

export let lastMatchResult = null;

export function getGlobalMinifiedData() {
    // Calculadora del Hub Familiar
    const minified = { n: "Familia", s: {} };
    let bitString = "";

    if (!window.DATA || !window.DATA.TEAMS) return "";

    window.DATA.TEAMS.forEach(team => {
        team.stickers.forEach(s => {
            let totalMissing = 0;
            let totalExtras = 0;

            for (let id in globalState.albums) {
                let st = globalState.albums[id].stickers[s.code] || { have: false, count: 0 };
                if (!st.have) totalMissing++;
                if (st.have && st.count > 1) totalExtras += (st.count - 1);
            }

            let net = totalExtras - totalMissing;
            
            // Si Net < 0, la familia NECESITA copias. Exportamos como missing (0).
            // Si Net >= 0, la familia la tiene (1) y quizás ofrece repetidas.
            if (net < 0) {
                bitString += "1"; // Missing for legacy mapping
            } else {
                bitString += "0"; // Have
                if (net > 0) minified.s[s.code] = 1 + net;
            }
        });
    });

    while(bitString.length % 4 !== 0) bitString += "0"; 
    let hexString = "";
    for(let i=0; i<bitString.length; i+=4) hexString += parseInt(bitString.substring(i, i+4), 2).toString(16);
    minified.m = hexString;

    return JSON.stringify(minified);
}

export function compareGlobalTrades(inputStr) {
    try {
        const parsed = JSON.parse(inputStr); 
        let friendState = { profile: { name: parsed.n || 'Contacto' }, stickers: {}, legacy: !parsed.m }; 
        let bitString = "";
        
        if (parsed.m) { for(let i=0; i<parsed.m.length; i++) bitString += parseInt(parsed.m[i], 16).toString(2).padStart(4, '0'); }
        
        let index = 0; 
        window.DATA.TEAMS.forEach(team => { 
            team.stickers.forEach(s => { 
                let isMissing = friendState.legacy ? !(parsed.s && parsed.s[s.code]) : (bitString[index] === "1"); 
                let count = (parsed.s && parsed.s[s.code]) ? parsed.s[s.code] : (isMissing ? 0 : 1); 
                friendState.stickers[s.code] = { have: !isMissing, count: count }; 
                index++; 
            }); 
        });

        let iReceive = {}; let iGive = {};    
        
        window.DATA.TEAMS.forEach(team => {
            team.stickers.forEach(s => {
                let totalMissing = 0; let totalExtras = 0;
                for (let id in globalState.albums) {
                    let st = globalState.albums[id].stickers[s.code] || { have: false, count: 0 };
                    if (!st.have) totalMissing++;
                    if (st.have && st.count > 1) totalExtras += (st.count - 1);
                }
                let net = totalExtras - totalMissing;

                const friendSticker = friendState.stickers[s.code] || { have: false, count: 0 }; 
                const myName = s.code;

                // Si la familia necesita y el amigo ofrece
                if (net < 0 && friendSticker.have && friendSticker.count > 1) { 
                    if(!iReceive[team.name]) iReceive[team.name] = []; 
                    iReceive[team.name].push(myName); 
                }
                // Si el amigo necesita y la familia ofrece
                if (!friendSticker.have && net > 0) { 
                    if(!iGive[team.name]) iGive[team.name] = []; 
                    iGive[team.name].push(myName); 
                }
            }); 
        });

        lastMatchResult = { iReceive, iGive, friendName: friendState.profile.name, legacy: friendState.legacy }; 
        return lastMatchResult;
    } catch(e) { 
        alert('Código inválido.'); return null; 
    }
}

export function executeGlobalTrade() {
    if (!lastMatchResult) return false;
    let tRec = 0; for(let t in lastMatchResult.iReceive) tRec += lastMatchResult.iReceive[t].length;
    let tGive = 0; for(let t in lastMatchResult.iGive) tGive += lastMatchResult.iGive[t].length;
    let totalCambios = Math.min(tRec, tGive);
    
    if (totalCambios === 0) { alert("No hay transacciones equitativas posibles."); return false; }
    if (!confirm(`¿Ejecutar intercambio colaborativo de ${totalCambios} láminas?`)) return false;
    
    // Repartir las que se reciben a los álbumes que las necesitan
    for (let team in lastMatchResult.iReceive) {
        lastMatchResult.iReceive[team].forEach(code => {
            for (let id in globalState.albums) {
                let st = globalState.albums[id].stickers[code] || {have: false, count: 0};
                if (!st.have) {
                    globalState.albums[id].stickers[code] = {have: true, count: 1};
                    break; // Solo le da 1 copia al primer álbum que la necesite
                }
            }
        });
    }

    // Descontar las que se entregan de los álbumes que las tienen repetidas
    for (let team in lastMatchResult.iGive) {
        lastMatchResult.iGive[team].forEach(code => {
            for (let id in globalState.albums) {
                let st = globalState.albums[id].stickers[code] || {have: false, count: 0};
                if (st.have && st.count > 1) {
                    st.count--;
                    globalState.albums[id].stickers[code] = st;
                    break; // Solo descuenta 1 copia
                }
            }
        });
    }
    
    saveStore();
    return true;
}