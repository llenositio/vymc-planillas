/**
 * Módulo de Planilla Mensual de Acomodadores y Audio / Video (AV)
 */

window.programaMesAV = [];
window.ausenciasMes = [];

/**
 * Carga la planilla AV guardada desde Supabase para la congregación activa
 */
window.cargarPlanillaAVDesdeSupabase = async function() {
    let idCongre = window.congregacionIdActual;
    if (!idCongre && window.congregacionActual) {
        idCongre = window.congregacionActual.id;
    }

    if (!idCongre) return;

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
    } else if (data && data.datos && Array.isArray(data.datos) && data.datos.length > 0) {
        window.programaMesAV = data.datos;
    } else if (window.programaMes && window.programaMes.length > 0) {
        window.programaMesAV = window.programaMes.map(sem => ({
            fecha: sem.fecha || 'Semana',
            puestos: sem.puestosAV || {}
        }));
    }

    window.renderizarPlanillaAV();
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
 * Evalúa si una fecha corresponde a Entre Semana (ES) o Fin de Semana (FS)
 */
function determinarTipoDia(fechaStr) {
    if (!fechaStr) return 'ES';
    const texto = fechaStr.toLowerCase();
    if (texto.includes('sáb') || texto.includes('sab') || texto.includes('dom') || texto.includes('fin')) {
        return 'FS';
    }
    const fecha = new Date(fechaStr);
    if (!isNaN(fecha.getTime())) {
        const diaSemana = fecha.getDay();
        return (diaSemana === 0 || diaSemana === 6) ? 'FS' : 'ES';
    }
    return 'ES';
}

/**
 * MOTOR DE DESCARTE INTELIGENTE
 * Obtiene la lista filtrada de hermanos elegibles para un puesto y fecha específica
 */
window.obtenerElegiblesAV = function(puestoClave, fechaStr, asignacionesSemanaAV = {}, asignacionesVyMCFecha = []) {
    const tipoDia = determinarTipoDia(fechaStr);
    const campoAptitud = `${puestoClave}_${tipoDia.toLowerCase()}`;

    // 1. Filtrar por aptitud en la tabla hermanos_av
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
    if (asignacionesVyMCFecha.length > 0) {
        elegibles = elegibles.filter(h => !asignacionesVyMCFecha.includes(h.nombre));
    }

    // 4. Filtro de Doble Asignación en AV ese mismo día
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
 * Verifica si la asignación actual genera un conflicto con VyMC a posteriori
 */
window.detectarConflictoVyMC = function(nombreHermano, asignacionesVyMCFecha = []) {
    if (!nombreHermano || nombreHermano.startsWith('--') || nombreHermano === 'ASAMBLEA') return false;
    return asignacionesVyMCFecha.includes(nombreHermano);
};

/**
 * Renderiza la Planilla Mensual AV en pantalla adaptada a los puestos dinámicos
 */
window.renderizarPlanillaAV = function() {
    const contenedor = document.getElementById('contenedorPlanillaAV');
    if (!contenedor) return;

    // Si no hay programa cargado, tomar semanas de VyMC
    if ((!window.programaMesAV || window.programaMesAV.length === 0) && window.programaMes) {
        window.programaMesAV = window.programaMes.map(sem => ({
            fecha: sem.fecha || 'Semana',
            puestos: sem.puestosAV || {}
        }));
    }

    const esMensajero = (typeof window.rolUsuarioActual === 'string' && window.rolUsuarioActual.startsWith('mensajero_'));

    let html = `
        <table class="w-full text-xs text-left border-collapse bg-white">
            <thead class="bg-slate-800 text-white font-bold uppercase text-[11px]">
                <tr>
                    <th class="p-2 border border-slate-700 w-36">Fecha / Semana</th>
    `;

    // Encabezados según los puestos activos
    (window.puestosConfigAV || []).forEach(p => {
        html += `<th class="p-2 border border-slate-700 text-center">${p.label}</th>`;
    });

    html += `
                    <th class="p-2 border border-slate-700 text-center w-12">WA</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
    `;

    (window.programaMesAV || []).forEach((sem, idx) => {
        html += `<tr class="hover:bg-slate-50">`;
        html += `<td class="p-2 font-bold text-slate-900 border border-slate-200">${sem.fecha}</td>`;

        (window.puestosConfigAV || []).forEach(p => {
            const asignadoActual = (sem.puestos && sem.puestos[p.key]) || '';
            const elegibles = window.obtenerElegiblesAV(p.key, sem.fecha, sem.puestos || {});
            const disabled = esMensajero ? 'disabled' : '';

            html += `<td class="p-1 border border-slate-200">`;
            html += `<select ${disabled} class="celda-asignacion-av w-full bg-transparent font-semibold text-xs border border-slate-300 rounded p-1 outline-none focus:ring-2 focus:ring-emerald-500" onchange="window.asignarHermanoAV(${idx}, '${p.key}', this.value)">`;
            html += `<option value="">-- SELECCIONAR --</option>`;
            
            if (asignadoActual && !elegibles.some(e => e.nombre === asignadoActual)) {
                html += `<option value="${asignadoActual}" selected>${asignadoActual}</option>`;
            }

            elegibles.forEach(e => {
                const sel = (e.nombre === asignadoActual) ? 'selected' : '';
                html += `<option value="${e.nombre}" ${sel}>${e.nombre}</option>`;
            });

            html += `</select></td>`;
        });

        html += `
            <td class="p-1 border border-slate-200 text-center">
                <button onclick="if(typeof window.enviarWhatsAppCuadrillaAV==='function') window.enviarWhatsAppCuadrillaAV(${idx});" title="Enviar WhatsApp a la cuadrilla" class="text-emerald-600 hover:text-emerald-800 font-bold p-1">
                    <i class="fa-brands fa-whatsapp text-lg"></i>
                </button>
            </td>
        `;
        html += `</tr>`;
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
 * Asigna un hermano a un puesto en la semana seleccionada
 */
window.asignarHermanoAV = function(indexSemana, puestoKey, nombre) {
    if (!window.programaMesAV[indexSemana]) return;
    if (!window.programaMesAV[indexSemana].puestos) window.programaMesAV[indexSemana].puestos = {};
    
    window.programaMesAV[indexSemana].puestos[puestoKey] = nombre;
    window.renderizarPlanillaAV();
};

/**
 * Guardar planilla AV en Supabase
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

    const payload = {
        congregacion_id: idCongre,
        mes_ano: mesClave,
        datos: window.programaMesAV,
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
