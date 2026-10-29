window.onload = async function() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('vista') === 'publica') return; 

    if (typeof cargarOpcionesAniosHistorial === 'function') cargarOpcionesAniosHistorial();

    try {
        if (typeof db !== 'undefined' && db) {
            if (typeof cargarHermanosDesdeSupabase === 'function') await cargarHermanosDesdeSupabase();
            if (typeof cargarPlanillaDesdeSupabase === 'function') await cargarPlanillaDesdeSupabase();
        }
    } catch (err) {
        console.error("Error inicializando:", err);
    }

    renderizarMatrizHermanos();

    if (!window.programaMes || window.programaMes.length === 0) {
        inicializarMesDefault(4);
    }

    const inputMes = document.getElementById('inputNombreMes');
    if (inputMes && window.nombreMesGlobal) {
        inputMes.value = window.nombreMesGlobal;
        actualizarTextoTituloMes(window.nombreMesGlobal);
    }
    
    renderizarSelectorSemanas();
    cargarSemanaEnPlanilla(0);
};

window.notificarYGuardarAutosave = async function() {
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
};

window.renderizarSelectorSemanas = function() {
    const cont = document.getElementById('selectorSemanas');
    if (!cont) return;
    cont.innerHTML = '';
    window.programaMes.forEach((s, idx) => {
        const btn = document.createElement('button');
        btn.onclick = () => cargarSemanaEnPlanilla(idx);
        btn.className = `px-2.5 py-1 text-xs font-bold rounded-md border transition ${idx === window.semanaActivaIdx ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`;
        btn.innerText = `Sem ${idx + 1}: ${s.semana ? s.semana.split(' DE ')[0] : 'S/N'}`;
        cont.appendChild(btn);
    });
};

