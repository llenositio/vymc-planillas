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
    
    // Generador de celdas para salas aprovechando el 50% del ancho
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

    cuerpo.innerHTML = `
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

        <tr>
            <th colspan="4" class="bg-tesoros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Tesoros de la Biblia</th>
        </tr>
        <tr>
            <td class="col-tiempo font-bold text-xs">${p.p1?.t || '10 min'}</td>
            <td class="px-2 col-titulo font-medium">${p.p1?.tit || '1. Discurso'}</td>
            <td class="px-2 col-desc font-semibold text-slate-700">${p.p1?.desc || 'Discurso'}</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_p1', 'disc', p.p1?.asig)}</td>
        </tr>
        <tr>
            <td class="col-tiempo font-bold text-xs">${p.p2?.t || '10 min'}</td>
            <td class="px-2 col-titulo font-medium">${p.p2?.tit || '2. Busquemos perlas escondidas'}</td>
            <td class="px-2 col-desc font-semibold text-slate-700">${p.p2?.desc || 'Preguntas y respuestas'}</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_p2', 'perlas', p.p2?.asig)}</td>
        </tr>
        <tr>
            <td class="col-tiempo font-bold text-xs">${p.p3?.t || '4 min'}</td>
            <td class="px-2 col-titulo font-medium">3. Lectura de la Biblia</td>
            <td class="px-2 col-desc font-medium text-slate-700">${p.p3?.desc || ''}</td>
            ${renderSalasCelda('p3', 'lec')}
        </tr>

        <tr>
            <th colspan="4" class="bg-maestros text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Seamos mejores maestros</th>
        </tr>
        ${['p4', 'p5', 'p6', 'p7'].map(pk => p[pk]?.tit ? `
        <tr>
            <td class="col-tiempo font-bold text-xs">${p[pk].t}</td>
            <td class="px-2 col-titulo font-medium">${p[pk].tit}</td>
            <td class="px-2 col-desc text-slate-700">${p[pk].desc}</td>
            ${renderSalasCelda(pk, 'smm')}
        </tr>` : '').join('')}

        <tr>
            <th colspan="4" class="bg-vida text-white py-1 text-center text-xs font-extrabold uppercase tracking-wide">Nuestra vida cristiana</th>
        </tr>
        <tr>
            <td class="px-2 font-bold" colspan="4">Canción N°: ${sem.canciones?.[1] || ''}</td>
        </tr>
        ${p.p8?.tit ? `
        <tr>
            <td class="col-tiempo font-bold text-xs">${p.p8.t}</td>
            <td class="px-2 col-titulo font-medium">${p.p8.tit}</td>
            <td class="px-2 col-desc text-slate-700">${p.p8.desc}</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_p8', 'nvc', p.p8.asig)}</td>
        </tr>` : ''}
        <tr>
            <td class="col-tiempo font-bold text-xs">${p.p9?.t || '30 min'}</td>
            <td class="px-2 font-medium" colspan="2">${p.p9?.tit || 'Estudio bíblico de la congregación'}</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_p9', 'eb', p.p9?.asig)}</td>
        </tr>
        ${sem.tipoSemana !== 'viajante' ? `
        <tr>
            <td class="col-tiempo"></td>
            <td class="px-2 font-medium" colspan="2">Lector del Estudio Bíblico:</td>
            <td class="px-2 col-asig">${crearSelectHTML('asig_lector_eb', 'lectorL', p.p9?.lector)}</td>
        </tr>` : ''}
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
}
