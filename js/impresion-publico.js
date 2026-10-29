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

window.cargarOpcionesAniosHistorial = function() {
    const selectAnio = document.getElementById('selectFiltroAnio');
    if (!selectAnio) return;

    selectAnio.innerHTML = '';
    const anioInicio = 2026;
    const anioActual = new Date().getFullYear();
    const anioFin = Math.max(anioActual, 2026) + 3;

    for (let anio = anioInicio; anio <= anioFin; anio++) {
        const option = document.createElement('option');
        option.value = anio;
        option.innerText = anio;
        if (anio === anioActual) option.selected = true;
        selectAnio.appendChild(option);
    }
};

window.buscarYCargarPlanillaHistorial = async function() {
    const mes = document.getElementById('selectFiltroMes').value;
    const anio = document.getElementById('selectFiltroAnio').value;
    const busquedaNombre = `${mes} ${anio}`.toUpperCase();

    try {
        const clienteSupabase = typeof db !== 'undefined' ? db : (typeof supabaseClient !== 'undefined' ? supabaseClient : null);

        if (!clienteSupabase) {
            alert("No hay conexión con la base de datos.");
            return;
        }

        const { data, error } = await clienteSupabase.from('planillas')
            .select('*')
            .ilike('mes_ano', `%${busquedaNombre}%`)
            .maybeSingle();

        if (error) {
            console.error("Error consultando planilla:", error);
            alert("Ocurrió un error al buscar en el historial.");
            return;
        }

        if (!data) {
            alert(`No se encontró ninguna planilla guardada para: ${busquedaNombre}`);
            return;
        }

        if (confirm(`Se encontró la planilla "${data.mes_ano}". ¿Deseas cargarla en la pantalla principal?`)) {
            window.nombreMesGlobal = data.mes_ano || "";
            window.programaMes = typeof data.datos === 'string' ? JSON.parse(data.datos) : (data.datos || []);

            const inputMes = document.getElementById('inputNombreMes');
            if (inputMes) inputMes.value = window.nombreMesGlobal;
            actualizarTextoTituloMes(window.nombreMesGlobal);

            window.semanaActivaIdx = 0;
            cambiarPestaña('planilla');
            renderizarSelectorSemanas();
            cargarSemanaEnPlanilla(0);
        }
    } catch (e) {
        console.error("Error al reabrir planilla:", e);
    }
};

/* VISTA PÚBLICA Y REALTIME */
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const esVistaPublica = params.get('vista') === 'publica';
    const mesSolicitado = params.get('mes');

    if (esVistaPublica && mesSolicitado) {
        activarModoPublico(mesSolicitado);
    }
});

async function activarModoPublico(mes) {
    document.body.classList.add('modo-publico');
    const modalLogin = document.getElementById('modalLogin');
    if (modalLogin) modalLogin.remove();

    await cargarYRenderizarMesPublico(mes);
    suscribirRealtimeMesPublico(mes);
}

