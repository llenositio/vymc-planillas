/* RENDERIZADO DE PLANILLA SEMANAL */
window.renderizarSelectorSemanas = function() {
    const contenedor = document.getElementById('selectorSemanas');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    window.programaMes.forEach((sem, idx) => {
        const btn = document.createElement('button');
        const activa = idx === window.semanaActivaIdx;
        btn.className = `px-3 py-1 rounded-md text-xs font-bold transition ${activa ? 'bg-amber-600 text-white shadow' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`;
        btn.innerText = `Sem ${idx + 1}${sem.semana && sem.semana !== 'FECHA' ? ': ' + sem.semana : ''}`;
        btn.onclick = () => cargarSemanaEnPlanilla(idx);
        contenedor.appendChild(btn);
    });
};

window.cargarSemanaEnPlanilla = function(idx) {
    if (!window.programaMes[idx]) return;
    window.semanaActivaIdx = idx;
    const sem = window.programaMes[idx];

    renderizarSelectorSemanas();

    const radios = document.getElementsByName('tipoSemana');
    radios.forEach(r => { r.checked = (r.value === sem.tipoSemana); });

    const selSalas = document.getElementById('selectNumSalas');
    if (selSalas) selSalas.value = sem.numSalas || 1;

    const banner = document.getElementById('bannerEventoEspecial');
    const tabla = document.getElementById('tablaPlanillaCompleta');
    
    if (sem.tipoSemana === 'asamblea' || sem.tipoSemana === 'conmemoracion') {
        banner.classList.remove('hidden');
        tabla.classList.add('hidden');
        if (sem.tipoSemana === 'asamblea') {
            banner.className = "mb-4 p-8 rounded-xl text-center font-black text-xl bg-red-100 text-red-900 border-2 border-red-300 uppercase tracking-wider";
            banner.innerHTML = `<i class="fa-solid fa-building-columns text-3xl block mb-2"></i> Semana de Asamblea Regional o de Circuito<br><span class="text-sm font-semibold">No se celebran reuniones entre semana ni de fin de semana en el Salón del Reino.</span>`;
        } else {
            banner.className = "mb-4 p-8 rounded-xl text-center font-black text-xl bg-purple-100 text-purple-900 border-2 border-purple-300 uppercase tracking-wider";
            banner.innerHTML = `<i class="fa-solid fa-wine-glass text-3xl block mb-2"></i> Semana de la Conmemoración de la Muerte de Cristo<br><span class="text-sm font-semibold">Programa especial de la Conmemoración.</span>`;
        }
        return;
    } else {
        banner.classList.add('hidden');
        tabla.classList.remove('hidden');
    }

    const thead = document.getElementById('cabeceraTablaPlanilla');
    const tbody = document.getElementById('cuerpoTablaPlanilla');
    if (!thead || !tbody) return;

    thead.innerHTML = `
        <tr>
            <th colspan="11" class="py-1.5 text-center bg-slate-100 border-b-2 border-slate-900 font-black text-xs sm:text-sm text-slate-900">
                Semana del <span contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="actualizarCampoSemana('semana', this.innerText)" class="editable-field uppercase">${sem.semana}</span> , 
                <span contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="actualizarCampoSemana('lectura', this.innerText)" class="editable-field uppercase">${sem.lectura}</span>
            </th>
        </tr>
    `;

    let filasHTML = '';

    // 1. FILAS SUPERIORES: CANCIÓN 1 Y PRESIDENCIA / ORACIÓN INICIAL
    filasHTML += `
        <tr>
            <td class="c-tiempo">1 min</td>
            <td class="font-medium" colspan="2">
                Canción N° <input type="text" class="input-inline w-8 border-b border-slate-400" value="${sem.canciones[0] || ''}" onchange="actualizarCancion(0, this.value)">. Presidencia: Palabras de introducción.
            </td>
            <td colspan="7" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs">
                <div class="flex items-center justify-center gap-1">
                    ${crearSelectHTML('sel-presidencia', 'pres', sem.presidencia)}
                    ${crearBotonWhatsAppHTML(sem.presidencia, '', 'Presidencia de la reunión')}
                </div>
            </td>
            <td class="text-center no-print"></td>
        </tr>
        <tr>
            <td class="c-tiempo"></td>
            <td class="font-medium" colspan="2">Oración</td>
            <td colspan="7" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs">
                <div class="flex items-center justify-center gap-1">
                    ${crearSelectHTML('sel-oracionIni', 'orac', sem.oracionIni)}
                    ${crearBotonWhatsAppHTML(sem.oracionIni, '', 'Oración inicial')}
                </div>
            </td>
            <td class="text-center no-print"></td>
        </tr>
    `;

    let tesorosRenderizado = false;
    let maestrosRenderizado = false;
    let vidaRenderizado = false;

    const numSalas = sem.numSalas || 1;

    sem.partes.forEach((parte, pIdx) => {
        if (parte.seccion === 'tesoros' && !tesorosRenderizado) {
            filasHTML += `
                <tr>
                    <th class="bg-tesoros text-white c-tiempo"><i class="fa-solid fa-gem text-xs"></i></th>
                    <th colspan="9" class="bg-tesoros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wider">Tesoros de la Biblia</th>
                    <th class="bg-tesoros text-white text-center no-print">
                        <button onclick="agregarParteSeccion('tesoros')" class="text-white hover:text-amber-300 text-xs" title="Agregar parte"><i class="fa-solid fa-plus"></i></button>
                    </th>
                </tr>
            `;
            tesorosRenderizado = true;
        }

        if (parte.seccion === 'maestros' && !maestrosRenderizado) {
            let subcabeceraSalas = '';
            if (numSalas === 1) {
                subcabeceraSalas = `<th colspan="7" class="bg-maestros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wider">Seamos mejores maestros</th>`;
            } else if (numSalas === 2) {
                subcabeceraSalas = `
                    <th colspan="2" class="bg-maestros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wider">Seamos mejores maestros</th>
                    <th colspan="4" class="bg-amber-800 text-white py-1 text-center text-[10px] font-bold uppercase border-l border-amber-500">Sala Principal</th>
                    <th colspan="3" class="bg-amber-900 text-white py-1 text-center text-[10px] font-bold uppercase border-l border-amber-500">Sala B</th>
                `;
            } else if (numSalas === 3) {
                subcabeceraSalas = `
                    <th colspan="2" class="bg-maestros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wider">Seamos mejores maestros</th>
                    <th colspan="3" class="bg-amber-800 text-white py-1 text-center text-[10px] font-bold uppercase border-l border-amber-500">Sala A</th>
                    <th colspan="2" class="bg-amber-900 text-white py-1 text-center text-[10px] font-bold uppercase border-l border-amber-500">Sala B</th>
                    <th colspan="2" class="bg-amber-950 text-white py-1 text-center text-[10px] font-bold uppercase border-l border-amber-500">Sala C</th>
                `;
            }

            if (numSalas === 1) {
                filasHTML += `
                    <tr>
                        <th class="bg-maestros text-white c-tiempo"><i class="fa-solid fa-wheat-awn text-xs"></i></th>
                        <th colspan="9" class="bg-maestros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wider">Seamos mejores maestros</th>
                        <th class="bg-maestros text-white text-center no-print">
                            <button onclick="agregarParteSeccion('maestros')" class="text-white hover:text-amber-300 text-xs" title="Agregar parte"><i class="fa-solid fa-plus"></i></button>
                        </th>
                    </tr>
                `;
            } else {
                filasHTML += `
                    <tr>
                        <th class="bg-maestros text-white c-tiempo"><i class="fa-solid fa-wheat-awn text-xs"></i></th>
                        ${subcabeceraSalas}
                        <th class="bg-maestros text-white text-center no-print">
                            <button onclick="agregarParteSeccion('maestros')" class="text-white hover:text-amber-300 text-xs" title="Agregar parte"><i class="fa-solid fa-plus"></i></button>
                        </th>
                    </tr>
                `;
            }
            maestrosRenderizado = true;
        }

        if (parte.seccion === 'vida' && !vidaRenderizado) {
            filasHTML += `
                <tr>
                    <th class="bg-vida text-white c-tiempo py-1">
                        <img src="Oveja.png" class="w-4 h-4 mx-auto object-contain" alt="Oveja">
                    </th>
                    <th colspan="9" class="bg-vida text-white py-1 text-center text-xs font-extrabold uppercase tracking-wider">Nuestra vida cristiana</th>
                    <th class="bg-vida text-white text-center no-print">
                        <button onclick="agregarParteSeccion('vida')" class="text-white hover:text-amber-300 text-xs" title="Agregar parte"><i class="fa-solid fa-plus"></i></button>
                    </th>
                </tr>
                <tr>
                    <td class="px-2 font-bold" colspan="10">
                        Canción Nº: <input type="text" class="input-inline w-8 border-b border-slate-400" value="${sem.canciones[1] || ''}" onchange="actualizarCancion(1, this.value)">
                    </td>
                    <td class="no-print"></td>
                </tr>
            `;
            vidaRenderizado = true;
        }

        // DETERMINAR CATEGORÍA AUTOMÁTICA
        let catSelect = 'nvc';
        if (parte.seccion === 'tesoros') {
            if (parte.tit.startsWith('1.')) catSelect = 'disc';
            else if (parte.tit.startsWith('2.')) catSelect = 'perlas';
            else if (parte.tit.startsWith('3.') || parte.tit.toLowerCase().includes('lectura')) catSelect = 'lec';
        } else if (parte.seccion === 'maestros') {
            catSelect = 'smm';
        } else if (parte.seccion === 'vida') {
            if (parte.tit.toLowerCase().includes('estudio bíblico')) catSelect = 'eb';
        }

        const esEstudioBiblico = (parte.seccion === 'vida' && parte.tit.toLowerCase().includes('estudio bíblico'));
        const llevaAyudante = (parte.seccion === 'maestros' && !parte.tit.toLowerCase().includes('discurso'));

        let celdasAsignacionHTML = '';

        if (esEstudioBiblico) {
            celdasAsignacionHTML = `
                <td colspan="4" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs border-r border-slate-300">
                    <div class="flex items-center justify-center gap-1 px-1">
                        <span class="font-bold text-slate-700 normal-case shrink-0">Conductor:</span>
                        ${crearSelectHTML(`sel-parte-${pIdx}`, 'eb', parte.asig, 'Conductor')}
                        ${crearBotonWhatsAppHTML(parte.asig, '', 'Conductor Estudio Bíblico de la Congregación')}
                    </div>
                </td>
                <td colspan="3" class="font-black uppercase text-amber-950 bg-amber-100/50 text-center text-xs">
                    <div class="flex items-center justify-center gap-1 px-1">
                        <span class="font-bold text-slate-700 normal-case shrink-0">Lector:</span>
                        ${crearSelectHTML(`sel-parte-ayu-${pIdx}`, 'lectorL', parte.asigAyudante, 'Lector')}
                        ${crearBotonWhatsAppHTML(parte.asigAyudante, '', 'Lector Estudio Bíblico de la Congregación')}
                    </div>
                </td>
            `;
        } else if (parte.seccion === 'maestros' && numSalas > 1) {
            if (numSalas === 2) {
                celdasAsignacionHTML = `
                    <td colspan="4" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs border-r border-slate-300">
                        <div class="flex flex-col gap-0.5">
                            <div class="flex items-center justify-center gap-0.5">
                                ${crearSelectHTML(`sel-parte-${pIdx}`, catSelect, parte.asig, 'Titular A')}
                                ${crearBotonWhatsAppHTML(parte.asig, parte.asigAyudante, parte.tit, 'Sala Principal')}
                            </div>
                            ${llevaAyudante ? `
                            <div class="flex items-center justify-center gap-0.5 border-t border-slate-200 pt-0.5">
                                ${crearSelectHTML(`sel-parte-ayu-${pIdx}`, catSelect, parte.asigAyudante, 'Ayud. A')}
                                ${crearBotonWhatsAppHTML(parte.asigAyudante, parte.asig, 'Ayudante en: ' + parte.tit, 'Sala Principal')}
                            </div>` : ''}
                        </div>
                    </td>
                    <td colspan="3" class="font-black uppercase text-amber-950 bg-amber-100/50 text-center text-xs">
                        <div class="flex flex-col gap-0.5">
                            <div class="flex items-center justify-center gap-0.5">
                                ${crearSelectHTML(`sel-parteB-${pIdx}`, catSelect, parte.asigB, 'Titular B')}
                                ${crearBotonWhatsAppHTML(parte.asigB, parte.asigBAyudante, parte.tit, 'Sala Auxiliar B')}
                            </div>
                            ${llevaAyudante ? `
                            <div class="flex items-center justify-center gap-0.5 border-t border-slate-200 pt-0.5">
                                ${crearSelectHTML(`sel-parteB-ayu-${pIdx}`, catSelect, parte.asigBAyudante, 'Ayud. B')}
                                ${crearBotonWhatsAppHTML(parte.asigBAyudante, parte.asigB, 'Ayudante en: ' + parte.tit, 'Sala Auxiliar B')}
                            </div>` : ''}
                        </div>
                    </td>
                `;
            } else if (numSalas === 3) {
                celdasAsignacionHTML = `
                    <td colspan="3" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs border-r border-slate-300">
                        <div class="flex flex-col gap-0.5">
                            <div class="flex items-center justify-center gap-0.5">
                                ${crearSelectHTML(`sel-parte-${pIdx}`, catSelect, parte.asig, 'Tit. A')}
                                ${crearBotonWhatsAppHTML(parte.asig, parte.asigAyudante, parte.tit, 'Sala Principal')}
                            </div>
                            ${llevaAyudante ? `
                            <div class="flex items-center justify-center gap-0.5 border-t border-slate-200 pt-0.5">
                                ${crearSelectHTML(`sel-parte-ayu-${pIdx}`, catSelect, parte.asigAyudante, 'Ayu. A')}
                                ${crearBotonWhatsAppHTML(parte.asigAyudante, parte.asig, 'Ayudante en: ' + parte.tit, 'Sala Principal')}
                            </div>` : ''}
                        </div>
                    </td>
                    <td colspan="2" class="font-black uppercase text-amber-950 bg-amber-100/50 text-center text-xs border-r border-slate-300">
                        <div class="flex flex-col gap-0.5">
                            <div class="flex items-center justify-center gap-0.5">
                                ${crearSelectHTML(`sel-parteB-${pIdx}`, catSelect, parte.asigB, 'Tit. B')}
                                ${crearBotonWhatsAppHTML(parte.asigB, parte.asigBAyudante, parte.tit, 'Sala Auxiliar B')}
                            </div>
                            ${llevaAyudante ? `
                            <div class="flex items-center justify-center gap-0.5 border-t border-slate-200 pt-0.5">
                                ${crearSelectHTML(`sel-parteB-ayu-${pIdx}`, catSelect, parte.asigBAyudante, 'Ayu. B')}
                                ${crearBotonWhatsAppHTML(parte.asigBAyudante, parte.asigB, 'Ayudante en: ' + parte.tit, 'Sala Auxiliar B')}
                            </div>` : ''}
                        </div>
                    </td>
                    <td colspan="2" class="font-black uppercase text-amber-950 bg-amber-200/50 text-center text-xs">
                        <div class="flex flex-col gap-0.5">
                            <div class="flex items-center justify-center gap-0.5">
                                ${crearSelectHTML(`sel-parteC-${pIdx}`, catSelect, parte.asigC, 'Tit. C')}
                                ${crearBotonWhatsAppHTML(parte.asigC, parte.asigCAyudante, parte.tit, 'Sala Auxiliar C')}
                            </div>
                            ${llevaAyudante ? `
                            <div class="flex items-center justify-center gap-0.5 border-t border-slate-200 pt-0.5">
                                ${crearSelectHTML(`sel-parteC-ayu-${pIdx}`, catSelect, parte.asigCAyudante, 'Ayu. C')}
                                ${crearBotonWhatsAppHTML(parte.asigCAyudante, parte.asigC, 'Ayudante en: ' + parte.tit, 'Sala Auxiliar C')}
                            </div>` : ''}
                        </div>
                    </td>
                `;
            }
        } else {
            if (llevaAyudante) {
                celdasAsignacionHTML = `
                    <td colspan="4" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs border-r border-slate-300">
                        <div class="flex items-center justify-center gap-1">
                            ${crearSelectHTML(`sel-parte-${pIdx}`, catSelect, parte.asig, 'Estudiante')}
                            ${crearBotonWhatsAppHTML(parte.asig, parte.asigAyudante, parte.tit, 'Sala Principal')}
                        </div>
                    </td>
                    <td colspan="3" class="font-black uppercase text-amber-950 bg-amber-100/50 text-center text-xs">
                        <div class="flex items-center justify-center gap-1">
                            ${crearSelectHTML(`sel-parte-ayu-${pIdx}`, catSelect, parte.asigAyudante, 'Ayudante')}
                            ${crearBotonWhatsAppHTML(parte.asigAyudante, parte.asig, 'Ayudante en: ' + parte.tit, 'Sala Principal')}
                        </div>
                    </td>
                `;
            } else {
                celdasAsignacionHTML = `
                    <td colspan="7" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs">
                        <div class="flex items-center justify-center gap-1">
                            ${crearSelectHTML(`sel-parte-${pIdx}`, catSelect, parte.asig)}
                            ${crearBotonWhatsAppHTML(parte.asig, '', parte.tit, 'Sala Principal')}
                        </div>
                    </td>
                `;
            }
        }

        filasHTML += `
            <tr>
                <td class="c-tiempo"><span contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="actualizarCampoParte(${pIdx}, 't', this.innerText)" class="editable-field">${parte.t}</span></td>
                <td class="font-medium"><span contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="actualizarCampoParte(${pIdx}, 'tit', this.innerText)" class="editable-field">${parte.tit}</span></td>
                <td class="text-slate-600"><span contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="actualizarCampoParte(${pIdx}, 'desc', this.innerText)" class="editable-field">${parte.desc}</span></td>
                ${celdasAsignacionHTML}
                <td class="text-center no-print">
                    <button onclick="eliminarParte(${pIdx})" class="text-slate-400 hover:text-red-600 transition text-xs"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            </tr>
        `;
    });

    // 3. FILAS INFERIORES
    if (sem.tipoSemana === 'viajante') {
        filasHTML += `
            <tr>
                <td class="c-tiempo">3 min</td>
                <td class="font-medium" colspan="2">Repaso de esta reunión y adelanto de la próxima.</td>
                <td colspan="7" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs">
                    <div class="flex items-center justify-center gap-1">
                        ${crearSelectHTML('sel-repaso', 'pres', sem.repaso)}
                        ${crearBotonWhatsAppHTML(sem.repaso, '', 'Repaso de la reunión')}
                    </div>
                </td>
                <td class="text-center no-print"></td>
            </tr>
            <tr class="bg-blue-50/50">
                <td class="c-tiempo font-bold text-blue-900">30 min</td>
                <td class="font-bold text-blue-900" colspan="2">
                    <span contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="actualizarCampoSemana('temaViajanteEntreSemana', this.innerText)" class="editable-field">${sem.temaViajanteEntreSemana}</span>
                </td>
                <td colspan="7" class="font-black uppercase text-blue-950 text-center text-xs">
                    <div class="flex items-center justify-center gap-1">
                        <input type="text" class="input-inline w-full text-blue-950 font-black uppercase text-xs" placeholder="NOMBRE SUPERINTENDENTE" value="${sem.asigViajanteEntreSemana || ''}" onchange="actualizarCampoSemana('asigViajanteEntreSemana', this.value)">
                        ${crearBotonWhatsAppHTML(sem.asigViajanteEntreSemana, '', sem.temaViajanteEntreSemana)}
                    </div>
                </td>
                <td class="text-center no-print"></td>
            </tr>
            <tr>
                <td class="c-tiempo"></td>
                <td class="font-medium" colspan="2">
                    Canción Nº <input type="text" class="input-inline w-8 border-b border-slate-400" value="${sem.canciones[2] || ''}" onchange="actualizarCancion(2, this.value)"> y oración:
                </td>
                <td colspan="7" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs">
                    <div class="flex items-center justify-center gap-1">
                        <input type="text" class="input-inline w-full text-amber-950 font-black uppercase text-xs" placeholder="ORACIÓN FINAL" value="${sem.oracionFin || ''}" onchange="actualizarCampoSemana('oracionFin', this.value)">
                        ${crearBotonWhatsAppHTML(sem.oracionFin, '', 'Oración final')}
                    </div>
                </td>
                <td class="text-center no-print"></td>
            </tr>
        `;
    } else {
        filasHTML += `
            <tr>
                <td class="c-tiempo">3 min</td>
                <td class="font-medium" colspan="2">Repaso de esta reunión y adelanto de la próxima.</td>
                <td colspan="7" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs">
                    <div class="flex items-center justify-center gap-1">
                        ${crearSelectHTML('sel-repaso', 'pres', sem.repaso)}
                        ${crearBotonWhatsAppHTML(sem.repaso, '', 'Repaso de la reunión')}
                    </div>
                </td>
                <td class="text-center no-print"></td>
            </tr>
            <tr>
                <td class="c-tiempo"></td>
                <td class="font-medium" colspan="2">
                    Canción Nº <input type="text" class="input-inline w-8 border-b border-slate-400" value="${sem.canciones[2] || ''}" onchange="actualizarCancion(2, this.value)"> y oración:
                </td>
                <td colspan="7" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs">
                    <div class="flex items-center justify-center gap-1">
                        ${crearSelectHTML('sel-oracionFin', 'orac', sem.oracionFin)}
                        ${crearBotonWhatsAppHTML(sem.oracionFin, '', 'Oración final')}
                    </div>
                </td>
                <td class="text-center no-print"></td>
            </tr>
        `;
    }

    // 4. SECCIÓN REUNIÓN DEL FIN DE SEMANA
    filasHTML += `
        <tr class="border-t-2 border-slate-900 bg-slate-50/50">
            <td class="px-2 font-bold py-1.5" colspan="3">
                <div class="flex items-center gap-1">
                    <span>Domingo, presidencia:</span>
                    ${crearSelectHTML('sel-domPresi', 'presPub', sem.domPresi)}
                    ${crearBotonWhatsAppHTML(sem.domPresi, '', 'Presidencia Reunión Pública (Domingo)')}
                </div>
            </td>
            <td class="px-2 font-bold py-1.5" colspan="7">
                <div class="flex items-center justify-end gap-1">
                    <span>Lector:</span>
                    ${crearSelectHTML('sel-domLector', 'lectorW', sem.domLector)}
                    ${crearBotonWhatsAppHTML(sem.domLector, '', 'Lector de La Atalaya (Domingo)')}
                </div>
            </td>
            <td class="text-center no-print"></td>
        </tr>
    `;

    if (sem.tipoSemana === 'viajante') {
        filasHTML += `
            <tr class="bg-blue-50/30">
                <td class="c-tiempo">5 min</td>
                <td class="px-2 font-medium" colspan="2">Canción Nº: <input type="text" class="input-inline w-8 border-b border-slate-400" value="${sem.cancionDomIni || ''}" onchange="actualizarCampoSemana('cancionDomIni', this.value)">. Oración</td>
                <td colspan="7" class="font-bold text-slate-600 text-center text-xs">Presidente</td>
                <td class="no-print"></td>
            </tr>
            <tr class="bg-blue-50/30">
                <td class="c-tiempo font-bold text-blue-900">30 min</td>
                <td class="px-2 font-bold text-blue-900" colspan="2"><span contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="actualizarCampoSemana('temaDiscPub', this.innerText)" class="editable-field">${sem.temaDiscPub}</span></td>
                <td colspan="7" class="font-black uppercase text-blue-950 text-center text-xs">
                    <div class="flex items-center justify-center gap-1">
                        <input type="text" class="input-inline w-full text-blue-950 font-black uppercase text-xs" placeholder="DISCURSANTE PÚBLICO" value="${sem.asigViajanteDiscPub || ''}" onchange="actualizarCampoSemana('asigViajanteDiscPub', this.value)">
                        ${crearBotonWhatsAppHTML(sem.asigViajanteDiscPub, '', sem.temaDiscPub)}
                    </div>
                </td>
                <td class="no-print"></td>
            </tr>
            <tr class="bg-blue-50/30">
                <td class="c-tiempo"></td>
                <td class="px-2 font-medium" colspan="9">Canción Nº: <input type="text" class="input-inline w-8 border-b border-slate-400" value="${sem.cancionDomMid || ''}" onchange="actualizarCampoSemana('cancionDomMid', this.value)"></td>
                <td class="no-print"></td>
            </tr>
            <tr class="bg-blue-50/30">
                <td class="c-tiempo">30 min</td>
                <td class="px-2 font-medium" colspan="2"><span contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="actualizarCampoSemana('temaAtalaya', this.innerText)" class="editable-field">${sem.temaAtalaya}</span></td>
                <td colspan="7" class="font-bold text-slate-600 text-center text-xs">Conductor de La Atalaya</td>
                <td class="no-print"></td>
            </tr>
            <tr class="bg-blue-50/30">
                <td class="c-tiempo font-bold text-blue-900">30 min</td>
                <td class="px-2 font-bold text-blue-900" colspan="2"><span contenteditable="true" onpaste="limpiarTextoPegado(event)" onblur="actualizarCampoSemana('temaDiscFin', this.innerText)" class="editable-field">${sem.temaDiscFin}</span></td>
                <td colspan="7" class="font-black uppercase text-blue-950 text-center text-xs">
                    <div class="flex items-center justify-center gap-1">
                        <input type="text" class="input-inline w-full text-blue-950 font-black uppercase text-xs" placeholder="DISCURSO FINAL VIAJANTE" value="${sem.asigViajanteDiscFin || ''}" onchange="actualizarCampoSemana('asigViajanteDiscFin', this.value)">
                        ${crearBotonWhatsAppHTML(sem.asigViajanteDiscFin, '', sem.temaDiscFin)}
                    </div>
                </td>
                <td class="no-print"></td>
            </tr>
            <tr class="bg-blue-50/30">
                <td class="c-tiempo">5 min</td>
                <td class="px-2 font-medium" colspan="2">Canción Nº: <input type="text" class="input-inline w-8 border-b border-slate-400" value="${sem.cancionDomFin || ''}" onchange="actualizarCampoSemana('cancionDomFin', this.value)">. Oración</td>
                <td colspan="7" class="font-bold text-slate-600 text-center text-xs">Superintendente de Circuito</td>
                <td class="no-print"></td>
            </tr>
        `;
    }

    tbody.innerHTML = filasHTML;
};

