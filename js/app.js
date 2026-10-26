let semanaActivaIdx = 0;

window.onload = async function() {
    try {
        if (typeof db !== 'undefined' && db) {
            await cargarHermanosDesdeSupabase();
            await cargarPlanillaDesdeSupabase();
        }
    } catch (err) {
        console.error("Error inicializando:", err);
    }

    renderizarMatrizHermanos();

    if (!programaMes || programaMes.length === 0) {
        // Crear una semana por defecto si la base de datos está vacía
        programaMes = [crearEstructuraSemanaVacia("14-20 DE SEPTIEMBRE", "JEREMÍAS 34, 35")];
    }
    
    renderizarSelectorSemanas();
    cargarSemanaEnPlanilla(0);
};

function cambiarPestaña(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`sec-${tab}`);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('nav button').forEach(btn => {
        btn.className = "px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition";
    });
    const activeTab = document.getElementById(`tab-${tab}`);
    if (activeTab) activeTab.className = "px-3 py-1.5 rounded-lg text-white bg-amber-600 font-bold transition";
}

function crearEstructuraSemanaVacia(nombreSemana, lectura) {
    return {
        semana: nombreSemana,
        lectura: lectura,
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
            // TESOROS
            { seccion: "tesoros", t: "10 mins.", tit: "1. Jehová recompensa a los que siempre le obedecen", desc: "Discurso", participantes: 1, asig: "" },
            { seccion: "tesoros", t: "10 mins.", tit: "2. Busquemos perlas escondidas.", desc: `Preguntas y respuestas ${lectura}`, participantes: 1, asig: "" },
            { seccion: "tesoros", t: "4 mins.", tit: "3. Lectura de la Biblia: Jer 35:1-14 (th lección 5)", desc: "", participantes: 1, asig: "" },
            // MAESTROS
            { seccion: "maestros", t: "2 mins.", tit: "4. Empiece conversaciones", desc: "DE CASA EN CASA. Ofrezca un curso de la Biblia (lmd lección 3 punto 3).", participantes: 2, asig: "", asigAyudante: "" },
            { seccion: "maestros", t: "2 mins.", tit: "5. Empiece conversaciones", desc: "DE CASA EN CASA. Presente un video del kit de enseñanza.", participantes: 2, asig: "", asigAyudante: "" },
            { seccion: "maestros", t: "3 mins.", tit: "6. Haga revisitas", desc: "INFORMAL. Ofrézcale un curso de la Biblia.", participantes: 2, asig: "", asigAyudante: "" },
            { seccion: "maestros", t: "4 mins.", tit: "7. Haga discípulos", desc: "Converse con su estudiante de la Biblia.", participantes: 2, asig: "", asigAyudante: "" },
            // VIDA
            { seccion: "vida", t: "6 mins.", tit: "8. El autocontrol nos ayuda a obedecer", desc: "Análisis con el auditorio.", participantes: 1, asig: "" },
            { seccion: "vida", t: "9 mins.", tit: "9. Logros de la organización", desc: "Ponga el VIDEO. Luego haga las preguntas.", participantes: 1, asig: "" },
            { seccion: "vida", t: "30 mins.", tit: "Estudio bíblico de la congregación: wcg cap. 8", desc: "", participantes: 2, asig: "", asigAyudante: "" }
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

function crearSelectHTML(id, cat, valorActual = "", placeholder = "Seleccionar") {
    const aptos = obtenerOpcionesHermanos(cat);
    let options = `<option value="">-- ${placeholder} --</option>`;
    aptos.forEach(h => {
        const sel = h.nombre === valorActual ? 'selected' : '';
        options += `<option value="${h.nombre}" ${sel}>${h.nombre}</option>`;
    });
    return `<select id="${id}" class="select-asig" onchange="guardarAsignacionSemana('${id}')">${options}</select>`;
}

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
    cabecera.innerHTML = `
        <colgroup>
            <col class="col-tiempo">
            <col class="col-titulo">
            <col class="col-desc">
            <col class="col-asig">
        </colgroup>
        <tr>
            <th colspan="4" class="py-2 px-3 bg-white text-center border-b-2 border-slate-900">
                <div class="flex justify-center items-center gap-2">
                    <span class="font-extrabold text-slate-800 text-sm">Semana del</span>
                    <input type="text" value="${sem.semana}" onchange="actualizarEncabezadoSemana('semana', this.value)" class="input-live font-black text-slate-900 text-base text-center w-64 border-b border-slate-300">
                    <span class="font-extrabold text-slate-800 text-sm">,</span>
                    <input type="text" value="${sem.lectura}" onchange="actualizarEncabezadoSemana('lectura', this.value)" class="input-live font-black text-slate-900 text-base text-center w-64 border-b border-slate-300">
                </div>
            </th>
        </tr>
    `;

    const radios = document.getElementsByName('tipoSemana');
    radios.forEach(r => r.checked = (r.value === sem.tipoSemana));

    const banner = document.getElementById('bannerEventoEspecial');
    const tabla = document.getElementById('tablaPlanillaCompleta');

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

    const partes = sem.partes || [];
    const cuerpo = document.getElementById('cuerpoTablaPlanilla');
    
    const renderSalasMaestros = (pIndex, cat) => {
        const item = partes[pIndex] || {};
        const cantP = item.participantes || 1;

        const renderSelectsSala = (prefix, valTit, valAyu) => {
            let res = `<div class="flex flex-col justify-center h-full">`;
            res += crearSelectHTML(`${prefix}_titular`, cat, valTit, "Asignado");
            if (cantP === 2) {
                res += `<div class="border-t border-dashed border-slate-300 my-0.5"></div>`;
                res += crearSelectHTML(`${prefix}_ayudante`, cat, valAyu, "Ayudante");
            }
            res += `</div>`;
            return res;
        };

        let html = `<td class="p-1 col-asig relative group">`;
        html += `<button onclick="toggleParticipantesParte(${pIndex})" class="no-print absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 bg-slate-200 hover:bg-slate-300 text-[9px] px-1 py-0.5 rounded font-bold transition z-10" title="Alternar 1 o 2 participantes">
            ${cantP === 1 ? '1 Asig' : '2 Asig'}
        </button>`;

        if (numSalas === 1) {
            html += renderSelectsSala(`asig_p${pIndex}_A`, item.asig, item.asigAyudante);
        } else {
            html += `<div class="grid grid-cols-${numSalas} gap-1 text-[10px] h-full">
                <div class="border-r border-slate-300 pr-1">
                    <span class="block text-[8px] text-slate-400 font-bold uppercase no-print">Prin.</span>
                    ${renderSelectsSala(`asig_p${pIndex}_A`, item.asig, item.asigAyudante)}
                </div>
                <div class="${numSalas === 3 ? 'border-r border-slate-300 pr-1' : ''}">
                    <span class="block text-[8px] text-slate-400 font-bold uppercase no-print">Sala B</span>
                    ${renderSelectsSala(`asig_p${pIndex}_B`, item.asigB, item.asigBAyudante)}
                </div>`;
            if (numSalas === 3) {
                html += `<div>
                    <span class="block text-[8px] text-slate-400 font-bold uppercase no-print">Sala C</span>
                    ${renderSelectsSala(`asig_p${pIndex}_C`, item.asigC, item.asigCAyudante)}
                </div>`;
            }
            html += `</div>`;
        }
        html += `</td>`;
        return html;
    };

    const renderSalasLectura = (pIndex, cat) => {
        const item = partes[pIndex] || {};
        if (numSalas === 1) {
            return `<td class="px-2 col-asig">${crearSelectHTML(`asig_p${pIndex}_A_titular`, cat, item.asig)}</td>`;
        }
        let html = `<td class="px-1 py-1 col-asig">
            <div class="grid grid-cols-${numSalas} gap-1 text-[10px]">
                <div class="border-r border-slate-300 pr-1">
                    <span class="block text-[8px] text-slate-400 font-bold uppercase no-print">Prin.</span>
                    ${crearSelectHTML(`asig_p${pIndex}_A_titular`, cat, item.asig, "Principal")}
                </div>
                <div class="${numSalas === 3 ? 'border-r border-slate-300 pr-1' : ''}">
                    <span class="block text-[8px] text-slate-400 font-bold uppercase no-print">Sala B</span>
                    ${crearSelectHTML(`asig_p${pIndex}_B_titular`, cat, item.asigB, "Sala B")}
                </div>`;
        if (numSalas === 3) {
            html += `<div>
                    <span class="block text-[8px] text-slate-400 font-bold uppercase no-print">Sala C</span>
                    ${crearSelectHTML(`asig_p${pIndex}_C_titular`, cat, item.asigC, "Sala C")}
                </div>`;
        }
        html += `</div></td>`;
        return html;
    };

    // APERTURA
    let filasHTML = `
        <tr class="h-6">
            <td class="col-tiempo">1 min</td>
            <td class="px-2 font-medium" colspan="2">
                Canción N° <input type="text" value="${sem.canciones?.[0] || ''}" onchange="actualizarCancionSemana(0, this.value)" class="input-live w-12 text-center font-bold">. Presidencia: Palabras de introducción.
            </td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_presi', 'pres', sem.presidencia)}</td>
        </tr>
        <tr class="h-6">
            <td class="col-tiempo"></td>
            <td class="px-2 font-medium" colspan="2">Oración</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_orac_ini', 'orac', sem.oracionIni)}</td>
        </tr>
    `;

    let renderizoTesorosHeader = false;
    let renderizoMaestrosHeader = false;
    let renderizoVidaHeader = false;

    partes.forEach((item, pIndex) => {

        if (item.seccion === 'tesoros' && !renderizoTesorosHeader) {
            filasHTML += `
                <tr>
                    <th class="bg-tesoros text-white text-center"><i class="fa-solid fa-gem text-xs"></i></th>
                    <th colspan="3" class="bg-tesoros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Tesoros de la Biblia</th>
                </tr>
            `;
            renderizoTesorosHeader = true;
        } else if (item.seccion === 'maestros' && !renderizoMaestrosHeader) {
            filasHTML += `
                <tr>
                    <th class="bg-maestros text-white text-center"><i class="fa-solid fa-wheat-awn text-xs"></i></th>
                    <th colspan="3" class="bg-maestros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Seamos mejores maestros</th>
                </tr>
            `;
            renderizoMaestrosHeader = true;
        } else if (item.seccion === 'vida' && !renderizoVidaHeader) {
            filasHTML += `
                <tr>
                    <th class="bg-vida text-white text-center"><i class="fa-solid fa-sheep text-xs"></i></th>
                    <th colspan="3" class="bg-vida text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Nuestra vida cristiana</th>
                </tr>
                <tr>
                    <td class="px-2 font-bold" colspan="4">
                        Canción Nº: <input type="text" value="${sem.canciones?.[1] || ''}" onchange="actualizarCancionSemana(1, this.value)" class="input-live w-12 font-bold">
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
                        <td class="col-tiempo">
                            <input type="text" value="${item.t}" onchange="actualizarCampoParte(${pIndex}, 't', this.value)" class="input-live text-center font-bold">
                        </td>
                        <td class="px-2 font-medium" colspan="2">
                            <input type="text" value="${item.tit}" onchange="actualizarCampoParte(${pIndex}, 'tit', this.value)" class="input-live font-medium">
                        </td>
                        ${renderSalasLectura(pIndex, cat)}
                    </tr>
                `;
            } else {
                filasHTML += `
                    <tr>
                        <td class="col-tiempo">
                            <input type="text" value="${item.t}" onchange="actualizarCampoParte(${pIndex}, 't', this.value)" class="input-live text-center font-bold">
                        </td>
                        <td class="px-2 col-titulo font-medium">
                            <input type="text" value="${item.tit}" onchange="actualizarCampoParte(${pIndex}, 'tit', this.value)" class="input-live font-medium">
                        </td>
                        <td class="px-2 col-desc text-slate-700">
                            <input type="text" value="${item.desc}" onchange="actualizarCampoParte(${pIndex}, 'desc', this.value)" class="input-live text-slate-700">
                        </td>
                        <td class="px-2 col-asig">${crearSelectHTML(`asig_p${pIndex}_A_titular`, cat, item.asig)}</td>
                    </tr>
                `;
            }
        } 
        else if (item.seccion === 'maestros') {
            filasHTML += `
                <tr>
                    <td class="col-tiempo">
                        <input type="text" value="${item.t}" onchange="actualizarCampoParte(${pIndex}, 't', this.value)" class="input-live text-center font-bold">
                    </td>
                    <td class="px-2 col-titulo font-medium">
                        <input type="text" value="${item.tit}" onchange="actualizarCampoParte(${pIndex}, 'tit', this.value)" class="input-live font-medium">
                    </td>
                    <td class="px-2 col-desc text-slate-700">
                        <input type="text" value="${item.desc}" onchange="actualizarCampoParte(${pIndex}, 'desc', this.value)" class="input-live text-slate-700">
                    </td>
                    ${renderSalasMaestros(pIndex, cat)}
                </tr>
            `;
        } 
        else if (item.seccion === 'vida') {
            if (item.tit.includes('Estudio bíblico')) {
                filasHTML += `
                    <tr>
                        <td class="col-tiempo" rowspan="2">
                            <input type="text" value="${item.t}" onchange="actualizarCampoParte(${pIndex}, 't', this.value)" class="input-live text-center font-bold">
                        </td>
                        <td class="px-2 font-medium" colspan="2">
                            <input type="text" value="${item.tit}" onchange="actualizarCampoParte(${pIndex}, 'tit', this.value)" class="input-live font-medium">
                        </td>
                        <td class="px-2 col-asig">${crearSelectHTML(`asig_p${pIndex}_A_titular`, 'eb', item.asig)}</td>
                    </tr>
                    <tr>
                        <td class="px-2 font-medium" colspan="2">Lector:</td>
                        <td class="px-2 col-asig">${crearSelectHTML(`asig_p${pIndex}_A_ayudante`, 'lectorL', item.asigAyudante)}</td>
                    </tr>
                `;
            } else {
                filasHTML += `
                    <tr class="group">
                        <td class="col-tiempo relative">
                            <input type="text" value="${item.t}" onchange="actualizarCampoParte(${pIndex}, 't', this.value)" class="input-live text-center font-bold">
                            <button onclick="eliminarFilaParte(${pIndex})" class="no-print absolute top-0.5 left-0.5 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 text-[10px]" title="Eliminar fila"><i class="fa-solid fa-circle-minus"></i></button>
                        </td>
                        <td class="px-2 col-titulo font-medium">
                            <input type="text" value="${item.tit}" onchange="actualizarCampoParte(${pIndex}, 'tit', this.value)" class="input-live font-medium">
                        </td>
                        <td class="px-2 col-desc text-slate-700">
                            <input type="text" value="${item.desc}" onchange="actualizarCampoParte(${pIndex}, 'desc', this.value)" class="input-live text-slate-700">
                        </td>
                        <td class="px-2 col-asig">${crearSelectHTML(`asig_p${pIndex}_A_titular`, 'nvc', item.asig)}</td>
                    </tr>
                `;
            }
        }
    });

    filasHTML += `
        <tr class="no-print bg-slate-50">
            <td colspan="4" class="p-1 text-center">
                <button onclick="agregarFilaVida()" class="text-xs font-bold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded border border-red-200 transition">
                    <i class="fa-solid fa-plus-circle mr-1"></i> Agregar parte a Nuestra Vida Cristiana
                </button>
            </td>
        </tr>
    `;

    // CONCLUSIÓN
    filasHTML += `
        <tr>
            <td class="col-tiempo" rowspan="2">3 mins.</td>
            <td class="px-2 font-medium" colspan="2">Repaso de esta reunión y adelanto de la próxima.</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_repaso', 'pres', sem.repaso)}</td>
        </tr>
        <tr>
            <td class="px-2 font-medium" colspan="2">
                Canción <input type="text" value="${sem.canciones?.[2] || ''}" onchange="actualizarCancionSemana(2, this.value)" class="input-live w-12 font-bold text-center"> y oración
            </td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_orac_fin', 'orac', sem.oracionFin)}</td>
        </tr>

        <!-- REUNIÓN PÚBLICA -->
        <tr class="border-t-2 border-slate-900 bg-slate-50/50">
            <td class="px-2 font-bold py-1.5" colspan="2">
                Domingo, presidencia: 
                <div class="inline-block ml-2 w-48">${crearSelectHTML('asig_dom_presi', 'presPub', sem.domPresi)}</div>
            </td>
            <td class="px-2 font-bold py-1.5 text-right" colspan="2">
                Lector: 
                <div class="inline-block ml-2 text-left w-48">${crearSelectHTML('asig_dom_lector', 'lectorW', sem.domLector)}</div>
            </td>
        </tr>
    `;

    cuerpo.innerHTML = filasHTML;
}

