/**
 * Módulo de Historial, Estadísticas Acumuladas y Matriz de Hermanos
 * Incluye algoritmo de sugerencia por rotación y antigüedad en cada rol.
 */

window.historialAsignaciones = [];
window.historialPorHermanoRol = {};

/**
 * Carga todas las planillas guardadas de la congregación desde Supabase para calcular el historial real
 */
window.cargarHistorialDesdeSupabase = async function() {
    let idCongre = window.congregacionIdActual || (window.congregacionActual ? window.congregacionActual.id : null);
    if (!idCongre) return;

    const { data, error } = await db
        .from('planillas')
        .select('mes_ano, datos, updated_at')
        .eq('congregacion_id', idCongre)
        .order('updated_at', { ascending: true });

    if (error) {
        console.error("Error cargando historial de planillas:", error);
        return;
    }

    window.historialAsignaciones = data || [];
    window.procesarHistorialAsignaciones();
};

/**
 * Procesa las planillas históricas y construye un mapa exacto por hermano y rol
 */
window.procesarHistorialAsignaciones = function() {
    const mapa = {};

    const registrar = (nombreRaw, rol, ordenTiempo, etiquetaMes) => {
        if (!nombreRaw || typeof nombreRaw !== 'string') return;
        const nombreLimpio = nombreRaw.split('(')[0].trim();
        if (!nombreLimpio || nombreLimpio.startsWith('--')) return;

        const key = nombreLimpio.toLowerCase();
        if (!mapa[key]) mapa[key] = {};
        if (!mapa[key][rol]) {
            mapa[key][rol] = { count: 0, lastOrder: -1, lastMes: '' };
        }

        mapa[key][rol].count += 1;
        if (ordenTiempo >= mapa[key][rol].lastOrder) {
            mapa[key][rol].lastOrder = ordenTiempo;
            mapa[key][rol].lastMes = etiquetaMes;
        }
    };

    let ordenGlobal = 0;

    (window.historialAsignaciones || []).forEach(planilla => {
        const mesLabel = planilla.mes_ano || 'SIN MES';
        const rawDatos = typeof planilla.datos === 'string' ? JSON.parse(planilla.datos) : (planilla.datos || []);
        const semanas = Array.isArray(rawDatos) ? rawDatos : (rawDatos.semanas || rawDatos.programa || []);

        if (!Array.isArray(semanas)) return;

        semanas.forEach(sem => {
            if (!sem || sem.tipoSemana === 'asamblea' || sem.tipoSemana === 'conmemoracion') return;
            ordenGlobal++;

            // a) Presidencia ES (Canción N° . Presidencia: Palabras de introducción)
            if (sem.presidencia) {
                registrar(sem.presidencia, 'presi', ordenGlobal, mesLabel);
            }

            // b) y j) Oración inicial y final unificadas
            if (sem.oracionIni) registrar(sem.oracionIni, 'oraciones', ordenGlobal, mesLabel);
            if (sem.oracionFin) registrar(sem.oracionFin, 'oraciones', ordenGlobal, mesLabel);

            // k) Presidencia FS (Domingo / Fin de semana)
            if (sem.domPresi) registrar(sem.domPresi, 'presiDom', ordenGlobal, mesLabel);

            // l) Lector W (Lector de La Atalaya)
            if (sem.domLector) registrar(sem.domLector, 'lectorAtalaya', ordenGlobal, mesLabel);

            (sem.partes || []).forEach(p => {
                const titLower = (p.tit || '').toLowerCase();
                const descLower = (p.desc || p.tipo || p.detalle || '').toLowerCase();
                const textoCompleto = `${titLower} ${descLower}`;

                if (p.seccion === 'tesoros') {
                    // c) Discurso de Tesoros (10 min)
                    if (p.tit && p.tit.trim().startsWith('1.') && p.asig) {
                        registrar(p.asig, 'discurso', ordenGlobal, mesLabel);
                    }
                    // d) Busquemos perlas escondidas
                    else if ((p.tit && p.tit.trim().startsWith('2.')) || textoCompleto.includes('perlas escondidas')) {
                        if (p.asig) registrar(p.asig, 'perlas', ordenGlobal, mesLabel);
                    }
                    // e) Lectura de la Biblia
                    else if ((p.tit && p.tit.trim().startsWith('3.')) || textoCompleto.includes('lectura de la biblia')) {
                        if (p.asig) registrar(p.asig, 'lectura', ordenGlobal, mesLabel);
                    }
                } else if (p.seccion === 'maestros') {
                    // f) Seamos Mejores Maestros: separados en Estudiante (E) y Ayudante (A)
                    [p.asig, p.asigB, p.asigC].forEach(nom => {
                        if (nom) {
                            registrar(nom, 'smmE', ordenGlobal, mesLabel);
                            registrar(nom, 'smm', ordenGlobal, mesLabel);
                        }
                    });
                    [p.asigAyudante, p.asigBAyudante, p.asigCAyudante].forEach(nom => {
                        if (nom) {
                            registrar(nom, 'smmA', ordenGlobal, mesLabel);
                            registrar(nom, 'smm', ordenGlobal, mesLabel);
                        }
                    });
                } else if (p.seccion === 'vida') {
                    // h) Estudio Bíblico (EB) e i) Lector L
                    if (textoCompleto.includes('estudio bíblico') || textoCompleto.includes('estudio biblico')) {
                        if (p.asig) registrar(p.asig, 'estudioBiblico', ordenGlobal, mesLabel);
                        if (p.asigAyudante) registrar(p.asigAyudante, 'lectorLibro', ordenGlobal, mesLabel);
                    } else {
                        // g) Nuestra Vida Cristiana: solo temas de NVC separados en Común (C) o Necesidades Locales (NL)
                        const esNecLoc = textoCompleto.includes('necesidades locales') ||
                                         textoCompleto.includes('necesidades lucales') ||
                                         textoCompleto.includes('nec loc') ||
                                         textoCompleto.includes('nec. loc');

                        if (p.asig) {
                            if (esNecLoc) {
                                registrar(p.asig, 'nvcNL', ordenGlobal, mesLabel);
                            } else {
                                registrar(p.asig, 'nvcC', ordenGlobal, mesLabel);
                            }
                            registrar(p.asig, 'nvc', ordenGlobal, mesLabel);
                        }
                    }
                }
            });
        });
    });

    window.historialPorHermanoRol = mapa;
};

