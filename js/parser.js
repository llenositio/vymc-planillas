/**
 * Analiza el texto bruto pegado desde JW.org o la Guía de Actividades
 * y construye las semanas con sus partes detalladas, canciones y libro de estudio.
 */
function procesarTextoGuiaActividades(rawText) {
    if (!rawText || !rawText.trim()) return [];

    // Separar bloques por fechas (Ejemplo: "5-11 DE OCTUBRE")
    const bloques = rawText.split(/\n(?=\d{1,2}-\d{1,2}\s+DE\s+)/i);
    let nuevasSemanas = [];

    bloques.forEach((bloque, idx) => {
        const lineas = bloque.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lineas.length < 2) return;

        const semanaNom = lineas[0];
        const lecturaNom = lineas[1];

        // 1. EXTRAER CANCIONES (Busca todas las apariciones de "Canción X" en la semana)
        let canciones = [];
        lineas.forEach(linea => {
            const matchCancion = linea.match(/Canci[óo]n\s+(\d+)/i);
            if (matchCancion && canciones.length < 3) {
                canciones.push(matchCancion[1]);
            }
        });

        // Si se encontraron menos de 3 canciones, rellenar vacíos
        while (canciones.length < 3) {
            canciones.push("");
        }

        let partes = {};

        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i];
            const matchParte = linea.match(/^(\d+)\.\s+(.*)/);

            if (matchParte) {
                const numStr = matchParte[1];
                const num = parseInt(numStr);
                let titBruto = matchParte[2];

                let t = "";
                let desc = "";
                let titFinal = titBruto;

                // Extraer tiempo entre paréntesis
                let matchTiempo = titBruto.match(/\((\d+\s*min[^\)]*)\)/i);

                // --- CASO ESPECIAL: LECTURA DE LA BIBLIA (PARTE 3) ---
                if (num === 3) {
                    titFinal = "3. Lectura de la Biblia";
                    if (i + 1 < lineas.length) {
                        const sigLinea = lineas[i + 1];
                        const matchSigTiempo = sigLinea.match(/\((\d+\s*min[^\)]*)\)/i);
                        if (matchSigTiempo) {
                            t = matchSigTiempo[1];
                            desc = sigLinea.replace(/\([^\)]*min[^\)]*\)/gi, '').trim();
                        } else {
                            desc = sigLinea;
                        }
                    }
                    if (!t) t = "4 min o menos";
                    titFinal = `3. Lectura de la Biblia: ${desc}`;
                    desc = "";
                } 
                // --- CASO ESPECIAL: ESTUDIO BÍBLICO DE LA CONGREGACIÓN (PARTE 9) ---
                else if (num === 9) {
                    titFinal = "9. Estudio bíblico de la congregación";
                    t = "30 min";
                    
                    // Extraer la porción del libro (Ejemplo: "wcg cap. 11" o "(30 mins.) wcg cap. 11")
                    let textoLibro = titBruto.replace(/\([^\)]*\)/g, '').replace(/Estudio b[íi]blico de la congregaci[óo]n:?/i, '').trim();
                    
                    // Si no venía en la misma línea, buscar en el renglón de abajo
                    if (!textoLibro && i + 1 < lineas.length) {
                        textoLibro = lineas[i + 1].replace(/\([^\)]*\)/g, '').trim();
                    }

                    if (textoLibro) {
                        titFinal = `9. Estudio bíblico de la congregación: ${textoLibro}`;
                    }
                }
                // --- RESTO DE PARTES ---
                else {
                    if (matchTiempo) {
                        t = matchTiempo[1];
                        titFinal = `${num}. ` + titBruto.replace(/\([^\)]*\)/g, '').trim();
                    } else if (i + 1 < lineas.length) {
                        const sigLinea = lineas[i + 1];
                        const matchSigTiempo = sigLinea.match(/\((\d+\s*min[^\)]*)\)/i);
                        if (matchSigTiempo) {
                            t = matchSigTiempo[1];
                            desc = sigLinea.replace(/\([^\)]*min[^\)]*\)/gi, '').trim();
                        }
                    }

                    if (num === 1) desc = "Discurso";
                    else if (num === 2) desc = `Preguntas y respuestas ${lecturaNom}`;
                }

                // Categorización
                let cat = "smm";
                if (num === 1) cat = "disc";
                else if (num === 2) cat = "perlas";
                else if (num === 3) cat = "lec";
                else if (num >= 8 && num < 9) cat = "nvc";
                else if (num >= 9) cat = "eb";

                partes[`p${num}`] = {
                    t: t,
                    tit: titFinal,
                    desc: desc,
                    cat: cat,
                    asig: "",
                    asigB: "",
                    asigC: ""
                };
            }
        }

        nuevasSemanas.push({
            idSemana: idx,
            semana: semanaNom,
            lectura: lecturaNom,
            tipoSemana: "normal",
            numSalas: 1,
            canciones: canciones,
            partes: partes,
            presidencia: "",
            oracionIni: "",
            repaso: "",
            oracionFin: "",
            domPresi: "",
            domLector: ""
        });
    });

    return nuevasSemanas;
}