// FUNCIONES DE EDICIÓN EN VIVO
async function actualizarEncabezadoSemana(campo, valor) {
    if (programaMes[semanaActivaIdx]) {
        programaMes[semanaActivaIdx][campo] = valor;
        await guardarPlanillaEnSupabase();
    }
}

async function actualizarCancionSemana(index, valor) {
    if (programaMes[semanaActivaIdx]) {
        if (!programaMes[semanaActivaIdx].canciones) programaMes[semanaActivaIdx].canciones = ["161", "121", "28"];
        programaMes[semanaActivaIdx].canciones[index] = valor;
        await guardarPlanillaEnSupabase();
    }
}

async function actualizarCampoParte(pIndex, campo, valor) {
    const sem = programaMes[semanaActivaIdx];
    if (sem && sem.partes && sem.partes[pIndex]) {
        sem.partes[pIndex][campo] = valor;
        await guardarPlanillaEnSupabase();
    }
}

async function toggleParticipantesParte(pIndex) {
    const sem = programaMes[semanaActivaIdx];
    if (sem && sem.partes && sem.partes[pIndex]) {
        sem.partes[pIndex].participantes = (sem.partes[pIndex].participantes === 2) ? 1 : 2;
        cargarSemanaEnPlanilla(semanaActivaIdx);
        await guardarPlanillaEnSupabase();
    }
}