async function cargarYRenderizarMesPublico(mes) {
    const areaPrint = document.querySelector('.print-area');
    if (!areaPrint) return;

    const mesBuscado = mes.trim().toUpperCase();
    const clienteSupabase = typeof db !== 'undefined' ? db : (typeof supabaseClient !== 'undefined' ? supabaseClient : null);

    if (!clienteSupabase) {
        console.error("No se encontró la conexión con Supabase.");
        return;
    }

    const { data, error } = await clienteSupabase
        .from('planillas')
        .select('*')
        .ilike('mes_ano', mesBuscado)
        .maybeSingle();

    if (error || !data) {
        areaPrint.innerHTML = `<div class="p-8 text-center text-rose-600 font-bold text-lg">No se encontró información publicada para el mes: ${mes}</div>`;
        return;
    }

    const programa = typeof data.datos === 'string' ? JSON.parse(data.datos) : (data.datos || []);

    if (!Array.isArray(programa) || programa.length === 0) {
        areaPrint.innerHTML = `<div class="p-8 text-center text-amber-600 font-bold text-lg">El mes ${mes} no tiene información guardada.</div>`;
        return;
    }

    let htmlPublico = `
        <div class="text-center mb-6 border-b-2 border-slate-900 pb-2">
            <h2 class="text-2xl font-black text-slate-900 uppercase tracking-widest">
                PROGRAMA DE REUNIONES - MES DE ${data.mes_ano || mesBuscado}
            </h2>
        </div>
    `;

    programa.forEach((sem) => {
        let filasHTML = '';

        filasHTML += `
            <tr>
                <td class="c-tiempo">1 min</td>
                <td class="font-medium" colspan="2">Canción N° ${sem.canciones?.[0] || ''}. Presidencia: Palabras de introducción.</td>
                <td colspan="7" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs">${fNom(sem.presidencia)}</td>
            </tr>
            <tr>
                <td class="c-tiempo"></td>
                <td class="font-medium" colspan="2">Oración</td>
                <td colspan="7" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs">${fNom(sem.oracionIni)}</td>
            </tr>
        `;

        let tHeader = false, mHeader = false, vHeader = false;

        (sem.partes || []).forEach(p => {
            if (p.seccion === 'tesoros' && !tHeader) {
                filasHTML += `<tr><th class="bg-tesoros text-white c-tiempo"><i class="fa-solid fa-gem text-xs"></i></th><th colspan="9" class="bg-tesoros text-white py-1 text-center text-xs font-extrabold uppercase">Tesoros de la Biblia</th></tr>`;
                tHeader = true;
            } else if (p.seccion === 'maestros' && !mHeader) {
                filasHTML += `<tr><th class="bg-maestros text-white c-tiempo"><i class="fa-solid fa-wheat-awn text-xs"></i></th><th colspan="9" class="bg-maestros text-white py-1 text-center text-xs font-extrabold uppercase">Seamos mejores maestros</th></tr>`;
                mHeader = true;
            } else if (p.seccion === 'vida' && !vHeader) {
                filasHTML += `
                    <tr><th class="bg-vida text-white c-tiempo py-1"><img src="Oveja.png" class="w-4 h-4 mx-auto object-contain" alt="Oveja"></th><th colspan="9" class="bg-vida text-white py-1 text-center text-xs font-extrabold uppercase">Nuestra vida cristiana</th></tr>
                    <tr><td class="px-2 font-bold" colspan="10">Canción Nº: ${sem.canciones?.[1] || ''}</td></tr>
                `;
                vHeader = true;
            }

            let celdasNombres = '';
            const numSalas = sem.numSalas || 1;

            if (numSalas === 2 && p.seccion === 'maestros') {
                celdasNombres = `
                    <td colspan="4" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs border-r border-slate-300">
                        ${fNom(p.asig)} ${fNom(p.asigAyudante) ? '/ ' + fNom(p.asigAyudante) : ''}
                    </td>
                    <td colspan="3" class="font-black uppercase text-amber-950 bg-amber-100/50 text-center text-xs">
                        ${fNom(p.asigB)} ${fNom(p.asigBAyudante) ? '/ ' + fNom(p.asigBAyudante) : ''}
                    </td>
                `;
            } else if (numSalas === 3 && p.seccion === 'maestros') {
                celdasNombres = `
                    <td colspan="3" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs border-r border-slate-300">
                        ${fNom(p.asig)} ${fNom(p.asigAyudante) ? '/ ' + fNom(p.asigAyudante) : ''}
                    </td>
                    <td colspan="2" class="font-black uppercase text-amber-950 bg-amber-100/50 text-center text-xs border-r border-slate-300">
                        ${fNom(p.asigB)} ${fNom(p.asigBAyudante) ? '/ ' + fNom(p.asigBAyudante) : ''}
                    </td>
                    <td colspan="2" class="font-black uppercase text-amber-950 bg-amber-200/50 text-center text-xs">
                        ${fNom(p.asigC)} ${fNom(p.asigCAyudante) ? '/ ' + fNom(p.asigCAyudante) : ''}
                    </td>
                `;
            } else {
                celdasNombres = `
                    <td colspan="7" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs">
                        ${fNom(p.asig)} ${fNom(p.asigAyudante) ? '/ ' + fNom(p.asigAyudante) : ''}
                    </td>
                `;
            }

            filasHTML += `
                <tr>
                    <td class="c-tiempo">${p.t || ''}</td>
                    <td class="font-medium px-2">${p.tit || ''}</td>
                    <td class="text-slate-600 px-2">${p.desc || ''}</td>
                    ${celdasNombres}
                </tr>
            `;
        });

        filasHTML += `
            <tr>
                <td class="c-tiempo">3 min</td>
                <td class="font-medium px-2" colspan="2">Repaso de esta reunión y adelanto de la próxima.</td>
                <td colspan="7" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs">${fNom(sem.repaso)}</td>
            </tr>
            <tr>
                <td class="c-tiempo"></td>
                <td class="font-medium px-2" colspan="2">Canción y oración: 38</td>
                <td colspan="7" class="font-black uppercase text-amber-950 bg-amber-50/50 text-center text-xs">${fNom(sem.oracionFin)}</td>
            </tr>
            <tr class="border-t-2 border-slate-900 bg-slate-50/50">
                <td class="px-2 font-bold py-1.5" colspan="3">Domingo, presidencia: ${fNom(sem.domPresi)}</td>
                <td class="px-2 font-bold py-1.5 text-right" colspan="7">Lector: ${fNom(sem.domLector)}</td>
            </tr>
        `;

        htmlPublico += `
            <div class="mb-8">
                <table class="tabla-semana-publica border border-slate-900 w-full">
                    <thead>
                        <tr>
                            <th colspan="10" class="py-1.5 text-center bg-slate-100 border-b-2 border-slate-900 font-black text-sm text-slate-900">
                                Semana del ${sem.semana || '---'} ${sem.lectura ? ', ' + sem.lectura : ''}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filasHTML}
                    </tbody>
                </table>
            </div>
        `;
    });

    areaPrint.innerHTML = htmlPublico;
}

function suscribirRealtimeMesPublico(mes) {
    const clienteSupabase = typeof db !== 'undefined' ? db : (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
    if (!clienteSupabase) return;

    clienteSupabase
        .channel('publico-planillas')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'planillas', filter: `mes_ano=eq.${mes.toUpperCase()}` }, () => {
            cargarYRenderizarMesPublico(mes);
        })
        .subscribe();
}
