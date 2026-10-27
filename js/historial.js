/**
 * Módulo de Historial y Estadísticas Dinámicas de Asignaciones
 */

// Categorías de agrupación en orden jerárquico
const ORDEN_CONDICIONES = [
    { clave: 'A', titulo: 'Ancianos' },
    { clave: 'SM', titulo: 'Siervos Ministeriales' },
    { clave: 'Prec', titulo: 'Precursores' },
    { clave: 'Pub', titulo: 'Publicadores' },
    { clave: 'PNB', titulo: 'Publicadores No Bautizados' }
];

window.renderizarTablaHistorial = function() {
    const contenedor = document.getElementById('contenedorTablaHistorial');
    if (!contenedor) return;

    if (!Array.isArray(listaHermanos) || listaHermanos.length === 0) {
        contenedor.innerHTML = `<div class="p-4 text-center text-slate-500 font-medium">No hay hermanos cargados en la matriz.</div>`;
        return;
    }

    // 1. Calcular conteos para cada hermano a partir de todos los meses/semanas
    const conteos = calcularConteosGlobales();

    // 2. Agrupar hermanos según su campo 'condicion' actual
    const grupos = {};
    ORDEN_CONDICIONES.forEach(c => grupos[c.clave] = []);
    grupos['Otros'] = []; // Para hermanos sin condición definida

    listaHermanos.forEach(h => {
        const condNorm = (h.condicion || '').trim();
        if (grupos[condNorm]) {
            grupos[condNorm].push(h);
        } else {
            grupos['Otros'].push(h);
        }
    });

    // 3. Generar HTML de la tabla con encabezado multinivel
    let html = `
        <div class="overflow-x-auto shadow rounded-lg border border-slate-300 bg-white">
            <table class="w-full text-xs text-center border-collapse">
                <thead>
                    <tr class="bg-slate-800 text-white font-bold border-b border-slate-900">
                        <th class="p-2 text-left w-56 border-r border-slate-700" rowspan="2">HERMANO</th>
                        <th class="p-2 border-r border-slate-700" rowspan="2">Pres. Vid y Min</th>
                        <th class="p-1 border-r border-slate-700" colspan="2">Tesoros de la Biblia</th>
                        <th class="p-2 border-r border-slate-700" rowspan="2">SMM</th>
                        <th class="p-1 border-r border-slate-700" colspan="2">Nuestra vida cristiana</th>
                        <th class="p-1 border-r border-slate-700" colspan="2">Lecturas</th>
                        <th class="p-2 border-r border-slate-700" rowspan="2">Estudio Bíblico</th>
                        <th class="p-2 border-r border-slate-700" rowspan="2">Oraciones</th>
                        <th class="p-2 border-r border-slate-700" rowspan="2">P. Pública + oración</th>
                        <th class="p-2 bg-amber-600 text-white font-black" rowspan="2">PRESENCIA</th>
                    </tr>
                    <tr class="bg-slate-700 text-white font-semibold border-b border-slate-800">
                        <th class="p-1.5 border-r border-slate-600">Discurso</th>
                        <th class="p-1.5 border-r border-slate-700">Busquemos perlas</th>
                        <th class="p-1.5 border-r border-slate-600">Necesidades Locales</th>
                        <th class="p-1.5 border-r border-slate-700">Otro</th>
                        <th class="p-1.5 border-r border-slate-600">Libro</th>
                        <th class="p-1.5 border-r border-slate-700">Atalaya</th>
                    </tr>
                </thead>
                <tbody>
    `;

    // 4. Renderizar filas por grupo
    ORDEN_CONDICIONES.concat([{ clave: 'Otros', titulo: 'Sin Categoría' }]).forEach(grupo => {
        const hermanosGrupo = grupos[grupo.clave] || [];
        if (hermanosGrupo.length === 0) return;

        // Encabezado de grupo
        html += `
            <tr class="bg-slate-200 border-y border-slate-300 font-extrabold text-slate-800 text-left">
                <td colspan="13" class="px-3 py-1.5 uppercase tracking-wide bg-slate-300/80">
                    ${grupo.titulo} (${hermanosGrupo.length})
                </td>
            </tr>
        `;

        // Filas de hermanos
        hermanosGrupo.forEach(h => {
            const stats = conteos[h.nombre] || {
                presi: 0,
                discurso: 0,
                perlas: 0,
                smm: 0,
                necLocales: 0,
                nvcOtro: 0,
                lectorLibro: 0,
                lectorAtalaya: 0,
                estudioBiblico: 0,
                oraciones: 0,
                presiDom: 0,
                total: 0
            };

            html += `
                <tr class="hover:bg-slate-50 transition border-b border-slate-200">
                    <td class="p-2 text-left font-bold text-slate-800 border-r border-slate-200">${h.nombre}</td>
                    ${renderCeldaConteo(stats.presi)}
                    ${renderCeldaConteo(stats.discurso)}
                    ${renderCeldaConteo(stats.perlas)}
                    ${renderCeldaConteo(stats.smm)}
                    ${renderCeldaConteo(stats.necLocales)}
                    ${renderCeldaConteo(stats.nvcOtro)}
                    ${renderCeldaConteo(stats.lectorLibro)}
                    ${renderCeldaConteo(stats.lectorAtalaya)}
                    ${renderCeldaConteo(stats.estudioBiblico)}
                    ${renderCeldaConteo(stats.oraciones)}
                    ${renderCeldaConteo(stats.presiDom)}
                    <td class="p-2 font-black border-l-2 border-slate-300 ${stats.total > 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-50 text-slate-400'}">
                        ${stats.total}
                    </td>
                </tr>
            `;
        });
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    contenedor.innerHTML = html;
};

// Genera el HTML de cada celda con el resalte rosado si el conteo es mayor a 0
function renderCeldaConteo(valor) {
    if (valor > 0) {
        return `<td class="p-2 font-bold border-r border-slate-200 bg-red-100 text-red-900">${valor}</td>`;
    }
    return `<td class="p-2 border-r border-slate-200 text-slate-300">0</td>`;
}

// Recorre todas las semanas y calcula el conteo por hermano y por categoría
function calcularConteosGlobales() {
    const res = {};

    // Inicializar mapa para todos los hermanos
    if (Array.isArray(listaHermanos)) {
        listaHermanos.forEach(h => {
            res[h.nombre] = {
                presi: 0,
                discurso: 0,
                perlas: 0,
                smm: 0,
                necLocales: 0,
                nvcOtro: 0,
                lectorLibro: 0,
                lectorAtalaya: 0,
                estudioBiblico: 0,
                oraciones: 0,
                presiDom: 0,
                total: 0
            };
        });
    }

    const sumar = (nombre, cat) => {
        if (!nombre || !res[nombre]) return;
        res[nombre][cat] = (res[nombre][cat] || 0) + 1;
        res[nombre].total = (res[nombre].total || 0) + 1;
    };

    if (!Array.isArray(programaMes)) return res;

    programaMes.forEach(sem => {
        if (!sem) return;

        // Presidencia y Oraciones
        sumar(sem.presidencia, 'presi');
        sumar(sem.oracionIni, 'oraciones');
        sumar(sem.repaso, 'presi');
        sumar(sem.oracionFin, 'oraciones');
        sumar(sem.domPresi, 'presiDom');
        sumar(sem.domLector, 'lectorAtalaya');

        // Partes
        const partes = sem.partes || [];
        partes.forEach(p => {
            if (p.seccion === 'tesoros') {
                if (p.tit && p.tit.toLowerCase().includes('perlas')) {
                    sumar(p.asig, 'perlas');
                } else if (p.tit && p.tit.toLowerCase().includes('lectura')) {
                    sumar(p.asig, 'smm');
                    sumar(p.asigB, 'smm');
                    sumar(p.asigC, 'smm');
                } else {
                    sumar(p.asig, 'discurso');
                }
            } 
            else if (p.seccion === 'maestros') {
                sumar(p.asig, 'smm');
                sumar(p.asigAyudante, 'smm');
                sumar(p.asigB, 'smm');
                sumar(p.asigBAyudante, 'smm');
                sumar(p.asigC, 'smm');
                sumar(p.asigCAyudante, 'smm');
            } 
            else if (p.seccion === 'vida') {
                if (p.tit && p.tit.toLowerCase().includes('estudio bíblico')) {
                    sumar(p.asig, 'estudioBiblico');
                    sumar(p.asigAyudante, 'lectorLibro');
                } else if (p.tit && p.tit.toLowerCase().includes('necesidades locales')) {
                    sumar(p.asig, 'necLocales');
                } else {
                    sumar(p.asig, 'nvcOtro');
                }
            }
        });
    });

    return res;
}