/**
 * Ordena una lista de hermanos aptos para un rol específico priorizando:
 * 1. Quienes nunca han tenido ese rol o lo tuvieron hace más tiempo (menor lastOrder)
 * 2. Menor cantidad de veces realizadas en ese rol
 * 3. Orden alfabético
 */
window.obtenerSugeridosPorRol = function(rol, listaAptos) {
    if (!Array.isArray(listaAptos)) return [];
    const mapa = window.historialPorHermanoRol || {};

    const aliasRol = {
        'tesoros': 'discurso',
        'lec_biblia': 'lectura',
        'smm': 'smmE',
        'nvc': 'nvcC',
        'ebc': 'estudioBiblico',
        'lector_ebc': 'lectorLibro',
        'pres_pub': 'presiDom',
        'lector_atalaya': 'lectorAtalaya'
    };
    const rolBuscado = aliasRol[rol] || rol;

    return [...listaAptos].sort((a, b) => {
        const keyA = (a.nombre || '').trim().toLowerCase();
        const keyB = (b.nombre || '').trim().toLowerCase();

        const infoA = (mapa[keyA] && mapa[keyA][rolBuscado]) ? mapa[keyA][rolBuscado] : { count: 0, lastOrder: -1 };
        const infoB = (mapa[keyB] && mapa[keyB][rolBuscado]) ? mapa[keyB][rolBuscado] : { count: 0, lastOrder: -1 };

        if (infoA.lastOrder !== infoB.lastOrder) {
            return infoA.lastOrder - infoB.lastOrder;
        }
        if (infoA.count !== infoB.count) {
            return infoA.count - infoB.count;
        }
        return (a.nombre || '').localeCompare(b.nombre || '');
    });
};

/**
 * Busca y carga una planilla histórica por mes y año
 */
