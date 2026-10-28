if (typeof programaMes === 'undefined') window.programaMes = [];
if (typeof listaHermanos === 'undefined') window.listaHermanos = [];
let semanaActivaIdx = 0;
let nombreMesGlobal = "";

/* PREVENIR PEGAR FORMATO NO DESEADO EN CAMPOS EDITABLES */
window.limpiarTextoPegado = function(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
};

function cargarOpcionesAniosHistorial() {
    const selectAnio = document.getElementById('selectFiltroAnio');
    if (!selectAnio) return;

    selectAnio.innerHTML = '';
    const anioInicio = 2026;
    const anioActual = new Date().getFullYear();
    const anioFin = Math.max(anioActual, 2026) + 3;

    for (let anio = anioInicio; anio <= anioFin; anio++) {
        const option = document.createElement('option');
        option.value = anio;
        option.innerText = anio;
        if (anio === anioActual) option.selected = true;
        selectAnio.appendChild(option);
    }
}

window.onload = async function() {
    cargarOpcionesAniosHistorial();

    try {
        if (typeof db !== 'undefined' && db) {
            if (typeof cargarHermanosDesdeSupabase === 'function') await cargarHermanosDesdeSupabase();
            if (typeof cargarPlanillaDesdeSupabase === 'function') await cargarPlanillaDesdeSupabase();
        }
    } catch (err) {
        console.error("Error inicializando:", err);
    }

    renderizarMatrizHermanos();

    if (!programaMes || programaMes.length === 0) {
        inicializarMesDefault(4);
    }

    const inputMes = document.getElementById('inputNombreMes');
    if (inputMes && nombreMesGlobal) {
        inputMes.value = nombreMesGlobal;
        actualizarTextoTituloMes(nombreMesGlobal);
    }
    
    renderizarSelectorSemanas();
    cargarSemanaEnPlanilla(0);
};

function inicializarMesDefault(cantSemanas = 4) {
    programaMes = [];
    for (let i = 0; i < cantSemanas; i++) {
        programaMes.push(crearEstructuraSemanaEjemplo());
    }
}

function crearEstructuraSemanaEjemplo() {
    return {
        semana: "FECHA",
        lectura: "LECTURA",
        canciones: ["", "", ""],
        tipoSemana: "normal",
        numSalas: 1,
        presidencia: "",
        oracionIni: "",
        repaso: "",
        oracionFin: "",
        domPresi: "",
        domLector: "",
        cancionDomIni: "",
        temaDiscPub: "",
        cancionDomMid: "",
        temaAtalaya: "",
        temaDiscFin: "",
        cancionDomFin: "",
        partes: [
            { seccion: "tesoros", t: "10 min", tit: "1. Tengamos un punto de vista equilibrado de la protección de Jehová", desc: "Discurso", participantes: 1, asig: "" },
            { seccion: "tesoros", t: "10 min", tit: "2. Busquemos perlas escondidas", desc: "Preguntas y respuestas", participantes: 1, asig: "" },
            { seccion: "tesoros", t: "4 min", tit: "3. Lectura de la Biblia", desc: "Jer 40:1-10 (th lección 2).", participantes: 1, asig: "" },
            
            { seccion: "maestros", t: "2 min", tit: "4. Empiece conversaciones", desc: "DE CASA EN CASA. (lmd lección 2 punto 3).", participantes: 2, asig: "", asigAyudante: "" },
            { seccion: "maestros", t: "2 min", tit: "5. Empiece conversaciones", desc: "PREDICACIÓN INFORMAL. (lmd lección 2 punto 5).", participantes: 2, asig: "", asigAyudante: "" },
            { seccion: "maestros", t: "4 min", tit: "6. Empiece conversaciones", desc: "PREDICACIÓN PÚBLICA. Una persona se queda mirando el carrito de publicaciones (lmd lección 5 punto 3).", participantes: 2, asig: "", asigAyudante: "" },
            { seccion: "maestros", t: "3 min", tit: "7. Explique sus creencias", desc: "Escenificación. ijwbq artículo 103. Tema: ¿Quién es Jehová? (th lección 17).", participantes: 2, asig: "", asigAyudante: "" },
            
            { seccion: "vida", t: "15 min", tit: "8. Jehová protege a las viudas", desc: "Análisis con el auditorio.", participantes: 1, asig: "" }
        ]
    };
}

function renderizarSelectorSemanas() {
    const cont = document.getElementById('selectorSemanas');
    if (!cont) return;
    cont.innerHTML = '';
    programaMes.forEach((s, idx) => {
        const btn = document.createElement('button');
        btn.onclick = () => cargarSemanaEnPlanilla(idx);
        btn.className = `px-2.5 py-1 text-xs font-bold rounded-md border transition ${idx === semanaActivaIdx ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`;
        btn.innerText = `Sem ${idx + 1}: ${s.semana ? s.semana.split(' DE ')[0] : 'S/N'}`;
        cont.appendChild(btn);
    });
}

