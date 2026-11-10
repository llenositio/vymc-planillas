/**
 * Módulo de Planilla Mensual de Acomodadores y Audio / Video (AV) - Estructura Desglosada (ES / FS)
 */

window.programaMesAV = [];
window.ausenciasMes = [];

/**
 * Carga la planilla AV guardada desde Supabase asegurando la carga previa de la matriz de elegibles
 */
window.cargarPlanillaAVDesdeSupabase = async function() {
    let idCongre = window.congregacionIdActual;
    if (!idCongre && window.congregacionActual) {
        idCongre = window.congregacionActual.id;
    }

    if (!idCongre) return;

    // SOLUCIÓN PUNTO 2b: Cargar la matriz de elegibles automáticamente si no está en memoria
    if (!window.listaHermanosAV || window.listaHermanosAV.length === 0) {
        if (typeof window.cargarElegiblesAVDesdeSupabase === 'function') {
            await window.cargarElegiblesAVDesdeSupabase();
        }
    }

    const inputMes = document.getElementById('inputNombreMes');
    const mesClave = (inputMes && inputMes.value.trim()) ? inputMes.value.trim().toUpperCase() : 'ACTUAL';

    const { data, error } = await db
        .from('planillas_av')
        .select('*')
        .eq('congregacion_id', idCongre)
        .eq('mes_ano', mesClave)
        .maybeSingle();

    if (error) {
        console.error("Error cargando planilla AV desde Supabase:", error);
    } else if (data) {
        if (data.datos && Array.isArray(data.datos) && data.datos.length > 0) {
            window.programaMesAV = data.datos;
        } else {
            window.sincronizarSemanasDesdeVyMC();
        }

        // Cargar el teléfono del grupo/cuadrilla guardado
        const inputTel = document.getElementById('inputTelGrupoAV');
        if (inputTel && data.telefono_grupo) {
            inputTel.value = data.telefono_grupo;
        }
    } else {
        // Si no hay datos guardados en Supabase, sincronizar semanas desde el programa VyMC principal
        window.sincronizarSemanasDesdeVyMC();
    }

    window.renderizarPlanillaAV();
};

/**
 * Sincroniza semanas generando la estructura desglosada para ES y FS
 */
window.sincronizarSemanasDesdeVyMC = function() {
    const programaBase = window.programaMes || window.programaVyMC || window.programaActual || [];
    if (Array.isArray(programaBase) && programaBase.length > 0) {
        window.programaMesAV = programaBase.map(sem => ({
            fecha: sem.fecha || sem.semana || 'Semana',
            puestosES: sem.puestosAV_ES || sem.puestosAV || {},
            puestosFS: sem.puestosAV_FS || {}
        }));
    }
};

/**
 * Carga las ausencias registradas para la congregación activa
 */
window.cargarAusenciasDesdeSupabase = async function() {
    let idCongre = window.congregacionIdActual;
    if (!idCongre && window.congregacionActual) {
        idCongre = window.congregacionActual.id;
    }

    if (!idCongre) return;

    const { data, error } = await db
        .from('ausencias')
        .select('*')
        .eq('congregacion_id', idCongre);

    if (error) {
        console.error("Error cargando ausencias:", error);
        return;
    }
    window.ausenciasMes = data || [];
};

/**
 * MOTOR DE DESCARTE INTELIGENTE
 * Obtiene la lista filtrada de hermanos elegibles según el puesto y tipo de reunión ('ES' o 'FS')
 */
