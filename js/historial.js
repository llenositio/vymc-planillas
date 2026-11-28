/**
 * Módulo de Historial, Estadísticas Acumuladas y Matriz de Hermanos
 * Incluye algoritmo de sugerencia por rotación y antigüedad en cada rol,
 * filtro por rango de fechas (Desde / Hasta) y feedback visual al actualizar.
 */

window.historialAsignaciones = [];
window.historialPorHermanoRol = {};

/**
 * Convierte "NOVIEMBRE 2026" (o "11/2026") a un entero YYYYMM comparable (ej: 202611)
 */
window.parsearMesAnoANumero = function(mesAnoStr) {
    if (!mesAnoStr || typeof mesAnoStr !== 'string') return null;
    const limpio = mesAnoStr.trim().toUpperCase();

    const meses = {
        'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
        'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
        'SEPTIEMBRE': 9, 'SETIEMBRE': 9, 'OCTUBRE': 10,
        'NOVIEMBRE': 11, 'DICIEMBRE': 12
    };

    const matchAnio = limpio.match(/(20\d{2})/);
    if (!matchAnio) return null;
    const anio = parseInt(matchAnio[1], 10);

    for (const [nombreMes, numMes] of Object.entries(meses)) {
        if (limpio.includes(nombreMes)) {
            return anio * 100 + numMes;
        }
    }

    const matchMesNum = limpio.match(/\b(0?[1-9]|1[0-2])\b/);
    if (matchMesNum) {
        return anio * 100 + parseInt(matchMesNum[1], 10);
    }

    return null;
};

/**
 * Carga todas las planillas guardadas de la congregación desde Supabase
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
 * Procesa las planillas históricas (opcionalmente filtradas por rango YYYYMM)
 * y construye un mapa exacto por hermano y rol
 */
