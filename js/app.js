function cargarSemanaEnPlanilla(idx) {
    if (!programaMes || programaMes.length === 0) return;
    semanaActivaIdx = idx;
    renderizarSelectorSemanas();
    const sem = programaMes[idx];

    const numSalas = sem.tipoSemana === 'viajante' ? 1 : (sem.numSalas || 1);
    
    const selSalas = document.getElementById('selectNumSalas');
    if (selSalas) {
        selSalas.value = numSalas;
        selSalas.disabled = (sem.tipoSemana === 'viajante');
    }

    const cabecera = document.getElementById('cabeceraTablaPlanilla');
    cabecera.innerHTML = `
        <colgroup>
            <col class="col-tiempo">
            <col class="col-titulo">
            <col class="col-desc">
            <col class="col-asig">
        </colgroup>
        <tr>
            <th colspan="4" class="py-2 px-3 bg-white text-center border-b-2 border-slate-900">
                <span class="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                    Semana del ${sem.semana}, ${sem.lectura}
                </span>
            </th>
        </tr>
    `;

    const radios = document.getElementsByName('tipoSemana');
    radios.forEach(r => r.checked = (r.value === sem.tipoSemana));

    const banner = document.getElementById('bannerEventoEspecial');
    const tabla = document.getElementById('tablaPlanillaCompleta');

    if (sem.tipoSemana === 'asamblea') {
        banner.className = "mb-4 p-4 rounded-lg text-center font-extrabold text-sm bg-red-100 text-red-900 border border-red-300 block";
        banner.innerHTML = `<i class="fa-solid fa-building-columns text-xl mb-1"></i><br>NO HAY REUNIÓN ENTRE SEMANA POR ASAMBLEA DE CIRCUITO / REGIONAL`;
        tabla.classList.add('opacity-30', 'pointer-events-none');
    } else if (sem.tipoSemana === 'conmemoracion') {
        banner.className = "mb-4 p-4 rounded-lg text-center font-extrabold text-sm bg-purple-100 text-purple-900 border border-purple-300 block";
        banner.innerHTML = `<i class="fa-solid fa-wine-glass text-xl mb-1"></i><br>CELEBRACIÓN DE LA CONMEMORACIÓN DE LA MUERTE DE CRISTO`;
        tabla.classList.remove('opacity-30', 'pointer-events-none');
    } else {
        banner.classList.add('hidden');
        tabla.classList.remove('opacity-30', 'pointer-events-none');
    }

    const p = sem.partes || {};
    const cuerpo = document.getElementById('cuerpoTablaPlanilla');
    
    const renderSalasCelda = (parteKey, cat) => {
        const item = p[parteKey] || {};
        if (numSalas === 1) {
            return `<td class="px-2 col-asig">${crearSelectHTML(`asig_${parteKey}_A`, cat, item.asig)}</td>`;
        }
        
        let html = `<td class="px-1 py-1 col-asig">
            <div class="grid grid-cols-${numSalas} gap-1 text-[10px]">
                <div class="border-r border-slate-300 pr-1">
                    <span class="block text-[8px] text-slate-400 font-bold uppercase">Prin.</span>
                    ${crearSelectHTML(`asig_${parteKey}_A`, cat, item.asig, "Principal")}
                </div>
                <div class="${numSalas === 3 ? 'border-r border-slate-300 pr-1' : ''}">
                    <span class="block text-[8px] text-slate-400 font-bold uppercase">Sala B</span>
                    ${crearSelectHTML(`asig_${parteKey}_B`, cat, item.asigB, "Sala B")}
                </div>`;
        if (numSalas === 3) {
            html += `<div>
                    <span class="block text-[8px] text-slate-400 font-bold uppercase">Sala C</span>
                    ${crearSelectHTML(`asig_${parteKey}_C`, cat, item.asigC, "Sala C")}
                </div>`;
        }
        html += `</div></td>`;
        return html;
    };

    // Generación dinámica de filas basada en las partes reales procesadas
    let filasHTML = `
        <tr class="h-6">
            <td class="col-tiempo font-bold text-xs">1 min</td>
            <td class="px-2 font-medium" colspan="2">Canción N° ${sem.canciones?.[0] || ''}. Presidencia: Palabras de introducción.</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_presi', 'pres', sem.presidencia)}</td>
        </tr>
        <tr class="h-6">
            <td class="col-tiempo"></td>
            <td class="px-2 font-medium" colspan="2">Oración</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_orac_ini', 'orac', sem.oracionIni)}</td>
        </tr>
    `;

    const keys = Object.keys(p);
    let tesorosMostrado = false;
    let maestrosMostrado = false;
    let vidaMostrado = false;

    keys.forEach((pk, index) => {
        const item = p[pk];
        if (!item || !item.tit) return;

        // Encabezados de sección según la parte
        if (index === 0 && !tesorosMostrado) {
            filasHTML += `<tr><th colspan="4" class="bg-tesoros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Tesoros de la Biblia</th></tr>`;
            tesorosMostrado = true;
        } else if (index === 3 && !maestrosMostrado) {
            filasHTML += `<tr><th colspan="4" class="bg-maestros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Seamos mejores maestros</th></tr>`;
            maestrosMostrado = true;
        } else if (index === 7 && !vidaMostrado) {
            filasHTML += `
                <tr><th colspan="4" class="bg-vida text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Nuestra vida cristiana</th></tr>
                <tr><td class="px-2 font-bold" colspan="4">Canción N°: ${sem.canciones?.[1] || ''}</td></tr>
            `;
            vidaMostrado = true;
        }

        // Seleccionar categoría adecuada para el filtro de hermanos
        let cat = 'smm';
        if (index === 0) cat = 'disc';
        else if (index === 1) cat = 'perlas';
        else if (index === 2) cat = 'lec';
        else if (index >= 7) cat = 'nvc';

        const esParteMultiSala = (index >= 2 && index <= 6);

        filasHTML += `
            <tr>
                <td class="col-tiempo font-bold text-xs">${item.t || ''}</td>
                <td class="px-2 col-titulo font-medium">${item.tit}</td>
                <td class="px-2 col-desc text-slate-700">${item.desc || ''}</td>
                ${esParteMultiSala ? renderSalasCelda(pk, cat) : `<td class="px-2 col-asig">${crearSelectHTML(`asig_${pk}`, cat, item.asig)}</td>`}
            </tr>
        `;
    });

    // Cierre estándar de la reunión
    filasHTML += `
        <tr class="h-6">
            <td class="col-tiempo font-bold text-xs">3 min</td>
            <td class="px-2 font-medium" colspan="2">Repaso de esta reunión y adelanto de la próxima.</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_repaso', 'pres', sem.repaso)}</td>
        </tr>
        <tr class="h-6">
            <td class="col-tiempo"></td>
            <td class="px-2 font-medium" colspan="2">Canción ${sem.canciones?.[2] || ''} y oración</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_orac_fin', 'orac', sem.oracionFin)}</td>
        </tr>

        <tr class="border-t-2 border-slate-900 bg-slate-50/50">
            <td class="px-2 font-bold py-1.5" colspan="2">
                Domingo, presidencia: 
                <div class="inline-block ml-2 w-48">${crearSelectHTML('asig_dom_presi', 'presPub', sem.domPresi)}</div>
            </td>
            <td class="px-2 font-bold py-1.5 text-right" colspan="2">
                Lector La Atalaya: 
                <div class="inline-block ml-2 text-left w-48">${crearSelectHTML('asig_dom_lector', 'lectorW', sem.domLector)}</div>
            </td>
        </tr>
    `;

    cuerpo.innerHTML = filasHTML;
}
