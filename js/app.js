let programaMes = [];
let listaHermanos = [];
let semanaActivaIdx = 0;

window.onload = async function() {
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
        programaMes = [crearEstructuraSemanaEjemplo()];
    }
    
    renderizarSelectorSemanas();
    cargarSemanaEnPlanilla(0);
};

function crearEstructuraSemanaEjemplo() {
    return {
        semana: "14-20 DE SEPTIEMBRE",
        lectura: "JEREMÍAS 34, 35",
        canciones: ["161", "121", "28"],
        tipoSemana: "normal",
        numSalas: 1,
        presidencia: "",
        oracionIni: "",
        repaso: "",
        oracionFin: "",
        domPresi: "",
        domLector: "",
        partes: [
            { seccion: "tesoros", t: "10 min", tit: "1. Jehová recompensa a los que siempre le obedecen", desc: "Discurso", participantes: 1, asig: "" },
            { seccion: "tesoros", t: "10 min", tit: "2. Busquemos perlas escondidas.", desc: "Preguntas y respuestas JEREMÍAS 34, 35", participantes: 1, asig: "" },
            { seccion: "tesoros", t: "4 min", tit: "3. Lectura de la Biblia: Jer 35:1-14 (th lección 5).", desc: "", participantes: 1, asig: "" },
            
            { seccion: "maestros", t: "2 min", tit: "4. Empiece conversaciones", desc: "DE CASA EN CASA. Ofrezca un curso de la Biblia (lmd lección 3 punto 3).", participantes: 2, asig: "", asigAyudante: "" },
            { seccion: "maestros", t: "2 min", tit: "5. Empiece conversaciones", desc: "DE CASA EN CASA. Presente un video del kit de enseñanza (lmd lección 3 punto 5).", participantes: 2, asig: "", asigAyudante: "" },
            { seccion: "maestros", t: "3 min", tit: "6. Haga revisitas", desc: "PREDICACIÓN INFORMAL. Ofrézcale un curso de la Biblia a una persona que en otra ocasión le dijo que estaba preocupada por algo que vio en las noticias (lmd lección 7 punto 4).", participantes: 2, asig: "", asigAyudante: "" },
            { seccion: "maestros", t: "4 min", tit: "7. Haga discípulos", desc: "Converse con su estudiante de la Biblia (th lección 11).", participantes: 2, asig: "", asigAyudante: "" },
            
            { seccion: "vida", t: "6 min", tit: "8. El autocontrol nos ayuda a obedecer", desc: "Análisis con el auditorio.", participantes: 1, asig: "" },
            { seccion: "vida", t: "9 min", tit: "9. Logros de la organización para el mes de septiembre", desc: "Ponga el VIDEO. Luego haga las preguntas.", participantes: 1, asig: "" },
            { seccion: "vida", t: "30 min", tit: "Estudio bíblico de la congregación: wcg cap. 8.", desc: "", participantes: 2, asig: "", asigAyudante: "" }
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
        btn.innerText = `Sem ${idx + 1}: ${s.semana ? s.semana.split(' DE ')[0] : ''}`;
        cont.appendChild(btn);
    });
}

function obtenerOpcionesHermanos(cat) {
    if (!Array.isArray(listaHermanos)) return [];
    return listaHermanos.filter(h => {
        if (!cat) return true;
        if (cat === 'orac') return h.orac === 'X';
        if (cat === 'pres') return h.pres === 'X';
        if (cat === 'disc') return h.disc === 'X';
        if (cat === 'perlas') return h.perlas === 'X';
        if (cat === 'lec') return h.lec === 'X';
        if (cat === 'smm') return h.smm === 'X';
        if (cat === 'nvc') return h.nvc === 'X';
        if (cat === 'eb') return h.eb === 'X';
        if (cat === 'lectorL') return h.lectorL === 'X';
        if (cat === 'presPub') return h.presPub === 'X';
        if (cat === 'lectorW') return h.lectorW === 'X';
        return true;
    });
}

function crearSelectHTML(id, cat, valorActual = "", placeholder = "ELEGIR") {
    const aptos = obtenerOpcionesHermanos(cat);
    let options = `<option value="">-- ${placeholder} --</option>`;
    aptos.forEach(h => {
        const sel = h.nombre === valorActual ? 'selected' : '';
        options += `<option value="${h.nombre}" ${sel}>${h.nombre}</option>`;
    });
    return `<select id="${id}" class="select-asig" onchange="guardarAsignacionSemana('${id}')">${options}</select>`;
}