window.buscarYCargarPlanillaHistorial = async function() {
    const selMes = document.getElementById('selectFiltroMes');
    const selAnio = document.getElementById('selectFiltroAnio');
    if (!selMes || !selAnio) return;

    const mesBuscado = `${selMes.value} ${selAnio.value}`.trim().toUpperCase();
    let idCongre = window.congregacionIdActual || (window.congregacionActual ? window.congregacionActual.id : null);

    if (!idCongre) {
        alert("No hay congregación seleccionada.");
        return;
    }

    const { data, error } = await db
        .from('planillas')
        .select('*')
        .eq('congregacion_id', idCongre)
        .eq('mes_ano', mesBuscado)
        .maybeSingle();

    if (error) {
        console.error("Error buscando planilla en historial:", error);
        alert("Ocurrió un error al buscar la planilla.");
        return;
    }

    if (!data || !data.datos) {
        alert(`No se encontró ninguna planilla guardada para "${mesBuscado}".`);
        return;
    }

    const rawDatos = typeof data.datos === 'string' ? JSON.parse(data.datos) : (data.datos || []);
    window.programaMes = Array.isArray(rawDatos) ? rawDatos : (rawDatos.semanas || rawDatos.programa || []);
    window.nombreMesGlobal = data.mes_ano;
    window.semanaActivaIdx = 0;

    const inputMes = document.getElementById('inputNombreMes');
    if (inputMes) inputMes.value = window.nombreMesGlobal;
    if (typeof window.actualizarTextoTituloMes === 'function') {
        window.actualizarTextoTituloMes(window.nombreMesGlobal);
    }

    if (typeof window.cambiarPestaña === 'function') {
        window.cambiarPestaña('planilla');
    }
    if (typeof window.renderizarSelectorSemanas === 'function') {
        window.renderizarSelectorSemanas();
    }
    if (typeof window.cargarSemanaEnPlanilla === 'function') {
        window.cargarSemanaEnPlanilla(0);
    }
    if (typeof window.actualizarLinkPublico === 'function') {
        window.actualizarLinkPublico();
    }
    if (typeof window.cargarPlanillaAVDesdeSupabase === 'function') {
        await window.cargarPlanillaAVDesdeSupabase();
    }
};

/**
 * Renderiza la tabla de Estadísticas Acumuladas en la pestaña "Estadísticas"
 */
