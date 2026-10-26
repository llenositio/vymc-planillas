window.procesarTextoPrograma = function(textoPegado) {
    if (!textoPegado || !textoPegado.trim()) return;

    // Normalizar texto
    const lineas = textoPegado.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let nuevaSemana = {
        semana: "SEMANA DEL MES",
        lectura: "",
        canciones: ["161", "121", "28"],
        tipoSemana: "normal",
        numSalas: 1,
        presidencia: "",
        oracionIni: "",
        repaso: "",
        oracionFin: "",
        partes: []
    };

    let seccionActual = "tesoros";

    for (let i = 0; i < lineas.length; i++) {
        let linea = lineas[i];

        // Detector de Semana y Lectura Bíblica
        if (linea.includes("DE SEPTIEMBRE") || linea.includes("DE OCTUBRE") || linea.includes("DE NOVIEMBRE") || linea.includes("DE DICIEMBRE") || linea.match(/\d+-\d+/)) {
            nuevaSemana.semana = linea;
            if (lineas[i+1] && (lineas[i+1].includes("JEREMÍAS") || lineas[i+1].includes("LAMENTACIONES") || lineas[i+1].match(/^[1-2]?\s?[A-ZÁÉÍÓÚ]+/))) {
                nuevaSemana.lectura = lineas[i+1];
            }
        }

        // Cambio de Secciones
        if (linea.includes("TESOROS DE LA BIBLIA")) seccionActual = "tesoros";
        if (linea.includes("SEAMOS MEJORES MAESTROS")) seccionActual = "maestros";
        if (linea.includes("NUESTRA VIDA CRISTIANA")) seccionActual = "vida";

        // Captura de Canciones
        if (linea.startsWith("Canción") && linea.includes("y oración")) {
            let num = linea.replace(/\D/g, '');
            if (num) nuevaSemana.canciones[0] = num;
        }
        if (linea.startsWith("Canción ") && !linea.includes("y oración") && seccionActual === "vida") {
            let num = linea.replace(/\D/g, '');
            if (num) nuevaSemana.canciones[1] = num;
        }

        // Captura de Partes Numeradas (1. 2. 3. etc.)
        let matchParte = linea.match(/^(\d+)\.\s*(.+)/);
        if (matchParte) {
            let numParte = matchParte[1];
            let tituloParte = matchParte[2];
            let tiempoParte = "5 min";
            let descParte = "";

            // Buscar tiempo en la línea actual o en la siguiente (ej: "(10 mins.)")
            let matchTiempo = linea.match(/\((\d+\s*min[s]?\.)\)/i);
            if (!matchTiempo && lineas[i+1]) {
                matchTiempo = lineas[i+1].match(/\((\d+\s*min[s]?\.)\)/i);
            }
            if (matchTiempo) {
                tiempoParte = matchTiempo[1].replace('.', '');
            }

            // Capturar descripción si existe en la línea siguiente
            if (lineas[i+1] && !lineas[i+1].startsWith("Canción") && !lineas[i+1].match(/^\d+\./) && !lineas[i+1].includes("SEAMOS") && !lineas[i+1].includes("TESOROS")) {
                if (!lineas[i+1].includes("min")) {
                    descParte = lineas[i+1];
                } else if (lineas[i+2] && !lineas[i+2].match(/^\d+\./)) {
                    descParte = lineas[i+2];
                }
            }

            // Determinar si lleva ayudante (Seamos mejores maestros)
            let participantes = (seccionActual === "maestros") ? 2 : 1;

            nuevaSemana.partes.push({
                seccion: seccionActual,
                t: tiempoParte,
                tit: `${numParte}. ${tituloParte}`,
                desc: descParte,
                participantes: participantes,
                asig: ""
            });
        }
    }

    // Reemplazar o actualizar semana activa
    if (nuevaSemana.partes.length > 0) {
        programaMes[semanaActivaIdx] = nuevaSemana;
        cargarSemanaEnPlanilla(semanaActivaIdx);
        if (typeof guardarPlanillaEnSupabase === 'function') {
            guardarPlanillaEnSupabase();
        }
    }
};
