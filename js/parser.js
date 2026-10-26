/**
 * Parser dinámico que mapea la Guía de Actividades directamente
 * al modelo de 4 columnas de la planilla Excel VyMC.
 */
function procesarTextoGuiaActividades(texto) {
    if (!texto || !texto.trim()) return [];

    // Separar por encabezados de semana (ej: "5-11 DE OCTUBRE")
    const bloquesSemanas = texto.split(/(?=\b\d{1,2}-\d{1,2}\s+DE\s+[A-ZÁÉÍÓÚÑ]+\b)/i);
    const semanasProcesadas = [];

    bloquesSemanas.forEach(bloque => {
        if (!bloque.trim()) return;

        const lineas = bloque.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lineas.length < 2) return;

        const semHeader = lineas[0];
        const lectura = lineas[1] || '';

        // Extraer números de canciones
        const canciones = [];
        lineas.forEach(l => {
            const match = l.match(/Canción\s+(\d+)/i);
            if (match && !canciones.includes(match[1])) {
                canciones.push(match[1]);
            }
        });

        const partes = {};
        let parteCounter = 1;

        for (let i = 2; i < lineas.length; i++) {
            const linea = lineas[i];

            // Detectar cualquier línea con tiempo entre paréntesis (ej: "(10 min)", "(4 mins.)")
            const matchMin = linea.match(/\((\d+)\s*mins?\b\.?\)/i);
            
            if (matchMin) {
                const minutos = `${matchMin[1]} min`;
                let textoLimpio = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();

                let titulo = textoLimpio;
                let descripcion = '';

                // Separar modalidad si está presente en la misma línea o en la siguiente
                if (textoLimpio.toLowerCase().includes('discurso')) {
                    titulo = textoLimpio.replace(/discurso/i, '').trim();
                    descripcion = 'Discurso';
                } else if (textoLimpio.toLowerCase().includes('perlas escondidas')) {
                    titulo = textoLimpio.replace(/perlas escondidas/i, '').trim();
                    descripcion = 'Preguntas y respuestas';
                }

                // Leer detalle o lección de la siguiente línea si viene entre paréntesis
                if (i + 1 < lineas.length && lineas[i + 1].startsWith('(')) {
                    descripcion = lineas[i + 1];
                    i++;
                }

                partes[`p${parteCounter}`] = {
                    t: minutos,
                    tit: titulo,
                    desc: descripcion,
                    asig: '',
                    asigB: '',
                    asigC: ''
                };

                parteCounter++;
            }
        }

        semanasProcesadas.push({
            semana: semHeader,
            lectura: lectura,
            canciones: canciones,
            tipoSemana: 'normal',
            numSalas: 1,
            presidencia: '',
            oracionIni: '',
            repaso: '',
            oracionFin: '',
            domPresi: '',
            domLector: '',
            partes: partes
        });
    });

    return semanasProcesadas;
}