/* ACCIONES DE EDICIÓN */
window.actualizarCampoSemana = function(campo, valor) {
    window.programaMes[window.semanaActivaIdx][campo] = valor.trim();
    if (campo === 'semana') renderizarSelectorSemanas();
    notificarYGuardarAutosave();
};

window.actualizarCancion = function(idxCancion, valor) {
    window.programaMes[window.semanaActivaIdx].canciones[idxCancion] = valor.trim();
    notificarYGuardarAutosave();
};

window.actualizarCampoParte = function(idxParte, campo, valor) {
    window.programaMes[window.semanaActivaIdx].partes[idxParte][campo] = valor.trim();
    notificarYGuardarAutosave();
};

window.guardarAsignacionSemana = function(idSelect) {
    const el = document.getElementById(idSelect);
    if (!el) return;
    const val = el.value;
    const sem = window.programaMes[window.semanaActivaIdx];

    if (idSelect === 'sel-presidencia') sem.presidencia = val;
    else if (idSelect === 'sel-oracionIni') sem.oracionIni = val;
    else if (idSelect === 'sel-repaso') sem.repaso = val;
    else if (idSelect === 'sel-oracionFin') sem.oracionFin = val;
    else if (idSelect === 'sel-domPresi') sem.domPresi = val;
    else if (idSelect === 'sel-domLector') sem.domLector = val;
    else if (idSelect.startsWith('sel-parte-ayu-')) {
        const idx = parseInt(idSelect.replace('sel-parte-ayu-', ''));
        if (sem.partes[idx]) sem.partes[idx].asigAyudante = val;
    } else if (idSelect.startsWith('sel-parteB-ayu-')) {
        const idx = parseInt(idSelect.replace('sel-parteB-ayu-', ''));
        if (sem.partes[idx]) sem.partes[idx].asigBAyudante = val;
    } else if (idSelect.startsWith('sel-parteC-ayu-')) {
        const idx = parseInt(idSelect.replace('sel-parteC-ayu-', ''));
        if (sem.partes[idx]) sem.partes[idx].asigCAyudante = val;
    } else if (idSelect.startsWith('sel-parteB-')) {
        const idx = parseInt(idSelect.replace('sel-parteB-', ''));
        if (sem.partes[idx]) sem.partes[idx].asigB = val;
    } else if (idSelect.startsWith('sel-parteC-')) {
        const idx = parseInt(idSelect.replace('sel-parteC-', ''));
        if (sem.partes[idx]) sem.partes[idx].asigC = val;
    } else if (idSelect.startsWith('sel-parte-')) {
        const idx = parseInt(idSelect.replace('sel-parte-', ''));
        if (sem.partes[idx]) sem.partes[idx].asig = val;
    }

    cargarSemanaEnPlanilla(window.semanaActivaIdx);
    notificarYGuardarAutosave();
};

