/**
 * Módulo de Historial y Estadísticas Dinámicas de Asignaciones
 * Versión de Alta Legibilidad: Fuentes más grandes, mayor padding y columnas uniformes.
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
        contenedor.innerHTML = `<div class="p-8 text-center text-slate-500 font-semibold text-base">No hay hermanos cargados en la matriz.</div>`;
        return;
    }

    const conteos = calcularConteosCombinados();

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

    let html = `
        <div class="shadow-md rounded-xl border border-slate-300 bg-white overflow-hidden my-2">
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-center border-collapse">
                    <colgroup>
                        <col class="w-60"> <!-- Hermano: Ancho cómodo para nombres largos -->
                        <col class="w-24"> <!-- Pres. Vid y Min -->
                        <col class="w-24"> <!-- Tesoros Disc -->
                        <col class="w-24"> <!-- Tesoros Perlas -->
                        <col class="w-24"> <!-- SMM -->
                        <col class="w-24"> <!-- NVC Nec. Locales -->
                        <col class="w-24"> <!-- NVC Otro -->
                        <col class="w-24"> <!-- Lec Libro -->
                        <col class="w-24"> <!-- Lec Atalaya -->
                        <col class="w-24"> <!-- Estudio Bíblico -->
                        <col class="w-24"> <!-- Oraciones -->
                        <col class="w-24"> <!-- P. Pública -->
                        <col class="w-28"> <!-- PRESENCIA -->
                    </colgroup>
                    <thead>
                        <tr class="bg-slate-900 text-white font-extrabold uppercase text-xs tracking-wider border-b border-slate-800">
                            <th class="py-3 px-3 text-left border-r border-slate-800" rowspan="2">HERMANO</th>
                            <th class="py-3 px-1 border-r border-slate-800 leading-snug" rowspan="2">Pres.<br>Vid y Min</th>
                            <th class="py-2 px-1 border-r border-slate-800" colspan="2">Tesoros de la Biblia</th>
                            <th class="py-3 px-1 border-r border-slate-800" rowspan="2">SMM</th>
                            <th class="py-2 px-1 border-r border-slate-800" colspan="2">Nuestra vida cristiana</th>
                            <th class="py-2 px-1 border-r border-slate-800" colspan="2">Lecturas</th>
                            <th class="py-3 px-1 border-r border-slate-800 leading-snug" rowspan="2">Estudio<br>Bíblico</th>
                            <th class="py-3 px-1 border-r border-slate-800" rowspan="2">Oraciones</th>
                            <th class="py-3 px-1 border-r border-slate-800 leading-snug" rowspan="2">P. Pública<br>+ Oración</th>
                            <th class="py-3 px-1 bg-amber-600 text-white font-black tracking-wider" rowspan="2">PRESENCIA</th>
                        </tr>
                        <tr class="bg-slate-800 text-slate-200 font-bold text-[11px] uppercase border-b border-slate-700">
                            <th class="py-2.5 px-1 border-r border-slate-700 leading-tight">Discurso</th>
                            <th class="py-2.5 px-1 border-r border-slate-700 leading-tight">Busquemos<br>perlas</th>
                            <th class="py-2.5 px-1 border-r border-slate-700 leading-tight">Necesidades<br>Locales</th>
                            <th class="py-2.5 px-1 border-r border-slate-700 leading-tight">Otro</th>
                            <th class="py-2.5 px-1 border-r border-slate-700 leading-tight">Libro</th>
                            <th class="py-2.5 px-1 border-r border-slate-700 leading-tight">Atalaya</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 font-medium">
    `;

    ORDEN_CONDICIONES.concat([{ clave: 'Otros', titulo: 'Sin Categoría' }]).forEach(grupo => {
        const hermanosGrupo = grupos[grupo.clave] || [];
        if (hermanosGrupo.length === 0) return;

        html += `
            <tr class="bg-slate-200/90 border-y border-slate-300 font-black text-slate-900 text-left">
                <td colspan="13" class="px-4 py-2.5 uppercase tracking-wide text-xs">
                    ${grupo.titulo} (${hermanosGrupo.length})
                </td>
            </tr>
        `;

        hermanosGrupo.forEach(h => {
            const data = conteos[h.nombre] || crearEstructuraVacia();

            html += `
                <tr class="hover:bg-slate-50 transition text-sm">
                    <td class="py-3 px-3 text-left font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                        <div class="flex items-center justify-between gap-1">
                            <span>${h.nombre}</span>
                            ${data.totalActivo > 0 ? `<span class="shrink-0 px-1.5 py-0.5 rounded text-[11px] font-black bg-amber-200 text-amber-950 border border-amber-400">Planilla: ${data.totalActivo}</span>` : ''}
                        </div>
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
                    <td class="py-3 px-2 font-black border-l-2 border-slate-300 text-center text-base ${data.hist.total > 0 ? 'bg-amber-100 text-amber-950' : 'bg-slate-50 text-slate-400'}">
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

function renderCeldaConteo(valorHist, valorAct) {
    if (valorAct > 0) {
        return `<td class="py-3 px-2 font-black border-r border-slate-200 bg-amber-200 text-amber-950 border-2 border-amber-400 text-sm">
            ${valorHist} <span class="text-[11px] text-amber-900 font-extrabold block leading-none mt-0.5">(+${valorAct} act)</span>
        </td>`;
    }
    if (valorHist > 0) {
        return `<td class="py-3 px-2 font-bold border-r border-slate-200 bg-red-100 text-red-900 text-sm">${valorHist}</td>`;
    }
    return `<td class="py-3 px-2 border-r border-slate-200 text-slate-300 text-sm">0</td>`;
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
        const esAct = true;

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