window.renderizarTablaHistorial = async function() {
    const contenedor = document.getElementById('contenedorTablaHistorial');
    if (!contenedor) return;

    await window.cargarHistorialDesdeSupabase();

    const hermanos = window.listaHermanos || [];
    if (hermanos.length === 0) {
        contenedor.innerHTML = `<p class="text-center text-xs text-slate-500 py-6">No hay hermanos cargados en la congregación.</p>`;
        return;
    }

    const categorias = [
        { key: 'A', titulo: 'Ancianos' },
        { key: 'SM', titulo: 'Siervos Ministeriales' },
        { key: 'Pub', titulo: 'Publicadores' },
        { key: 'PNB', titulo: 'Publicadores No Bautizados' },
        { key: 'E', titulo: 'Estudiantes' },
        { key: 'Otro', titulo: 'Sin Categoría' }
    ];

    const grupos = { 'A': [], 'SM': [], 'Pub': [], 'PNB': [], 'E': [], 'Otro': [] };
    hermanos.forEach(h => {
        const cond = (h.condicion || '').trim();
        if (cond === 'A') grupos['A'].push(h);
        else if (cond === 'SM') grupos['SM'].push(h);
        else if (cond === 'Pub' || cond === 'Publicador') grupos['Pub'].push(h);
        else if (cond === 'PNB') grupos['PNB'].push(h);
        else if (cond === 'E' || cond === 'Estudio' || cond === 'Estudiante') grupos['E'].push(h);
        else grupos['Otro'].push(h);
    });

    let html = `
        <div class="overflow-x-auto">
        <table class="w-full text-[11px] text-left border-collapse">
            <thead class="bg-slate-900 text-white uppercase text-[10px] font-extrabold sticky top-0 z-10">
                <tr>
                    <th class="px-2.5 py-2 border border-slate-700 sticky left-0 bg-slate-900 z-20 min-w-[170px]">Hermano / Hermana</th>
                    <th class="px-1.5 py-2 border border-slate-700 text-center w-10">Grp</th>
                    <th class="px-1.5 py-2 border border-slate-700 text-center bg-slate-800" title="Presidencia Entre Semana">Presid. ES</th>
                    <th class="px-1.5 py-2 border border-slate-700 text-center bg-slate-800" title="Oración Inicial y Final">Oración</th>
                    <th class="px-1.5 py-2 border border-slate-700 text-center bg-cyan-900" title="Discurso Tesoros de la Biblia">Tesoros</th>
                    <th class="px-1.5 py-2 border border-slate-700 text-center bg-cyan-800" title="Busquemos Perlas Escondidas">Perlas</th>
                    <th class="px-1.5 py-2 border border-slate-700 text-center bg-cyan-700" title="Lectura de la Biblia">Lectura</th>
                    <th class="px-1.5 py-2 border border-slate-700 text-center bg-amber-800" title="Seamos Mejores Maestros - Estudiante">SMM (E)</th>
                    <th class="px-1.5 py-2 border border-slate-700 text-center bg-amber-700" title="Seamos Mejores Maestros - Ayudante">SMM (A)</th>
                    <th class="px-1.5 py-2 border border-slate-700 text-center bg-rose-900" title="Nuestra Vida Cristiana - Tema Común">NVC (C)</th>
                    <th class="px-1.5 py-2 border border-slate-700 text-center bg-rose-800" title="Nuestra Vida Cristiana - Necesidades Locales">NVC (NL)</th>
                    <th class="px-1.5 py-2 border border-slate-700 text-center bg-rose-950" title="Conductor Estudio Bíblico de Congregación">EB</th>
                    <th class="px-1.5 py-2 border border-slate-700 text-center bg-rose-950" title="Lector Estudio Bíblico de Congregación">Lector L</th>
                    <th class="px-1.5 py-2 border border-slate-700 text-center bg-indigo-900" title="Presidencia Fin de Semana">Presid. FS</th>
                    <th class="px-1.5 py-2 border border-slate-700 text-center bg-indigo-800" title="Lector de La Atalaya">Lector W</th>
                    <th class="px-2 py-2 border border-slate-700 text-center bg-emerald-900">Total Hist.</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
    `;

    const mapaHist = window.historialPorHermanoRol || {};

    const celda = (objRol, colorClass) => {
        const cant = objRol ? objRol.count : 0;
        const ult = objRol && objRol.lastMes ? ` title="Último: ${objRol.lastMes}"` : '';
        const estiloCero = cant === 0 ? 'text-slate-300 font-normal' : `font-bold ${colorClass}`;
        return `<td class="px-1.5 py-1.5 text-center border border-slate-200 ${estiloCero}"${ult}>${cant}</td>`;
    };

    categorias.forEach(cat => {
        const lista = grupos[cat.key];
        if (!lista || lista.length === 0) return;

        html += `
            <tr class="bg-slate-200 font-black text-slate-800 uppercase text-[10px]">
                <td colspan="16" class="px-2.5 py-1.5 border border-slate-300">${cat.titulo} (${lista.length})</td>
            </tr>
        `;

        lista.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')).forEach(h => {
            const k = (h.nombre || '').trim().toLowerCase();
            const hData = mapaHist[k] || {};

            const cPresiES = hData.presi ? hData.presi.count : 0;
            const cOrac = hData.oraciones ? hData.oraciones.count : 0;
            const cDiscurso = hData.discurso ? hData.discurso.count : 0;
            const cPerlas = hData.perlas ? hData.perlas.count : 0;
            const cLectura = hData.lectura ? hData.lectura.count : 0;
            const cSmmE = hData.smmE ? hData.smmE.count : 0;
            const cSmmA = hData.smmA ? hData.smmA.count : 0;
            const cNvcC = hData.nvcC ? hData.nvcC.count : 0;
            const cNvcNL = hData.nvcNL ? hData.nvcNL.count : 0;
            const cEB = hData.estudioBiblico ? hData.estudioBiblico.count : 0;
            const cLectorL = hData.lectorLibro ? hData.lectorLibro.count : 0;
            const cPresiFS = hData.presiDom ? hData.presiDom.count : 0;
            const cLectorW = hData.lectorAtalaya ? hData.lectorAtalaya.count : 0;

            const totalHist = cPresiES + cOrac + cDiscurso + cPerlas + cLectura +
                              cSmmE + cSmmA + cNvcC + cNvcNL + cEB + cLectorL +
                              cPresiFS + cLectorW;

            html += `
                <tr class="hover:bg-slate-50 transition">
                    <td class="px-2.5 py-1.5 font-bold text-slate-900 border border-slate-200 sticky left-0 bg-white">${h.nombre}</td>
                    <td class="px-1.5 py-1.5 text-center text-slate-600 border border-slate-200">${h.grupo || '-'}</td>
                    ${celda(hData.presi, 'text-slate-800')}
                    ${celda(hData.oraciones, 'text-slate-800')}
                    ${celda(hData.discurso, 'text-cyan-900')}
                    ${celda(hData.perlas, 'text-cyan-800')}
                    ${celda(hData.lectura, 'text-cyan-700')}
                    ${celda(hData.smmE, 'text-amber-900')}
                    ${celda(hData.smmA, 'text-amber-700')}
                    ${celda(hData.nvcC, 'text-rose-900')}
                    ${celda(hData.nvcNL, 'text-rose-700')}
                    ${celda(hData.estudioBiblico, 'text-rose-950')}
                    ${celda(hData.lectorLibro, 'text-rose-950')}
                    ${celda(hData.presiDom, 'text-indigo-900')}
                    ${celda(hData.lectorAtalaya, 'text-indigo-700')}
                    <td class="px-2 py-1.5 text-center font-black text-emerald-900 bg-emerald-50/60 border border-slate-200">${totalHist}</td>
                </tr>
            `;
        });
    });

    html += `</tbody></table></div>`;
    contenedor.innerHTML = html;
};