window.obtenerElegiblesAVPorTipo = function(puestoClave, tipoDia, fechaStr, asignacionesSemanaAV = {}, asignacionesVyMCFecha = []) {
    const campoAptitud = `${puestoClave}_${tipoDia.toLowerCase()}`;

    // 1. Filtrar por aptitud en la matriz hermanos_av
    let elegibles = (window.listaHermanosAV || []).filter(h => h[campoAptitud] === true);

    // 2. Filtro de Ausencias Programadas
    if (fechaStr && window.ausenciasMes && window.ausenciasMes.length > 0) {
        const fechaObj = new Date(fechaStr);
        elegibles = elegibles.filter(h => {
            const ausente = window.ausenciasMes.some(a => {
                if (a.hermano_id !== h.hermano_id) return false;
                const inicio = new Date(a.fecha_inicio);
                const fin = new Date(a.fecha_fin);
                return fechaObj >= inicio && fechaObj <= fin;
            });
            return !ausente;
        });
    }

    // 3. Filtro VyMC (Escuela): Excluir si tiene asignación en la Escuela esa misma reunión
    if (tipoDia === 'ES' && asignacionesVyMCFecha.length > 0) {
        elegibles = elegibles.filter(h => !asignacionesVyMCFecha.includes(h.nombre));
    }

    // 4. Filtro de Doble Asignación en AV en la misma reunión
    const asignadosHoy = Object.entries(asignacionesSemanaAV)
        .filter(([puesto, nombre]) => puesto !== puestoClave && nombre)
        .map(([_, nombre]) => nombre);

    elegibles = elegibles.filter(h => !asignadosHoy.includes(h.nombre));

    // 5. Ordenar por contador histórico (sugeridos primero los de menor participación)
    elegibles.sort((a, b) => {
        const cantA = (window.conteoHistoricoAV && window.conteoHistoricoAV[a.nombre]) || 0;
        const cantB = (window.conteoHistoricoAV && window.conteoHistoricoAV[b.nombre]) || 0;
        return cantA - cantB;
    });

    return elegibles;
};

/**
 * Renderiza la Planilla Mensual AV desglosada en 2 filas por semana (ES y FS)
 */