window.cargarSemanaEnPlanilla = function(idx) {
    if (!window.programaMes || window.programaMes.length === 0) return;
    window.semanaActivaIdx = idx;
    renderizarSelectorSemanas();
    const sem = window.programaMes[idx];
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
                <th colspan="11" class="py-2 px-3 bg-white text-center border-b-2 border-slate-900">
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
            <td class="c-tiempo editable-field text-slate-900 font-bold" contenteditable="true" onpaste="limpiarTextoPegado(event)">1 min</td>
            <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">
                Canción N° ${sem.canciones?.[0] || ''}. Presidencia: Palabras de introducción.
            </td>
            <td class="px-2 col-asig" colspan="7">
                <div class="flex items-center justify-between w-full gap-1">
                    ${crearSelectHTML('asig_presi', 'pres', sem.presidencia)}
                    ${crearBotonWhatsAppHTML(sem.presidencia, '', 'Presidencia: Palabras de introducción', 'Sala Principal')}
                </div>
            </td>
            <td class="no-print text-center w-8"></td>
        </tr>
        <tr class="h-6">
            <td class="c-tiempo editable-field text-slate-900 font-bold" contenteditable="true" onpaste="limpiarTextoPegado(event)"></td>
            <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">Oración</td>
            <td class="px-2 col-asig" colspan="7">
                <div class="flex items-center justify-between w-full gap-1">
                    ${crearSelectHTML('asig_orac_ini', 'orac', sem.oracionIni)}
                    ${crearBotonWhatsAppHTML(sem.oracionIni, '', 'Oración Inicial', 'Sala Principal')}
                </div>
            </td>
            <td class="no-print text-center w-8"></td>
        </tr>
    `;

    let renderizoTesorosHeader = false, renderizoMaestrosHeader = false, renderizoVidaHeader = false;

    partes.forEach((item, pIndex) => {
        if (item.seccion === 'tesoros' && !renderizoTesorosHeader) {
            filasHTML += `
                <tr>
                    <th class="bg-tesoros text-white text-center c-tiempo"><i class="fa-solid fa-gem text-xs"></i></th>
                    <th colspan="10" class="bg-tesoros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Tesoros de la Biblia</th>
                </tr>
            `;
            renderizoTesorosHeader = true;
        } else if (item.seccion === 'maestros' && !renderizoMaestrosHeader) {
            filasHTML += `
                <tr>
                    <th class="bg-maestros text-white text-center c-tiempo"><i class="fa-solid fa-wheat-awn text-xs"></i></th>
                    <th colspan="10" class="bg-maestros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Seamos mejores maestros</th>
                </tr>
            `;
            renderizoMaestrosHeader = true;
        } else if (item.seccion === 'vida' && !renderizoVidaHeader) {
            filasHTML += `
                <tr class="no-print bg-amber-50/50">
                    <td colspan="11" class="p-1 text-center">
                        <button onclick="agregarFilaMaestros()" class="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-3 py-1 rounded border border-amber-300 transition">
                            <i class="fa-solid fa-plus-circle mr-1"></i> Agregar parte a Seamos Mejores Maestros
                        </button>
                    </td>
                </tr>
                <tr>
                    <th class="bg-vida text-white text-center c-tiempo py-1">
                        <img src="Oveja.png" class="w-4 h-4 mx-auto object-contain" alt="Oveja">
                    </th>
                    <th colspan="10" class="bg-vida text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Nuestra vida cristiana</th>
                </tr>
                <tr>
                    <td class="px-2 font-bold editable-field" colspan="11" contenteditable="true" onpaste="limpiarTextoPegado(event)">
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
                        <td class="c-tiempo editable-field text-slate-900 font-bold" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 't', this.innerText)">${item.t}</td>
                        <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 'tit', this.innerText)">${item.tit}</td>
                        ${renderSalasLectura(pIndex, cat)}
                        <td class="no-print text-center w-8"></td>
                    </tr>
                `;
            } else {
                filasHTML += `
                    <tr>
                        <td class="c-tiempo editable-field text-slate-900 font-bold" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 't', this.innerText)">${item.t}</td>
                        <td class="px-2 col-titulo font-medium editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 'tit', this.innerText)">${item.tit}</td>
                        <td class="px-2 col-desc editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 'desc', this.innerText)">${item.desc}</td>
                        <td class="px-2 col-asig" colspan="7">
                            <div class="flex items-center justify-between w-full gap-1">
                                ${crearSelectHTML(`asig_p${pIndex}_A_titular`, cat, item.asig)}
                                ${crearBotonWhatsAppHTML(item.asig, '', item.tit, 'Sala Principal')}
                            </div>
                        </td>
                        <td class="no-print text-center w-8"></td>
                    </tr>
                `;
            }
        } 
        else if (item.seccion === 'maestros') {
            filasHTML += `
                <tr class="group">
                    <td class="c-tiempo editable-field text-slate-900 font-bold" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 't', this.innerText)">${item.t}</td>
                    <td class="px-2 col-titulo font-medium editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 'tit', this.innerText)">${item.tit}</td>
                    <td class="px-2 col-desc editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 'desc', this.innerText)">${item.desc}</td>
                    ${renderSalasMaestros(pIndex, cat)}
                    <td class="no-print text-center w-8 align-middle">
                        <button onclick="eliminarFilaParte(${pIndex})" class="text-red-500 hover:text-red-700 text-sm" title="Eliminar fila"><i class="fa-solid fa-circle-minus"></i></button>
                    </td>
                </tr>
            `;
        } 
        else if (item.seccion === 'vida') {
            if (!item.tit.includes('Estudio bíblico')) {
                filasHTML += `
                    <tr class="group">
                        <td class="c-tiempo editable-field text-slate-900 font-bold" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 't', this.innerText)">${item.t}</td>
                        <td class="px-2 col-titulo font-medium editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 'tit', this.innerText)">${item.tit}</td>
                        <td class="px-2 col-desc editable-field" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarTextoEditable(${pIndex}, 'desc', this.innerText)">${item.desc}</td>
                        <td class="px-2 col-asig" colspan="7">
                            <div class="flex items-center justify-between w-full gap-1">
                                ${crearSelectHTML(`asig_p${pIndex}_A_titular`, 'nvc', item.asig)}
                                ${crearBotonWhatsAppHTML(item.asig, '', item.tit, 'Sala Principal')}
                            </div>
                        </td>
                        <td class="no-print text-center w-8 align-middle">
                            <button onclick="eliminarFilaParte(${pIndex})" class="text-red-500 hover:text-red-700 text-sm" title="Eliminar fila"><i class="fa-solid fa-circle-minus"></i></button>
                        </td>
                    </tr>
                `;
            }
        }
    });

    filasHTML += `
        <tr class="no-print bg-slate-50">
            <td colspan="11" class="p-1 text-center">
                <button onclick="agregarFilaVida()" class="text-xs font-bold text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded border border-red-200 transition">
                    <i class="fa-solid fa-plus-circle mr-1"></i> Agregar parte a Nuestra Vida Cristiana
                </button>
            </td>
        </tr>
    `;

    if (esViajante) {
        filasHTML += `
            <tr>
                <td class="c-tiempo editable-field text-slate-900 font-bold" contenteditable="true" onpaste="limpiarTextoPegado(event)">3 min</td>
                <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">
                    Repaso de esta reunión y adelanto de la próxima.
                </td>
                <td class="px-2 col-asig" colspan="7">
                    <div class="flex items-center justify-between w-full gap-1">
                        ${crearSelectHTML('asig_repaso', 'pres', sem.repaso)}
                        ${crearBotonWhatsAppHTML(sem.repaso, '', 'Repaso y adelanto', 'Sala Principal')}
                    </div>
                </td>
                <td class="no-print text-center w-8"></td>
            </tr>
            <tr>
                <td class="c-tiempo font-bold text-blue-900 bg-blue-50/50">30 min</td>
                <td class="px-2 font-black text-blue-900 bg-blue-50/50 editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarEncabezadoSemana('temaViajanteEntreSemana', this.innerText)">
                    ${sem.temaViajanteEntreSemana || 'Discurso del superintendente de circuito'}
                </td>
                <td class="px-2 col-asig bg-blue-50/50" colspan="7">
                    <div class="flex items-center justify-between w-full gap-1">
                        ${crearSelectHTML('asig_viajante_entre_semana', '', sem.asigViajanteEntreSemana, "SUPERINTENDENTE DE CIRCUITO")}
                        ${crearBotonWhatsAppHTML(sem.asigViajanteEntreSemana, '', 'Discurso del superintendente de circuito', 'Sala Principal')}
                    </div>
                </td>
                <td class="no-print text-center w-8"></td>
            </tr>
            <tr>
                <td class="c-tiempo editable-field text-slate-900 font-bold" contenteditable="true" onpaste="limpiarTextoPegado(event)"></td>
                <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">
                    Canción y oración: 38
                </td>
                <td class="px-2 col-asig" colspan="7">
                    <div class="flex items-center justify-between w-full gap-1">
                        ${crearSelectHTML('asig_orac_fin', 'orac', sem.oracionFin)}
                        ${crearBotonWhatsAppHTML(sem.oracionFin, '', 'Oración Final', 'Sala Principal')}
                    </div>
                </td>
                <td class="no-print text-center w-8"></td>
            </tr>
        `;
    } else {
        const idxEB = partes.findIndex(p => p.tit && p.tit.includes('Estudio bíblico'));
        const itemEB = idxEB !== -1 ? partes[idxEB] : { t: '30 min', tit: 'Estudio bíblico de la congregación: wcg cap. 11.', asig: '', asigAyudante: '' };
        
        filasHTML += `
            <tr>
                <td class="c-tiempo editable-field text-slate-900 font-bold" rowspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="${idxEB !== -1 ? `guardarTextoEditable(${idxEB}, 't', this.innerText)` : ''}">${itemEB.t || '30 min'}</td>
                <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="${idxEB !== -1 ? `guardarTextoEditable(${idxEB}, 'tit', this.innerText)` : ''}">
                    ${itemEB.tit}
                </td>
                <td class="px-2 col-asig" colspan="7">
                    <div class="flex items-center justify-between w-full gap-1">
                        ${crearSelectHTML(idxEB !== -1 ? `asig_p${idxEB}_A_titular` : 'asig_eb_conductor', 'eb', itemEB.asig)}
                        ${crearBotonWhatsAppHTML(itemEB.asig, itemEB.asigAyudante, itemEB.tit, 'Sala Principal')}
                    </div>
                </td>
                <td class="no-print text-center w-8"></td>
            </tr>
            <tr>
                <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">Lector:</td>
                <td class="px-2 col-asig" colspan="7">
                    <div class="flex items-center justify-between w-full gap-1">
                        ${crearSelectHTML(idxEB !== -1 ? `asig_p${idxEB}_A_ayudante` : 'asig_eb_lector', 'lectorL', itemEB.asigAyudante)}
                        ${crearBotonWhatsAppHTML(itemEB.asigAyudante, '', 'Lector del Estudio Bíblico', 'Sala Principal')}
                    </div>
                </td>
                <td class="no-print text-center w-8"></td>
            </tr>
            <tr>
                <td class="c-tiempo editable-field text-slate-900 font-bold" rowspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">3 min</td>
                <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)">Repaso de esta reunión y adelanto de la próxima.</td>
                <td class="px-2 col-asig" colspan="7">
                    <div class="flex items-center justify-between w-full gap-1">
                        ${crearSelectHTML('asig_repaso', 'pres', sem.repaso)}
                        ${crearBotonWhatsAppHTML(sem.repaso, '', 'Repaso y adelanto', 'Sala Principal')}
                    </div>
                </td>
                <td class="no-print text-center w-8"></td>
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
                <td class="no-print text-center w-8"></td>
            </tr>
        `;
    }

    if (esViajante) {
        filasHTML += `
            <tr>
                <th class="bg-[#7ca2d3] text-white text-center c-tiempo py-1">
                    <img src="Torre.png" class="w-4 h-4 mx-auto object-contain" alt="Torre">
                </th>
                <th colspan="10" class="bg-[#7ca2d3] text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">
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
                <td class="no-print text-center w-8"></td>
            </tr>
            <tr>
                <td class="c-tiempo editable-field text-slate-900 font-bold" contenteditable="true" onpaste="limpiarTextoPegado(event)">30 min</td>
                <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarEncabezadoSemana('temaDiscPub', this.innerText)">
                    ${sem.temaDiscPub || 'Discurso público:'}
                </td>
                <td class="px-2 col-asig" colspan="7">
                    <div class="flex items-center justify-between w-full gap-1">
                        ${crearSelectHTML('asig_viajante_disc_pub', '', sem.asigViajanteDiscPub, "SUPERINTENDENTE DE CIRCUITO")}
                        ${crearBotonWhatsAppHTML(sem.asigViajanteDiscPub, '', 'Discurso público', 'Reunión Pública')}
                    </div>
                </td>
                <td class="no-print text-center w-8"></td>
            </tr>
            <tr>
                <td class="c-tiempo editable-field text-slate-900 font-bold" contenteditable="true" onpaste="limpiarTextoPegado(event)">3 min</td>
                <td class="px-2 font-medium editable-field" colspan="10" contenteditable="true" onpaste="limpiarTextoPegado(event)">
                    Canción Nº ${sem.cancionDomMid || ''}
                </td>
            </tr>
            <tr>
                <td class="c-tiempo editable-field text-slate-900 font-bold" contenteditable="true" onpaste="limpiarTextoPegado(event)">30 min</td>
                <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarEncabezadoSemana('temaAtalaya', this.innerText)">
                    ${sem.temaAtalaya || 'La Atalaya:'}
                </td>
                <td class="px-2 col-asig" colspan="7">
                    <div class="flex items-center justify-between w-full gap-1">
                        ${crearSelectHTML('asig_dom_lector', 'lectorW', sem.domLector, "LECTOR")}
                        ${crearBotonWhatsAppHTML(sem.domLector, '', 'Lector de La Atalaya', 'Reunión Pública')}
                    </div>
                </td>
                <td class="no-print text-center w-8"></td>
            </tr>
            <tr>
                <td class="c-tiempo editable-field text-slate-900 font-bold" contenteditable="true" onpaste="limpiarTextoPegado(event)">30 min</td>
                <td class="px-2 font-medium editable-field" colspan="2" contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="guardarEncabezadoSemana('temaDiscFin', this.innerText)">
                    ${sem.temaDiscFin || 'Discurso final:'}
                </td>
                <td class="px-2 col-asig" colspan="7">
                    <div class="flex items-center justify-between w-full gap-1">
                        ${crearSelectHTML('asig_viajante_disc_fin', '', sem.asigViajanteDiscFin, "SUPERINTENDENTE DE CIRCUITO")}
                        ${crearBotonWhatsAppHTML(sem.asigViajanteDiscFin, '', 'Discurso final', 'Reunión Pública')}
                    </div>
                </td>
                <td class="no-print text-center w-8"></td>
            </tr>
            <tr>
                <td class="c-tiempo editable-field text-slate-900 font-bold" contenteditable="true" onpaste="limpiarTextoPegado(event)">3 min</td>
                <td class="px-2 font-medium editable-field" colspan="10" contenteditable="true" onpaste="limpiarTextoPegado(event)">
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
                <td class="px-2 font-bold py-1.5 text-right editable-field" colspan="8" contenteditable="true" onpaste="limpiarTextoPegado(event)">
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
};

