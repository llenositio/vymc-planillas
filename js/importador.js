window.abrirModalImportador = function() {
    const m = document.getElementById('modalImportador');
    if (m) m.classList.remove('hidden');
    window.volverAPasoTextoCrudo();
};

window.cerrarModalImportador = function() {
    const m = document.getElementById('modalImportador');
    if (m) m.classList.add('hidden');
};

window.volverAPasoTextoCrudo = function() {
    const paso1 = document.getElementById('pasoModalTextoCrudo');
    const paso2 = document.getElementById('pasoModalFormateado');
    const btn1 = document.getElementById('btnConvertirCrudo');
    const btn2 = document.getElementById('btnCargarAPlanilla');

    if (paso1) paso1.classList.remove('hidden');
    if (paso2) paso2.classList.add('hidden');
    if (btn1) btn1.classList.remove('hidden');
    if (btn2) btn2.classList.add('hidden');
};

window.convertirTextoCrudoADelimitado = function() {
    const rawEl = document.getElementById('inputTextoCrudo');
    if (!rawEl || !rawEl.value.trim()) {
        alert("Pega primero el texto del programa.");
        return;
    }

    const raw = rawEl.value;
    const lineas = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let resultadoLineas = [];

    let semanaTexto = "";
    let lecturaTexto = "";

    for (let i = 0; i < lineas.length; i++) {
        let l = lineas[i];
        if (l.match(/\d+-\d+\s+DE\s+[A-Z]+/i)) {
            semanaTexto = l;
            if (lineas[i+1] && !lineas[i+1].includes('Canción')) {
                lecturaTexto = lineas[i+1];
            }
            break;
        }
    }

    if (semanaTexto) {
        resultadoLineas.push(`Semana del ${semanaTexto} // ${lecturaTexto}`);
    }

    for (let i = 0; i < lineas.length; i++) {
        let l = lineas[i];

        if (l.includes("TESOROS DE LA BIBLIA")) {
            resultadoLineas.push("TESOROS DE LA BIBLIA");
            continue;
        }
        if (l.includes("SEAMOS MEJORES MAESTROS")) {
            resultadoLineas.push("SEAMOS MEJORES MAESTROS");
            continue;
        }
        if (l.includes("NUESTRA VIDA CRISTIANA")) {
            resultadoLineas.push("NUESTRA VIDA CRISTIANA");
            continue;
        }

        if (l.startsWith("Canción") && l.includes("introducción")) {
            let partesIntro = l.split('|');
            resultadoLineas.push(`${partesIntro[0].trim()} // ${partesIntro[1] ? partesIntro[1].trim() : ''}`);
            resultadoLineas.push("Oracion");
            continue;
        }

        if (l.startsWith("Canción") && !l.includes("oración") && !l.includes("introducción")) {
            resultadoLineas.push(l);
            continue;
        }

        if (l.includes("Palabras de conclusión")) {
            let partesFin = l.split('|');
            resultadoLineas.push(`${partesFin[0].trim()} |`);
            if (partesFin[1]) resultadoLineas.push(partesFin[1].trim());
            continue;
        }

        let matchNum = l.match(/^(\d+)\.\s*(.+)/);
        if (matchNum) {
            let numParte = matchNum[1];
            let restTexto = matchNum[2];
            let tiempo = "5 min";

            for (let j = i; j <= Math.min(i + 4, lineas.length - 1); j++) {
                let matchTiempo = lineas[j].match(/\((\d+\s*min[s]?\.)\)/i);
                if (matchTiempo) {
                    tiempo = matchTiempo[1];
                    break;
                }
            }

            if (numParte === "1") {
                resultadoLineas.push(`${tiempo} // ${l} // Discurso`);
            } 
            else if (numParte === "2") {
                resultadoLineas.push(`${tiempo} // ${l} // Preguntas y respuestas, ${lecturaTexto}`);
            } 
            else if (numParte === "3") {
                let detLectura = restTexto.replace(/\(\d+\s*min[s]?\.\)/i, '').trim();
                resultadoLineas.push(`${tiempo} // 3. Lectura de la Biblia // ${detLectura}`);
            } 
            else {
                let partesLinea = restTexto.split('.');
                let titulo = `${numParte}. ${partesLinea[0].trim()}`;
                let descripcion = partesLinea.slice(1).join('.').replace(/\(\d+\s*min[s]?\.\)/i, '').trim();

                if (descripcion) {
                    resultadoLineas.push(`${tiempo} // ${titulo} // ${descripcion}`);
                } else {
                    resultadoLineas.push(`${tiempo} // ${titulo} // `);
                }
            }
        }
    }

    const outEl = document.getElementById('outputTextoDelimitado');
    if (outEl) outEl.value = resultadoLineas.join('\n');

    document.getElementById('pasoModalTextoCrudo').classList.add('hidden');
    document.getElementById('pasoModalFormateado').classList.remove('hidden');
    document.getElementById('btnConvertirCrudo').classList.add('hidden');
    document.getElementById('btnCargarAPlanilla').classList.remove('hidden');
};

window.cargarDelimitadoAPlanilla = async function() {
    const outEl = document.getElementById('outputTextoDelimitado');
    if (!outEl || !outEl.value.trim()) return;

    const textoDelimitado = outEl.value;
    const lineas = textoDelimitado.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let nuevaSemana = {
        semana: "",
        lectura: "",
        canciones: ["", "", ""],
        tipoSemana: "normal",
        numSalas: 1,
        partes: []
    };

    let seccionActual = "tesoros";

    lineas.forEach(linea => {
        if (linea.startsWith("TESOROS DE LA BIBLIA")) { seccionActual = "tesoros"; return; }
        if (linea.startsWith("SEAMOS MEJORES MAESTROS")) { seccionActual = "maestros"; return; }
        if (linea.startsWith("NUESTRA VIDA CRISTIANA")) { seccionActual = "vida"; return; }

        if (linea.startsWith("Cancion") || linea.startsWith("Canción")) {
            let num = linea.replace(/\D/g, '');
            if (num && !linea.includes("introducción") && !linea.includes("oración")) {
                nuevaSemana.canciones[1] = num;
            }
            return;
        }

        if (linea.startsWith("Semana del")) {
            const partesHead = linea.split('//');
            if (partesHead[0]) nuevaSemana.semana = partesHead[0].replace('Semana del', '').trim();
            if (partesHead[1]) nuevaSemana.lectura = partesHead[1].trim();
            return;
        }

        const segmentos = linea.split('//').map(s => s.trim());
        if (segmentos.length >= 1 && !linea.startsWith("Canción") && !linea.startsWith("Palabras") && !linea.startsWith("Oracion")) {
            let t = "", tit = "", desc = "";

            if (segmentos.length === 1) {
                tit = segmentos[0];
            } else if (segmentos.length === 2) {
                tit = segmentos[0];
                desc = segmentos[1];
            } else if (segmentos.length >= 3) {
                t = segmentos[0];
                tit = segmentos[1];
                desc = segmentos[2];
            }

            tit = tit.replace(/[\r\n]+/g, ' ');
            desc = desc.replace(/[\r\n]+/g, ' ');

            nuevaSemana.partes.push({
                seccion: seccionActual,
                t: t,
                tit: tit,
                desc: desc,
                participantes: seccionActual === 'maestros' ? 2 : 1,
                asig: ''
            });
        }
    });

    if (nuevaSemana.partes.length > 0) {
        window.programaMes[window.semanaActivaIdx] = nuevaSemana;
        cargarSemanaEnPlanilla(window.semanaActivaIdx);
        await notificarYGuardarAutosave();
    }

    window.cerrarModalImportador();
};