function obtenerOpcionesHermanos(cat) {
    if (!Array.isArray(listaHermanos)) return [];
    return listaHermanos.filter(h => {
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
}

function crearSelectHTML(id, cat, valorActual = "", placeholder = "ELEGIR") {
    const aptos = obtenerOpcionesHermanos(cat);
    let options = `<option value="">-- ${placeholder} --</option>`;
    
    const conteoActivo = {};
    if (Array.isArray(programaMes)) {
        programaMes.forEach(sem => {
            if (!sem) return;
            const personas = [sem.presidencia, sem.oracionIni, sem.repaso, sem.oracionFin, sem.domPresi, sem.domLector];
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
}

function crearBotonWhatsAppHTML(nombreHermano, nombreAyudante = "", intervencion = "", sala = "Sala Principal") {
    if (!nombreHermano) return '';
    const sem = programaMes[semanaActivaIdx];
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
}

window.guardarTextoEditable = function(pIndex, campo, valor) {
    const sem = programaMes[semanaActivaIdx];
    if (sem && sem.partes && sem.partes[pIndex]) {
        sem.partes[pIndex][campo] = valor;
        notificarYGuardarAutosave();
    }
};

function cargarSemanaEnPlanilla(idx) {
    if (!programaMes || programaMes.length === 0) return;
    semanaActivaIdx = idx;
    renderizarSelectorSemanas();
    const sem = programaMes[idx];
    const esViajante = sem.tipoSemana === 'viajante';

    const numSalas = esViajante ? 1 : (sem.numSalas || 1);
    
    const selSalas = document.getElementById('selectNumSalas');
    if (selSalas) {
        selSalas.value = numSalas;
        selSalas.disabled = esViajante;
    }

    const cabecera = document.getElementById('cabeceraTablaPlanilla');
    if (cabecera) {
        cabecera.innerHTML = `
            <tr>
                <th colspan="10" class="py-2 px-3 bg-white text-center border-b-2 border-slate-900">
                    <div class="flex justify-center items-center gap-1 font-black text-slate-900 text-base">
                        <span>Semana del</span>
                        <input type="text" value="${sem.semana || ''}" onchange="actualizarEncabezadoSemana('semana', this.value)" onpaste="limpiarTextoPegado(event)" class="input-inline max-w-[200px]" placeholder="FECHA">
                        <span>,</span>
                        <input type="text" value="${sem.lectura || ''}" onchange="actualizarEncabezadoSemana('lectura', this.value)" onpaste="limpiarTextoPegado(event)" class="input-inline max-w-[180px]" placeholder="LECTURA">
                    </div>
                </th>
            </tr>
        `;
    }

    const radios = document.getElementsByName('tipoSemana');
    radios.forEach(r => r.checked = (r.value === sem.tipoSemana));

    const banner = document.getElementById('bannerEventoEspecial');
    const tabla = document.getElementById('tablaPlanillaCompleta');

    if (banner && tabla) {
        if (sem.tipoSemana === 'asamblea') {
            banner.className = "mb-4 p-4 rounded-lg text-center font-extrabold text-sm bg-red-100 text-red-900 border border-red-300 block";
            banner.innerHTML = `<i class="fa-solid fa-building-columns text-xl mb-1"></i><br>NO HAY REUNIÓN ENTRE SEMANA POR ASAMBLEA DE CIRCUITO / REGIONAL`;
            tabla.classList.add('opacity-30', 'pointer-events-none');
        } else if (sem.tipoSemana === 'conmemoracion') {
            banner.className = "mb-4 p-4 rounded-lg text-center font-extrabold text-sm bg-purple-100 text-purple-900 border border-purple-300 block";
            banner.innerHTML = `<i class="fa-solid fa-wine-glass text-xl mb-1"></i><br>CELEBRACIÓN DE LA CONMEMORACIÓN DE LA MUERTE DE CRISTO`;
            tabla.classList.remove('opacity-30', 'pointer-events-none');
        } else {
            banner.classList.add('hidden');
            tabla.classList.remove('opacity-30', 'pointer-events-none');
        }
    }

    const partes = sem.partes || [];
    const cuerpo = document.getElementById('cuerpoTablaPlanilla');
    if (!cuerpo) return;
    
    const renderSalasMaestros = (pIndex, cat) => {
        const item = partes[pIndex] || {};
        const cantP = item.participantes || 1;

        const renderSelectsGroup = (prefix, valTit, valAyu, nombreSala = "Sala Principal") => {
            let res = `<div class="flex items-center justify-between w-full gap-1">`;
            res += `<div class="flex-1">`;
            res += crearSelectHTML(`${prefix}_titular`, cat, valTit, "ASIGNAR");
            if (cantP === 2) {
                res += `<div class="border-t border-dashed border-slate-300 my-0.5"></div>`;
                res += crearSelectHTML(`${prefix}_ayudante`, cat, valAyu, "AYUDANTE");
            }
            res += `</div>`;
            res += crearBotonWhatsAppHTML(valTit, valAyu, item.tit, nombreSala);
            res += `</div>`;
            return res;
        };

        let html = '';

        if (numSalas === 1) {
            html += `<td class="p-1 col-asig relative group" colspan="7">
                <button onclick="toggleParticipantesParte(${pIndex})" class="no-print absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-slate-200 hover:bg-slate-300 text-[9px] px-1 py-0.5 rounded font-bold transition z-10">
                    ${cantP === 1 ? '1 Asig' : '2 Asig'}
                </button>
                ${renderSelectsGroup(`asig_p${pIndex}_A`, item.asig, item.asigAyudante, "Sala Principal")}
            </td>`;
        } else if (numSalas === 2) {
            html += `<td class="p-1 col-asig relative group" colspan="4">
                <button onclick="toggleParticipantesParte(${pIndex})" class="no-print absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-slate-200 hover:bg-slate-300 text-[9px] px-1 py-0.5 rounded font-bold transition z-10">
                    ${cantP === 1 ? '1 Asig' : '2 Asig'}
                </button>
                ${renderSelectsGroup(`asig_p${pIndex}_A`, item.asig, item.asigAyudante, "Sala Principal")}
            </td>
            <td class="p-1 col-asig" colspan="3">
                ${renderSelectsGroup(`asig_p${pIndex}_B`, item.asigB, item.asigBAyudante, "Sala B")}
            </td>`;
        } else if (numSalas === 3) {
            html += `<td class="p-1 col-asig relative group" colspan="3">
                <button onclick="toggleParticipantesParte(${pIndex})" class="no-print absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-slate-200 hover:bg-slate-300 text-[9px] px-1 py-0.5 rounded font-bold transition z-10">
                    ${cantP === 1 ? '1 Asig' : '2 Asig'}
                </button>
                ${renderSelectsGroup(`asig_p${pIndex}_A`, item.asig, item.asigAyudante, "Sala Principal")}
            </td>
            <td class="p-1 col-asig" colspan="2">
                ${renderSelectsGroup(`asig_p${pIndex}_B`, item.asigB, item.asigBAyudante, "Sala B")}
            </td>
            <td class="p-1 col-asig" colspan="2">
                ${renderSelectsGroup(`asig_p${pIndex}_C`, item.asigC, item.asigCAyudante, "Sala C")}
            </td>`;
        }
        return html;
    };

    const renderSalasLectura = (pIndex, cat) => {
        const item = partes[pIndex] || {};
        if (numSalas === 1) {
            return `<td class="px-2 col-asig" colspan="7">
                <div class="flex items-center justify-between w-full gap-1">
                    ${crearSelectHTML(`asig_p${pIndex}_A_titular`, cat, item.asig)}
                    ${crearBotonWhatsAppHTML(item.asig, '', item.tit, 'Sala Principal')}
                </div>
            </td>`;
        } else if (numSalas === 2) {
            return `<td class="px-1 py-1 col-asig" colspan="4">
                <div class="flex items-center justify-between w-full gap-1">
                    ${crearSelectHTML(`asig_p${pIndex}_A_titular`, cat, item.asig, "Principal")}
                    ${crearBotonWhatsAppHTML(item.asig, '', item.tit, 'Sala Principal')}
                </div>
            </td>
            <td class="px-1 py-1 col-asig" colspan="3">
                <div class="flex items-center justify-between w-full gap-1">
                    ${crearSelectHTML(`asig_p${pIndex}_B_titular`, cat, item.asigB, "Sala B")}
                    ${crearBotonWhatsAppHTML(item.asigB, '', item.tit, 'Sala B')}
                </div>
            </td>`;
        } else {
            return `<td class="px-1 py-1 col-asig" colspan="3">
                <div class="flex items-center justify-between w-full gap-1">
                    ${crearSelectHTML(`asig_p${pIndex}_A_titular`, cat, item.asig, "Principal")}
                    ${crearBotonWhatsAppHTML(item.asig, '', item.tit, 'Sala Principal')}
                </div>
            </td>
            <td class="px-1 py-1 col-asig" colspan="2">
                <div class="flex items-center justify-between w-full gap-1">
                    ${crearSelectHTML(`asig_p${pIndex}_B_titular`, cat, item.asigB, "Sala B")}
                    ${crearBotonWhatsAppHTML(item.asigB, '', item.tit, 'Sala B')}
                </div>
            </td>
            <td class="px-1 py-1 col-asig" colspan="2">
                <div class="flex items-center justify-between w-full gap-1">
                    ${crearSelectHTML(`asig_p${pIndex}_C_titular`, cat, item.asigC, "Sala C")}
                    ${crearBotonWhatsAppHTML(item.asigC, '', item.tit, 'Sala C')}
                </div>
            </td>`;
        }
    };

    let filasHTML = `
        <tr class="h-6">
            <td class="c-tiempo editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)">1 min</td>
            <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">
                Canción N° ${sem.canciones?.[0] || ''}. Presidencia: Palabras de introducción.
            </td>
            <td class="px-2 col-asig" colspan="7">
                <div class="flex items-center justify-between w-full gap-1">
                    ${crearSelectHTML('asig_presi', 'pres', sem.presidencia)}
                    ${crearBotonWhatsAppHTML(sem.presidencia, '', 'Presidencia: Palabras de introducción', 'Sala Principal')}
                </div>
            </td>
        </tr>
        <tr class="h-6">
            <td class="c-tiempo editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)"></td>
            <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">Oración</td>
            <td class="px-2 col-asig" colspan="7">
                <div class="flex items-center justify-between w-full gap-1">
                    ${crearSelectHTML('asig_orac_ini', 'orac', sem.oracionIni)}
                    ${crearBotonWhatsAppHTML(sem.oracionIni, '', 'Oración Inicial', 'Sala Principal')}
                </div>
            </td>
        </tr>
    `;

    let renderizoTesorosHeader = false;
    let renderizoMaestrosHeader = false;
    let renderizoVidaHeader = false;

    partes.forEach((item, pIndex) => {

        if (item.seccion === 'tesoros' && !renderizoTesorosHeader) {
            filasHTML += `
                <tr>
                    <th class="bg-tesoros text-white text-center c-tiempo"><i class="fa-solid fa-gem text-xs"></i></th>
                    <th colspan="9" class="bg-tesoros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Tesoros de la Biblia</th>
                </tr>
            `;
            renderizoTesorosHeader = true;
        } else if (item.seccion === 'maestros' && !renderizoMaestrosHeader) {
            filasHTML += `
                <tr>
                    <th class="bg-maestros text-white text-center c-tiempo"><i class="fa-solid fa-wheat-awn text-xs"></i></th>
                    <th colspan="9" class="bg-maestros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Seamos mejores maestros</th>
                </tr>
            `;
            renderizoMaestrosHeader = true;
        } else if (item.seccion === 'vida' && !renderizoVidaHeader) {

            filasHTML += `
                <tr class="no-print bg-amber-50/50">
                    <td colspan="10" class="p-1 text-center">
                        <button onclick="agregarFilaMaestros()" class="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded border border-amber-300 transition">
                            <i class="fa-solid fa-plus-circle mr-1"></i> Agregar parte a Seamos Mejores Maestros
                        </button>
                    </td>
                </tr>
            `;

            filasHTML += `
                <tr>
                    <th class="bg-vida text-white text-center c-tiempo py-1">
                        <svg class="w-4 h-4 text-white inline-block -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 17l-1 3M10 17l1 3M15 17l-1 3M18 17l1 3"/>
                            <path d="M19 13a3 3 0 0 0-2.8-2 2.5 2.5 0 0 0-4.4-1.2A3 3 0 0 0 7 11a3 3 0 0 0 0 6h12a3 3 0 0 0 0-4z"/>
                            <path d="M18.5 11.5l1.5-1.5a1.5 1.5 0 0 1 2.1 2.1L21 13"/>
                        </svg>
                    </th>
                    <th colspan="9" class="bg-vida text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Nuestra vida cristiana</th>
                </tr>
                <tr>
                    <td class="px-2 font-bold editable-field" colspan="10" contenteditable="true" onpaste="limpiarTextoPegado(event)">
                        Canción Nº: ${sem.canciones?.[1] || ''}
                    </td>
                </tr>
            `;
            renderizoVidaHeader = true;
        }
        let cat = 'smm';
        if (item.seccion === 'tesoros') {
            if (pIndex === 0) cat = 'disc';
            else if (item.tit.includes('perlas')) cat = 'perlas';
            else if (item.tit.includes('Lectura')) cat = 'lec';
        } else if (item.seccion === 'vida') {
            cat = 'nvc';
        }

        if (item.seccion === 'tesoros') {
            if (item.tit.includes('Lectura')) {
                filasHTML += `
                    <tr>
                        <td class="c-tiempo editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 't', this.innerText)">${item.t}</td>
                        <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 'tit', this.innerText)">${item.tit}</td>
                        ${renderSalasLectura(pIndex, cat)}
                    </tr>
                `;
            } else {
                filasHTML += `
                    <tr>
                        <td class="c-tiempo editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 't', this.innerText)">${item.t}</td>
                        <td class="px-2 col-titulo font-medium editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 'tit', this.innerText)">${item.tit}</td>
                        <td class="px-2 col-desc editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 'desc', this.innerText)">${item.desc}</td>
                        <td class="px-2 col-asig" colspan="7">
                            <div class="flex items-center justify-between w-full gap-1">
                                ${crearSelectHTML(`asig_p${pIndex}_A_titular`, cat, item.asig)}
                                ${crearBotonWhatsAppHTML(item.asig, '', item.tit, 'Sala Principal')}
                            </div>
                        </td>
                    </tr>
                `;
            }
        } 
        else if (item.seccion === 'maestros') {
            filasHTML += `
                <tr class="group">
                    <td class="c-tiempo relative editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 't', this.innerText)">
                        ${item.t}
                        <button onclick="eliminarFilaParte(${pIndex})" class="no-print absolute top-0.5 left-0.5 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 text-[10px]" title="Eliminar fila"><i class="fa-solid fa-circle-minus"></i></button>
                    </td>
                    <td class="px-2 col-titulo font-medium editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 'tit', this.innerText)">${item.tit}</td>
                    <td class="px-2 col-desc editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 'desc', this.innerText)">${item.desc}</td>
                    ${renderSalasMaestros(pIndex, cat)}
                </tr>
            `;
        } 
        else if (item.seccion === 'vida') {
            if (!item.tit.includes('Estudio bíblico')) {
                filasHTML += `
                    <tr class="group">
                        <td class="c-tiempo relative editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 't', this.innerText)">
                            ${item.t}
                            <button onclick="eliminarFilaParte(${pIndex})" class="no-print absolute top-0.5 left-0.5 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 text-[10px]" title="Eliminar fila"><i class="fa-solid fa-circle-minus"></i></button>
                        </td>
                        <td class="px-2 col-titulo font-medium editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 'tit', this.innerText)">${item.tit}</td>
                        <td class="px-2 col-desc editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 'desc', this.innerText)">${item.desc}</td>
                        <td class="px-2 col-asig" colspan="7">
                            <div class="flex items-center justify-between w-full gap-1">
                                ${crearSelectHTML(`asig_p${pIndex}_A_titular`, 'nvc', item.asig)}
                                ${crearBotonWhatsAppHTML(item.asig, '', item.tit, 'Sala Principal')}
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
    });

    filasHTML += `
        <tr class="no-print bg-slate-50">
            <td colspan="10" class="p-1 text-center">
                <button onclick="agregarFilaVida()" class="text-xs font-bold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded border border-red-200 transition">
                    <i class="fa-solid fa-plus-circle mr-1"></i> Agregar parte a Nuestra Vida Cristiana
                </button>
            </td>
        </tr>
    `;

    // REUNIÓN ENTRE SEMANA: ESTUDIO BÍBLICO VS DISCURSO DEL VIAJANTE
    const idxEB = partes.findIndex(p => p.tit && (p.tit.includes('Estudio bíblico') || p.tit.includes('Discurso del superintendente')));

    if (esViajante) {
        filasHTML += `
            <tr>
                <td class="c-tiempo font-bold text-blue-900 bg-blue-50/50">30 min</td>
                <td class="px-2 font-black text-blue-900 bg-blue-50/50" colspan="2">
                    Discurso del superintendente de circuito
                </td>
                <td class="px-2 col-asig bg-blue-50/50" colspan="7">
                    <span class="text-xs font-black text-blue-800 px-2 uppercase flex items-center gap-1 py-1">
                        <i class="fa-solid fa-user-tie"></i> Superintendente de Circuito
                    </span>
                </td>
            </tr>
        `;
    } else {
        const itemEB = idxEB !== -1 ? partes[idxEB] : { t: '30 min', tit: 'Estudio bíblico de la congregación: wcg cap. 11.', asig: '', asigAyudante: '' };
        filasHTML += `
            <tr>
                <td class="c-tiempo editable-field" rowspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="${idxEB !== -1 ? `guardarTextoEditable(${idxEB}, 't', this.innerText)` : ''}">${itemEB.t || '30 min'}</td>
                <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="${idxEB !== -1 ? `guardarTextoEditable(${idxEB}, 'tit', this.innerText)` : ''}">
                    ${itemEB.tit}
                </td>
                <td class="px-2 col-asig" colspan="7">
                    <div class="flex items-center justify-between w-full gap-1">
                        ${crearSelectHTML(idxEB !== -1 ? `asig_p${idxEB}_A_titular` : 'asig_eb_conductor', 'eb', itemEB.asig)}
                        ${crearBotonWhatsAppHTML(itemEB.asig, itemEB.asigAyudante, itemEB.tit, 'Sala Principal')}
                    </div>
                </td>
            </tr>
            <tr>
                <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">Lector:</td>
                <td class="px-2 col-asig" colspan="7">
                    <div class="flex items-center justify-between w-full gap-1">
                        ${crearSelectHTML(idxEB !== -1 ? `asig_p${idxEB}_A_ayudante` : 'asig_eb_lector', 'lectorL', itemEB.asigAyudante)}
                        ${crearBotonWhatsAppHTML(itemEB.asigAyudante, '', 'Lector del Estudio Bíblico', 'Sala Principal')}
                    </div>
                </td>
            </tr>
        `;
    }

    // CIERRE REUNIÓN ENTRE SEMANA
    filasHTML += `
        <tr>
            <td class="c-tiempo editable-field" rowspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">3 min</td>
            <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">Repaso de esta reunión y adelanto de la próxima.</td>
            <td class="px-2 col-asig" colspan="7">
                <div class="flex items-center justify-between w-full gap-1">
                    ${crearSelectHTML('asig_repaso', 'pres', sem.repaso)}
                    ${crearBotonWhatsAppHTML(sem.repaso, '', 'Repaso y adelanto', 'Sala Principal')}
                </div>
            </td>
        </tr>
        <tr>
            <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">
                Canción y oración: 38
            </td>
            <td class="px-2 col-asig" colspan="7">
                <div class="flex items-center justify-between w-full gap-1">
                    ${crearSelectHTML('asig_orac_fin', 'orac', sem.oracionFin)}
                    ${crearBotonWhatsAppHTML(sem.oracionFin, '', 'Oración Final', 'Sala Principal')}
                </div>
            </td>
        </tr>
    `;

    // REUNIÓN DE FIN DE SEMANA
    if (esViajante) {
        filasHTML += `
            <tr>
                <th class="bg-blue-700 text-white text-center c-tiempo py-1">
                    <i class="fa-solid fa-tower-observation text-xs"></i>
                </th>
                <th colspan="9" class="bg-blue-700 text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">
                    Reunión de fin de semana
                </th>
            </tr>

            <tr>
                <td class="px-2 font-medium editable-field" colspan="3" contenteditable="true" onpaste="limpiarTextoPegado(event)">
                    Presidencia, canción Nº ${sem.cancionDomIni || ''} y oración
                </td>
                <td class="px-2 col-asig" colspan="7">
                    <div class="flex items-center justify-between w-full gap-1">
                        ${crearSelectHTML('asig_dom_presi', 'presPub', sem.domPresi)}
                        ${crearBotonWhatsAppHTML(sem.domPresi, '', 'Presidencia del Domingo', 'Reunión Pública')}
                    </div>
                </td>
            </tr>

            <tr>
                <td class="c-tiempo editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)">30 min</td>
                <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">
                    Discurso público: ${sem.temaDiscPub || ''}
                </td>
                <td class="px-2 col-asig" colspan="7">
                    <span class="text-xs font-black text-blue-800 px-2 uppercase flex items-center gap-1 py-1">
                        <i class="fa-solid fa-user-tie"></i> Superintendente de Circuito
                    </span>
                </td>
            </tr>

            <tr>
                <td class="c-tiempo editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)">3 min</td>
                <td class="px-2 font-medium editable-field" colspan="9" contenteditable="true" onpaste="limpiarTextoPegado(event)">
                    Canción Nº ${sem.cancionDomMid || ''}
                </td>
            </tr>

            <tr>
                <td class="c-tiempo editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)">30 min</td>
                <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">
                    La Atalaya: ${sem.temaAtalaya || ''}
                </td>
                <td class="px-2 col-asig" colspan="7">
                    <div class="flex items-center justify-between w-full gap-1">
                        ${crearSelectHTML('asig_dom_lector', 'lectorW', sem.domLector, "LECTOR")}
                        ${crearBotonWhatsAppHTML(sem.domLector, '', 'Lector de La Atalaya', 'Reunión Pública')}
                    </div>
                </td>
            </tr>

            <tr>
                <td class="c-tiempo editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)">30 min</td>
                <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">
                    Discurso final: ${sem.temaDiscFin || ''}
                </td>
                <td class="px-2 col-asig" colspan="7">
                    <span class="text-xs font-black text-blue-800 px-2 uppercase flex items-center gap-1 py-1">
                        <i class="fa-solid fa-user-tie"></i> Superintendente de Circuito
                    </span>
                </td>
            </tr>

            <tr>
                <td class="c-tiempo editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)">3 min</td>
                <td class="px-2 font-medium editable-field" colspan="9" contenteditable="true" onpaste="limpiarTextoPegado(event)">
                    Canción Nº ${sem.cancionDomFin || ''} y oración
                </td>
            </tr>
        `;
    } else {
        filasHTML += `
            <tr class="border-t-2 border-slate-900 bg-slate-50/50">
                <td class="px-2 font-bold py-1.5 editable-field" colspan="3" contenteditable="true" onpaste="limpiarTextoPegado(event)">
                    Domingo, presidencia: 
                    <div class="inline-flex items-center ml-2 w-48 gap-1">
                        ${crearSelectHTML('asig_dom_presi', 'presPub', sem.domPresi)}
                        ${crearBotonWhatsAppHTML(sem.domPresi, '', 'Presidencia del Domingo', 'Reunión Pública')}
                    </div>
                </td>
                <td class="px-2 font-bold py-1.5 text-right editable-field" colspan="7" contenteditable="true" onpaste="limpiarTextoPegado(event)">
                    Lector: 
                    <div class="inline-flex items-center ml-2 text-left w-48 gap-1">
                        ${crearSelectHTML('asig_dom_lector', 'lectorW', sem.domLector)}
                        ${crearBotonWhatsAppHTML(sem.domLector, '', 'Lector de La Atalaya', 'Reunión Pública')}
                    </div>
                </td>
            </tr>
        `;
    }

    cuerpo.innerHTML = filasHTML;
}

window.actualizarNombreMes = function(val) {
    nombreMesGlobal = val.trim().toUpperCase();
    actualizarTextoTituloMes(nombreMesGlobal);
    notificarYGuardarAutosave();
};

function actualizarTextoTituloMes(txt) {
    const el = document.getElementById('txtNombreMes');
    if (el) el.innerText = txt || "---";
}

async function notificarYGuardarAutosave() {
    if (typeof guardarPlanillaEnSupabase === 'function') {
        await guardarPlanillaEnSupabase();
    }
    
    if (typeof renderizarTablaHistorial === 'function') {
        renderizarTablaHistorial();
    }

    const badge = document.getElementById('estadoGuardado');
    if (badge) {
        badge.classList.remove('opacity-0');
        setTimeout(() => badge.classList.add('opacity-0'), 2000);
    }
}

window.guardarMesManual = async function() {
    await notificarYGuardarAutosave();
    alert("¡Trabajo del mes guardado correctamente!");
};

window.resetearPlanillaMes = async function() {
    if (confirm("¿Estás seguro de resetear la planilla para iniciar un NUEVO MES? Esto limpiará las semanas actuales.")) {
        nombreMesGlobal = "";
        const inputMes = document.getElementById('inputNombreMes');
        if (inputMes) inputMes.value = "";
        actualizarTextoTituloMes("");

        inicializarMesDefault(4);
        semanaActivaIdx = 0;
        
        renderizarSelectorSemanas();
        cargarSemanaEnPlanilla(0);
        await notificarYGuardarAutosave();
    }
};

function renderizarMatrizHermanos() {
    const cuerpo = document.getElementById('cuerpoTablaHermanos');
    if (!cuerpo) return;
    cuerpo.innerHTML = '';

    if (!Array.isArray(listaHermanos)) return;

    listaHermanos.forEach((h, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white text-xs' : 'bg-slate-50/50 text-xs';
        
        const colsBool = [
            'oracion', 'pres_vymc', 'disc_tesoros', 'perlas', 
            'lec_biblia', 'smm', 'nvc', 'ebc', 'lector_ebc', 
            'pres_pub', 'lector_atalaya'
        ];

        tr.innerHTML = `
            <td class="font-bold text-slate-400">${index + 1}</td>
            <td class="text-left font-bold px-2">
                <input type="text" value="${h.nombre || ''}" onchange="actualizarHermano(${h.id}, 'nombre', this.value)" onpaste="limpiarTextoPegado(event)" class="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 font-semibold text-slate-800">
            </td>
            <td>
                <select onchange="actualizarHermano(${h.id}, 'sexo', this.value)" class="text-xs bg-transparent font-bold ${h.sexo === 'V' ? 'text-blue-600' : 'text-pink-600'}">
                    <option value="V" ${h.sexo === 'V' ? 'selected' : ''}>V</option>
                    <option value="M" ${h.sexo === 'M' ? 'selected' : ''}>M</option>
                </select>
            </td>
            <td>
                <input type="text" value="${h.condicion || ''}" onchange="actualizarHermano(${h.id}, 'condicion', this.value)" class="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300">
            </td>
            <td>
                <input type="number" value="${h.grupo || ''}" onchange="actualizarHermano(${h.id}, 'grupo', parseInt(this.value) || null)" class="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300">
            </td>
            <td>
                <input type="text" value="${h.responsabilidades || ''}" onchange="actualizarHermano(${h.id}, 'responsabilidades', this.value)" class="w-full text-center bg-transparent border-b border-transparent hover:border-slate-300">
            </td>
            <td>
                <input type="text" value="${h.celular || ''}" onchange="actualizarHermano(${h.id}, 'celular', this.value)" placeholder="+54..." class="w-full text-center font-mono text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300">
            </td>

            ${colsBool.map(col => `
                <td>
                    <input type="checkbox" ${(h[col] === true || h[col] === 'X') ? 'checked' : ''} onchange="actualizarHermano(${h.id}, '${col}', this.checked)" class="rounded text-amber-600 cursor-pointer">
                </td>
            `).join('')}

            <td class="no-print">
                <button onclick="eliminarHermano(${h.id})" class="text-red-500 hover:text-red-700 text-xs px-1 py-0.5" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        cuerpo.appendChild(tr);
    });
}

window.actualizarHermano = async function(id, campo, valor) {
    if (typeof actualizarHermanoBD === 'function') await actualizarHermanoBD(id, campo, valor);
    if (programaMes.length > 0) cargarSemanaEnPlanilla(semanaActivaIdx);
    if (typeof renderizarTablaHistorial === 'function') renderizarTablaHistorial();
};

window.agregarNuevoHermano = async function() {
    if (typeof agregarNuevoHermanoBD === 'function') await agregarNuevoHermanoBD();
    renderizarMatrizHermanos();
    if (typeof renderizarTablaHistorial === 'function') renderizarTablaHistorial();
};

window.eliminarHermano = async function(id) {
    if (typeof eliminarHermanoBD === 'function') await eliminarHermanoBD(id);
    renderizarMatrizHermanos();
    if (programaMes.length > 0) cargarSemanaEnPlanilla(semanaActivaIdx);
    if (typeof renderizarTablaHistorial === 'function') renderizarTablaHistorial();
};

window.agregarFilaMaestros = async function() {
    const sem = programaMes[semanaActivaIdx];
    if (!sem) return;
    
    let ultimoIdxMaestros = -1;
    sem.partes.forEach((p, idx) => {
        if (p.seccion === 'maestros') ultimoIdxMaestros = idx;
    });

    const nuevaParte = {
        seccion: 'maestros',
        t: '3 min',
        tit: 'Nueva Asignación SMM',
        desc: '',
        participantes: 2,
        asig: '',
        asigAyudante: ''
    };

    if (ultimoIdxMaestros !== -1) {
        sem.partes.splice(ultimoIdxMaestros + 1, 0, nuevaParte);
    } else {
        sem.partes.push(nuevaParte);
    }

    cargarSemanaEnPlanilla(semanaActivaIdx);
    await notificarYGuardarAutosave();
};

window.agregarFilaVida = async function() {
    const sem = programaMes[semanaActivaIdx];
    if (!sem) return;
    
    const idxEBC = sem.partes.findIndex(p => p.tit && p.tit.includes('Estudio bíblico'));
    const nuevaParte = {
        seccion: 'vida',
        t: '15 min',
        tit: 'Nueva Parte NVC',
        desc: '',
        participantes: 1,
        asig: ''
    };

    if (idxEBC !== -1) {
        sem.partes.splice(idxEBC, 0, nuevaParte);
    } else {
        sem.partes.push(nuevaParte);
    }

    cargarSemanaEnPlanilla(semanaActivaIdx);
    await notificarYGuardarAutosave();
};

window.eliminarFilaParte = async function(pIndex) {
    const sem = programaMes[semanaActivaIdx];
    if (sem && sem.partes && sem.partes[pIndex]) {
        sem.partes.splice(pIndex, 1);
        cargarSemanaEnPlanilla(semanaActivaIdx);
        await notificarYGuardarAutosave();
    }
};

window.abrirModalImportador = function() {
    const m = document.getElementById('modalImportador');
    if (m) m.classList.remove('hidden');
    window.volverAPasoTextoCrudo();
};

window.cerrarModalImportador = function() {
    const m = document.getElementById('modalImportador');
    if (m) m.classList.add('hidden');
};

window.volverAPasoTextoCrudo = function() {
    const paso1 = document.getElementById('pasoModalTextoCrudo');
    const paso2 = document.getElementById('pasoModalFormateado');
    const btn1 = document.getElementById('btnConvertirCrudo');
    const btn2 = document.getElementById('btnCargarAPlanilla');

    if (paso1) paso1.classList.remove('hidden');
    if (paso2) paso2.classList.add('hidden');
    if (btn1) btn1.classList.remove('hidden');
    if (btn2) btn2.classList.add('hidden');
};

window.convertirTextoCrudoADelimitado = function() {
    const rawEl = document.getElementById('inputTextoCrudo');
    if (!rawEl || !rawEl.value.trim()) {
        alert("Pega primero el texto del programa.");
        return;
    }

    const raw = rawEl.value;
    const lineas = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let resultadoLineas = [];

    let semanaTexto = "";
    let lecturaTexto = "";

    for (let i = 0; i < lineas.length; i++) {
        let l = lineas[i];
        if (l.match(/\d+-\d+\s+DE\s+[A-Z]+/i)) {
            semanaTexto = l;
            if (lineas[i+1] && !lineas[i+1].includes('Canción')) {
                lecturaTexto = lineas[i+1];
            }
            break;
        }
    }

    if (semanaTexto) {
        resultadoLineas.push(`Semana del ${semanaTexto} // ${lecturaTexto}`);
    }

    for (let i = 0; i < lineas.length; i++) {
        let l = lineas[i];

        if (l.includes("TESOROS DE LA BIBLIA")) {
            resultadoLineas.push("TESOROS DE LA BIBLIA");
            continue;
        }
        if (l.includes("SEAMOS MEJORES MAESTROS")) {
            resultadoLineas.push("SEAMOS MEJORES MAESTROS");
            continue;
        }
        if (l.includes("NUESTRA VIDA CRISTIANA")) {
            resultadoLineas.push("NUESTRA VIDA CRISTIANA");
            continue;
        }

        if (l.startsWith("Canción") && l.includes("introducción")) {
            let partesIntro = l.split('|');
            resultadoLineas.push(`${partesIntro[0].trim()} // ${partesIntro[1] ? partesIntro[1].trim() : ''}`);
            resultadoLineas.push("Oracion");
            continue;
        }

        if (l.startsWith("Canción") && !l.includes("oración") && !l.includes("introducción")) {
            resultadoLineas.push(l);
            continue;
        }

        if (l.includes("Palabras de conclusión")) {
            let partesFin = l.split('|');
            resultadoLineas.push(`${partesFin[0].trim()} |`);
            if (partesFin[1]) resultadoLineas.push(partesFin[1].trim());
            continue;
        }

        let matchNum = l.match(/^(\d+)\.\s*(.+)/);
        if (matchNum) {
            let numParte = matchNum[1];
            let restTexto = matchNum[2];
            let tiempo = "5 min";

            for (let j = i; j <= Math.min(i + 4, lineas.length - 1); j++) {
                let matchTiempo = lineas[j].match(/\((\d+\s*min[s]?\.)\)/i);
                if (matchTiempo) {
                    tiempo = matchTiempo[1];
                    break;
                }
            }

            if (numParte === "1") {
                resultadoLineas.push(`${tiempo} // ${l} // Discurso`);
            } 
            else if (numParte === "2") {
                resultadoLineas.push(`${tiempo} // ${l} // Preguntas y respuestas, ${lecturaTexto}`);
            } 
            else if (numParte === "3") {
                let detLectura = restTexto.replace(/\(\d+\s*min[s]?\.\)/i, '').trim();
                resultadoLineas.push(`${tiempo} // 3. Lectura de la Biblia // ${detLectura}`);
            } 
            else {
                let partesLinea = restTexto.split('.');
                let titulo = `${numParte}. ${partesLinea[0].trim()}`;
                let descripcion = partesLinea.slice(1).join('.').replace(/\(\d+\s*min[s]?\.\)/i, '').trim();

                if (descripcion) {
                    resultadoLineas.push(`${tiempo} // ${titulo} // ${descripcion}`);
                } else {
                    resultadoLineas.push(`${tiempo} // ${titulo} // `);
                }
            }
        }
    }

    const outEl = document.getElementById('outputTextoDelimitado');
    if (outEl) outEl.value = resultadoLineas.join('\n');

    document.getElementById('pasoModalTextoCrudo').classList.add('hidden');
    document.getElementById('pasoModalFormateado').classList.remove('hidden');
    document.getElementById('btnConvertirCrudo').classList.add('hidden');
    document.getElementById('btnCargarAPlanilla').classList.remove('hidden');
};

window.cargarDelimitadoAPlanilla = async function() {
    const outEl = document.getElementById('outputTextoDelimitado');
    if (!outEl || !outEl.value.trim()) return;

    const textoDelimitado = outEl.value;
    const lineas = textoDelimitado.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let nuevaSemana = {
        semana: "",
        lectura: "",
        canciones: ["", "", ""],
        tipoSemana: "normal",
        numSalas: 1,
        partes: []
    };

    let seccionActual = "tesoros";

    lineas.forEach(linea => {
        if (linea.startsWith("TESOROS DE LA BIBLIA")) { seccionActual = "tesoros"; return; }
        if (linea.startsWith("SEAMOS MEJORES MAESTROS")) { seccionActual = "maestros"; return; }
        if (linea.startsWith("NUESTRA VIDA CRISTIANA")) { seccionActual = "vida"; return; }

        if (linea.startsWith("Cancion") || linea.startsWith("Canción")) {
            let num = linea.replace(/\D/g, '');
            if (num && !linea.includes("introducción") && !linea.includes("oración")) {
                nuevaSemana.canciones[1] = num;
            }
            return;
        }

        if (linea.startsWith("Semana del")) {
            const partesHead = linea.split('//');
            if (partesHead[0]) nuevaSemana.semana = partesHead[0].replace('Semana del', '').trim();
            if (partesHead[1]) nuevaSemana.lectura = partesHead[1].trim();
            return;
        }

        const segmentos = linea.split('//').map(s => s.trim());
        if (segmentos.length >= 1 && !linea.startsWith("Canción") && !linea.startsWith("Palabras") && !linea.startsWith("Oracion")) {
            let t = "";
            let tit = "";
            let desc = "";

            if (segmentos.length === 1) {
                tit = segmentos[0];
            } else if (segmentos.length === 2) {
                tit = segmentos[0];
                desc = segmentos[1];
            } else if (segmentos.length >= 3) {
                t = segmentos[0];
                tit = segmentos[1];
                desc = segmentos[2];
            }

            tit = tit.replace(/[\r\n]+/g, ' ');
            desc = desc.replace(/[\r\n]+/g, ' ');

            nuevaSemana.partes.push({
                seccion: seccionActual,
                t: t,
                tit: tit,
                desc: desc,
                participantes: seccionActual === 'maestros' ? 2 : 1,
                asig: ''
            });
        }
    });

    if (nuevaSemana.partes.length > 0) {
        programaMes[semanaActivaIdx] = nuevaSemana;
        cargarSemanaEnPlanilla(semanaActivaIdx);
        await notificarYGuardarAutosave();
    }

    window.cerrarModalImportador();
};

window.actualizarEncabezadoSemana = async function(campo, valor) {
    if (programaMes[semanaActivaIdx]) {
        programaMes[semanaActivaIdx][campo] = valor;
        await notificarYGuardarAutosave();
    }
};

window.toggleParticipantesParte = async function(pIndex) {
    const sem = programaMes[semanaActivaIdx];
    if (sem && sem.partes && sem.partes[pIndex]) {
        sem.partes[pIndex].participantes = (sem.partes[pIndex].participantes === 2) ? 1 : 2;
        cargarSemanaEnPlanilla(semanaActivaIdx);
        await notificarYGuardarAutosave();
    }
};

window.agregarNuevaSemana = async function() {
    const numSem = programaMes.length + 1;
    const nuevaSem = crearEstructuraSemanaEjemplo();
    nuevaSem.semana = `NUEVA SEMANA ${numSem}`;
    programaMes.push(nuevaSem);
    semanaActivaIdx = programaMes.length - 1;
    renderizarSelectorSemanas();
    cargarSemanaEnPlanilla(semanaActivaIdx);
    await notificarYGuardarAutosave();
};

window.eliminarSemanaActiva = async function() {
    if (!programaMes || programaMes.length === 0) return;
    
    if (confirm(`¿Estás seguro de que deseas eliminar la semana "${programaMes[semanaActivaIdx].semana}"?`)) {
        programaMes.splice(semanaActivaIdx, 1);
        if (semanaActivaIdx >= programaMes.length) {
            semanaActivaIdx = Math.max(0, programaMes.length - 1);
        }
        if (programaMes.length === 0) {
            programaMes = [crearEstructuraSemanaEjemplo()];
            semanaActivaIdx = 0;
        }
        renderizarSelectorSemanas();
        cargarSemanaEnPlanilla(semanaActivaIdx);
        await notificarYGuardarAutosave();
    }
};

window.cambiarNumSalasSemana = async function(cantidad) {
    if (!programaMes[semanaActivaIdx]) return;
    programaMes[semanaActivaIdx].numSalas = parseInt(cantidad);
    cargarSemanaEnPlanilla(semanaActivaIdx);
    await notificarYGuardarAutosave();
};

window.guardarAsignacionSemana = async function(elemId) {
    const el = document.getElementById(elemId);
    if (!el) return;
    const val = el.value;
    const sem = programaMes[semanaActivaIdx];
    if (!sem) return;

    if (elemId === 'asig_presi') sem.presidencia = val;
    else if (elemId === 'asig_orac_ini') sem.oracionIni = val;
    else if (elemId.startsWith('asig_p')) {
        const partesId = elemId.split('_');
        const pIndex = parseInt(partesId[1].replace('p', ''));
        const sala = partesId[2];
        const rol = partesId[3];

        if (sem.partes && sem.partes[pIndex]) {
            if (sala === 'A') {
                if (rol === 'ayudante') sem.partes[pIndex].asigAyudante = val;
                else sem.partes[pIndex].asig = val;
            } else if (sala === 'B') {
                if (rol === 'ayudante') sem.partes[pIndex].asigBAyudante = val;
                else sem.partes[pIndex].asigB = val;
            } else if (sala === 'C') {
                if (rol === 'ayudante') sem.partes[pIndex].asigCAyudante = val;
                else sem.partes[pIndex].asigC = val;
            }
        }
    }
    else if (elemId === 'asig_repaso') sem.repaso = val;
    else if (elemId === 'asig_orac_fin') sem.oracionFin = val;
    else if (elemId === 'asig_dom_presi') sem.domPresi = val;
    else if (elemId === 'asig_dom_lector') sem.domLector = val;

    await notificarYGuardarAutosave();
    cargarSemanaEnPlanilla(semanaActivaIdx);
};

window.actualizarTipoSemana = async function(tipo) {
    if (!programaMes[semanaActivaIdx]) return;
    programaMes[semanaActivaIdx].tipoSemana = tipo;
    if (tipo === 'viajante') programaMes[semanaActivaIdx].numSalas = 1;
    cargarSemanaEnPlanilla(semanaActivaIdx);
    await notificarYGuardarAutosave();
};

window.cambiarPestaña = function(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`sec-${tab}`);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('nav button').forEach(btn => {
        btn.className = "px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition";
    });
    const activeTab = document.getElementById(`tab-${tab}`);
    if (activeTab) activeTab.className = "px-3 py-1.5 rounded-lg text-white bg-amber-600 font-bold transition";

    if (tab === 'historial') {
        if (typeof cargarOpcionesAniosHistorial === 'function') cargarOpcionesAniosHistorial();
    }

    if (tab === 'estadisticas' && typeof renderizarTablaHistorial === 'function') {
        renderizarTablaHistorial();
    }
};

/* IMPRESIÓN A4 EN BLOQUES DE 2 SEMANAS POR PÁGINA */
window.prepararEImprimir = function() {
    const areaPrint = document.querySelector('.print-area');
    if (!areaPrint) {
        window.print();
        return;
    }

    const contenidoOriginal = areaPrint.innerHTML;
    let htmlTotalPrint = `<div class="text-center mb-4 border-b-2 border-slate-900 pb-2">
        <h2 class="text-xl font-black text-slate-900 uppercase tracking-widest">
            PROGRAMA DE REUNIONES - MES DE ${nombreMesGlobal || "---"}
        </h2>
    </div>`;

    programaMes.forEach((sem, idx) => {
        htmlTotalPrint += `
            <div class="semana-bloque-print">
                <table class="tabla-semana-print">
                    <colgroup>
                        <col class="c-tiempo">
                        <col style="width: 25% !important;">
                        <col style="width: 35% !important;">
                        <col style="width: 5% !important;">
                        <col style="width: 5% !important;">
                        <col style="width: 5% !important;">
                        <col style="width: 5% !important;">
                        <col style="width: 5% !important;">
                        <col style="width: 5% !important;">
                        <col style="width: 5% !important;">
                    </colgroup>
                    <thead>
                        <tr>
                            <th colspan="10" class="py-1 text-center bg-white border-b-2 border-slate-900 font-black text-sm text-slate-900">
                                Semana del ${sem.semana || '---'} , ${sem.lectura || '---'}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        cargarSemanaEnPlanilla(idx);
        const cuerpoActual = document.getElementById('cuerpoTablaPlanilla');
        if (cuerpoActual) {
            htmlTotalPrint += cuerpoActual.innerHTML;
        }

        htmlTotalPrint += `
                    </tbody>
                </table>
            </div>
        `;
    });

    areaPrint.innerHTML = htmlTotalPrint;

    setTimeout(() => {
        window.print();
        areaPrint.innerHTML = contenidoOriginal;
        cargarSemanaEnPlanilla(semanaActivaIdx);
    }, 200);
};

/* BUSCADOR DE HISTORIAL POR MES Y AÑO */
window.buscarYCargarPlanillaHistorial = async function() {
    const mes = document.getElementById('selectFiltroMes').value;
    const anio = document.getElementById('selectFiltroAnio').value;
    const busquedaNombre = `${mes} ${anio}`;

    try {
        if (typeof db === 'undefined' || !db) {
            alert("No hay conexión con la base de datos.");
            return;
        }

        const { data, error } = await db.from('planillas')
            .select('*')
            .ilike('nombre_mes', `%${busquedaNombre}%`)
            .maybeSingle();

        if (error) {
            console.error("Error consultando planilla:", error);
            alert("Ocurrió un error al buscar en el historial.");
            return;
        }

        if (!data) {
            alert(`No se encontró ninguna planilla guardada para: ${busquedaNombre}`);
            return;
        }

        if (confirm(`Se encontró la planilla "${data.nombre_mes}". ¿Deseas cargarla en la pantalla principal?`)) {
            nombreMesGlobal = data.nombre_mes || "";
            programaMes = data.programa_mes || [];

            const inputMes = document.getElementById('inputNombreMes');
            if (inputMes) inputMes.value = nombreMesGlobal;
            actualizarTextoTituloMes(nombreMesGlobal);

            semanaActivaIdx = 0;
            cambiarPestaña('planilla');
            renderizarSelectorSemanas();
            cargarSemanaEnPlanilla(0);
        }
    } catch (e) {
        console.error("Error al reabrir planilla:", e);
    }
};
