/**
 * Módulo de Planilla Mensual de Acomodadores y Audio / Video (planillas_av)
 * Incluye motor de descarte inteligente (Aptitud + Ausencia + Cruce ES/FS separado + No duplicar en misma reunión),
 * contador de asignaciones (N), resaltado buscador y envío WhatsApp cuadrilla/individual.
 */

window.programaMesAV = [];
window.ausenciasMes = [];

/**
 * Carga las ausencias de la congregación desde Supabase
 */
window.cargarAusenciasDesdeSupabase = async function() {
    let idCongre = window.congregacionIdActual || (window.congregacionActual ? window.congregacionActual.id : null);
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
 * Convierte una cadena YYYY-MM-DD a objeto Date en hora local (00:00:00) para evitar desfases UTC
 */
function parsearFechaLocal(fechaStr) {
    if (!fechaStr) return null;
    const limpio = String(fechaStr).split('T')[0];
    const partes = limpio.split('-');
    if (partes.length !== 3) return null;
    return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]), 0, 0, 0);
}

/**
 * Convierte un texto de semana (ej. "2-8 DE NOVIEMBRE") y mes (ej. "NOVIEMBRE 2026")
 * en un rango de fechas aproximado { inicio, fin } en hora local
 */
function parsearRangoSemana(textoSemana, mesAnoStr) {
    if (!textoSemana) return null;

    const mesesMap = {
        'ENERO': 0, 'FEBRERO': 1, 'MARZO': 2, 'ABRIL': 3,
        'MAYO': 4, 'JUNIO': 5, 'JULIO': 6, 'AGOSTO': 7,
        'SEPTIEMBRE': 8, 'OCTUBRE': 9, 'NOVIEMBRE': 10, 'DICIEMBRE': 11
    };

    const strUpper = (mesAnoStr || "").toUpperCase();
    let anio = new Date().getFullYear();
    const matchAnio = strUpper.match(/\d{4}/);
    if (matchAnio) anio = parseInt(matchAnio[0]);

    let mesIdx = new Date().getMonth();
    for (const [nombreMes, idx] of Object.entries(mesesMap)) {
        if (strUpper.includes(nombreMes)) {
            mesIdx = idx;
            break;
        }
    }

    const nums = textoSemana.match(/\d+/g);
    if (!nums || nums.length === 0) return null;

    const diaIni = parseInt(nums[0]);
    const diaFin = nums.length > 1 ? parseInt(nums[1]) : diaIni + 6;

    const inicio = new Date(anio, mesIdx, diaIni, 0, 0, 0);
    let fin = new Date(anio, mesIdx, diaFin, 23, 59, 59);
    if (diaFin < diaIni) {
        fin = new Date(anio, mesIdx + 1, diaFin, 23, 59, 59);
    }

    return { inicio, fin };
}

/**
 * Obtiene los nombres (normalizados en minúsculas) de hermanos con parte en VyMC/Reunión Pública
 * discriminando estrictamente entre Entre Semana ('ES') y Fin de Semana ('FS').
 */
function obtenerAsignadosReunionPorTipo(indexSemana, tipoDia) {
    const asignados = new Set();
    if (!Array.isArray(window.programaMes) || !window.programaMes[indexSemana]) {
        return asignados;
    }

    const sem = window.programaMes[indexSemana];

    if (tipoDia === 'ES') {
        const camposES = [
            sem.presidencia,
            sem.oracionIni,
            sem.repaso,
            sem.oracionFin,
            sem.asigViajanteEntreSemana
        ];

        camposES.forEach(nombre => {
            if (nombre && nombre.trim() !== "") {
                asignados.add(nombre.trim().toLowerCase());
            }
        });

        (sem.partes || []).forEach(p => {
            [p.asig, p.asigAyudante, p.asigB, p.asigBAyudante, p.asigC, p.asigCAyudante].forEach(nombre => {
                if (nombre && nombre.trim() !== "") {
                    asignados.add(nombre.trim().toLowerCase());
                }
            });
        });
    } else if (tipoDia === 'FS') {
        const camposFS = [
            sem.domPresi,
            sem.domLector,
            sem.asigViajanteDiscPub,
            sem.asigViajanteDiscFin
        ];

        camposFS.forEach(nombre => {
            if (nombre && nombre.trim() !== "") {
                asignados.add(nombre.trim().toLowerCase());
            }
        });
    }

    return asignados;
}

