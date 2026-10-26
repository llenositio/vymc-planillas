/**
 * Parser dinámico para la Guía de Actividades de la Reunión VyMC.
 * Extrae semanas, canciones, títulos, duraciones y lecciones
 * directamente del texto ingresado por el usuario.
 */
function procesarTextoGuiaActividades(texto) {
    if (!texto || !texto.trim()) return [];

    // Dividir el texto completo por encabezados de semana (ej: "5-11 DE OCTUBRE")
    const bloquesSemanas = texto.split(/(?=\b\d{1,2}-\d{1,2}\s+DE\s+[A-ZÁÉÍÓÚÑ]+\b)/i);
    const semanasProcesadas = [];

    bloquesSemanas.forEach(bloque => {
        if (!bloque.trim()) return;

        const lineas = bloque.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lineas.length < 2) return;

        const semHeader = lineas[0];
        const lectura = lineas[1] || '';

        // Extraer números de canción
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

            // Si la línea contiene una duración entre paréntesis (ej: "(10 min)" o "(4 mins.)")
            const matchMin = linea.match(/\((\d+)\s*mins?\b\.?\)/i);
            
            if (matchMin) {
                const minutos = `${matchMin[1]} min`;
                
                // Limpiar el título quitando el tiempo en paréntesis
                let tituloLimpio = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();
                let descripcion = '';

                // Si la línea siguiente es una lección o detalle entre paréntesis, extraerla como descripción
                if (i + 1 < lineas.length && lineas[i + 1].startsWith('(')) {
                    descripcion = lineas[i + 1];
                    i++; // Avanzar el índice al haber consumido la descripción
                }

                // Guardar la parte leída dinámicamente
                partes[`p${parteCounter}`] = {
                    t: minutos,
                    tit: tituloLimpio,
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