async function agregarNuevaSemana() {
    const numSem = programaMes.length + 1;
    const nuevaSem = crearEstructuraSemanaVacia(`NUEVA SEMANA ${numSem}`, "LIBRO");
    programaMes.push(nuevaSem);
    semanaActivaIdx = programaMes.length - 1;
    renderizarSelectorSemanas();
    cargarSemanaEnPlanilla(semanaActivaIdx);
    await guardarPlanillaEnSupabase();
}

async function agregarFilaVida() {
    const sem = programaMes[semanaActivaIdx];
    if (!sem) return;
    
    const idxEBC = sem.partes.findIndex(p => p.tit.includes('Estudio bíblico'));
    const nuevaParte = {
        seccion: 'vida',
        t: '15 mins.',
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
    await guardarPlanillaEnSupabase();
}

async function eliminarFilaParte(pIndex) {
    const sem = programaMes[semanaActivaIdx];
    if (sem && sem.partes && sem.partes[pIndex]) {
        sem.partes.splice(pIndex, 1);
        cargarSemanaEnPlanilla(semanaActivaIdx);
        await guardarPlanillaEnSupabase();
    }
}

async function cambiarNumSalasSemana(cantidad) {
    if (!programaMes[semanaActivaIdx]) return;
    programaMes[semanaActivaIdx].numSalas = parseInt(cantidad);
    cargarSemanaEnPlanilla(semanaActivaIdx);
    await guardarPlanillaEnSupabase();
}

async function guardarAsignacionSemana(elemId) {
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

    await guardarPlanillaEnSupabase();
}

async function actualizarTipoSemana(tipo) {
    if (!programaMes[semanaActivaIdx]) return;
    programaMes[semanaActivaIdx].tipoSemana = tipo;
    if (tipo === 'viajante') programaMes[semanaActivaIdx].numSalas = 1;
    cargarSemanaEnPlanilla(semanaActivaIdx);
    await guardarPlanillaEnSupabase();
}

function renderizarMatrizHermanos() {
    const cuerpo = document.getElementById('cuerpoTablaHermanos');
    if (!cuerpo) return;
    cuerpo.innerHTML = '';

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

async function actualizarHermano(id, campo, valor) {
    await actualizarHermanoBD(id, campo, valor);
    if (programaMes.length > 0) cargarSemanaEnPlanilla(semanaActivaIdx);
}

async function agregarNuevoHermano() {
    await agregarNuevoHermanoBD();
    renderizarMatrizHermanos();
}

async function eliminarHermano(id) {
    await eliminarHermanoBD(id);
    renderizarMatrizHermanos();
    if (programaMes.length > 0) cargarSemanaEnPlanilla(semanaActivaIdx);
}