window.guardarTextoEditable = function(pIndex, campo, valor) {
    const sem = window.programaMes[window.semanaActivaIdx];
    if (sem && sem.partes && sem.partes[pIndex]) {
        sem.partes[pIndex][campo] = valor;
        notificarYGuardarAutosave();
    }
};

window.guardarEncabezadoSemana = async function(campo, valor) {
    if (window.programaMes[window.semanaActivaIdx]) {
        window.programaMes[window.semanaActivaIdx][campo] = valor.trim();
        await notificarYGuardarAutosave();
    }
};

window.actualizarEncabezadoSemana = async function(campo, valor) {
    if (window.programaMes[window.semanaActivaIdx]) {
        window.programaMes[window.semanaActivaIdx][campo] = valor;
        await notificarYGuardarAutosave();
    }
};

window.guardarAsignacionSemana = async function(elemId) {
    const el = document.getElementById(elemId);
    if (!el) return;
    const val = el.value;
    const sem = window.programaMes[window.semanaActivaIdx];
    if (!sem) return;

    if (elemId === 'asig_presi') sem.presidencia = val;
    else if (elemId === 'asig_orac_ini') sem.oracionIni = val;
    else if (elemId === 'asig_viajante_entre_semana') sem.asigViajanteEntreSemana = val;
    else if (elemId === 'asig_viajante_disc_pub') sem.asigViajanteDiscPub = val;
    else if (elemId === 'asig_viajante_disc_fin') sem.asigViajanteDiscFin = val;
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
    cargarSemanaEnPlanilla(window.semanaActivaIdx);
};