/**
 * Calcula el conteo actual de asignaciones AV en el mes para cada hermano
 */
function obtenerConteoMensualAV() {
    const conteo = {};
    (window.programaMesAV || []).forEach(sem => {
        Object.values(sem.puestosES || {}).forEach(nombre => {
            if (nombre && nombre.trim()) {
                const k = nombre.trim().toLowerCase();
                conteo[k] = (conteo[k] || 0) + 1;
            }
        });
        Object.values(sem.puestosFS || {}).forEach(nombre => {
            if (nombre && nombre.trim()) {
                const k = nombre.trim().toLowerCase();
                conteo[k] = (conteo[k] || 0) + 1;
            }
        });
    });
    return conteo;
}

/**
 * Motor de filtrado inteligente:
 * 1. Filtra por aptitud en la Matriz AV (es / fs)
 * 2. Descarta por Ausencias registradas en la semana
 * 3. Descarta por Cruce de asignación en la misma reunión (ES vs ES / FS vs FS)
 * 4. Descarta a quienes ya están asignados en OTRO puesto de esa misma reunión
 * 5. Ordena por menor cantidad de asignaciones en el mes y devuelve { nombre, conteoMes }
 */
window.obtenerElegiblesAVPorTipo = function(puestoKey, tipoDia, indexSemana, valorActual = "") {
    const campoAptitud = (tipoDia === 'ES') ? `${puestoKey}_es` : `${puestoKey}_fs`;
    const semanaObj = window.programaMesAV[indexSemana];
    const textoSemana = semanaObj ? semanaObj.fecha : "";
    const inputMes = document.getElementById('inputNombreMes');
    const mesAno = inputMes ? inputMes.value : (window.nombreMesGlobal || "");

    const rangoSemana = parsearRangoSemana(textoSemana, mesAno);
    const asignadosReunion = obtenerAsignadosReunionPorTipo(indexSemana, tipoDia);
    const valorActualNorm = (valorActual || "").trim().toLowerCase();
    const conteoMensual = obtenerConteoMensualAV();

    // Hermanos ya ocupados en OTRO puesto dentro de esta misma reunión (ES o FS)
    const ocupadosMismaReunion = new Set();
    if (semanaObj) {
        const mapaPuestos = (tipoDia === 'ES') ? (semanaObj.puestosES || {}) : (semanaObj.puestosFS || {});
        Object.entries(mapaPuestos).forEach(([kPuesto, nom]) => {
            if (kPuesto !== puestoKey && nom && nom.trim() !== "") {
                ocupadosMismaReunion.add(nom.trim().toLowerCase());
            }
        });
    }

    const filtrados = (window.listaHermanosAV || []).filter(h => {
        const nombreNorm = (h.nombre || "").trim().toLowerCase();

        // Mantener siempre visible al que ya está seleccionado en este casillero exacto
        if (valorActualNorm && nombreNorm === valorActualNorm) return true;

        // 1. Filtro de Aptitud
        if (!h[campoAptitud]) return false;

        // 2. Filtro de Ausencias
        if (rangoSemana && Array.isArray(window.ausenciasMes) && window.ausenciasMes.length > 0) {
            const hId = Number(h.hermano_id);
            const estaAusente = window.ausenciasMes.some(a => {
                if (Number(a.hermano_id) !== hId) return false;
                const fIni = parsearFechaLocal(a.fecha_inicio);
                const fFin = parsearFechaLocal(a.fecha_fin);
                if (!fIni || !fFin) return false;
                fFin.setHours(23, 59, 59, 999);
                return (fIni <= rangoSemana.fin && fFin >= rangoSemana.inicio);
            });
            if (estaAusente) return false;
        }

        // 3. Filtro de Cruce con la misma reunión (ES solo bloquea ES; FS solo bloquea FS)
        if (asignadosReunion.has(nombreNorm)) return false;

        // 4. Filtro de no repetir puesto en la misma reunión
        if (ocupadosMismaReunion.has(nombreNorm)) return false;

        return true;
    });

    return filtrados
        .map(h => {
            const nombreNorm = (h.nombre || "").trim().toLowerCase();
            return {
                ...h,
                conteoMes: conteoMensual[nombreNorm] || 0
            };
        })
        .sort((a, b) => {
            if (a.conteoMes !== b.conteoMes) return a.conteoMes - b.conteoMes;
            return a.nombre.localeCompare(b.nombre);
        });
};