window.actualizarTipoSemana = function(nuevoTipo) {
    window.programaMes[window.semanaActivaIdx].tipoSemana = nuevoTipo;
    cargarSemanaEnPlanilla(window.semanaActivaIdx);
    notificarYGuardarAutosave();
};

window.cambiarNumSalasSemana = function(num) {
    window.programaMes[window.semanaActivaIdx].numSalas = parseInt(num);
    cargarSemanaEnPlanilla(window.semanaActivaIdx);
    notificarYGuardarAutosave();
};

window.agregarParteSeccion = function(seccion) {
    const nueva = {
        seccion: seccion,
        t: "5 min",
        tit: "Nueva intervención",
        desc: "Detalles",
        participantes: seccion === 'maestros' ? 2 : 1,
        asig: ""
    };

    const partes = window.programaMes[window.semanaActivaIdx].partes;

    if (seccion === 'vida') {
        const idxEstudio = partes.findIndex(p =>
            p.seccion === 'vida' && (p.tit || '').toLowerCase().includes('estudio bíblico')
        );
        if (idxEstudio !== -1) {
            partes.splice(idxEstudio, 0, nueva);
            cargarSemanaEnPlanilla(window.semanaActivaIdx);
            notificarYGuardarAutosave();
            return;
        }
    }

    let ultimoIdxSeccion = -1;
    partes.forEach((p, idx) => {
        if (p.seccion === seccion) {
            ultimoIdxSeccion = idx;
        }
    });

    if (ultimoIdxSeccion !== -1) {
        partes.splice(ultimoIdxSeccion + 1, 0, nueva);
    } else {
        partes.push(nueva);
    }

    cargarSemanaEnPlanilla(window.semanaActivaIdx);
    notificarYGuardarAutosave();
};