window.toggleParticipantesParte = async function(pIndex) {
    const sem = window.programaMes[window.semanaActivaIdx];
    if (sem && sem.partes && sem.partes[pIndex]) {
        sem.partes[pIndex].participantes = (sem.partes[pIndex].participantes === 2) ? 1 : 2;
        cargarSemanaEnPlanilla(window.semanaActivaIdx);
        await notificarYGuardarAutosave();
    }
};

window.agregarNuevaSemana = async function() {
    const numSem = window.programaMes.length + 1;
    const nuevaSem = crearEstructuraSemanaEjemplo();
    nuevaSem.semana = `NUEVA SEMANA ${numSem}`;
    window.programaMes.push(nuevaSem);
    window.semanaActivaIdx = window.programaMes.length - 1;
    renderizarSelectorSemanas();
    cargarSemanaEnPlanilla(window.semanaActivaIdx);
    await notificarYGuardarAutosave();
};

window.eliminarSemanaActiva = async function() {
    if (!window.programaMes || window.programaMes.length === 0) return;
    
    if (confirm(`¿Estás seguro de que deseas eliminar la semana "${window.programaMes[window.semanaActivaIdx].semana}"?`)) {
        window.programaMes.splice(window.semanaActivaIdx, 1);
        if (window.semanaActivaIdx >= window.programaMes.length) {
            window.semanaActivaIdx = Math.max(0, window.programaMes.length - 1);
        }
        if (window.programaMes.length === 0) {
            window.programaMes = [crearEstructuraSemanaEjemplo()];
            window.semanaActivaIdx = 0;
        }
        renderizarSelectorSemanas();
        cargarSemanaEnPlanilla(window.semanaActivaIdx);
        await notificarYGuardarAutosave();
    }
};