window.renderizarPlanillaAV = function() {
    const contenedor = document.getElementById('contenedorPlanillaAV');
    if (!contenedor) return;

    // Si no hay semanas cargadas, intentar sincronizar con VyMC
    if (!window.programaMesAV || window.programaMesAV.length === 0) {
        window.sincronizarSemanasDesdeVyMC();
    }

    if (!window.programaMesAV || window.programaMesAV.length === 0) {
        contenedor.innerHTML = `
            <div class="p-6 text-center text-slate-500 bg-white rounded-lg border border-slate-200 shadow-sm">
                <i class="fa-solid fa-calendar-xmark text-3xl mb-2 text-slate-400"></i>
                <p class="font-bold">No hay programa de reuniones cargado aún.</p>
                <p class="text-xs text-slate-400 mt-1">Carga o genera primero las semanas en la pestaña "Planilla VyMC".</p>
            </div>
        `;
        return;
    }

    const esMensajero = (typeof window.rolUsuarioActual === 'string' && window.rolUsuarioActual.startsWith('mensajero_'));

    let html = `
        <table class="w-full text-xs text-left border-collapse bg-white shadow-sm rounded-lg overflow-hidden border border-slate-300">
            <thead class="bg-slate-900 text-white font-bold uppercase text-[11px]">
                <tr>
                    <th class="p-2 border border-slate-700 w-36 text-center">Semana</th>
                    <th class="p-2 border border-slate-700 w-28 text-center">Reunión</th>
    `;

    // Encabezados dinámicos según matriz_av
    (window.puestosConfigAV || []).forEach(p => {
        html += `<th class="p-2 border border-slate-700 text-center">${p.label}</th>`;
    });

    html += `
                    <th class="p-2 border border-slate-700 text-center w-10">WA Grupo</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-300 font-medium">
    `;

    (window.programaMesAV || []).forEach((sem, idx) => {
        // Asegurar la inicialización de los objetos ES y FS
        if (!sem.puestosES) sem.puestosES = sem.puestos || {};
        if (!sem.puestosFS) sem.puestosFS = {};

        // ---------------------------------------------------------------------
        // FILA 1: ENTRE SEMANA (JUEVES / ES)
        // ---------------------------------------------------------------------
        html += `<tr class="bg-slate-50/80 hover:bg-slate-100/80 transition">`;
        html += `<td rowspan="2" class="p-2 font-black text-slate-900 border border-slate-300 bg-white align-middle text-center">${sem.fecha}</td>`;
        html += `<td class="p-1.5 border border-slate-300 text-center bg-emerald-100/70 text-emerald-900 font-black tracking-wide">ENTRE SEMANA</td>`;

        (window.puestosConfigAV || []).forEach(p => {
            const asignadoES = sem.puestosES[p.key] || '';
            const elegiblesES = window.obtenerElegiblesAVPorTipo(p.key, 'ES', sem.fecha, sem.puestosES);
            const disabled = esMensajero ? 'disabled' : '';

            // SOLUCIÓN PUNTO 2a: Ícono chiquito de WhatsApp individual al lado del selector
            html += `<td class="p-1 border border-slate-300">`;
            html += `<div class="flex items-center gap-1">`;
            html += `<select ${disabled} class="celda-asignacion-av flex-1 bg-transparent font-bold text-xs border border-slate-300 rounded p-1 outline-none focus:ring-2 focus:ring-emerald-500" onchange="window.asignarHermanoAVPorTipo(${idx}, 'ES', '${p.key}', this.value)">`;
            html += `<option value="">-- SELECCIONAR --</option>`;

            if (asignadoES && !elegiblesES.some(e => e.nombre === asignadoES)) {
                html += `<option value="${asignadoES}" selected>${asignadoES}</option>`;
            }

            elegiblesES.forEach(e => {
                const sel = (e.nombre === asignadoES) ? 'selected' : '';
                html += `<option value="${e.nombre}" ${sel}>${e.nombre}</option>`;
            });

            html += `</select>`;
            html += `<button onclick="if(typeof window.enviarWhatsAppIndividualAV==='function') window.enviarWhatsAppIndividualAV(${idx}, 'ES', '${p.key}');" title="WhatsApp Individual" class="text-emerald-600 hover:text-emerald-800 font-bold p-0.5">`;
            html += `<i class="fa-brands fa-whatsapp text-sm"></i>`;
            html += `</button>`;
            html += `</div></td>`;
        });

        html += `
            <td class="p-1 border border-slate-300 text-center">
                <button onclick="if(typeof window.enviarWhatsAppCuadrillaAV==='function') window.enviarWhatsAppCuadrillaAV(${idx}, 'ES');" title="WhatsApp Entre Semana" class="text-emerald-600 hover:text-emerald-800 font-bold p-1">
                    <i class="fa-brands fa-whatsapp text-lg"></i>
                </button>
            </td>
        </tr>`;

        // ---------------------------------------------------------------------
        // FILA 2: FIN DE SEMANA (DOMINGO / FS)
        // ---------------------------------------------------------------------
        html += `<tr class="bg-white hover:bg-slate-50 transition border-b-2 border-slate-400">`;
        html += `<td class="p-1.5 border border-slate-300 text-center bg-blue-100/70 text-blue-900 font-black tracking-wide">FIN DE SEMANA</td>`;

        (window.puestosConfigAV || []).forEach(p => {
            const asignadoFS = sem.puestosFS[p.key] || '';
            const elegiblesFS = window.obtenerElegiblesAVPorTipo(p.key, 'FS', sem.fecha, sem.puestosFS);
            const disabled = esMensajero ? 'disabled' : '';

            // SOLUCIÓN PUNTO 2a: Ícono chiquito de WhatsApp individual al lado del selector
            html += `<td class="p-1 border border-slate-300">`;
            html += `<div class="flex items-center gap-1">`;
            html += `<select ${disabled} class="celda-asignacion-av flex-1 bg-transparent font-bold text-xs border border-slate-300 rounded p-1 outline-none focus:ring-2 focus:ring-blue-500" onchange="window.asignarHermanoAVPorTipo(${idx}, 'FS', '${p.key}', this.value)">`;
            html += `<option value="">-- SELECCIONAR --</option>`;

            if (asignadoFS && !elegiblesFS.some(e => e.nombre === asignadoFS)) {
                html += `<option value="${asignadoFS}" selected>${asignadoFS}</option>`;
            }

            elegiblesFS.forEach(e => {
                const sel = (e.nombre === asignadoFS) ? 'selected' : '';
                html += `<option value="${e.nombre}" ${sel}>${e.nombre}</option>`;
            });

            html += `</select>`;
            html += `<button onclick="if(typeof window.enviarWhatsAppIndividualAV==='function') window.enviarWhatsAppIndividualAV(${idx}, 'FS', '${p.key}');" title="WhatsApp Individual" class="text-blue-600 hover:text-blue-800 font-bold p-0.5">`;
            html += `<i class="fa-brands fa-whatsapp text-sm"></i>`;
            html += `</button>`;
            html += `</div></td>`;
        });

        html += `
            <td class="p-1 border border-slate-300 text-center">
                <button onclick="if(typeof window.enviarWhatsAppCuadrillaAV==='function') window.enviarWhatsAppCuadrillaAV(${idx}, 'FS');" title="WhatsApp Fin de Semana" class="text-emerald-600 hover:text-emerald-800 font-bold p-1">
                    <i class="fa-brands fa-whatsapp text-lg"></i>
                </button>
            </td>
        </tr>`;
    });

    html += `
            </tbody>
        </table>
    `;

    contenedor.innerHTML = html;

    if (typeof window.actualizarTablaVerdeRepeticiones === 'function') {
        window.actualizarTablaVerdeRepeticiones();
    }
};

