/**
 * Módulo de Gestión de Elegibles Acomodadores / Audio y Video (hermanos_av)
 */

window.listaHermanosAV = [];

/**
 * Carga los elegibles de AV desde Supabase cruzando con la tabla principal de hermanos
 */
window.cargarElegiblesAVDesdeSupabase = async function() {
    if (!window.congregacionIdActual) return;

    // 1. Obtener todos los hermanos de la congregación (de la tabla principal hermanos)
    const { data: hermanos, error: errHermanos } = await db
        .from('hermanos')
        .select('id, nombre, telefono, sexo, activo')
        .eq('congregacion_id', window.congregacionIdActual)
        .order('nombre', { ascending: true });

    if (errHermanos) {
        console.error("Error cargando lista general de hermanos:", errHermanos);
        return;
    }

    // 2. Obtener la matriz de aptitudes AV (tabla hermanos_av)
    const { data: aptitudesAV, error: errAV } = await db
        .from('hermanos_av')
        .select('*')
        .eq('congregacion_id', window.congregacionIdActual);

    if (errAV) {
        console.error("Error cargando aptitudes AV:", errAV);
        return;
    }

    // Mapear aptitudes por hermano_id para rápido acceso
    const mapaAptitudes = {};
    (aptitudesAV || []).forEach(item => {
        mapaAptitudes[item.hermano_id] = item;
    });

    // 3. Consolidar lista (solo varones o según criterio)
    window.listaHermanosAV = (hermanos || []).map(h => {
        const apt = mapaAptitudes[h.id] || {};
        return {
            hermano_id: h.id,
            nombre: h.nombre,
            telefono: h.telefono || '',
            puerta_es: !!apt.puerta_es,
            puerta_fs: !!apt.puerta_fs,
            aud1_es: !!apt.aud1_es,
            aud1_fs: !!apt.aud1_fs,
            aud2_es: !!apt.aud2_es,
            aud2_fs: !!apt.aud2_fs,
            mic1_es: !!apt.mic1_es,
            mic1_fs: !!apt.mic1_fs,
            mic2_es: !!apt.mic2_es,
            mic2_fs: !!apt.mic2_fs,
            audio_es: !!apt.audio_es,
            audio_fs: !!apt.audio_fs,
            video_es: !!apt.video_es,
            video_fs: !!apt.video_fs
        };
    });

    if (typeof renderizarMatrizAV === 'function') {
        renderizarMatrizAV();
    }
};

/**
 * Renderiza la tabla HTML de la Matriz de Elegibles AV
 */
window.renderizarMatrizAV = function() {
    const contenedor = document.getElementById('contenedorMatrizAV');
    if (!contenedor) return;

    const esMensajero = (typeof window.rolUsuarioActual === 'string' && window.rolUsuarioActual.startsWith('mensajero_'));

    let html = `
        <div class="overflow-x-auto shadow-md rounded-lg border border-slate-200">
            <table class="w-full text-xs text-left text-slate-700 bg-white">
                <thead class="text-[11px] uppercase bg-slate-800 text-white font-bold tracking-wider">
                    <tr>
                        <th class="px-3 py-2 border-b border-slate-700">Hermano</th>
                        <th class="px-2 py-2 text-center border-b border-slate-700 bg-emerald-900/40">Puerta ES</th>
                        <th class="px-2 py-2 text-center border-b border-slate-700 bg-emerald-800/40">Puerta FS</th>
                        <th class="px-2 py-2 text-center border-b border-slate-700 bg-blue-900/40">Aud 1 ES</th>
                        <th class="px-2 py-2 text-center border-b border-slate-700 bg-blue-800/40">Aud 1 FS</th>
                        <th class="px-2 py-2 text-center border-b border-slate-700 bg-teal-900/40">Aud 2 ES</th>
                        <th class="px-2 py-2 text-center border-b border-slate-700 bg-teal-800/40">Aud 2 FS</th>
                        <th class="px-2 py-2 text-center border-b border-slate-700 bg-indigo-900/40">Mic 1 ES</th>
                        <th class="px-2 py-2 text-center border-b border-slate-700 bg-indigo-800/40">Mic 1 FS</th>
                        <th class="px-2 py-2 text-center border-b border-slate-700 bg-purple-900/40">Mic 2 ES</th>
                        <th class="px-2 py-2 text-center border-b border-slate-700 bg-purple-800/40">Mic 2 FS</th>
                        <th class="px-2 py-2 text-center border-b border-slate-700 bg-amber-900/40">Audio ES</th>
                        <th class="px-2 py-2 text-center border-b border-slate-700 bg-amber-800/40">Audio FS</th>
                        <th class="px-2 py-2 text-center border-b border-slate-700 bg-rose-900/40">Video ES</th>
                        <th class="px-2 py-2 text-center border-b border-slate-700 bg-rose-800/40">Video FS</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 font-medium">
    `;

    const campos = [
        'puerta_es', 'puerta_fs', 'aud1_es', 'aud1_fs', 
        'aud2_es', 'aud2_fs', 'mic1_es', 'mic1_fs', 
        'mic2_es', 'mic2_fs', 'audio_es', 'audio_fs', 
        'video_es', 'video_fs'
    ];

    window.listaHermanosAV.forEach((h, idx) => {
        html += `<tr class="hover:bg-slate-50 transition">`;
        html += `<td class="px-3 py-1.5 font-bold text-slate-900 whitespace-nowrap">${h.nombre}</td>`;

        campos.forEach(campo => {
            const checked = h[campo] ? 'checked' : '';
            const disabled = esMensajero ? 'disabled' : '';
            html += `
                <td class="px-2 py-1 text-center">
                    <input type="checkbox" ${checked} ${disabled}
                           onchange="actualizarAptitudAVInmediata(${h.hermano_id}, '${campo}', this.checked)"
                           class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed">
                </td>
            `;
        });

        html += `</tr>`;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    contenedor.innerHTML = html;
};

/**
 * Guarda o actualiza un checkbox individual directamente en Supabase
 */
window.actualizarAptitudAVInmediata = async function(hermanoId, campo, valor) {
    if (window.rolUsuarioActual && window.rolUsuarioActual.startsWith('mensajero_')) {
        return;
    }

    if (!window.congregacionIdActual) return;

    const payload = {
        congregacion_id: window.congregacionIdActual,
        hermano_id: hermanoId,
        [campo]: valor,
        updated_at: new Date().toISOString()
    };

    const { error } = await db
        .from('hermanos_av')
        .upsert(payload, { onConflict: 'congregacion_id,hermano_id' });

    if (error) {
        console.error("Error guardando aptitud AV:", error);
    } else {
        // Actualizar array en memoria local
        const item = window.listaHermanosAV.find(x => x.hermano_id === hermanoId);
        if (item) item[campo] = valor;
    }
};
