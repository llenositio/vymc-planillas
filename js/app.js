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

    if (programaMes && programaMes.length > 0) {
        renderizarSelectorSemanas();
        cargarSemanaEnPlanilla(0);
    } else {
        mostrarEstadoTablaVacia();
    }
};

function mostrarEstadoTablaVacia() {
    const cabecera = document.getElementById('cabeceraTablaPlanilla');
    const cuerpo = document.getElementById('cuerpoTablaPlanilla');
    if (cabecera) cabecera.innerHTML = '';
    if (cuerpo) {
        cuerpo.innerHTML = `
            <tr>
                <td colspan="4" class="py-12 text-center text-slate-400">
                    <i class="fa-solid fa-calendar-plus text-4xl mb-3 text-slate-300"></i>
                    <p class="font-bold text-sm">No hay un programa cargado para este mes.</p>
                    <p class="text-xs text-slate-400 mt-1">Ve a la pestaña <b>"Cargar Programa"</b> para pegar el texto de la Guía de Actividades.</p>
                </td>
            </tr>
        `;
    }
}

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
                <span class="text-base font-black text-slate-900 tracking-tight">
                    Semana del ${sem.semana}, ${sem.lectura}
                </span>
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

    const p = sem.partes || {};
    const cuerpo = document.getElementById('cuerpoTablaPlanilla');
    
    const renderSalasCelda = (parteKey, cat) => {
        const item = p[parteKey] || {};
        if (numSalas === 1) {
            return `<td class="px-2 col-asig">${crearSelectHTML(`asig_${parteKey}_A`, cat, item.asig)}</td>`;
        }
        
        let html = `<td class="px-1 py-1 col-asig">
            <div class="grid grid-cols-${numSalas} gap-1 text-[10px]">
                <div class="border-r border-slate-300 pr-1">
                    <span class="block text-[8px] text-slate-400 font-bold uppercase">Prin.</span>
                    ${crearSelectHTML(`asig_${parteKey}_A`, cat, item.asig, "Principal")}
                </div>
                <div class="${numSalas === 3 ? 'border-r border-slate-300 pr-1' : ''}">
                    <span class="block text-[8px] text-slate-400 font-bold uppercase">Sala B</span>
                    ${crearSelectHTML(`asig_${parteKey}_B`, cat, item.asigB, "Sala B")}
                </div>`;
        if (numSalas === 3) {
            html += `<div>
                    <span class="block text-[8px] text-slate-400 font-bold uppercase">Sala C</span>
                    ${crearSelectHTML(`asig_${parteKey}_C`, cat, item.asigC, "Sala C")}
                </div>`;
        }
        html += `</div></td>`;
        return html;
    };

    // MAQUETADO LÍNEA POR LÍNEA CALCADO A TU MODELO EXCEL
    let filasHTML = `
        <tr class="h-6">
            <td class="col-tiempo">1 min</td>
            <td class="px-2 font-medium" colspan="2">Canción N° ${sem.canciones?.[0] || '33'}. Presidencia: Palabras de introducción.</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_presi', 'pres', sem.presidencia)}</td>
        </tr>
        <tr class="h-6">
            <td class="col-tiempo"></td>
            <td class="px-2 font-medium" colspan="2">Oración</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_orac_ini', 'orac', sem.oracionIni)}</td>
        </tr>

        <!-- TESOROS DE LA BIBLIA -->
        <tr>
            <th class="bg-tesoros text-white text-center"><i class="fa-solid fa-gem text-xs"></i></th>
            <th colspan="3" class="bg-tesoros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Tesoros de la Biblia</th>
        </tr>
        <tr>
            <td class="col-tiempo">${p.p1?.t || '10 min'}</td>
            <td class="px-2 col-titulo font-medium">${p.p1?.tit || '1. Tengamos un punto de vista equilibrado de la protección de Jehová'}</td>
            <td class="px-2 col-desc font-semibold text-slate-700">${p.p1?.desc || 'Discurso'}</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_p1', 'disc', p.p1?.asig)}</td>
        </tr>
        <tr>
            <td class="col-tiempo">${p.p2?.t || '10 min'}</td>
            <td class="px-2 col-titulo font-medium">${p.p2?.tit || '2. Busquemos perlas escondidas.'}</td>
            <td class="px-2 col-desc font-semibold text-slate-700">${p.p2?.desc || 'Preguntas y respuestas ' + (sem.lectura || '')}</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_p2', 'perlas', p.p2?.asig)}</td>
        </tr>
        <tr>
            <td class="col-tiempo">${p.p3?.t || '4 min o menos'}</td>
            <td class="px-2 font-medium" colspan="2">${p.p3?.tit || '3. Lectura de la Biblia:'} ${p.p3?.desc || 'Jer 40:1-10 (th lección 2).'}</td>
            ${renderSalasCelda('p3', 'lec')}
        </tr>

        <!-- SEAMOS MEJORES MAESTROS -->
        <tr>
            <th class="bg-maestros text-white text-center"><i class="fa-solid fa-wheat-awn text-xs"></i></th>
            <th colspan="3" class="bg-maestros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Seamos mejores maestros</th>
        </tr>
        <tr>
            <td class="col-tiempo">${p.p4?.t || '2 mins.'}</td>
            <td class="px-2 col-titulo font-medium">${p.p4?.tit || '4. Empiece conversaciones'}</td>
            <td class="px-2 col-desc text-slate-700">${p.p4?.desc || 'DE CASA EN CASA. (lmd lección 2 punto 3).'}</td>
            ${renderSalasCelda('p4', 'smm')}
        </tr>
        <tr>
            <td class="col-tiempo">${p.p5?.t || '2 mins.'}</td>
            <td class="px-2 col-titulo font-medium">${p.p5?.tit || '5. Empiece conversaciones'}</td>
            <td class="px-2 col-desc text-slate-700">${p.p5?.desc || 'PREDICACIÓN INFORMAL. (lmd lección 2 punto 5).'}</td>
            ${renderSalasCelda('p5', 'smm')}
        </tr>
        <tr>
            <td class="col-tiempo">${p.p6?.t || '4 mins.'}</td>
            <td class="px-2 col-titulo font-medium">${p.p6?.tit || '6. Empiece conversaciones'}</td>
            <td class="px-2 col-desc text-slate-700">${p.p6?.desc || 'PREDICACIÓN PÚBLICA. Una persona se queda mirando el carrito de publicaciones (lmd lección 5 punto 3).'}</td>
            ${renderSalasCelda('p6', 'smm')}
        </tr>
        <tr>
            <td class="col-tiempo">${p.p7?.t || '3 mins.'}</td>
            <td class="px-2 col-titulo font-medium">${p.p7?.tit || '7. Explique sus creencias'}</td>
            <td class="px-2 col-desc text-slate-700">${p.p7?.desc || 'Escenificación. ijwbq artículo 103. Tema: ¿Quién es Jehová? (th lección 17).'}</td>
            ${renderSalasCelda('p7', 'smm')}
        </tr>

        <!-- NUESTRA VIDA CRISTIANA -->
        <tr>
            <th class="bg-vida text-white text-center"><i class="fa-solid fa-sheep text-xs"></i></th>
            <th colspan="3" class="bg-vida text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Nuestra vida cristiana</th>
        </tr>
        <tr>
            <td class="px-2 font-bold" colspan="4">Canción N°: ${sem.canciones?.[1] || '17'}</td>
        </tr>
        <tr>
            <td class="col-tiempo">${p.p8?.t || '15 mins.'}</td>
            <td class="px-2 col-titulo font-medium">${p.p8?.tit || '8. Jehová protege a las viudas'}</td>
            <td class="px-2 col-desc text-slate-700">${p.p8?.desc || 'Análisis con el auditorio. Ponga el VIDEO A pesar de perder a mi esposo, vuelvo a ser feliz.'}</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_p8', 'nvc', p.p8?.asig)}</td>
        </tr>
        <tr>
            <td class="col-tiempo">${p.p9?.t || '30 min'}</td>
            <td class="px-2 font-medium" colspan="2">${p.p9?.tit || 'Estudio bíblico de la congregación: wcg cap. 11.'}</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_p9', 'eb', p.p9?.asig)}</td>
        </tr>
        ${sem.tipoSemana !== 'viajante' ? `
        <tr>
            <td class="col-tiempo"></td>
            <td class="px-2 font-medium" colspan="2">Lector:</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_lector_eb', 'lectorL', p.p9?.lector)}</td>
        </tr>` : ''}
        <tr class="h-6">
            <td class="col-tiempo">3 min</td>
            <td class="px-2 font-medium" colspan="2">Repaso de esta reunión y adelanto de la próxima.</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_repaso', 'pres', sem.repaso)}</td>
        </tr>
        <tr class="h-6">
            <td class="col-tiempo"></td>
            <td class="px-2 font-medium" colspan="2">Canción ${sem.canciones?.[2] || '38'} y oración</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_orac_fin', 'orac', sem.oracionFin)}</td>
        </tr>

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
    else if (elemId === 'asig_p1') sem.partes.p1.asig = val;
    else if (elemId === 'asig_p2') sem.partes.p2.asig = val;
    else if (elemId.startsWith('asig_p3_')) {
        if (elemId.endsWith('_A')) sem.partes.p3.asig = val;
        if (elemId.endsWith('_B')) sem.partes.p3.asigB = val;
        if (elemId.endsWith('_C')) sem.partes.p3.asigC = val;
    }
    else if (elemId.startsWith('asig_p4_')) {
        if (elemId.endsWith('_A')) sem.partes.p4.asig = val;
        if (elemId.endsWith('_B')) sem.partes.p4.asigB = val;
        if (elemId.endsWith('_C')) sem.partes.p4.asigC = val;
    }
    else if (elemId.startsWith('asig_p5_')) {
        if (elemId.endsWith('_A')) sem.partes.p5.asig = val;
        if (elemId.endsWith('_B')) sem.partes.p5.asigB = val;
        if (elemId.endsWith('_C')) sem.partes.p5.asigC = val;
    }
    else if (elemId.startsWith('asig_p6_')) {
        if (elemId.endsWith('_A')) sem.partes.p6.asig = val;
        if (elemId.endsWith('_B')) sem.partes.p6.asigB = val;
        if (elemId.endsWith('_C')) sem.partes.p6.asigC = val;
    }
    else if (elemId.startsWith('asig_p7_')) {
        if (elemId.endsWith('_A')) sem.partes.p7.asig = val;
        if (elemId.endsWith('_B')) sem.partes.p7.asigB = val;
        if (elemId.endsWith('_C')) sem.partes.p7.asigC = val;
    }
    else if (elemId === 'asig_p8') sem.partes.p8.asig = val;
    else if (elemId === 'asig_p9') sem.partes.p9.asig = val;
    else if (elemId === 'asig_lector_eb') sem.partes.p9.lector = val;
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

function cargarEjemploDemoMes() {
    const txt = document.getElementById('textoMesCompleto');
    if (txt) {
        txt.value = 
`5-11 DE OCTUBRE
JEREMÍAS 40, 41
Canción 33
1. Tengamos un punto de vista equilibrado de la protección de Jehová (10 min) Discurso
2. Busquemos perlas escondidas (10 min) Preguntas y respuestas
3. Lectura de la Biblia (4 mins.) Jer 40:1-10 (th lección 2).
Canción 17
4. Empiece conversaciones (2 mins.) DE CASA EN CASA. (lmd lección 2 punto 3).
5. Empiece conversaciones (2 mins.) PREDICACIÓN INFORMAL. (lmd lección 2 punto 5).
6. Empiece conversaciones (4 mins.) PREDICACIÓN PÚBLICA. Carrito (lmd lección 5 punto 3).
7. Explique sus creencias (3 mins.) Escenificación (th lección 17).
8. Jehová protege a las viudas (15 min) Análisis con el auditorio.
9. Estudio bíblico de la congregación (30 min) wcg cap. 11
Canción 38 y oración`;
        alert("Texto de demostración cargado en el cuadro.");
    }
}

async function procesarTextoMes() {
    const rawText = document.getElementById('textoMesCompleto').value;
    const semanas = procesarTextoGuiaActividades(rawText);

    if (semanas && semanas.length > 0) {
        programaMes = semanas;
        semanaActivaIdx = 0;
        await guardarPlanillaEnSupabase();
        renderizarSelectorSemanas();
        cargarSemanaEnPlanilla(0);
        cambiarPestaña('planilla');
        alert(`¡Éxito! Se procesaron y generaron ${semanas.length} semanas de reunión.`);
    } else {
        alert("No se pudo detectar el formato de las semanas. Asegúrate de incluir encabezados como '5-11 DE OCTUBRE'.");
    }
}
