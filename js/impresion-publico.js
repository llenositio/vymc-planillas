/* IMPRESIÓN A4: 2 SEMANAS POR PÁGINA */
window.prepararEImprimir = function() {
    const areaPrint = document.querySelector('.print-area');
    if (!areaPrint) {
        window.print();
        return;
    }

    const contenidoOriginal = areaPrint.innerHTML;
    let htmlTotalPrint = '';

    for (let i = 0; i < window.programaMes.length; i += 2) {
        htmlTotalPrint += `<div class="hoja-print">`;

        if (i === 0) {
            htmlTotalPrint += `
                <div class="text-center mb-2 border-b-2 border-slate-900 pb-1">
                    <h2 class="text-sm font-black text-slate-900 uppercase tracking-widest">
                        PROGRAMA DE REUNIONES - MES DE ${window.nombreMesGlobal || "---"}
                    </h2>
                </div>
            `;
        }

        htmlTotalPrint += generarHTMLSemanaImpresion(i);

        if (i + 1 < window.programaMes.length) {
            htmlTotalPrint += generarHTMLSemanaImpresion(i + 1);
        }

        htmlTotalPrint += `</div>`;
    }

    areaPrint.innerHTML = htmlTotalPrint;

    setTimeout(() => {
        window.print();
        areaPrint.innerHTML = contenidoOriginal;
        cargarSemanaEnPlanilla(window.semanaActivaIdx);
    }, 250);
};

function generarHTMLSemanaImpresion(idx) {
    const sem = window.programaMes[idx];
    if (!sem) return '';

    cargarSemanaEnPlanilla(idx);
    const cuerpoActual = document.getElementById('cuerpoTablaPlanilla');
    const htmlCuerpo = cuerpoActual ? cuerpoActual.innerHTML : '';

    return `
        <div class="semana-bloque-print">
            <table class="tabla-semana-print">
                <colgroup>
                    <col class="c-tiempo">
                    <col style="width: 25% !important;">
                    <col style="width: 35% !important;">
                    <col style="width: 5% !important;">
                    <col style="width: 5% !important;">
                    <col style="width: 5% !important;">
                    <col style="width: 5% !important;">
                    <col style="width: 5% !important;">
                    <col style="width: 5% !important;">
                    <col style="width: 5% !important;">
                </colgroup>
                <thead>
                    <tr>
                        <th colspan="10" class="py-0.5 text-center bg-slate-100 border-b-2 border-slate-900 font-black text-xs text-slate-900">
                            Semana del ${sem.semana || '---'} , ${sem.lectura || '---'}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    ${htmlCuerpo}
                </tbody>
            </table>
        </div>
    `;
}
