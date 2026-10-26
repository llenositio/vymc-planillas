/**
 * Parser 100% dinámico para la Guía de Actividades VyMC.
 * Extrae semanas, canciones, tiempos, puntos y lecciones 
 * directamente del texto ingresado por el usuario sin valores fijos.
 */
function procesarTextoGuiaActividades(texto) {
    if (!texto || !texto.trim()) return [];

    // Dividir el texto continuo en bloques por encabezado de semana
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

        const partes = [];

        for (let i = 2; i < lineas.length; i++) {
            const linea = lineas[i];

            // Detectar cualquier tiempo entre paréntesis (ej: "(10 min)", "(4 mins.)")
            const matchMin = linea.match(/\((\d+)\s*mins?\b\.?\)/i);
            
            if (matchMin) {
                const minutos = `${matchMin[1]} min`;
                let textoSinTiempo = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();

                let titulo = textoSinTiempo;
                let descripcion = '';

                // Si la misma línea trae lección/modalidad o si la siguiente línea viene entre paréntesis
                if (i + 1 < lineas.length && lineas[i + 1].startsWith('(')) {
                    descripcion = lineas[i + 1];
                    i++; // Consumir la línea de descripción
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