/**
 * Asigna un hermano diferenciando ENTRE SEMANA (ES) y FIN DE SEMANA (FS)
 */
window.asignarHermanoAVPorTipo = function(indexSemana, tipoDia, puestoKey, nombre) {
    if (!window.programaMesAV[indexSemana]) return;
    
    const campo = (tipoDia === 'ES') ? 'puestosES' : 'puestosFS';
    if (!window.programaMesAV[indexSemana][campo]) {
        window.programaMesAV[indexSemana][campo] = {};
    }

    window.programaMesAV[indexSemana][campo][puestoKey] = nombre;
    window.renderizarPlanillaAV();
};

/**
 * Mantiene compatibilidad con llamadas antiguas
 */
window.asignarHermanoAV = function(indexSemana, puestoKey, nombre) {
    window.asignarHermanoAVPorTipo(indexSemana, 'ES', puestoKey, nombre);
};

/**
 * Guardar planilla AV en Supabase (incluyendo el número del grupo)
 */
window.guardarPlanillaAVEnSupabase = async function() {
    if (window.rolUsuarioActual && window.rolUsuarioActual.startsWith('mensajero_')) {
        alert("El usuario mensajero no tiene permisos para modificar la planilla.");
        return;
    }

    let idCongre = window.congregacionIdActual;
    if (!idCongre && window.congregacionActual) {
        idCongre = window.congregacionActual.id;
    }

    if (!idCongre) return;

    const inputMes = document.getElementById('inputNombreMes');
    const mesClave = (inputMes && inputMes.value.trim()) ? inputMes.value.trim().toUpperCase() : 'ACTUAL';

    const inputTel = document.getElementById('inputTelGrupoAV');
    const telGrupo = inputTel ? inputTel.value.trim() : '';

    const payload = {
        congregacion_id: idCongre,
        mes_ano: mesClave,
        datos: window.programaMesAV,
        telefono_grupo: telGrupo,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await db
        .from('planillas_av')
        .upsert(payload, { onConflict: 'congregacion_id,mes_ano' })
        .select();

    if (error) {
        console.error("Error guardando planilla AV:", error);
        alert("Error al guardar planilla AV: " + error.message);
    } else {
        console.log("Planilla AV guardada con éxito:", data);
        alert("Planilla AV guardada con éxito.");
    }
};

// Disparo inicial automático
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.cargarPlanillaAVDesdeSupabase();
} else {
    document.addEventListener('DOMContentLoaded', () => window.cargarPlanillaAVDesdeSupabase());
}
