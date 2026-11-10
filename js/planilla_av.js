/**
 * Módulo de Planilla Mensual de Acomodadores y Audio / Video (AV)
 */

window.programaMesAV = [];
window.ausenciasMes = [];

/**
 * Carga las ausencias registradas para la congregación activa
 */
window.cargarAusenciasDesdeSupabase = async function() {
    if (!window.congregacionIdActual) return;

    const { data, error } = await db
        .from('ausencias')
        .select('*')
        .eq('congregacion_id', window.congregacionIdActual);

    if (error) {
        console.error("Error cargando ausencias:", error);
        return;
    }
    window.ausenciasMes = data || [];
};

/**
 * Mapeo de columnas unificadas y su correspondencia en la tabla hermanos_av
 */
const CONFIG_COLUMNAS_AV = [
    { clave: 'puerta', titulo: 'PUERTA', es: 'puerta_es', fs: 'puerta_fs' },
    { clave: 'aud1', titulo: 'AUDITORIO 1', es: 'aud1_es', fs: 'aud1_fs' },
    { clave: 'aud2', titulo: 'AUDITORIO 2', es: 'aud2_es', fs: 'aud2_fs' },
    { clave: 'mic1', titulo: 'MIC 1', es: 'mic1_es', fs: 'mic1_fs' },
    { clave: 'mic2', titulo: 'MIC 2', es: 'mic2_es', fs: 'mic2_fs' },
    { clave: 'audio', titulo: 'AUDIO', es: 'audio_es', fs: 'audio_fs' },
    { clave: 'video', titulo: 'VIDEO', es: 'video_es', fs: 'video_fs' }
];

/**
 * Evalúa si una fecha corresponde a Entre Semana (ES) o Fin de Semana (FS)
 * Lunes (1) a Viernes (5) => ES | Sábado (6) y Domingo (0) => FS
 */
function determinarTipoDia(fechaStr) {
    if (!fechaStr) return 'ES';
    const fecha = new Date(fechaStr);
    const diaSemana = fecha.getDay();
    return (diaSemana === 0 || diaSemana === 6) ? 'FS' : 'ES';
}

/**
 * MOTOR DE DESCARTE INTELIGENTE
 * Obtiene la lista filtrada de hermanos elegibles para un puesto y fecha específica
 */
window.obtenerElegiblesAV = function(puestoClave, fechaStr, asignacionesSemanaAV = {}, asignacionesVyMCFecha = []) {
    const config = CONFIG_COLUMNAS_AV.find(c => c.clave === puestoClave);
    if (!config) return [];

    const tipoDia = determinarTipoDia(fechaStr);
    const campoAptitud = (tipoDia === 'FS') ? config.fs : config.es;

    // 1. Filtrar por aptitud en la tabla hermanos_av
    let elegibles = (window.listaHermanosAV || []).filter(h => h[campoAptitud] === true);

    // 2. Filtro de Ausencias Programadas
    if (fechaStr && window.ausenciasMes.length > 0) {
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
 * Guardar planilla AV en Supabase
 */
window.guardarPlanillaAVEnSupabase = async function() {
    if (window.rolUsuarioActual && window.rolUsuarioActual.startsWith('mensajero_')) {
        alert("El usuario mensajero no tiene permisos para modificar la planilla.");
        return;
    }

    if (!window.congregacionIdActual) return;

    const inputMes = document.getElementById('inputNombreMes');
    const mesClave = (inputMes && inputMes.value.trim()) ? inputMes.value.trim().toUpperCase() : 'ACTUAL';

    const payload = {
        congregacion_id: window.congregacionIdActual,
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
    }
};
