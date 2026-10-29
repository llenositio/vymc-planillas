window.fNom = function(str) {
    if (!str || str.includes('--') || str.includes('ELEGIR') || str.includes('ASIGNAR')) return '';
    return str.split('(')[0].trim();
};

window.obtenerOpcionesHermanos = function(cat) {
    if (!Array.isArray(window.listaHermanos)) return [];
    return window.listaHermanos.filter(h => {
        if (!cat) return true;
        if (cat === 'orac') return h.oracion === true || h.oracion === 'X';
        if (cat === 'pres') return h.pres_vymc === true || h.pres_vymc === 'X';
        if (cat === 'disc') return h.disc_tesoros === true || h.disc_tesoros === 'X';
        if (cat === 'perlas') return h.perlas === true || h.perlas === 'X';
        if (cat === 'lec') return h.lec_biblia === true || h.lec_biblia === 'X';
        if (cat === 'smm') return h.smm === true || h.smm === 'X';
        if (cat === 'nvc') return h.nvc === true || h.nvc === 'X';
        if (cat === 'eb') return h.ebc === true || h.ebc === 'X';
        if (cat === 'lectorL') return h.lector_ebc === true || h.lector_ebc === 'X';
        if (cat === 'presPub') return h.pres_pub === true || h.pres_pub === 'X';
        if (cat === 'lectorW') return h.lector_atalaya === true || h.lector_atalaya === 'X';
        return true;
    });
};

window.crearSelectHTML = function(id, cat, valorActual = "", placeholder = "ELEGIR") {
    const aptos = obtenerOpcionesHermanos(cat);
    let options = `<option value="">-- ${placeholder} --</option>`;
    
    const conteoActivo = {};
    if (Array.isArray(window.programaMes)) {
        window.programaMes.forEach(sem => {
            if (!sem) return;
            const personas = [
                sem.presidencia, sem.oracionIni, sem.repaso, sem.oracionFin, 
                sem.domPresi, sem.domLector, sem.asigViajanteEntreSemana, 
                sem.asigViajanteDiscPub, sem.asigViajanteDiscFin
            ];
            (sem.partes || []).forEach(p => personas.push(p.asig, p.asigAyudante, p.asigB, p.asigBAyudante, p.asigC, p.asigCAyudante));
            personas.forEach(p => { 
                if (p) conteoActivo[p] = (conteoActivo[p] || 0) + 1; 
            });
        });
    }

    aptos.forEach(h => {
        const sel = h.nombre === valorActual ? 'selected' : '';
        const cantMes = conteoActivo[h.nombre] || 0;
        const badge = cantMes > 0 ? ` (⚠️ ${cantMes} asig. activa)` : '';
        options += `<option value="${h.nombre}" ${sel}>${h.nombre}${badge}</option>`;
    });

    const asignacionesActual = conteoActivo[valorActual] || 0;
    
    let bgClase = "bg-transparent text-amber-900 border-slate-300";
    if (valorActual && asignacionesActual > 1) {
        bgClase = "bg-amber-200 text-amber-950 font-black border-2 border-amber-500 shadow-sm";
    } else if (valorActual && asignacionesActual === 1) {
        bgClase = "bg-emerald-50 text-emerald-950 font-bold border-slate-300";
    }

    return `<select id="${id}" class="select-asig flex-1 text-xs py-1 px-1 rounded outline-none focus:ring-1 focus:ring-amber-500 transition-colors ${bgClase}" onchange="guardarAsignacionSemana('${id}')">${options}</select>`;
};

window.crearBotonWhatsAppHTML = function(nombreHermano, nombreAyudante = "", intervencion = "", sala = "Sala Principal") {
    if (!nombreHermano) return '';
    const sem = window.programaMes[window.semanaActivaIdx];
    const fechaSemana = sem ? sem.semana : '';

    const hTit = (nombreHermano || '').replace(/'/g, "\\'");
    const hAyu = (nombreAyudante || '').replace(/'/g, "\\'");
    const intTxt = (intervencion || '').replace(/'/g, "\\'");
    const fSem = (fechaSemana || '').replace(/'/g, "\\'");

    return `
        <button onclick="enviarWhatsAppAsignacion('${hTit}', '${hAyu}', '${fSem}', '${intTxt}', '${sala}')" 
                class="no-print ml-1 text-emerald-600 hover:text-emerald-800 transition inline-flex items-center shrink-0" 
                title="Enviar S-89 por WhatsApp">
            <i class="fa-brands fa-whatsapp text-base"></i>
        </button>
    `;
};