window.guardarTextoEditable = function(pIndex, campo, valor) {
    const sem = programaMes[semanaActivaIdx];
    if (sem && sem.partes && sem.partes[pIndex]) {
        sem.partes[pIndex][campo] = valor;
        if (typeof guardarPlanillaEnSupabase === 'function') guardarPlanillaEnSupabase();
    }
};

function cargarSemanaEnPlanilla(idx) {
    if (!programaMes || programaMes.length === 0) return;
    semanaActivaIdx = idx;
    renderizarSelectorSemanas();
    const sem = programaMes[idx];

    const numSalas = sem.tipoSemana === 'viajante' ? 1 : (sem.numSalas || 1);
    
    const selSalas = document.getElementById('selectNumSalas');
    if (selSalas) {
        selSalas.value = numSalas;
        selSalas.disabled = (sem.tipoSemana === 'viajante');
    }

    const cabecera = document.getElementById('cabeceraTablaPlanilla');
    if (cabecera) {
        cabecera.innerHTML = `
            <tr>
                <th colspan="10" class="py-2 px-3 bg-white text-center border-b-2 border-slate-900">
                    <div class="flex justify-center items-center gap-1 font-black text-slate-900 text-base">
                        <span>Semana del</span>
                        <input type="text" value="${sem.semana}" onchange="actualizarEncabezadoSemana('semana', this.value)" class="input-inline max-w-[200px]">
                        <span>,</span>
                        <input type="text" value="${sem.lectura}" onchange="actualizarEncabezadoSemana('lectura', this.value)" class="input-inline max-w-[180px]">
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

        const renderSelectsGroup = (prefix, valTit, valAyu, placeholderPrefix = "") => {
            let res = `<div class="flex flex-col justify-center h-full">`;
            if (placeholderPrefix) {
                res += `<span class="block text-[8px] text-slate-400 font-bold uppercase no-print">${placeholderPrefix}</span>`;
            }
            res += crearSelectHTML(`${prefix}_titular`, cat, valTit, "ASIGNAR");
            if (cantP === 2) {
                res += `<div class="border-t border-dashed border-slate-300 my-0.5"></div>`;
                res += crearSelectHTML(`${prefix}_ayudante`, cat, valAyu, "AYUDANTE");
            }
            res += `</div>`;
            return res;
        };

        let html = '';

        if (numSalas === 1) {
            html += `<td class="p-1 col-asig relative group" colspan="7">
                <button onclick="toggleParticipantesParte(${pIndex})" class="no-print absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-slate-200 hover:bg-slate-300 text-[9px] px-1 py-0.5 rounded font-bold transition z-10">
                    ${cantP === 1 ? '1 Asig' : '2 Asig'}
                </button>
                ${renderSelectsGroup(`asig_p${pIndex}_A`, item.asig, item.asigAyudante)}
            </td>`;
        } else if (numSalas === 2) {
            html += `<td class="p-1 col-asig relative group" colspan="4">
                <button onclick="toggleParticipantesParte(${pIndex})" class="no-print absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-slate-200 hover:bg-slate-300 text-[9px] px-1 py-0.5 rounded font-bold transition z-10">
                    ${cantP === 1 ? '1 Asig' : '2 Asig'}
                </button>
                ${renderSelectsGroup(`asig_p${pIndex}_A`, item.asig, item.asigAyudante, "Prin.")}
            </td>
            <td class="p-1 col-asig" colspan="3">
                ${renderSelectsGroup(`asig_p${pIndex}_B`, item.asigB, item.asigBAyudante, "Sala B")}
            </td>`;
        } else if (numSalas === 3) {
            html += `<td class="p-1 col-asig relative group" colspan="3">
                <button onclick="toggleParticipantesParte(${pIndex})" class="no-print absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-slate-200 hover:bg-slate-300 text-[9px] px-1 py-0.5 rounded font-bold transition z-10">
                    ${cantP === 1 ? '1 Asig' : '2 Asig'}
                </button>
                ${renderSelectsGroup(`asig_p${pIndex}_A`, item.asig, item.asigAyudante, "Prin.")}
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
            return `<td class="px-2 col-asig" colspan="7">${crearSelectHTML(`asig_p${pIndex}_A_titular`, cat, item.asig)}</td>`;
        } else if (numSalas === 2) {
            return `<td class="px-1 py-1 col-asig" colspan="4">${crearSelectHTML(`asig_p${pIndex}_A_titular`, cat, item.asig, "Principal")}</td>
                    <td class="px-1 py-1 col-asig" colspan="3">${crearSelectHTML(`asig_p${pIndex}_B_titular`, cat, item.asigB, "Sala B")}</td>`;
        } else {
            return `<td class="px-1 py-1 col-asig" colspan="3">${crearSelectHTML(`asig_p${pIndex}_A_titular`, cat, item.asig, "Principal")}</td>
                    <td class="px-1 py-1 col-asig" colspan="2">${crearSelectHTML(`asig_p${pIndex}_B_titular`, cat, item.asigB, "Sala B")}</td>
                    <td class="px-1 py-1 col-asig" colspan="2">${crearSelectHTML(`asig_p${pIndex}_C_titular`, cat, item.asigC, "Sala C")}</td>`;
        }
    };

    let filasHTML = `
        <tr class="h-6">
            <td class="c-tiempo editable-field" contenteditable="true">1 min</td>
            <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true">
                Canción N° ${sem.canciones?.[0] || '161'}. Presidencia: Palabras de introducción.
            </td>
            <td class="px-2 col-asig" colspan="7">${crearSelectHTML('asig_presi', 'pres', sem.presidencia)}</td>
        </tr>
        <tr class="h-6">
            <td class="c-tiempo editable-field" contenteditable="true"></td>
            <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true">Oración</td>
            <td class="px-2 col-asig" colspan="7">${crearSelectHTML('asig_orac_ini', 'orac', sem.oracionIni)}</td>
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
                <tr>
                    <th class="bg-vida text-white text-center c-tiempo"><i class="fa-solid fa-sheep text-xs"></i></th>
                    <th colspan="9" class="bg-vida text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Nuestra vida cristiana</th>
                </tr>
                <tr>
                    <td class="px-2 font-bold editable-field" colspan="10" contenteditable="true">
                        Canción Nº: ${sem.canciones?.[1] || '121'}
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
                        <td class="c-tiempo editable-field" contenteditable="true" onblur="guardarTextoEditable(${pIndex}, 't', this.innerText)">${item.t}</td>
                        <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onblur="guardarTextoEditable(${pIndex}, 'tit', this.innerText)">${item.tit}</td>
                        ${renderSalasLectura(pIndex, cat)}
                    </tr>
                `;
            } else {
                filasHTML += `
                    <tr>
                        <td class="c-tiempo editable-field" contenteditable="true" onblur="guardarTextoEditable(${pIndex}, 't', this.innerText)">${item.t}</td>
                        <td class="px-2 col-titulo font-medium editable-field" contenteditable="true" onblur="guardarTextoEditable(${pIndex}, 'tit', this.innerText)">${item.tit}</td>
                        <td class="px-2 col-desc editable-field" contenteditable="true" onblur="guardarTextoEditable(${pIndex}, 'desc', this.innerText)">${item.desc}</td>
                        <td class="px-2 col-asig" colspan="7">${crearSelectHTML(`asig_p${pIndex}_A_titular`, cat, item.asig)}</td>
                    </tr>
                `;
            }
        } 
        else if (item.seccion === 'maestros') {
            filasHTML += `
                <tr>
                    <td class="c-tiempo editable-field" contenteditable="true" onblur="guardarTextoEditable(${pIndex}, 't', this.innerText)">${item.t}</td>
                    <td class="px-2 col-titulo font-medium editable-field" contenteditable="true" onblur="guardarTextoEditable(${pIndex}, 'tit', this.innerText)">${item.tit}</td>
                    <td class="px-2 col-desc editable-field" contenteditable="true" onblur="guardarTextoEditable(${pIndex}, 'desc', this.innerText)">${item.desc}</td>
                    ${renderSalasMaestros(pIndex, cat)}
                </tr>
            `;
        } 
        else if (item.seccion === 'vida') {
            if (item.tit.includes('Estudio bíblico')) {
                filasHTML += `
                    <tr>
                        <td class="c-tiempo editable-field" rowspan="2" contenteditable="true" onblur="guardarTextoEditable(${pIndex}, 't', this.innerText)">${item.t}</td>
                        <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onblur="guardarTextoEditable(${pIndex}, 'tit', this.innerText)">${item.tit}</td>
                        <td class="px-2 col-asig" colspan="7">${crearSelectHTML(`asig_p${pIndex}_A_titular`, 'eb', item.asig)}</td>
                    </tr>
                    <tr>
                        <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true">Lector:</td>
                        <td class="px-2 col-asig" colspan="7">${crearSelectHTML(`asig_p${pIndex}_A_ayudante`, 'lectorL', item.asigAyudante)}</td>
                    </tr>
                `;
            } else {
                filasHTML += `
                    <tr class="group">
                        <td class="c-tiempo relative editable-field" contenteditable="true" onblur="guardarTextoEditable(${pIndex}, 't', this.innerText)">
                            ${item.t}
                            <button onclick="eliminarFilaParte(${pIndex})" class="no-print absolute top-0.5 left-0.5 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 text-[10px]" title="Eliminar fila"><i class="fa-solid fa-circle-minus"></i></button>
                        </td>
                        <td class="px-2 col-titulo font-medium editable-field" contenteditable="true" onblur="guardarTextoEditable(${pIndex}, 'tit', this.innerText)">${item.tit}</td>
                        <td class="px-2 col-desc editable-field" contenteditable="true" onblur="guardarTextoEditable(${pIndex}, 'desc', this.innerText)">${item.desc}</td>
                        <td class="px-2 col-asig" colspan="7">${crearSelectHTML(`asig_p${pIndex}_A_titular`, 'nvc', item.asig)}</td>
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

    filasHTML += `
        <tr>
            <td class="c-tiempo editable-field" rowspan="2" contenteditable="true">3 min</td>
            <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true">Repaso de esta reunión y adelanto de la próxima.</td>
            <td class="px-2 col-asig" colspan="7">${crearSelectHTML('asig_repaso', 'pres', sem.repaso)}</td>
        </tr>
        <tr>
            <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true">
                Canción ${sem.canciones?.[2] || '28'} y oración
            </td>
            <td class="px-2 col-asig" colspan="7">${crearSelectHTML('asig_orac_fin', 'orac', sem.oracionFin)}</td>
        </tr>

        <tr class="border-t-2 border-slate-900 bg-slate-50/50">
            <td class="px-2 font-bold py-1.5 editable-field" colspan="3" contenteditable="true">
                Domingo, presidencia: 
                <div class="inline-block ml-2 w-48">${crearSelectHTML('asig_dom_presi', 'presPub', sem.domPresi)}</div>
            </td>
            <td class="px-2 font-bold py-1.5 text-right editable-field" colspan="7" contenteditable="true">
                Lector: 
                <div class="inline-block ml-2 text-left w-48">${crearSelectHTML('asig_dom_lector', 'lectorW', sem.domLector)}</div>
            </td>
        </tr>
    `;

    cuerpo.innerHTML = filasHTML;
}

/* FUNCIONES DEL MODAL DE EXTRACCIÓN (GLOBALES) */
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

        if (l.match(/\d+-\d+\s+DE\s+[A-Z]+/i) || l.match(/Semana del/i)) {
            semanaTexto = l.replace(/Semana del/i, '').trim();
            if (lineas[i+1] && !lineas[i+1].includes('Canción') && !lineas[i+1].includes('TESOROS')) {
                lecturaTexto = lineas[i+1];
            }
            resultadoLineas.push(`Semana del "${semanaTexto}"; "${lecturaTexto}"`);
            continue;
        }

        if (l.includes("TESOROS DE LA BIBLIA")) {
            resultadoLineas.push("\nTESOROS DE LA BIBLIA");
            continue;
        }
        if (l.includes("SEAMOS MEJORES MAESTROS")) {
            resultadoLineas.push("\nSEAMOS MEJORES MAESTROS");
            continue;
        }
        if (l.includes("NUESTRA VIDA CRISTIANA")) {
            resultadoLineas.push("\nNUESTRA VIDA CRISTIANA");
            continue;
        }

        if (l.startsWith("Canción") && l.includes("introducción")) {
            let matchMin = l.match(/\((\d+\s*min[s]?\.)\)/i);
            let t = matchMin ? matchMin[1] : "1 min";
            resultadoLineas.push(`${t} // ${l}`);
            continue;
        }

        let matchNum = l.match(/^(\d+)\.\s*(.+)/);
        if (matchNum) {
            let numTit = l;
            let tiempo = "5 min";
            let desc = "";

            if (lineas[i+1] && lineas[i+1].match(/\((\d+\s*min[s]?\.)\)/i)) {
                tiempo = lineas[i+1].match(/\((\d+\s*min[s]?\.)\)/i)[1];
                if (lineas[i+2] && !lineas[i+2].match(/^\d+\./) && !lineas[i+2].startsWith('-') && !lineas[i+2].startsWith('PREGÚNTESE')) {
                    desc = lineas[i+2];
                }
            } else if (l.match(/\((\d+\s*min[s]?\.)\)/i)) {
                tiempo = l.match(/\((\d+\s*min[s]?\.)\)/i)[1];
            }

            if (desc) {
                resultadoLineas.push(`${tiempo} // ${numTit} // ${desc}`);
            } else {
                resultadoLineas.push(`${tiempo} // ${numTit}`);
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
        semana: "14-20 DE SEPTIEMBRE",
        lectura: "",
        canciones: ["161", "121", "28"],
        tipoSemana: "normal",
        numSalas: 1,
        partes: []
    };

    let seccionActual = "tesoros";

    lineas.forEach(linea => {
        if (linea.startsWith("TESOROS DE LA BIBLIA")) { seccionActual = "tesoros"; return; }
        if (linea.startsWith("SEAMOS MEJORES MAESTROS")) { seccionActual = "maestros"; return; }
        if (linea.startsWith("NUESTRA VIDA CRISTIANA")) { seccionActual = "vida"; return; }

        if (linea.startsWith("Semana del")) {
            const partesHead = linea.replace('Semana del', '').split(';');
            if (partesHead[0]) nuevaSemana.semana = partesHead[0].replace(/"/g, '').trim();
            if (partesHead[1]) nuevaSemana.lectura = partesHead[1].replace(/"/g, '').trim();
            return;
        }

        const segmentos = linea.split('//').map(s => s.trim());
        if (segmentos.length >= 1 && !linea.startsWith("Canción")) {
            const tiempoStr = segmentos[0].replace(/"/g, '');
            const titStr = segmentos[1] ? segmentos[1].replace(/"/g, '') : '';
            const descStr = segmentos[2] ? segmentos[2].replace(/"/g, '') : '';

            nuevaSemana.partes.push({
                seccion: seccionActual,
                t: tiempoStr,
                tit: titStr,
                desc: descStr,
                participantes: seccionActual === 'maestros' ? 2 : 1,
                asig: ''
            });
        }
    });

    if (nuevaSemana.partes.length > 0) {
        programaMes[semanaActivaIdx] = nuevaSemana;
        cargarSemanaEnPlanilla(semanaActivaIdx);
        if (typeof guardarPlanillaEnSupabase === 'function') {
            await guardarPlanillaEnSupabase();
        }
    }

    window.cerrarModalImportador();
};

window.actualizarEncabezadoSemana = async function(campo, valor) {
    if (programaMes[semanaActivaIdx]) {
        programaMes[semanaActivaIdx][campo] = valor;
        if (typeof guardarPlanillaEnSupabase === 'function') await guardarPlanillaEnSupabase();
    }
};

window.toggleParticipantesParte = async function(pIndex) {
    const sem = programaMes[semanaActivaIdx];
    if (sem && sem.partes && sem.partes[pIndex]) {
        sem.partes[pIndex].participantes = (sem.partes[pIndex].participantes === 2) ? 1 : 2;
        cargarSemanaEnPlanilla(semanaActivaIdx);
        if (typeof guardarPlanillaEnSupabase === 'function') await guardarPlanillaEnSupabase();
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
    if (typeof guardarPlanillaEnSupabase === 'function') await guardarPlanillaEnSupabase();
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
        if (typeof guardarPlanillaEnSupabase === 'function') await guardarPlanillaEnSupabase();
    }
};

window.agregarFilaVida = async function() {
    const sem = programaMes[semanaActivaIdx];
    if (!sem) return;
    
    const idxEBC = sem.partes.findIndex(p => p.tit && p.tit.includes('Estudio bíblico'));
    const nuevaParte = {
        seccion: 'vida',
        t: '15 min',
        tit: 'Parte adicional',
        desc: 'Análisis con el auditorio.',
        participantes: 1,
        asig: ''
    };

    if (idxEBC !== -1) {
        sem.partes.splice(idxEBC, 0, nuevaParte);
    } else {
        sem.partes.push(nuevaParte);
    }

    cargarSemanaEnPlanilla(semanaActivaIdx);
    if (typeof guardarPlanillaEnSupabase === 'function') await guardarPlanillaEnSupabase();
};

window.eliminarFilaParte = async function(pIndex) {
    const sem = programaMes[semanaActivaIdx];
    if (sem && sem.partes && sem.partes[pIndex]) {
        sem.partes.splice(pIndex, 1);
        cargarSemanaEnPlanilla(semanaActivaIdx);
        if (typeof guardarPlanillaEnSupabase === 'function') await guardarPlanillaEnSupabase();
    }
};

window.cambiarNumSalasSemana = async function(cantidad) {
    if (!programaMes[semanaActivaIdx]) return;
    programaMes[semanaActivaIdx].numSalas = parseInt(cantidad);
    cargarSemanaEnPlanilla(semanaActivaIdx);
    if (typeof guardarPlanillaEnSupabase === 'function') await guardarPlanillaEnSupabase();
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

    if (typeof guardarPlanillaEnSupabase === 'function') await guardarPlanillaEnSupabase();
};

window.actualizarTipoSemana = async function(tipo) {
    if (!programaMes[semanaActivaIdx]) return;
    programaMes[semanaActivaIdx].tipoSemana = tipo;
    if (tipo === 'viajante') programaMes[semanaActivaIdx].numSalas = 1;
    cargarSemanaEnPlanilla(semanaActivaIdx);
    if (typeof guardarPlanillaEnSupabase === 'function') await guardarPlanillaEnSupabase();
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
};

function renderizarMatrizHermanos() {
    const cuerpo = document.getElementById('cuerpoTablaHermanos');
    if (!cuerpo) return;
    cuerpo.innerHTML = '';

    if (!Array.isArray(listaHermanos)) return;

    listaHermanos.forEach((h, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
        tr.innerHTML = `
            <td class="font-bold text-slate-400">${index + 1}</td>
            <td>
                <select onchange="actualizarHermano(${h.id}, 'sexo', this.value)" class="text-xs bg-transparent font-bold ${h.sexo === 'V' ? 'text-blue-600' : 'text-pink-600'}">
                    <option value="V" ${h.sexo === 'V' ? 'selected' : ''}>V</option>
                    <option value="M" ${h.sexo === 'M' ? 'selected' : ''}>M</option>
                </select>
            </td>
            ${['orac', 'pres', 'disc', 'perlas', 'lec', 'smm', 'nvc', 'eb', 'lectorL', 'presPub', 'lectorW'].map(col => `
                <td>
                    <input type="checkbox" ${h[col] === 'X' ? 'checked' : ''} onchange="actualizarHermano(${h.id}, '${col}', this.checked ? 'X' : '')" class="rounded text-amber-600">
                </td>
            `).join('')}
            <td class="text-left font-bold px-3">
                <input type="text" value="${h.nombre}" onchange="actualizarHermano(${h.id}, 'nombre', this.value)" class="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 font-semibold text-slate-800">
            </td>
            <td class="no-print">
                <button onclick="eliminarHermano(${h.id})" class="text-red-500 hover:text-red-700 text-xs px-2 py-1"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        cuerpo.appendChild(tr);
    });
}

window.actualizarHermano = async function(id, campo, valor) {
    if (typeof actualizarHermanoBD === 'function') await actualizarHermanoBD(id, campo, valor);
    if (programaMes.length > 0) cargarSemanaEnPlanilla(semanaActivaIdx);
};

window.agregarNuevoHermano = async function() {
    if (typeof agregarNuevoHermanoBD === 'function') await agregarNuevoHermanoBD();
    renderizarMatrizHermanos();
};

window.eliminarHermano = async function(id) {
    if (typeof eliminarHermanoBD === 'function') await eliminarHermanoBD(id);
    renderizarMatrizHermanos();
    if (programaMes.length > 0) cargarSemanaEnPlanilla(semanaActivaIdx);
};
