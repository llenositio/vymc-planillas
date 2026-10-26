/**
 * Parser ajustado para mapear exactamente las 4 columnas del modelo Excel VyMC:
 * Columna 1: Tiempo
 * Columna 2: Título / Punto
 * Columna 3: Modalidad / Lección / Detalle
 * Columna 4: Asignaciones
 */
function procesarTextoGuiaActividades(texto) {
    if (!texto || !texto.trim()) return [];

    const bloquesSemanas = texto.split(/(?=\b\d{1,2}-\d{1,2}\s+DE\s+[A-ZÁÉÍÓÚÑ]+\b)/i);
    const semanasProcesadas = [];

    bloquesSemanas.forEach(bloque => {
        if (!bloque.trim()) return;

        const lineas = bloque.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lineas.length < 2) return;

        const semHeader = lineas[0];
        const lectura = lineas[1] || '';

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

            // Buscar tiempo especificado entre paréntesis
            const matchMin = linea.match(/\((\d+)\s*mins?\b\.?\)/i);
            
            if (matchMin) {
                const minutos = `${matchMin[1]} min`;
                let textoLimpio = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();

                let titulo = textoLimpio;
                let descripcion = '';

                // Separar Título y Modalidad/Detalle
                if (textoLimpio.toLowerCase().includes('discurso')) {
                    titulo = textoLimpio.replace(/discurso/i, '').trim();
                    descripcion = 'Discurso';
                } else if (textoLimpio.toLowerCase().includes('perlas escondidas')) {
                    titulo = textoLimpio.replace(/perlas escondidas/i, '').trim();
                    descripcion = 'Preguntas y respuestas';
                }

                // Si la siguiente línea trae una lección o detalle entre paréntesis
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