window.cambiarNumSalasSemana = async function(cantidad) {
    if (!window.programaMes[window.semanaActivaIdx]) return;
    window.programaMes[window.semanaActivaIdx].numSalas = parseInt(cantidad);
    cargarSemanaEnPlanilla(window.semanaActivaIdx);
    await notificarYGuardarAutosave();
};

window.actualizarTipoSemana = async function(tipo) {
    if (!window.programaMes[window.semanaActivaIdx]) return;
    window.programaMes[window.semanaActivaIdx].tipoSemana = tipo;
    if (tipo === 'viajante') window.programaMes[window.semanaActivaIdx].numSalas = 1;
    cargarSemanaEnPlanilla(window.semanaActivaIdx);
    await notificarYGuardarAutosave();
};

window.agregarFilaMaestros = async function() {
    const sem = window.programaMes[window.semanaActivaIdx];
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

    cargarSemanaEnPlanilla(window.semanaActivaIdx);
    await notificarYGuardarAutosave();
};

window.agregarFilaVida = async function() {
    const sem = window.programaMes[window.semanaActivaIdx];
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

    cargarSemanaEnPlanilla(window.semanaActivaIdx);
    await notificarYGuardarAutosave();
};

window.eliminarFilaParte = async function(pIndex) {
    const sem = window.programaMes[window.semanaActivaIdx];
    if (sem && sem.partes && sem.partes[pIndex]) {
        sem.partes.splice(pIndex, 1);
        cargarSemanaEnPlanilla(window.semanaActivaIdx);
        await notificarYGuardarAutosave();
    }
};

