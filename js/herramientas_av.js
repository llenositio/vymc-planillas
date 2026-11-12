/**
 * Módulo de Herramientas Auxiliares para Planilla AV:
 * - Buscador y resaltador en tiempo real por hermano
 * - Tabla resumen de conteo mensual (ES / FS / Total)
 */

/**
 * Resalta en amarillo las asignaciones de un hermano buscado en #inputBuscarHermanoAV
 * y actualiza el contador en #textoConteoBuscadoAV
 */
window.actualizarResaltadoBuscador = function() {
    const input = document.getElementById('inputBuscarHermanoAV');
    const textoConteo = document.getElementById('textoConteoBuscadoAV');
    const celdas = document.querySelectorAll('.cel-asignacion-av');

    if (!input) return;

    const filtro = input.value.trim().toLowerCase();
    let coincidencias = 0;

    celdas.forEach(celda => {
        const hermanoCelda = (celda.getAttribute('data-hermano') || '').toLowerCase();
        celda.classList.remove('bg-amber-200', 'ring-2', 'ring-amber-500');

        if (filtro.length >= 2 && hermanoCelda.includes(filtro)) {
            celda.classList.add('bg-amber-200', 'ring-2', 'ring-amber-500');
            coincidencias++;
        }
    });

    if (textoConteo) {
        if (filtro.length >= 2) {
            textoConteo.textContent = coincidencias === 1
                ? `Se encontró 1 asignación en el mes para "${input.value.trim()}".`
                : `Se encontraron ${coincidencias} asignaciones en el mes para "${input.value.trim()}".`;
        } else {
            textoConteo.textContent = '';
        }
    }
};

/**
 * Genera y renderiza la tabla resumen de participación mensual en #contenedorTablaVerdeAV
 */
window.renderizarTablaResumenAV = function() {
    const contenedor = document.getElementById('contenedorTablaVerdeAV');
    if (!contenedor) return;

    const conteo = {};

    (window.programaMesAV || []).forEach(sem => {
        const puestosES = sem.puestosES || {};
        const puestosFS = sem.puestosFS || {};

        Object.values(puestosES).forEach(nombre => {
            if (nombre && nombre.trim()) {
                const key = nombre.trim();
                if (!conteo[key]) conteo[key] = { es: 0, fs: 0, total: 0 };
                conteo[key].es++;
                conteo[key].total++;
            }
        });

        Object.values(puestosFS).forEach(nombre => {
            if (nombre && nombre.trim()) {
                const key = nombre.trim();
                if (!conteo[key]) conteo[key] = { es: 0, fs: 0, total: 0 };
                conteo[key].fs++;
                conteo[key].total++;
            }
        });
    });

    const listaOrdenada = Object.entries(conteo).sort((a, b) => {
        if (b[1].total !== a[1].total) return b[1].total - a[1].total;
        return a[0].localeCompare(b[0]);
    });

    let html = `
        <div class="bg-emerald-50 border border-emerald-300 rounded-lg p-3 shadow-sm">
            <h4 class="text-xs font-bold text-emerald-900 uppercase mb-2 border-b border-emerald-200 pb-1 flex items-center gap-1.5">
                <i class="fa-solid fa-chart-simple text-emerald-600"></i> Resumen de Asignaciones del Mes
            </h4>
    `;

    if (listaOrdenada.length === 0) {
        html += `<p class="text-xs text-emerald-800/80 italic">Aún no hay hermanos asignados en esta planilla.</p>`;
    } else {
        html += `
            <div class="max-h-48 overflow-y-auto border border-emerald-200 rounded bg-white">
                <table class="w-full text-[11px] text-left border-collapse">
                    <thead class="bg-emerald-800 text-white uppercase font-bold sticky top-0">
                        <tr>
                            <th class="px-2 py-1">Hermano / Hermana</th>
                            <th class="px-2 py-1 text-center w-12">ES</th>
                            <th class="px-2 py-1 text-center w-12">FS</th>
                            <th class="px-2 py-1 text-center w-14">Total</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-emerald-100">
        `;

        listaOrdenada.forEach(([nombre, stats]) => {
            html += `
                <tr class="hover:bg-emerald-50/70">
                    <td class="px-2 py-1 font-bold text-slate-800">${nombre}</td>
                    <td class="px-2 py-1 text-center text-sky-800 font-semibold">${stats.es}</td>
                    <td class="px-2 py-1 text-center text-amber-800 font-semibold">${stats.fs}</td>
                    <td class="px-2 py-1 text-center font-black text-emerald-900 bg-emerald-50">${stats.total}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    }

    html += `</div>`;
    contenedor.innerHTML = html;
};