/**
 * Carga la planilla mensual AV desde Supabase (o la inicializa desde el programa VyMC)
 */
window.cargarPlanillaAVDesdeSupabase = async function() {
    let idCongre = window.congregacionIdActual || (window.congregacionActual ? window.congregacionActual.id : null);
    if (!idCongre) return;

    if (!Array.isArray(window.listaHermanosAV) || window.listaHermanosAV.length === 0) {
        if (typeof window.cargarElegiblesAVDesdeSupabase === 'function') {
            await window.cargarElegiblesAVDesdeSupabase();
        }
    }

    const inputMes = document.getElementById('inputNombreMes');
    const mesBuscado = (inputMes && inputMes.value.trim())
        ? inputMes.value.trim().toUpperCase()
        : (window.nombreMesGlobal || 'ACTUAL');

    const { data, error } = await db
        .from('planillas_av')
        .select('*')
        .eq('congregacion_id', idCongre)
        .eq('mes_ano', mesBuscado)
        .maybeSingle();

    if (error) {
        console.error("Error cargando planilla AV:", error);
    }

    const inputTelGrupo = document.getElementById('inputTelGrupoAV');

    if (data && data.datos) {
        window.programaMesAV = typeof data.datos === 'string' ? JSON.parse(data.datos) : (data.datos || []);
        if (inputTelGrupo) {
            inputTelGrupo.value = data.telefono_grupo || '';
        }
    } else {
        const semanasBase = (Array.isArray(window.programaMes) && window.programaMes.length > 0)
            ? window.programaMes
            : [{ semana: "SEMANA 1" }, { semana: "SEMANA 2" }, { semana: "SEMANA 3" }, { semana: "SEMANA 4" }];

        window.programaMesAV = semanasBase.map((s, idx) => ({
            fecha: s.semana || `SEMANA ${idx + 1}`,
            puestosES: {},
            puestosFS: {}
        }));

        if (inputTelGrupo && !inputTelGrupo.value) {
            const { data: previo } = await db
                .from('planillas_av')
                .select('telefono_grupo')
                .eq('congregacion_id', idCongre)
                .not('telefono_grupo', 'is', null)
                .limit(1)
                .maybeSingle();

            if (previo && previo.telefono_grupo) {
                inputTelGrupo.value = previo.telefono_grupo;
            }
        }
    }

    window.renderizarPlanillaAV();
};

/**
 * Renderiza la tabla mensual de Acomodadores / Audio y Video
 */
