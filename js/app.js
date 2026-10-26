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
                <td colspan="6" class="py-12 text-center text-slate-400">
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
    document.getElementById(`sec-${tab}`).classList.remove('hidden');

    document.querySelectorAll('nav button').forEach(btn => {
        btn.className = "px-3 py-1.5 rounded-lg text-slate-300 hover:text-white transition";
    });
    document.getElementById(`tab-${tab}`).className = "px-3 py-1.5 rounded-lg text-white bg-amber-600 font-bold transition";

    if (tab === 'envio') generarListaPartesEnvio();
}

function renderizarSelectorSemanas() {
    const cont = document.getElementById('selectorSemanas');
    if (!cont) return;
    cont.innerHTML = '';
    programaMes.forEach((s, idx) => {
        const btn = document.createElement('button');
        btn.onclick = () => cargarSemanaEnPlanilla(idx);
        btn.className = `px-2.5 py-1 text-xs font-bold rounded-md border transition ${idx === semanaActivaIdx ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`;
        btn.innerText = `Sem ${idx + 1}: ${s.semana.split(' DE ')[0]}`;
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

function crearSelectHTML(id, cat, valorActual = "", labelSala = "") {
    const aptos = obtenerOpcionesHermanos(cat);
    let options = `<option value="">-- ${labelSala ? labelSala : 'Seleccionar'} --</option>`;
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

    // Control de Salas y Viajante
    const numSalas = sem.tipoSemana === 'viajante' ? 1 : (sem.numSalas || 1);
    
    // Actualizar selector visual de salas
    const selSalas = document.getElementById('selectNumSalas');
    if (selSalas) {
        selSalas.value = numSalas;
        selSalas.disabled = (sem.tipoSemana === 'viajante');
    }

    const cabecera = document.getElementById('cabeceraTablaPlanilla');
    cabecera.innerHTML = `
        <tr>
            <th colspan="${2 + numSalas + 1}" class="py-2.5 px-3 bg-white text-center border-b-2 border-slate-900">
                <span class="text-lg sm:text-2xl font-black text-slate-900">
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
    
    // Función auxiliar para renderizar columnas de salas en SMM y Lectura
    const renderSalasCols = (parteKey, cat) => {
        const item = p[parteKey] || {};
        let html = `<td class="px-2">${crearSelectHTML(`asig_${parteKey}_A`, cat, item.asig, numSalas > 1 ? "Sala Principal" : "")}</td>`;
        if (numSalas >= 2) {
            html += `<td class="px-2">${crearSelectHTML(`asig_${parteKey}_B`, cat, item.asigB, "Sala B")}</td>`;
        }
        if (numSalas === 3) {
            html += `<td class="px-2">${crearSelectHTML(`asig_${parteKey}_C`, cat, item.asigC, "Sala C")}</td>`;
        }
        return html;
    };

    cuerpo.innerHTML = `
        <tr class="h-6">
            <td class="w-12 text-center font-bold">1 min</td>
            <td class="px-2 font-medium" colspan="${numSalas + 1}">Canción N° ${sem.canciones?.[0] || ''}. Presidencia: Palabras de introducción.</td>
            <td class="w-64 px-2">${crearSelectHTML('asig_presi', 'pres', sem.presidencia)}</td>
        </tr>
        <tr class="h-6">
            <td></td>
            <td class="px-2 font-medium" colspan="${numSalas + 1}">Oración</td>
            <td class="px-2">${crearSelectHTML('asig_orac_ini', 'orac', sem.oracionIni)}</td>
        </tr>

        <tr>
            <th colspan="${2 + numSalas + 1}" class="bg-tesoros text-white py-1.5 text-center text-xs font-extrabold uppercase tracking-wide">Tesoros de la Biblia</th>
        </tr>
        <tr>
            <td class="text-center font-bold w-12">${p.p1?.t || '10 min'}</td>
            <td class="px-2 font-medium w-64">${p.p1?.tit || '1. Discurso'}</td>
            <td class="px-2 font-semibold w-56" colspan="${numSalas}">${p.p1?.desc || 'Discurso'}</td>
            <td class="px-2">${crearSelectHTML('asig_p1', 'disc', p.p1?.asig)}</td>
        </tr>
        <tr>
            <td class="text-center font-bold">${p.p2?.t || '10 min'}</td>
            <td class="px-2 font-medium">${p.p2?.tit || '2. Busquemos perlas escondidas'}</td>
            <td class="px-2 font-semibold" colspan="${numSalas}">${p.p2?.desc || 'Preguntas y respuestas'}</td>
            <td class="px-2">${crearSelectHTML('asig_p2', 'perlas', p.p2?.asig)}</td>
        </tr>
        <tr>
            <td class="text-center font-bold">${p.p3?.t || '4 min o menos'}</td>
            <td class="px-2 font-medium" colspan="2">${p.p3?.tit || '3. Lectura de la Biblia'}</td>
            ${renderSalasCols('p3', 'lec')}
        </tr>

        <tr>
            <th colspan="${2 + numSalas + 1}" class="bg-maestros text-white py-1.5 text-center text-xs font-extrabold uppercase tracking-wide">Seamos mejores maestros</th>
        </tr>
        ${['p4', 'p5', 'p6', 'p7'].map(pk => p[pk]?.tit ? `
        <tr>
            <td class="text-center font-bold">${p[pk].t}</td>
            <td class="px-2 font-medium">${p[pk].tit}</td>
            <td class="px-2">${p[pk].desc}</td>
            ${renderSalasCols(pk, 'smm')}
        </tr>` : '').join('')}

        <tr>
            <th colspan="${2 + numSalas + 1}" class="bg-vida text-white py-1.5 text-center text-xs font-extrabold uppercase tracking-wide">Nuestra vida cristiana</th>
        </tr>
        <tr>
            <td class="px-2 font-bold" colspan="${2 + numSalas + 1}">Canción N°: ${sem.canciones?.[1] || ''}</td>
        </tr>
        ${p.p8?.tit ? `
        <tr>
            <td class="text-center font-bold">${p.p8.t}</td>
            <td class="px-2 font-medium">${p.p8.tit}</td>
            <td class="px-2" colspan="${numSalas}">${p.p8.desc}</td>
            <td class="px-2">${crearSelectHTML('asig_p8', 'nvc', p.p8.asig)}</td>
        </tr>` : ''}
        <tr>
            <td class="text-center font-bold">${p.p9?.t || '30 min'}</td>
            <td class="px-2 font-medium" colspan="${numSalas + 1}">${p.p9?.tit || 'Estudio bíblico de la congregación'}</td>
            <td class="px-2">${crearSelectHTML('asig_p9', 'eb', p.p9?.asig)}</td>
        </tr>
        ${sem.tipoSemana !== 'viajante' ? `
        <tr>
            <td></td>
            <td class="px-2 font-medium" colspan="${numSalas + 1}">Lector del Estudio Bíblico:</td>
            <td class="px-2">${crearSelectHTML('asig_lector_eb', 'lectorL', p.p9?.lector)}</td>
        </tr>` : ''}
        <tr class="h-6">
            <td class="text-center font-bold">3 min</td>
            <td class="px-2 font-medium" colspan="${numSalas + 1}">Repaso de esta reunión y adelanto de la próxima.</td>
            <td class="px-2">${crearSelectHTML('asig_repaso', 'pres', sem.repaso)}</td>
        </tr>
        <tr class="h-6">
            <td></td>
            <td class="px-2 font-medium" colspan="${numSalas + 1}">Canción ${sem.canciones?.[2] || ''} y oración</td>
            <td class="px-2">${crearSelectHTML('asig_orac_fin', 'orac', sem.oracionFin)}</td>
        </tr>

        <tr class="border-t-2 border-slate-900 bg-slate-50/50">
            <td class="px-2 font-bold py-1.5" colspan="${Math.ceil((2 + numSalas + 1) / 2)}">
                Domingo, presidencia: 
                <div class="w-48 inline-block ml-2">${crearSelectHTML('asig_dom_presi', 'presPub', sem.domPresi)}</div>
            </td>
            <td class="px-2 font-bold py-1.5 text-right" colspan="${Math.floor((2 + numSalas + 1) / 2)}">
                Lector La Atalaya: 
                <div class="w-48 inline-block ml-2 text-left">${crearSelectHTML('asig_dom_lector', 'lectorW', sem.domLector)}</div>
            </td>
        </tr>
    `;
}

async function cambiarNumSalasSemana(cantidad) {
    programaMes[semanaActivaIdx].numSalas = parseInt(cantidad);
    cargarSemanaEnPlanilla(semanaActivaIdx);
    await guardarPlanillaEnSupabase();
}

async function guardarAsignacionSemana(elemId) {
    const val = document.getElementById(elemId).value;
    const sem = programaMes[semanaActivaIdx];

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
    document.getElementById('textoMesCompleto').value = 
`5-11 DE OCTUBRE
JEREMÍAS 40, 41
Canciones: 33, 17, 38
1. Tengamos un punto de vista equilibrado de la protección de Jehová (10 min)
2. Busquemos perlas escondidas (10 min)
3. Lectura de la Biblia
(4 mins.) Jer 40:1-10 (th lección 2).
4. Empiece conversaciones
(2 mins.) DE CASA EN CASA. (lmd lección 2 punto 3).
5. Empiece conversaciones
(2 mins.) PREDICACIÓN INFORMAL. (lmd lección 2 punto 5).
6. Empiece conversaciones
(4 mins.) PREDICACIÓN PÚBLICA. Carrito (lmd lección 5 punto 3).
7. Explique sus creencias
(3 mins.) Escenificación. ¿Quién es Jehová? (th lección 17).
8. Jehová protege a las viudas (15 min)
9. Estudio bíblico de la congregación: wcg cap. 11 (30 min)`;

    alert("Texto de demostración cargado en el cuadro.");
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