window.eliminarParte = function(idxParte) {
    window.programaMes[window.semanaActivaIdx].partes.splice(idxParte, 1);
    cargarSemanaEnPlanilla(window.semanaActivaIdx);
    notificarYGuardarAutosave();
};

window.agregarNuevaSemana = function() {
    window.programaMes.push(crearEstructuraSemanaEjemplo());
    window.semanaActivaIdx = window.programaMes.length - 1;
    cargarSemanaEnPlanilla(window.semanaActivaIdx);
    notificarYGuardarAutosave();
};

window.eliminarSemanaActiva = function() {
    if (window.programaMes.length <= 1) {
        alert("Debe haber al menos una semana en el programa.");
        return;
    }
    if (confirm("¿Eliminar esta semana del programa?")) {
        window.programaMes.splice(window.semanaActivaIdx, 1);
        window.semanaActivaIdx = 0;
        cargarSemanaEnPlanilla(0);
        notificarYGuardarAutosave();
    }
};

window.resetearPlanillaMes = function() {
    if (confirm("¿Restaurar la planilla mensual a sus valores por defecto?")) {
        inicializarMesDefault(4);
        window.semanaActivaIdx = 0;
        cargarSemanaEnPlanilla(0);
        notificarYGuardarAutosave();
    }
};

window.guardarMesManual = function() {
    const input = document.getElementById('inputNombreMes');
    if (input) window.nombreMesGlobal = input.value.trim().toUpperCase();
    notificarYGuardarAutosave();
};

/* GUARDADO SILENCIOSO EN SUPABASE (INCLUYE SNAPSHOT PÚBLICO) */
let timeoutAutosave = null;
window.notificarYGuardarAutosave = async function() {
    if (timeoutAutosave) clearTimeout(timeoutAutosave);

    timeoutAutosave = setTimeout(async () => {
        if (typeof window.guardarPlanillaEnSupabase === 'function') {
            await window.guardarPlanillaEnSupabase();
        }
        if (typeof window.actualizarLinkPublico === 'function') {
            window.actualizarLinkPublico();
        }
    }, 600);
};
