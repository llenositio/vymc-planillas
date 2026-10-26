/**
 * Analiza el texto bruto pegado desde JW.org o la Guía de Actividades
 * y construye las semanas con sus partes detalladas.
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

        // Extracción de números de canciones
        let canciones = ["", "", ""];
        const lineaCanciones = lineas.find(l => l.toLowerCase().includes("cancion") || l.toLowerCase().includes("canciones"));
        if (lineaCanciones) {
            const numCanciones = lineaCanciones.match(/\d+/g);
            if (numCanciones) canciones = numCanciones.slice(0, 3);
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

                // Extraer tiempo entre paréntesis de la misma línea o del renglón siguiente
                let matchTiempo = titBruto.match(/\((\d+\s*min[^\)]*)\)/i);
                
                // Si es la Lectura de la Biblia (Parte 3)
                if (num === 3) {
                    titFinal = "3. Lectura de la Biblia";
                    // Revisar renglón posterior para obtener versículos y lección (Ej: "(4 mins.) Jer 40:1-10 (th lección 2).")
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
                    if (!t) t = "4 min o menos"; // Valor por defecto oficial
                    titFinal = `3. Lectura de la Biblia: ${desc}`;
                    desc = ""; // Se consolida en el título como en el Excel
                } 
                // Para las demás partes numeradas (1, 2, 4, 5, 6, 7, 8, 9...)
                else {
                    if (matchTiempo) {
                        t = matchTiempo[1];
                        titFinal = `${num}. ` + titBruto.replace(/\([^\)]*\)/g, '').trim();
                    } else if (i + 1 < lineas.length) {
                        // Buscar tiempo en la siguiente línea si no estaba en la primera
                        const sigLinea = lineas[i + 1];
                        const matchSigTiempo = sigLinea.match(/\((\d+\s*min[^\)]*)\)/i);
                        if (matchSigTiempo) {
                            t = matchSigTiempo[1];
                            desc = sigLinea.replace(/\([^\)]*min[^\)]*\)/gi, '').trim();
                        }
                    }

                    // Categorizar la parte
                    if (num === 1) desc = "Discurso";
                    else if (num === 2) desc = `Preguntas y respuestas ${lecturaNom}`;
                }

                // Definir categoría
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
                    asig: "",      // Sala Principal / A
                    asigB: "",     // Sala B
                    asigC: ""      // Sala C
                };
            }
        }

        nuevasSemanas.push({
            idSemana: idx,
            semana: semanaNom,
            lectura: lecturaNom,
            tipoSemana: "normal",
            numSalas: 1, // Por defecto 1 sala (se puede cambiar a 2 o 3 por semana)
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