window.procesarHistorialAsignaciones = function(desdeNum = null, hastaNum = null) {
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

    const planillasOrdenadas = [...(window.historialAsignaciones || [])].sort((a, b) => {
        const numA = window.parsearMesAnoANumero(a.mes_ano) || 0;
        const numB = window.parsearMesAnoANumero(b.mes_ano) || 0;
        return numA - numB;
    });

    planillasOrdenadas.forEach(planilla => {
        const mesLabel = planilla.mes_ano || 'SIN MES';
        const mesNum = window.parsearMesAnoANumero(mesLabel);

        if (desdeNum !== null && (mesNum === null || mesNum < desdeNum)) return;
        if (hastaNum !== null && (mesNum === null || mesNum > hastaNum)) return;

        const rawDatos = typeof planilla.datos === 'string' ? JSON.parse(planilla.datos) : (planilla.datos || []);
        const semanas = Array.isArray(rawDatos) ? rawDatos : (rawDatos.semanas || rawDatos.programa || []);

        if (!Array.isArray(semanas)) return;

        semanas.forEach(sem => {
            if (!sem || sem.tipoSemana === 'asamblea' || sem.tipoSemana === 'conmemoracion') return;
            ordenGlobal++;

            if (sem.presidencia) {
                registrar(sem.presidencia, 'presi', ordenGlobal, mesLabel);
            }

            if (sem.oracionIni) registrar(sem.oracionIni, 'oraciones', ordenGlobal, mesLabel);
            if (sem.oracionFin) registrar(sem.oracionFin, 'oraciones', ordenGlobal, mesLabel);

            if (sem.domPresi) registrar(sem.domPresi, 'presiDom', ordenGlobal, mesLabel);

            if (sem.domLector) registrar(sem.domLector, 'lectorAtalaya', ordenGlobal, mesLabel);

            (sem.partes || []).forEach(p => {
                const titLower = (p.tit || '').toLowerCase();
                const descLower = (p.desc || p.tipo || p.detalle || '').toLowerCase();
                const textoCompleto = `${titLower} ${descLower}`;

                if (p.seccion === 'tesoros') {
                    if (p.tit && p.tit.trim().startsWith('1.') && p.asig) {
                        registrar(p.asig, 'discurso', ordenGlobal, mesLabel);
                    } else if ((p.tit && p.tit.trim().startsWith('2.')) || textoCompleto.includes('perlas escondidas')) {
                        if (p.asig) registrar(p.asig, 'perlas', ordenGlobal, mesLabel);
                    } else if ((p.tit && p.tit.trim().startsWith('3.')) || textoCompleto.includes('lectura de la biblia')) {
                        if (p.asig) registrar(p.asig, 'lectura', ordenGlobal, mesLabel);
                    }
                } else if (p.seccion === 'maestros') {
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
                    if (textoCompleto.includes('estudio bíblico') || textoCompleto.includes('estudio biblico')) {
                        if (p.asig) registrar(p.asig, 'estudioBiblico', ordenGlobal, mesLabel);
                        if (p.asigAyudante) registrar(p.asigAyudante, 'lectorLibro', ordenGlobal, mesLabel);
                    } else {
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
 * Inyecta (si no existe) la barra de filtro Desde / Hasta arriba de Estadísticas
 */
window.asegurarBarraFiltroEstadisticas = function(contenedor) {
    if (document.getElementById('barraFiltroRangoEstadisticas')) return;

    const mesesLista = [
        { val: '01', txt: 'Enero' }, { val: '02', txt: 'Febrero' },
        { val: '03', txt: 'Marzo' }, { val: '04', txt: 'Abril' },
        { val: '05', txt: 'Mayo' }, { val: '06', txt: 'Junio' },
        { val: '07', txt: 'Julio' }, { val: '08', txt: 'Agosto' },
        { val: '09', txt: 'Septiembre' }, { val: '10', txt: 'Octubre' },
        { val: '11', txt: 'Noviembre' }, { val: '12', txt: 'Diciembre' }
    ];

    const anioActual = new Date().getFullYear();
    const aniosLista = [];
    for (let y = anioActual - 2; y <= anioActual + 2; y++) {
        aniosLista.push(y);
    }

    const optMeses = `<option value="">-- Mes --</option>` + mesesLista.map(m => `<option value="${m.val}">${m.txt}</option>`).join('');
    const optAnios = `<option value="">-- Año --</option>` + aniosLista.map(y => `<option value="${y}">${y}</option>`).join('');

    const barra = document.createElement('div');
    barra.id = 'barraFiltroRangoEstadisticas';
    barra.className = 'flex flex-wrap items-center gap-2 mb-3 p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs';
    barra.innerHTML = `
        <span class="font-bold text-slate-700">Filtrar período:</span>
        <div class="flex items-center gap-1">
            <label class="text-slate-600 font-semibold">Desde:</label>
            <select id="estDesdeMes" onchange="window.aplicarFiltroRangoEstadisticas()" class="border border-slate-300 rounded px-2 py-1 bg-white font-semibold text-slate-800">${optMeses}</select>
            <select id="estDesdeAnio" onchange="window.aplicarFiltroRangoEstadisticas()" class="border border-slate-300 rounded px-2 py-1 bg-white font-semibold text-slate-800">${optAnios}</select>
        </div>
        <div class="flex items-center gap-1">
            <label class="text-slate-600 font-semibold">Hasta:</label>
            <select id="estHastaMes" onchange="window.aplicarFiltroRangoEstadisticas()" class="border border-slate-300 rounded px-2 py-1 bg-white font-semibold text-slate-800">${optMeses}</select>
            <select id="estHastaAnio" onchange="window.aplicarFiltroRangoEstadisticas()" class="border border-slate-300 rounded px-2 py-1 bg-white font-semibold text-slate-800">${optAnios}</select>
        </div>
        <button type="button" onclick="window.limpiarFiltroRangoEstadisticas()" class="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded transition">
            Todo el historial
        </button>
        <span id="estInfoRangoActivo" class="text-[11px] font-semibold text-emerald-700 ml-auto">Mostrando: Todo el historial</span>
    `;

    contenedor.parentNode.insertBefore(barra, contenedor);
};

window.obtenerRangoEstadisticasSeleccionado = function() {
    const dMes = document.getElementById('estDesdeMes')?.value || '';
    const dAnio = document.getElementById('estDesdeAnio')?.value || '';
    const hMes = document.getElementById('estHastaMes')?.value || '';
    const hAnio = document.getElementById('estHastaAnio')?.value || '';

    const desdeNum = (dMes && dAnio) ? parseInt(`${dAnio}${dMes}`, 10) : null;
    const hastaNum = (hMes && hAnio) ? parseInt(`${hAnio}${hMes}`, 10) : null;

    const infoSpan = document.getElementById('estInfoRangoActivo');
    if (infoSpan) {
        if (desdeNum === null && hastaNum === null) {
            infoSpan.textContent = 'Mostrando: Todo el historial';
        } else {
            const txtDesde = desdeNum ? `${dMes}/${dAnio}` : 'Inicio';
            const txtHasta = hastaNum ? `${hMes}/${hAnio}` : 'Actualidad';
            infoSpan.textContent = `Período filtrado: ${txtDesde} → ${txtHasta}`;
        }
    }

    return { desdeNum, hastaNum };
};

window.aplicarFiltroRangoEstadisticas = function() {
    window.renderizarTablaHistorial(false);
};

window.limpiarFiltroRangoEstadisticas = function() {
    ['estDesdeMes', 'estDesdeAnio', 'estHastaMes', 'estHastaAnio'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    window.renderizarTablaHistorial(false);
};

/**
 * Feedback visual en el botón "Actualizar Conteo"
 */
window.mostrarFeedbackBotonConteo = function(estado) {
    const botones = Array.from(document.querySelectorAll('button')).filter(b =>
        b.textContent.includes('Actualizar Conteo') || b.dataset.esBotonConteo === '1'
    );

    botones.forEach(btn => {
        btn.dataset.esBotonConteo = '1';
        if (!btn.dataset.htmlOriginal) {
            btn.dataset.htmlOriginal = btn.innerHTML;
        }

        if (estado === 'cargando') {
            btn.disabled = true;
            btn.classList.add('opacity-75');
            btn.innerHTML = `<i class="fa-solid fa-rotate fa-spin mr-1"></i> Actualizando...`;
        } else if (estado === 'ok') {
            btn.disabled = false;
            btn.classList.remove('opacity-75');
            btn.innerHTML = `<i class="fa-solid fa-check mr-1 text-emerald-400"></i> Actualizado ✓`;
            setTimeout(() => {
                btn.innerHTML = btn.dataset.htmlOriginal;
            }, 1600);
        }
    });
};

/**
 * Normaliza la condición de un hermano a una clave canónica:
 * 'A', 'SM', 'Pub', 'PNB', 'E', 'Prec' o 'Otro' (cuando está vacía/null/no reconocida)
 */
window.normalizarCondicionHermano = function(condRaw) {
    const cond = (condRaw || '').trim();
    if (cond === 'A') return 'A';
    if (cond === 'SM') return 'SM';
    if (cond === 'Pub' || cond === 'Publicador') return 'Pub';
    if (cond === 'PNB') return 'PNB';
    if (cond === 'E' || cond === 'Estudio' || cond === 'Estudiante') return 'E';
    if (cond === 'Prec' || cond === 'Precursor' || cond === 'Precursora') return 'Prec';
    return 'Otro';
};

/**
 * Renderiza la tabla de Estadísticas Acumuladas en la pestaña "Estadísticas"
 */
window.renderizarTablaHistorial = async function(recargarBD = true) {
    const contenedor = document.getElementById('contenedorTablaHistorial');
    if (!contenedor) return;

    if (recargarBD) {
        window.mostrarFeedbackBotonConteo('cargando');
    }

    window.asegurarBarraFiltroEstadisticas(contenedor);
    const { desdeNum, hastaNum } = window.obtenerRangoEstadisticasSeleccionado();

    if (recargarBD || !window.historialAsignaciones || window.historialAsignaciones.length === 0) {
        await window.cargarHistorialDesdeSupabase();
    }

    window.procesarHistorialAsignaciones(desdeNum, hastaNum);

    const hermanos = window.listaHermanos || [];
    if (hermanos.length === 0) {
        contenedor.innerHTML = `<p class="text-center text-xs text-slate-500 py-6">No hay hermanos cargados en la congregación.</p>`;
        if (recargarBD) window.mostrarFeedbackBotonConteo('ok');
        return;
    }

    const categorias = [
        { key: 'A', titulo: 'Ancianos' },
        { key: 'SM', titulo: 'Siervos Ministeriales' },
        { key: 'Pub', titulo: 'Publicadores' },
        { key: 'PNB', titulo: 'Publicadores No Bautizados' },
        { key: 'E', titulo: 'Estudiantes' },
        { key: 'Prec', titulo: 'Precursores' },
        { key: 'Otro', titulo: 'Sin Categoría' }
    ];

    const grupos = { 'A': [], 'SM': [], 'Pub': [], 'PNB': [], 'E': [], 'Prec': [], 'Otro': [] };
    hermanos.forEach(h => {
        const claveCat = window.normalizarCondicionHermano(h.condicion);
        grupos[claveCat].push(h);
    });

    const thBase = 'px-1.5 py-2 border border-slate-700 text-center sticky top-0 z-20';

    let html = `
        <table class="w-full text-[11px] text-left border-collapse">
            <thead>
                <tr class="bg-slate-900 text-white uppercase text-[10px] font-extrabold">
                    <th class="px-2.5 py-2 border border-slate-700 sticky top-0 left-0 bg-slate-900 z-30 min-w-[170px]">Hermano / Hermana</th>
                    <th class="${thBase} bg-slate-900 w-10">Grp</th>
                    <th class="${thBase} bg-slate-800" title="Presidencia Entre Semana">Presid. ES</th>
                    <th class="${thBase} bg-slate-800" title="Oración Inicial y Final">Oración</th>
                    <th class="${thBase} bg-cyan-900" title="Discurso Tesoros de la Biblia">Tesoros</th>
                    <th class="${thBase} bg-cyan-800" title="Busquemos Perlas Escondidas">Perlas</th>
                    <th class="${thBase} bg-cyan-700" title="Lectura de la Biblia">Lectura</th>
                    <th class="${thBase} bg-amber-800" title="Seamos Mejores Maestros - Estudiante">SMM (E)</th>
                    <th class="${thBase} bg-amber-700" title="Seamos Mejores Maestros - Ayudante">SMM (A)</th>
                    <th class="${thBase} bg-rose-900" title="Nuestra Vida Cristiana - Tema Común">NVC (C)</th>
                    <th class="${thBase} bg-rose-800" title="Nuestra Vida Cristiana - Necesidades Locales">NVC (NL)</th>
                    <th class="${thBase} bg-rose-950" title="Conductor Estudio Bíblico de Congregación">EB</th>
                    <th class="${thBase} bg-rose-950" title="Lector Estudio Bíblico de Congregación">Lector L</th>
                    <th class="${thBase} bg-indigo-900" title="Presidencia Fin de Semana">Presid. FS</th>
                    <th class="${thBase} bg-indigo-800" title="Lector de La Atalaya">Lector W</th>
                    <th class="${thBase} bg-emerald-900">Total Hist.</th>
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

    html += `</tbody></table>`;
    contenedor.innerHTML = html;

    if (recargarBD) {
        window.mostrarFeedbackBotonConteo('ok');
    }
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
        const condCanon = window.normalizarCondicionHermano(h.condicion);
        const valorSelectCond = condCanon === 'Otro' ? '' : condCanon;

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
                    <option value="" ${valorSelectCond === '' ? 'selected' : ''}>-- Sin condición --</option>
                    <option value="Pub" ${valorSelectCond === 'Pub' ? 'selected' : ''}>Pub (Publicador)</option>
                    <option value="PNB" ${valorSelectCond === 'PNB' ? 'selected' : ''}>PNB (Publicador no bautizado)</option>
                    <option value="E" ${valorSelectCond === 'E' ? 'selected' : ''}>E (Estudio)</option>
                    <option value="SM" ${valorSelectCond === 'SM' ? 'selected' : ''}>SM (Siervo ministerial)</option>
                    <option value="A" ${valorSelectCond === 'A' ? 'selected' : ''}>A (Anciano)</option>
                    <option value="Prec" ${valorSelectCond === 'Prec' ? 'selected' : ''}>Prec (Precursor)</option>
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
