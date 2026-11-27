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
 * Procesa las planillas históricas y construye un mapa por hermano y rol
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

            if (sem.presidencia) {
                registrar(sem.presidencia, 'presi', ordenGlobal, mesLabel);
                registrar(sem.presidencia, 'tesoros', ordenGlobal, mesLabel);
            }
            if (sem.oracionIni) registrar(sem.oracionIni, 'oraciones', ordenGlobal, mesLabel);
            if (sem.repaso) {
                registrar(sem.repaso, 'presi', ordenGlobal, mesLabel);
                registrar(sem.repaso, 'nvc', ordenGlobal, mesLabel);
            }
            if (sem.oracionFin) registrar(sem.oracionFin, 'oraciones', ordenGlobal, mesLabel);
            if (sem.domPresi) registrar(sem.domPresi, 'presiDom', ordenGlobal, mesLabel);
            if (sem.domLector) registrar(sem.domLector, 'lectorAtalaya', ordenGlobal, mesLabel);

            (sem.partes || []).forEach(p => {
                const titLower = (p.tit || '').toLowerCase();

                if (p.seccion === 'tesoros') {
                    if (p.asig) registrar(p.asig, 'tesoros', ordenGlobal, mesLabel);
                    if (p.tit.startsWith('1.') && p.asig) registrar(p.asig, 'discurso', ordenGlobal, mesLabel);
                    if (p.tit.startsWith('2.') && p.asig) registrar(p.asig, 'perlas', ordenGlobal, mesLabel);
                    if ((p.tit.startsWith('3.') || titLower.includes('lectura')) && p.asig) {
                        registrar(p.asig, 'smm', ordenGlobal, mesLabel);
                    }
                } else if (p.seccion === 'maestros') {
                    [p.asig, p.asigAyudante, p.asigB, p.asigBAyudante, p.asigC, p.asigCAyudante].forEach(nom => {
                        if (nom) registrar(nom, 'smm', ordenGlobal, mesLabel);
                    });
                } else if (p.seccion === 'vida') {
                    if (p.asig) registrar(p.asig, 'nvc', ordenGlobal, mesLabel);
                    if (titLower.includes('estudio bíblico')) {
                        if (p.asig) registrar(p.asig, 'estudioBiblico', ordenGlobal, mesLabel);
                        if (p.asigAyudante) registrar(p.asigAyudante, 'lectorLibro', ordenGlobal, mesLabel);
                    } else {
                        if (p.asig) registrar(p.asig, 'nvcOtro', ordenGlobal, mesLabel);
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

    return [...listaAptos].sort((a, b) => {
        const keyA = (a.nombre || '').trim().toLowerCase();
        const keyB = (b.nombre || '').trim().toLowerCase();

        const infoA = (mapa[keyA] && mapa[keyA][rol]) ? mapa[keyA][rol] : { count: 0, lastOrder: -1 };
        const infoB = (mapa[keyB] && mapa[keyB][rol]) ? mapa[keyB][rol] : { count: 0, lastOrder: -1 };

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

    const conteoMesActivo = {};
    const sumarActivo = (nom, cat) => {
        if (!nom) return;
        const k = nom.split('(')[0].trim().toLowerCase();
        if (!conteoMesActivo[k]) conteoMesActivo[k] = { tesoros: 0, smm: 0, nvc: 0, presi: 0, oraciones: 0 };
        conteoMesActivo[k][cat] = (conteoMesActivo[k][cat] || 0) + 1;
    };

    (window.programaMes || []).forEach(sem => {
        if (!sem || sem.tipoSemana === 'asamblea' || sem.tipoSemana === 'conmemoracion') return;
        if (sem.presidencia) { sumarActivo(sem.presidencia, 'presi'); sumarActivo(sem.presidencia, 'tesoros'); }
        if (sem.oracionIni) sumarActivo(sem.oracionIni, 'oraciones');
        if (sem.repaso) { sumarActivo(sem.repaso, 'presi'); sumarActivo(sem.repaso, 'nvc'); }
        if (sem.oracionFin) sumarActivo(sem.oracionFin, 'oraciones');

        (sem.partes || []).forEach(p => {
            if (p.seccion === 'tesoros') {
                if (p.asig) sumarActivo(p.asig, 'tesoros');
                if ((p.tit.startsWith('3.') || (p.tit || '').toLowerCase().includes('lectura')) && p.asig) {
                    sumarActivo(p.asig, 'smm');
                }
            } else if (p.seccion === 'maestros') {
                [p.asig, p.asigAyudante, p.asigB, p.asigBAyudante, p.asigC, p.asigCAyudante].forEach(n => sumarActivo(n, 'smm'));
            } else if (p.seccion === 'vida') {
                if (p.asig) sumarActivo(p.asig, 'nvc');
            }
        });
    });

    let html = `
        <table class="w-full text-xs text-left border-collapse">
            <thead class="bg-slate-900 text-white uppercase text-[11px] font-extrabold sticky top-0 z-10">
                <tr>
                    <th class="px-3 py-2 border border-slate-700">Hermano / Hermana</th>
                    <th class="px-2 py-2 border border-slate-700 text-center w-14">Grupo</th>
                    <th class="px-2 py-2 border border-slate-700 text-center bg-cyan-900">Tesoros</th>
                    <th class="px-2 py-2 border border-slate-700 text-center bg-amber-800">Maestros</th>
                    <th class="px-2 py-2 border border-slate-700 text-center bg-rose-900">Vida Crist.</th>
                    <th class="px-2 py-2 border border-slate-700 text-center bg-slate-800">Presid.</th>
                    <th class="px-2 py-2 border border-slate-700 text-center bg-slate-800">Oraciones</th>
                    <th class="px-2 py-2 border border-slate-700 text-center bg-emerald-900">Total Hist.</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
    `;

    const mapaHist = window.historialPorHermanoRol || {};

    categorias.forEach(cat => {
        const lista = grupos[cat.key];
        if (!lista || lista.length === 0) return;

        html += `
            <tr class="bg-slate-200 font-black text-slate-800 uppercase text-[11px]">
                <td colspan="8" class="px-3 py-1.5 border border-slate-300">${cat.titulo} (${lista.length})</td>
            </tr>
        `;

        lista.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')).forEach(h => {
            const k = (h.nombre || '').trim().toLowerCase();
            const hData = mapaHist[k] || {};

            const cTesoros = hData.tesoros ? hData.tesoros.count : 0;
            const cSmm = hData.smm ? hData.smm.count : 0;
            const cNvc = hData.nvc ? hData.nvc.count : 0;
            const cPresi = hData.presi ? hData.presi.count : 0;
            const cOrac = hData.oraciones ? hData.oraciones.count : 0;
            const totalHist = cTesoros + cSmm + cNvc + cOrac;

            const mesT = hData.tesoros ? hData.tesoros.lastMes : '';
            const mesS = hData.smm ? hData.smm.lastMes : '';
            const mesN = hData.nvc ? hData.nvc.lastMes : '';

            html += `
                <tr class="hover:bg-slate-50 transition">
                    <td class="px-3 py-1.5 font-bold text-slate-900 border border-slate-200">${h.nombre}</td>
                    <td class="px-2 py-1.5 text-center text-slate-600 border border-slate-200">${h.grupo || '-'}</td>
                    <td class="px-2 py-1.5 text-center font-bold text-cyan-900 border border-slate-200" title="Último: ${mesT}">${cTesoros}</td>
                    <td class="px-2 py-1.5 text-center font-bold text-amber-900 border border-slate-200" title="Último: ${mesS}">${cSmm}</td>
                    <td class="px-2 py-1.5 text-center font-bold text-rose-900 border border-slate-200" title="Último: ${mesN}">${cNvc}</td>
                    <td class="px-2 py-1.5 text-center font-semibold text-slate-700 border border-slate-200">${cPresi}</td>
                    <td class="px-2 py-1.5 text-center font-semibold text-slate-700 border border-slate-200">${cOrac}</td>
                    <td class="px-2 py-1.5 text-center font-black text-emerald-900 bg-emerald-50/50 border border-slate-200">${totalHist}</td>
                </tr>
            `;
        });
    });

    html += `</tbody></table>`;
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
