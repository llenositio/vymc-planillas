/**
 * Módulo de Historial y Estadísticas Dinámicas de Asignaciones
 * Con visualización limpia, columnas uniformes y control de sobrecarga en programa activo.
 */

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
        contenedor.innerHTML = `<div class="p-6 text-center text-slate-500 font-medium">No hay hermanos cargados en la matriz.</div>`;
        return;
    }

    // 1. Calcular conteos globales y conteos en la planilla activa actual
    const conteos = calcularConteosCombinados();

    // 2. Agrupar hermanos según su condición actual
    const grupos = {};
    ORDEN_CONDICIONES.forEach(c => grupos[c.clave] = []);
    grupos['Otros'] = [];

    listaHermanos.forEach(h => {
        const condNorm = (h.condicion || '').trim();
        if (grupos[condNorm]) {
            grupos[condNorm].push(h);
        } else {
            grupos['Otros'].push(h);
        }
    });

    // 3. Renderizar estructura HTML limpia con anchos de columna fijos
    let html = `
        <div class="shadow-md rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-xs text-center border-collapse table-fixed min-w-[1100px]">
                    <colgroup>
                        <col class="w-48"> <!-- Hermano -->
                        <col class="w-20"> <!-- Pres. Vid y Min -->
                        <col class="w-20"> <!-- Tesoros Disc -->
                        <col class="w-20"> <!-- Tesoros Perlas -->
                        <col class="w-20"> <!-- SMM -->
                        <col class="w-20"> <!-- NVC Nec. Locales -->
                        <col class="w-20"> <!-- NVC Otro -->
                        <col class="w-20"> <!-- Lec Libro -->
                        <col class="w-20"> <!-- Lec Atalaya -->
                        <col class="w-20"> <!-- Estudio Bíblico -->
                        <col class="w-20"> <!-- Oraciones -->
                        <col class="w-20"> <!-- P. Pública -->
                        <col class="w-24"> <!-- PRESENCIA -->
                    </colgroup>
                    <thead>
                        <tr class="bg-slate-900 text-white font-bold uppercase text-[11px] border-b border-slate-800">
                            <th class="p-3 text-left border-r border-slate-800" rowspan="2">Hermano</th>
                            <th class="p-2 border-r border-slate-800 leading-tight" rowspan="2">Pres.<br>Vid y Min</th>
                            <th class="p-1.5 border-r border-slate-800" colspan="2">Tesoros de la Biblia</th>
                            <th class="p-2 border-r border-slate-800" rowspan="2">SMM</th>
                            <th class="p-1.5 border-r border-slate-800" colspan="2">Nuestra vida cristiana</th>
                            <th class="p-1.5 border-r border-slate-800" colspan="2">Lecturas</th>
                            <th class="p-2 border-r border-slate-800 leading-tight" rowspan="2">Estudio<br>Bíblico</th>
                            <th class="p-2 border-r border-slate-800" rowspan="2">Oraciones</th>
                            <th class="p-2 border-r border-slate-800 leading-tight" rowspan="2">P. Pública<br>+ Oración</th>
                            <th class="p-2 bg-amber-600 text-white font-black" rowspan="2">PRESENCIA</th>
                        </tr>
                        <tr class="bg-slate-800 text-slate-200 font-semibold text-[10px] uppercase border-b border-slate-700">
                            <th class="p-2 border-r border-slate-700 leading-tight">Discurso</th>
                            <th class="p-2 border-r border-slate-700 leading-tight">Busquemos<br>perlas</th>
                            <th class="p-2 border-r border-slate-700 leading-tight">Necesidades<br>Locales</th>
                            <th class="p-2 border-r border-slate-700 leading-tight">Otro</th>
                            <th class="p-2 border-r border-slate-700 leading-tight">Libro</th>
                            <th class="p-2 border-r border-slate-700 leading-tight">Atalaya</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200">
    `;

    ORDEN_CONDICIONES.concat([{ clave: 'Otros', titulo: 'Sin Categoría' }]).forEach(grupo => {
        const hermanosGrupo = grupos[grupo.clave] || [];
        if (hermanosGrupo.length === 0) return;

        html += `
            <tr class="bg-slate-100 border-y border-slate-300 font-extrabold text-slate-800 text-left">
                <td colspan="13" class="px-3 py-2 uppercase tracking-wide bg-slate-200/80 text-xs">
                    ${grupo.titulo} (${hermanosGrupo.length})
                </td>
            </tr>
        `;

        hermanosGrupo.forEach(h => {
            const data = conteos[h.nombre] || crearEstructuraVacia();

            html += `
                <tr class="hover:bg-slate-50 transition text-sm">
                    <td class="p-2.5 text-left font-bold text-slate-800 border-r border-slate-200 truncate" title="${h.nombre}">
                        ${h.nombre}
                        ${data.totalActivo > 0 ? `<span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300" title="Asignaciones en la planilla activa actual">Planilla: ${data.totalActivo}</span>` : ''}
                    </td>
                    ${renderCeldaConteo(data.hist.presi, data.act.presi)}
                    ${renderCeldaConteo(data.hist.discurso, data.act.discurso)}
                    ${renderCeldaConteo(data.hist.perlas, data.act.perlas)}
                    ${renderCeldaConteo(data.hist.smm, data.act.smm)}
                    ${renderCeldaConteo(data.hist.necLocales, data.act.necLocales)}
                    ${renderCeldaConteo(data.hist.nvcOtro, data.act.nvcOtro)}
                    ${renderCeldaConteo(data.hist.lectorLibro, data.act.lectorLibro)}
                    ${renderCeldaConteo(data.hist.lectorAtalaya, data.act.lectorAtalaya)}
                    ${renderCeldaConteo(data.hist.estudioBiblico, data.act.estudioBiblico)}
                    ${renderCeldaConteo(data.hist.oraciones, data.act.oraciones)}
                    ${renderCeldaConteo(data.hist.presiDom, data.act.presiDom)}
                    <td class="p-2 font-black border-l-2 border-slate-300 text-center ${data.hist.total > 0 ? 'bg-amber-100/80 text-amber-900' : 'bg-slate-50 text-slate-400'}">
                        ${data.hist.total}
                    </td>
                </tr>
            `;
        });
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    contenedor.innerHTML = html;
};

// Renderiza celdas destacando si hay asignación activa en el programa preparado
function renderCeldaConteo(valorHist, valorAct) {
    if (valorAct > 0) {
        // Alerta: el hermano ya fue asignado en la planilla en preparación
        return `<td class="p-2 font-bold border-r border-slate-200 bg-amber-200 text-amber-950 border-2 border-amber-400">
            ${valorHist} <span class="text-[10px] text-amber-800 font-extrabold block">(+${valorAct} act)</span>
        </td>`;
    }
    if (valorHist > 0) {
        return `<td class="p-2 font-semibold border-r border-slate-200 bg-red-50 text-red-900">${valorHist}</td>`;
    }
    return `<td class="p-2 border-r border-slate-200 text-slate-300">0</td>`;
}

function crearEstructuraVacia() {
    return {
        hist: { presi:0, discurso:0, perlas:0, smm:0, necLocales:0, nvcOtro:0, lectorLibro:0, lectorAtalaya:0, estudioBiblico:0, oraciones:0, presiDom:0, total:0 },
        act:  { presi:0, discurso:0, perlas:0, smm:0, necLocales:0, nvcOtro:0, lectorLibro:0, lectorAtalaya:0, estudioBiblico:0, oraciones:0, presiDom:0, total:0 },
        totalActivo: 0
    };
}

function calcularConteosCombinados() {
    const res = {};

    if (Array.isArray(listaHermanos)) {
        listaHermanos.forEach(h => res[h.nombre] = crearEstructuraVacia());
    }

    const sumar = (nombre, cat, esActivo = false) => {
        if (!nombre || !res[nombre]) return;
        if (esActivo) {
            res[nombre].act[cat] = (res[nombre].act[cat] || 0) + 1;
            res[nombre].act.total = (res[nombre].act.total || 0) + 1;
            res[nombre].totalActivo = (res[nombre].totalActivo || 0) + 1;
        }
        res[nombre].hist[cat] = (res[nombre].hist[cat] || 0) + 1;
        res[nombre].hist.total = (res[nombre].hist.total || 0) + 1;
    };

    if (!Array.isArray(programaMes)) return res;

    programaMes.forEach(sem => {
        if (!sem) return;
        const esAct = true; // Todo lo cargado en programaMes es la planilla activa en preparación

        sumar(sem.presidencia, 'presi', esAct);
        sumar(sem.oracionIni, 'oraciones', esAct);
        sumar(sem.repaso, 'presi', esAct);
        sumar(sem.oracionFin, 'oraciones', esAct);
        sumar(sem.domPresi, 'presiDom', esAct);
        sumar(sem.domLector, 'lectorAtalaya', esAct);

        const partes = sem.partes || [];
        partes.forEach(p => {
            if (p.seccion === 'tesoros') {
                if (p.tit && p.tit.toLowerCase().includes('perlas')) {
                    sumar(p.asig, 'perlas', esAct);
                } else if (p.tit && p.tit.toLowerCase().includes('lectura')) {
                    sumar(p.asig, 'smm', esAct);
                    sumar(p.asigB, 'smm', esAct);
                    sumar(p.asigC, 'smm', esAct);
                } else {
                    sumar(p.asig, 'discurso', esAct);
                }
            } else if (p.seccion === 'maestros') {
                sumar(p.asig, 'smm', esAct);
                sumar(p.asigAyudante, 'smm', esAct);
                sumar(p.asigB, 'smm', esAct);
                sumar(p.asigBAyudante, 'smm', esAct);
                sumar(p.asigC, 'smm', esAct);
                sumar(p.asigCAyudante, 'smm', esAct);
            } else if (p.seccion === 'vida') {
                if (p.tit && p.tit.toLowerCase().includes('estudio bíblico')) {
                    sumar(p.asig, 'estudioBiblico', esAct);
                    sumar(p.asigAyudante, 'lectorLibro', esAct);
                } else if (p.tit && p.tit.toLowerCase().includes('necesidades locales')) {
                    sumar(p.asig, 'necLocales', esAct);
                } else {
                    sumar(p.asig, 'nvcOtro', esAct);
                }
            }
        });
    });

    return res;
}