/**
 * Renderiza la Matriz de Hermanos VyMC en la pestaña "Matriz VyMC"
 */
window.renderizarMatrizHermanos = function() {
    const tbody = document.getElementById('cuerpoTablaHermanos');
    if (!tbody) return;

    const esMensajero = (typeof window.rolUsuarioActual === 'string' && window.rolUsuarioActual.startsWith('mensajero_'));
    const hermanos = window.listaHermanos || [];

    let html = '';
    const camposBool = [
        'oracion', 'pres_vymc', 'disc_tesoros', 'perlas', 'lec_biblia',
        'smm', 'nvc', 'ebc', 'lector_ebc', 'pres_pub', 'lector_atalaya'
    ];

    hermanos.forEach((h, idx) => {
        const disabledAttr = esMensajero ? 'disabled' : '';
        const editableAttr = esMensajero ? 'false' : 'true';
        const condActual = (h.condicion || '').trim();

        html += `<tr class="hover:bg-slate-50 transition">`;
        html += `<td class="border border-slate-300 font-bold text-slate-500">${idx + 1}</td>`;
        html += `
            <td class="border border-slate-300 text-left px-2 font-bold text-slate-900">
                <span contenteditable="${editableAttr}" onblur="actualizarHermanoBD(${h.id}, 'nombre', this.innerText.trim())" class="editable-field block">${h.nombre || ''}</span>
            </td>
        `;
        html += `
            <td class="border border-slate-300">
                <select ${disabledAttr} onchange="actualizarHermanoBD(${h.id}, 'sexo', this.value)" class="bg-transparent font-bold text-xs outline-none">
                    <option value="V" ${h.sexo === 'V' ? 'selected' : ''}>V</option>
                    <option value="M" ${h.sexo === 'M' ? 'selected' : ''}>M</option>
                </select>
            </td>
        `;
        html += `
            <td class="border border-slate-300">
                <select ${disabledAttr} onchange="actualizarHermanoBD(${h.id}, 'condicion', this.value)" class="bg-transparent font-bold text-xs outline-none">
                    <option value="Pub" ${(condActual === 'Pub' || condActual === 'Publicador') ? 'selected' : ''}>Pub</option>
                    <option value="PNB" ${condActual === 'PNB' ? 'selected' : ''}>PNB</option>
                    <option value="E" ${(condActual === 'E' || condActual === 'Estudio' || condActual === 'Estudiante') ? 'selected' : ''}>E</option>
                    <option value="SM" ${condActual === 'SM' ? 'selected' : ''}>SM</option>
                    <option value="A" ${condActual === 'A' ? 'selected' : ''}>A</option>
                </select>
            </td>
        `;
        html += `
            <td class="border border-slate-300">
                <input type="number" ${disabledAttr} value="${h.grupo || 1}" onchange="actualizarHermanoBD(${h.id}, 'grupo', parseInt(this.value) || 1)" class="w-10 text-center bg-transparent font-bold outline-none">
            </td>
        `;
        html += `
            <td class="border border-slate-300">
                <span contenteditable="${editableAttr}" onblur="actualizarHermanoBD(${h.id}, 'responsabilidades', this.innerText.trim())" class="editable-field text-xs">${h.responsabilidades || ''}</span>
            </td>
        `;
        html += `
            <td class="border border-slate-300 font-mono text-xs">
                <span contenteditable="${editableAttr}" onblur="actualizarHermanoBD(${h.id}, 'celular', this.innerText.trim())" class="editable-field">${h.celular || ''}</span>
            </td>
        `;

        camposBool.forEach(campo => {
            const checked = (h[campo] === true || h[campo] === 'X') ? 'checked' : '';
            html += `
                <td class="border border-slate-300 text-center">
                    <input type="checkbox" ${checked} ${disabledAttr} onchange="actualizarHermanoBD(${h.id}, '${campo}', this.checked)" class="w-4 h-4 rounded text-amber-600 cursor-pointer">
                </td>
            `;
        });

        html += `
            <td class="border border-slate-300 text-center no-print">
                ${!esMensajero ? `
                <button onclick="if(confirm('¿Eliminar a ${h.nombre}?')) eliminarHermanoBD(${h.id})" class="text-rose-500 hover:text-rose-700 p-1">
                    <i class="fa-solid fa-trash-can"></i>
                </button>` : ''}
            </td>
        `;
        html += `</tr>`;
    });

    tbody.innerHTML = html;
};

window.agregarNuevoHermano = function() {
    if (typeof window.agregarNuevoHermanoBD === 'function') {
        window.agregarNuevoHermanoBD();
    }
};
