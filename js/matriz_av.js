/**
 * Módulo de Gestión de Elegibles Acomodadores / Audio y Video (hermanos_av)
 */

window.listaHermanosAV = [];
window.listaHermanosGeneral = [];

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
 * Carga los elegibles de AV desde Supabase.
 * Carga varones por defecto e incluye a hermanas si están registradas en 'hermanos_av'.
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

    // 1. Obtener la lista general de hermanos (de la tabla 'hermanos')
    const { data: hermanosGral, error: errHermanos } = await db
        .from('hermanos')
        .select('id, nombre, celular, sexo, congregacion_id')
        .eq('congregacion_id', idCongre)
        .order('nombre', { ascending: true });

    if (errHermanos) {
        console.error("Error cargando lista general de hermanos:", errHermanos);
        return;
    }

    window.listaHermanosGeneral = hermanosGral || [];

    // 2. Obtener los registros de aptitudes de la tabla 'hermanos_av'
    const { data: aptitudesAV, error: errAV } = await db
        .from('hermanos_av')
        .select('*')
        .eq('congregacion_id', idCongre);

    if (errAV) {
        console.error("Error cargando aptitudes AV:", errAV);
    }

    const mapaAptitudes = {};
    (aptitudesAV || []).forEach(item => {
        if (item.hermano_id !== null && item.hermano_id !== undefined) {
            mapaAptitudes[Number(item.hermano_id)] = item;
        }
    });

    // 3. Consolidar: Varones ('V') + Hermanas ('M') registradas previamente en 'hermanos_av'
    window.listaHermanosAV = window.listaHermanosGeneral.filter(h => {
        const hId = Number(h.id);
        const tieneAptitudRegistrada = !!mapaAptitudes[hId];
        return h.sexo === 'V' || tieneAptitudRegistrada;
    }).map(h => {
        const hId = Number(h.id);
        const apt = mapaAptitudes[hId] || {};
        const celLimpio = (h.celular && h.celular !== 'Sin teléfono') ? String(h.celular).trim() : '';

        const obj = {
            hermano_id: hId,
            id: hId,
            nombre: h.nombre,
            sexo: h.sexo,
            telefono: celLimpio,
            celular: celLimpio
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
 * Renderiza la tabla HTML de la Matriz de Elegibles AV con selector de hermanas, gestión de columnas y acción de eliminar
 */
window.renderizarMatrizAV = function() {
    const contenedor = document.getElementById('contenedorMatrizAV');
    if (!contenedor) return;

    const esMensajero = (typeof window.rolUsuarioActual === 'string' && window.rolUsuarioActual.startsWith('mensajero_'));

    let html = '';

    // BARRA SUPERIOR: AGREGAR HERMANA EXCEPCIONAL Y AGREGAR PUESTOS
    if (!esMensajero) {
        const hermanasDisponibles = (window.listaHermanosGeneral || []).filter(h => 
            h.sexo === 'M' && !window.listaHermanosAV.some(av => Number(av.hermano_id) === Number(h.id))
        );

        html += `
            <div class="mb-3 flex items-center justify-between bg-slate-100 p-2.5 rounded-lg border border-slate-200 flex-wrap gap-2">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-700">Agregar Hermana (Excepcional):</span>
                    <select id="selectAgregarHermanaAV" class="bg-white border border-slate-300 text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-emerald-500">
                        <option value="">-- Seleccionar Hermana --</option>
        `;

        hermanasDisponibles.forEach(h => {
            html += `<option value="${h.id}">${h.nombre}</option>`;
        });

        html += `
                    </select>
                    <button onclick="window.agregarHermanaAMatrizAV()" class="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold px-2.5 py-1 rounded transition shadow-sm">
                        + Incluir en Matriz
                    </button>
                </div>

                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-700">Gestión de Columnas:</span>
                    <button onclick="window.agregarPuestoAV()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1 rounded transition flex items-center gap-1 shadow-sm">
                        <i class="fa-solid fa-plus"></i> Agregar Puesto
                    </button>
                </div>
            </div>
        `;
    }

    html += `
        <div class="overflow-x-auto shadow-md rounded-lg border border-slate-200">
            <table class="w-full text-xs text-left text-slate-700 bg-white">
                <thead class="text-[11px] uppercase bg-slate-800 text-white font-bold tracking-wider">
                    <tr>
                        <th class="px-3 py-2 border-b border-slate-700">Hermano / Hermana</th>
                        <th class="px-2 py-2 border-b border-slate-700 text-center w-12">Sexo</th>
    `;

    // Renderizar cabeceras de columnas editables
    window.puestosConfigAV.forEach((p, pIdx) => {
        const botonEliminar = !esMensajero ? `<button onclick="window.eliminarPuestoAV(${pIdx})" title="Eliminar puesto" class="ml-1 text-rose-300 hover:text-white font-bold px-1">✕</button>` : '';

        html += `
            <th class="px-2 py-2 text-center border-b border-slate-700 ${p.colorES}">
                <span contenteditable="${!esMensajero}" onblur="window.actualizarNombrePuestoAV(${pIdx}, this.innerText)" class="editable-field outline-none cursor-pointer hover:bg-slate-700/50 px-1 rounded">${p.label} ES</span>
            </th>
            <th class="px-2 py-2 text-center border-b border-slate-700 ${p.colorFS}">
                <div class="flex items-center justify-center">
                    <span contenteditable="${!esMensajero}" onblur="window.actualizarNombrePuestoAV(${pIdx}, this.innerText)" class="editable-field outline-none cursor-pointer hover:bg-slate-700/50 px-1 rounded">${p.label} FS</span>
                    ${botonEliminar}
                </div>
            </th>
        `;
    });

    html += `
                        <th class="px-2 py-2 border-b border-slate-700 text-center w-12">Acción</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 font-medium">
    `;

    // Renderizar filas por hermano / hermana
    (window.listaHermanosAV || []).forEach((h) => {
        const esMujer = h.sexo === 'M';
        const bgFila = esMujer ? 'bg-pink-50/60 hover:bg-pink-100/60' : 'hover:bg-slate-50';
        const hId = Number(h.hermano_id);

        html += `<tr class="${bgFila} transition">`;
        html += `
            <td class="px-3 py-1.5 font-bold text-slate-900 whitespace-nowrap">
                ${h.nombre} ${esMujer ? '<span class="text-[10px] text-pink-600 font-normal ml-1">(Excepcional)</span>' : ''}
            </td>
        `;
        html += `<td class="px-2 py-1.5 text-center font-black ${esMujer ? 'text-pink-600' : 'text-slate-600'}">${h.sexo}</td>`;

        window.puestosConfigAV.forEach(p => {
            const campoES = `${p.key}_es`;
            const campoFS = `${p.key}_fs`;
            const checkedES = h[campoES] ? 'checked' : '';
            const checkedFS = h[campoFS] ? 'checked' : '';
            const disabled = esMensajero ? 'disabled' : '';

            html += `
                <td class="px-2 py-1 text-center">
                    <input type="checkbox" ${checkedES} ${disabled}
                           onchange="window.actualizarAptitudAVInmediata(${hId}, '${campoES}', this.checked)"
                           class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed">
                </td>
                <td class="px-2 py-1 text-center">
                    <input type="checkbox" ${checkedFS} ${disabled}
                           onchange="window.actualizarAptitudAVInmediata(${hId}, '${campoFS}', this.checked)"
                           class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed">
                </td>
            `;
        });

        html += `
            <td class="px-2 py-1 text-center">
                ${!esMensajero ? `
                <button onclick="window.quitarHermanoDeMatrizAV(${hId})" title="Quitar de la matriz" class="text-rose-500 hover:text-rose-700 font-bold p-1">
                    <i class="fa-solid fa-trash-can"></i>
                </button>` : ''}
            </td>
        </tr>`;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    contenedor.innerHTML = html;
};

/**
 * Agrega una hermana excepcionalmente a la lista activa de la Matriz AV y crea su fila en Supabase
 */
window.agregarHermanaAMatrizAV = async function() {
    if (window.rolUsuarioActual && window.rolUsuarioActual.startsWith('mensajero_')) {
        return;
    }

    const select = document.getElementById('selectAgregarHermanaAV');
    if (!select || !select.value) {
        alert("Por favor selecciona una hermana de la lista.");
        return;
    }

    const hermanoId = Number(select.value);
    const hermana = (window.listaHermanosGeneral || []).find(h => Number(h.id) === hermanoId);

    if (!hermana) return;

    let idCongre = window.congregacionIdActual || (window.congregacionActual ? window.congregacionActual.id : null);
    if (idCongre) {
        const { error } = await db
            .from('hermanos_av')
            .upsert({
                congregacion_id: idCongre,
                hermano_id: hermanoId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'congregacion_id,hermano_id' });

        if (error) {
            console.error("Error registrando hermana en hermanos_av:", error);
        }
    }

    const celLimpio = (hermana.celular && hermana.celular !== 'Sin teléfono') ? String(hermana.celular).trim() : '';

    const nuevoObj = {
        hermano_id: hermanoId,
        id: hermanoId,
        nombre: hermana.nombre,
        sexo: hermana.sexo,
        telefono: celLimpio,
        celular: celLimpio
    };

    window.puestosConfigAV.forEach(p => {
        nuevoObj[`${p.key}_es`] = false;
        nuevoObj[`${p.key}_fs`] = false;
    });

    window.listaHermanosAV.push(nuevoObj);
    window.renderizarMatrizAV();
};

/**
 * Quita a un hermano/hermana de la matriz AV y elimina su registro en Supabase
 */
window.quitarHermanoDeMatrizAV = async function(hermanoId) {
    if (window.rolUsuarioActual && window.rolUsuarioActual.startsWith('mensajero_')) {
        return;
    }

    if (!confirm("¿Deseas quitar a esta persona de la matriz AV?")) return;

    const hId = Number(hermanoId);
    let idCongre = window.congregacionIdActual || (window.congregacionActual ? window.congregacionActual.id : null);
    
    if (idCongre) {
        const { error } = await db
            .from('hermanos_av')
            .delete()
            .eq('congregacion_id', idCongre)
            .eq('hermano_id', hId);

        if (error) {
            console.error("Error eliminando registro en hermanos_av:", error);
        }
    }

    window.listaHermanosAV = window.listaHermanosAV.filter(h => Number(h.hermano_id) !== hId);
    window.renderizarMatrizAV();
};

/**
 * Agrega un nuevo puesto (par de columnas ES / FS)
 */
window.agregarPuestoAV = function() {
    const nombre = prompt("Ingresa el nombre del nuevo puesto (ej. PLATAFORMA, PARKING):");
    if (!nombre || !nombre.trim()) return;

    const labelLimpio = nombre.trim().toUpperCase();
    const keyLimpia = labelLimpio.toLowerCase().replace(/[^a-z0-9]/g, '_');

    if (window.puestosConfigAV.some(p => p.key === keyLimpia)) {
        alert("Ya existe un puesto con ese nombre.");
        return;
    }

    const colores = [
        { colorES: 'bg-cyan-900/40', colorFS: 'bg-cyan-800/40' },
        { colorES: 'bg-fuchsia-900/40', colorFS: 'bg-fuchsia-800/40' },
        { colorES: 'bg-lime-900/40', colorFS: 'bg-lime-800/40' }
    ];

    const colorElegido = colores[window.puestosConfigAV.length % colores.length];

    window.puestosConfigAV.push({
        key: keyLimpia,
        label: labelLimpio,
        ...colorElegido
    });

    window.renderizarMatrizAV();
};

/**
 * Elimina un puesto por índice
 */
window.eliminarPuestoAV = function(index) {
    const puesto = window.puestosConfigAV[index];
    if (!puesto) return;

    if (confirm(`¿Estás seguro de eliminar el puesto "${puesto.label}" (ES y FS)?`)) {
        window.puestosConfigAV.splice(index, 1);
        window.renderizarMatrizAV();
    }
};

/**
 * Actualiza el nombre de un puesto en la configuración local
 */
window.actualizarNombrePuestoAV = function(index, nuevoTexto) {
    if (!window.puestosConfigAV[index]) return;
    const textoLimpio = nuevoTexto.replace(/\s+(ES|FS)$/i, '').trim();
    if (textoLimpio) {
        window.puestosConfigAV[index].label = textoLimpio.toUpperCase();
    }
};

/**
 * Guarda o actualiza un checkbox individual directamente en Supabase
 */
window.actualizarAptitudAVInmediata = async function(hermanoId, campo, valor) {
    if (window.rolUsuarioActual && window.rolUsuarioActual.startsWith('mensajero_')) {
        return;
    }

    let idCongre = window.congregacionIdActual || (window.congregacionActual ? window.congregacionActual.id : null);
    if (!idCongre) return;

    const hId = Number(hermanoId);

    const payload = {
        congregacion_id: idCongre,
        hermano_id: hId,
        [campo]: !!valor,
        updated_at: new Date().toISOString()
    };

    const { error } = await db
        .from('hermanos_av')
        .upsert(payload, { onConflict: 'congregacion_id,hermano_id' });

    if (error) {
        console.error("Error guardando aptitud AV:", error);
        alert("Error al guardar cambio en Supabase: " + error.message);
    } else {
        const item = window.listaHermanosAV.find(x => Number(x.hermano_id) === hId);
        if (item) item[campo] = !!valor;
    }
};