window.renderizarPlanillaAV = function() {
    const contenedor = document.getElementById('contenedorPlanillaAV');
    if (!contenedor) return;

    const esMensajero = (typeof window.rolUsuarioActual === 'string' && window.rolUsuarioActual.startsWith('mensajero_'));
    const puestos = window.puestosConfigAV || [];

    if (!Array.isArray(window.programaMesAV) || window.programaMesAV.length === 0) {
        contenedor.innerHTML = `<p class="text-center text-xs text-slate-500 py-6">No hay semanas cargadas. Guarda o carga un mes en la Planilla VyMC.</p>`;
        return;
    }

    let html = `
        <table class="w-full text-xs border-collapse border border-slate-400 bg-white">
            <thead>
                <tr class="bg-slate-900 text-white uppercase text-[11px] font-extrabold">
                    <th class="border border-slate-600 px-2 py-2 w-36 text-center">Semana</th>
                    <th class="border border-slate-600 px-2 py-2 w-24 text-center">Reunión</th>
    `;

    puestos.forEach(p => {
        html += `<th class="border border-slate-600 px-2 py-2 text-center">${p.label}</th>`;
    });

    html += `
                    <th class="border border-slate-600 px-2 py-2 w-24 text-center no-print">Cuadrilla</th>
                </tr>
            </thead>
            <tbody>
    `;

    window.programaMesAV.forEach((sem, sIdx) => {
        const filasDia = [
            { tipo: 'ES', etiqueta: 'Entre Semana', badgeClase: 'bg-sky-100 text-sky-900 border-sky-300', campo: 'puestosES' },
            { tipo: 'FS', etiqueta: 'Fin de Semana', badgeClase: 'bg-amber-100 text-amber-900 border-amber-300', campo: 'puestosFS' }
        ];

        filasDia.forEach((dia, dIdx) => {
            const puestosAsignados = sem[dia.campo] || {};
            const bgFila = (sIdx % 2 === 0) ? 'bg-white' : 'bg-slate-50/70';

            html += `<tr class="${bgFila} hover:bg-emerald-50/40 transition">`;

            if (dIdx === 0) {
                html += `
                    <td rowspan="2" class="border border-slate-400 px-2 py-2 font-black text-slate-900 text-center align-middle bg-slate-100">
                        <span contenteditable="${!esMensajero}" 
                              onblur="window.actualizarFechaSemanaAV(${sIdx}, this.innerText)"
                              class="editable-field uppercase block">${sem.fecha || ''}</span>
                    </td>
                `;
            }

            html += `
                <td class="border border-slate-400 px-1.5 py-1.5 text-center align-middle">
                    <span class="inline-block px-1.5 py-0.5 rounded border text-[10px] font-extrabold ${dia.badgeClase}">
                        ${dia.etiqueta}
                    </span>
                </td>
            `;

            puestos.forEach(p => {
                const valorActual = puestosAsignados[p.key] || "";
                const elegibles = window.obtenerElegiblesAVPorTipo(p.key, dia.tipo, sIdx, valorActual);

                let opciones = `<option value="">-- Elegir --</option>`;
                elegibles.forEach(h => {
                    const selected = (h.nombre === valorActual) ? 'selected' : '';
                    opciones += `<option value="${h.nombre}" ${selected}>${h.nombre} (${h.conteoMes})</option>`;
                });

                const disabledAttr = esMensajero ? 'disabled' : '';
                const selectBg = valorActual ? 'bg-emerald-50 font-bold text-slate-900' : 'bg-transparent text-slate-500';

                html += `
                    <td class="border border-slate-400 px-1 py-1 align-middle cel-asignacion-av" data-hermano="${valorActual.toLowerCase()}">
                        <div class="flex items-center gap-1">
                            <select onchange="window.asignarHermanoAVPorTipo(${sIdx}, '${dia.tipo}', '${p.key}', this.value)"
                                    ${disabledAttr}
                                    class="w-full text-[11px] py-1 px-1 rounded border border-slate-300 outline-none focus:ring-1 focus:ring-emerald-500 uppercase ${selectBg}">
                                ${opciones}
                            </select>
                            ${valorActual ? `
                                <button type="button"
                                        onclick="window.enviarWhatsAppIndividualAV(${sIdx}, '${dia.tipo}', '${p.key}')"
                                        title="Enviar notificación por WhatsApp a ${valorActual}"
                                        class="no-print text-emerald-600 hover:text-emerald-800 shrink-0 px-0.5 transition">
                                    <i class="fa-brands fa-whatsapp text-sm"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                `;
            });

            html += `
                <td class="border border-slate-400 px-1.5 py-1 text-center align-middle no-print">
                    <button type="button"
                            onclick="window.enviarWhatsAppCuadrillaAV(${sIdx}, '${dia.tipo}')"
                            title="Enviar cuadrilla ${dia.etiqueta} al grupo de WhatsApp"
                            class="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm inline-flex items-center gap-1 transition">
                        <i class="fa-brands fa-whatsapp"></i> Enviar
                    </button>
                </td>
            `;

            html += `</tr>`;
        });
    });

    html += `
            </tbody>
        </table>
    `;

    contenedor.innerHTML = html;

    if (typeof window.renderizarTablaResumenAV === 'function') {
        window.renderizarTablaResumenAV();
    }
    if (typeof window.actualizarResaltadoBuscador === 'function') {
        window.actualizarResaltadoBuscador();
    }
};

/**
 * Actualiza el texto de fecha de una semana en la planilla AV
 */
window.actualizarFechaSemanaAV = function(indexSemana, nuevoTexto) {
    if (!window.programaMesAV[indexSemana]) return;
    const limpio = nuevoTexto.trim().toUpperCase();
    if (limpio) {
        window.programaMesAV[indexSemana].fecha = limpio;
    }
};

/**
 * Asigna un hermano a un puesto ES o FS y re-renderiza para actualizar botones de WhatsApp y conteos
 */
window.asignarHermanoAVPorTipo = function(indexSemana, tipoDia, puestoKey, nombreHermano) {
    if (window.rolUsuarioActual && window.rolUsuarioActual.startsWith('mensajero_')) {
        return;
    }

    if (!window.programaMesAV[indexSemana]) return;
    const campoPuestos = (tipoDia === 'ES') ? 'puestosES' : 'puestosFS';
    if (!window.programaMesAV[indexSemana][campoPuestos]) {
        window.programaMesAV[indexSemana][campoPuestos] = {};
    }

    window.programaMesAV[indexSemana][campoPuestos][puestoKey] = nombreHermano || "";
    window.renderizarPlanillaAV();
};

/**
 * Guarda la planilla mensual AV y el teléfono de grupo en Supabase
 */
window.guardarPlanillaAVEnSupabase = async function() {
    if (window.rolUsuarioActual && window.rolUsuarioActual.startsWith('mensajero_')) {
        alert("Tu usuario tiene rol de solo lectura y no puede guardar cambios.");
        return;
    }

    let idCongre = window.congregacionIdActual || (window.congregacionActual ? window.congregacionActual.id : null);
    if (!idCongre) {
        alert("Error: No hay sesión activa o congregación asignada.");
        return;
    }

    const inputMes = document.getElementById('inputNombreMes');
    const mesClave = (inputMes && inputMes.value.trim())
        ? inputMes.value.trim().toUpperCase()
        : (window.nombreMesGlobal || "ACTUAL");

    const inputTelGrupo = document.getElementById('inputTelGrupoAV');
    const telGrupo = inputTelGrupo ? inputTelGrupo.value.trim() : "";

    const payload = {
        congregacion_id: idCongre,
        mes_ano: mesClave,
        datos: window.programaMesAV,
        telefono_grupo: telGrupo,
        updated_at: new Date().toISOString()
    };

    const { error } = await db
        .from('planillas_av')
        .upsert(payload, { onConflict: 'congregacion_id,mes_ano' });

    if (error) {
        console.error("Error guardando Planilla AV:", error);
        alert("Error al guardar Planilla AV en Supabase: " + error.message);
    } else {
        alert("Planilla AV guardada correctamente en Supabase.");
    }
};