window.guardarMesManual = async function() {
    await notificarYGuardarAutosave();
    alert("¡Trabajo del mes guardado correctamente!");
};

window.resetearPlanillaMes = async function() {
    if (confirm("¿Estás seguro de resetear la planilla para iniciar un NUEVO MES? Esto limpiará las semanas actuales.")) {
        window.nombreMesGlobal = "";
        const inputMes = document.getElementById('inputNombreMes');
        if (inputMes) inputMes.value = "";
        actualizarTextoTituloMes("");

        inicializarMesDefault(4);
        window.semanaActivaIdx = 0;
        
        renderizarSelectorSemanas();
        cargarSemanaEnPlanilla(0);
        await notificarYGuardarAutosave();
    }
};

/* GESTIÓN MATRIZ HERMANOS */
window.renderizarMatrizHermanos = function() {
    const cuerpo = document.getElementById('cuerpoTablaHermanos');
    if (!cuerpo) return;
    cuerpo.innerHTML = '';

    if (!Array.isArray(window.listaHermanos)) return;

    window.listaHermanos.forEach((h, index) => {
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
};

window.actualizarHermano = async function(id, campo, valor) {
    if (typeof actualizarHermanoBD === 'function') await actualizarHermanoBD(id, campo, valor);
    if (window.programaMes.length > 0) cargarSemanaEnPlanilla(window.semanaActivaIdx);
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
    if (window.programaMes.length > 0) cargarSemanaEnPlanilla(window.semanaActivaIdx);
    if (typeof renderizarTablaHistorial === 'function') renderizarTablaHistorial();
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
