/**
 * Módulo de Gestión de Elegibles Acomodadores / Audio y Video (hermanos_av)
 */

window.listaHermanosAV = [];
window.puestosConfigAV = [
    { key: 'puerta', label: 'PUERTA', colorES: 'bg-emerald-900/40', colorFS: 'bg-emerald-800/40' },
    { key: 'aud1', label: 'AUD 1', colorES: 'bg-blue-900/40', colorFS: 'bg-blue-800/40' },
    { key: 'aud2', label: 'AUD 2', colorES: 'bg-teal-900/40', colorFS: 'bg-teal-800/40' },
    { key: 'mic1', label: 'MIC 1', colorES: 'bg-indigo-900/40', colorFS: 'bg-indigo-800/40' },
    { key: 'mic2', label: 'MIC 2', colorES: 'bg-purple-900/40', colorFS: 'bg-purple-800/40' },
    { key: 'audio', label: 'AUDIO', colorES: 'bg-amber-900/40', colorFS: 'bg-amber-800/40' },
    { key: 'video', label: 'VIDEO', colorES: 'bg-rose-900/40', colorFS: 'bg-rose-800/40' }
];

/**
 * Carga los elegibles de AV desde Supabase cruzando con la tabla principal de hermanos
 */
window.cargarElegiblesAVDesdeSupabase = async function() {
    let idCongre = window.congregacionIdActual;
    if (!idCongre && window.congregacionActual) {
        idCongre = window.congregacionActual.id;
    }

    if (!idCongre) {
        console.warn("No hay congregación seleccionada aún.");
        return;
    }

    // 1. Obtener hermanos varones ('V') de la congregación desde la tabla 'hermanos'
    const { data: hermanos, error: errHermanos } = await db
        .from('hermanos')
        .select('id, nombre, celular, sexo, congregacion_id')
        .eq('congregacion_id', idCongre)
        .eq('sexo', 'V')
        .order('nombre', { ascending: true });

    if (errHermanos) {
        console.error("Error cargando lista general de hermanos:", errHermanos);
        return;
    }

    // 2. Obtener la matriz de aptitudes AV (tabla hermanos_av)
    const { data: aptitudesAV, error: errAV } = await db
        .from('hermanos_av')
        .select('*')
        .eq('congregacion_id', idCongre);

    if (errAV) {
        console.error("Error cargando aptitudes AV:", errAV);
    }

    const mapaAptitudes = {};
    (aptitudesAV || []).forEach(item => {
        mapaAptitudes[item.hermano_id] = item;
    });

    // 3. Consolidar lista de varones con sus aptitudes
    window.listaHermanosAV = (hermanos || []).map(h => {
        const apt = mapaAptitudes[h.id] || {};
        const obj = {
            hermano_id: h.id,
            nombre: h.nombre,
            telefono: h.celular || ''
        };

        window.puestosConfigAV.forEach(p => {
            obj[`${p.key}_es`] = !!apt[`${p.key}_es`];
            obj[`${p.key}_fs`] = !!apt[`${p.key}_fs`];
        });

        return obj;
    });

    if (typeof window.renderizarMatrizAV === 'function') {
        window.renderizarMatrizAV();
    }
};

/**
 * Renderiza la tabla HTML de la Matriz de Elegibles AV con encabezados editables
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
    `;

    // Renderizar cabeceras de columnas editables (ES y FS por puesto)
    window.puestosConfigAV.forEach((p, pIdx) => {
        html += `
            <th class="px-2 py-2 text-center border-b border-slate-700 ${p.colorES}">
                <span contenteditable="${!esMensajero}" onblur="window.actualizarNombrePuestoAV(${pIdx}, this.innerText, 'ES')" class="editable-field outline-none cursor-pointer hover:bg-slate-700/50 px-1 rounded">${p.label} ES</span>
            </th>
            <th class="px-2 py-2 text-center border-b border-slate-700 ${p.colorFS}">
                <span contenteditable="${!esMensajero}" onblur="window.actualizarNombrePuestoAV(${pIdx}, this.innerText, 'FS')" class="editable-field outline-none cursor-pointer hover:bg-slate-700/50 px-1 rounded">${p.label} FS</span>
            </th>
        `;
    });

    html += `
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 font-medium">
    `;

    // Renderizar filas por hermano
    (window.listaHermanosAV || []).forEach((h) => {
        html += `<tr class="hover:bg-slate-50 transition">`;
        html += `<td class="px-3 py-1.5 font-bold text-slate-900 whitespace-nowrap">${h.nombre}</td>`;

        window.puestosConfigAV.forEach(p => {
            const campoES = `${p.key}_es`;
            const campoFS = `${p.key}_fs`;
            const checkedES = h[campoES] ? 'checked' : '';
            const checkedFS = h[campoFS] ? 'checked' : '';
            const disabled = esMensajero ? 'disabled' : '';

            html += `
                <td class="px-2 py-1 text-center">
                    <input type="checkbox" ${checkedES} ${disabled}
                           onchange="actualizarAptitudAVInmediata(${h.hermano_id}, '${campoES}', this.checked)"
                           class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed">
                </td>
                <td class="px-2 py-1 text-center">
                    <input type="checkbox" ${checkedFS} ${disabled}
                           onchange="actualizarAptitudAVInmediata(${h.hermano_id}, '${campoFS}', this.checked)"
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
 * Actualiza la etiqueta visible de un puesto
 */
window.actualizarNombrePuestoAV = function(index, nuevoTexto, tipo) {
    if (!window.puestosConfigAV[index]) return;
    const textoLimpio = nuevoTexto.replace(/\s+(ES|FS)$/i, '').trim();
    if (textoLimpio) {
        window.puestosConfigAV[index].label = textoLimpio;
    }
};

/**
 * Guarda o actualiza un checkbox individual directamente en Supabase
 */
window.actualizarAptitudAVInmediata = async function(hermanoId, campo, valor) {
    if (window.rolUsuarioActual && window.rolUsuarioActual.startsWith('mensajero_')) {
        return;
    }

    let idCongre = window.congregacionIdActual;
    if (!idCongre && window.congregacionActual) {
        idCongre = window.congregacionActual.id;
    }

    if (!idCongre) return;

    const payload = {
        congregacion_id: idCongre,
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
        const item = window.listaHermanosAV.find(x => x.hermano_id === hermanoId);
        if (item) item[campo] = valor;
    }
};
