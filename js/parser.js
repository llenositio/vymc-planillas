/**
 * Parser 100% dinámico para la Guía de Actividades VyMC.
 * Extrae semanas, canciones, tiempos, puntos y lecciones 
 * directamente del texto ingresado por el usuario sin valores fijos.
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

        const partes = [];

        for (let i = 2; i < lineas.length; i++) {
            const linea = lineas[i];

            // Detectar tiempo entre paréntesis (ej: "(10 min)", "(4 mins.)")
            const matchMin = linea.match(/\((\d+)\s*mins?\b\.?\)/i);
            
            if (matchMin) {
                const minutos = `${matchMin[1]} min`;
                let textoLimpio = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();

                let titulo = textoLimpio;
                let descripcion = '';

                // Si la línea siguiente es una lección o detalle entre paréntesis
                if (i + 1 < lineas.length && (lineas[i + 1].startsWith('(') || lineas[i + 1].startsWith('DE CASA') || lineas[i + 1].startsWith('PREDICACIÓN') || lineas[i + 1].startsWith('Escenificación') || lineas[i + 1].startsWith('Análisis') || lineas[i + 1].startsWith('Discurso') || lineas[i + 1].startsWith('Preguntas'))) {
                    descripcion = lineas[i + 1];
                    i++;
                }

                partes.push({
                    t: minutos,
                    tit: titulo,
                    desc: descripcion,
                    asig: '',
                    asigB: '',
                    asigC: ''
                });
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
