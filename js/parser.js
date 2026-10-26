/**
 * Parser de la Guía de Actividades VyMC.
 * Extrae semanas, canciones, tiempos, puntos y modalidades separando adecuadamente las columnas B y C.
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
        let seccionActual = 'tesoros';

        for (let i = 2; i < lineas.length; i++) {
            const linea = lineas[i];

            // Descartar frases de apertura/cierre para evitar filas duplicadas
            if (/Palabras de introducción/i.test(linea) || /Palabras de conclusión/i.test(linea)) {
                continue;
            }

            if (/TESOROS DE LA BIBLIA/i.test(linea)) { seccionActual = 'tesoros'; continue; }
            if (/SEAMOS MEJORES MAESTROS/i.test(linea)) { seccionActual = 'maestros'; continue; }
            if (/NUESTRA VIDA CRISTIANA/i.test(linea)) { seccionActual = 'vida'; continue; }

            const matchMin = linea.match(/\((\d+)\s*mins?\b\.?\)/i);
            
            if (matchMin) {
                const minutos = `${matchMin[1]} mins.`;
                let titulo = '';
                let descripcion = '';
                let participantes = 1;

                if (seccionActual === 'tesoros') {
                    if (/^\d+\./.test(linea)) {
                        titulo = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();
                    } else if (i > 0 && /^\d+\./.test(lineas[i - 1])) {
                        titulo = lineas[i - 1];
                    }

                    if (/perlas/i.test(titulo)) {
                        titulo = '2. Busquemos perlas escondidas.';
                        descripcion = `Preguntas y respuestas ${lectura.toUpperCase()}`;
                    } else if (/Lectura/i.test(titulo)) {
                        let det = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();
                        titulo = `3. Lectura de la Biblia: ${det}`;
                        descripcion = '';
                    } else {
                        let tieneVideo = false;
                        for (let j = i; j < Math.min(i + 4, lineas.length); j++) {
                            if (/video/i.test(lineas[j])) { tieneVideo = true; break; }
                        }
                        descripcion = tieneVideo ? 'Discurso con video' : 'Discurso';
                    }
                } 
                else if (seccionActual === 'maestros') {
                    let textoLimpio = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();
                    
                    // Separar Título (Col 2) de Modalidad/Circunstancias (Col 3)
                    const posSeparador = textoLimpio.search(/\s[A-Z]{2,}\b/);
                    if (posSeparador !== -1) {
                        titulo = textoLimpio.substring(0, posSeparador).trim();
                        descripcion = textoLimpio.substring(posSeparador).trim();
                    } else {
                        titulo = textoLimpio;
                        if (i + 1 < lineas.length && !/^\d+\./.test(lineas[i + 1])) {
                            descripcion = lineas[i + 1];
                            i++;
                        }
                    }

                    if (/conversaciones|revisitas|discípulos/i.test(titulo) || /DE CASA|PREDICACIÓN/i.test(descripcion)) {
                        participantes = 2;
                    }
                } 
                else if (seccionActual === 'vida') {
                    titulo = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();

                    if (i + 1 < lineas.length && (lineas[i + 1].startsWith('Análisis') || lineas[i + 1].startsWith('Ponga') || lineas[i + 1].startsWith('Discurso'))) {
                        descripcion = lineas[i + 1];
                        i++;
                    }

                    if (/Estudio bíblico/i.test(titulo)) {
                        let matchPub = linea.match(/wcg\s+cap\.\s*\d+/i) || (lineas[i+1] ? lineas[i+1].match(/wcg\s+cap\.\s*\d+/i) : null);
                        let pubStr = matchPub ? matchPub[0] : 'wcg cap.';
                        titulo = `Estudio bíblico de la congregación: ${pubStr}`;
                        descripcion = '';
                    }
                }

                partes.push({
                    seccion: seccionActual,
                    t: minutos,
                    tit: titulo,
                    desc: descripcion,
                    participantes: participantes,
                    asig: '', asigAyudante: '', asigB: '', asigBAyudante: '', asigC: '', asigCAyudante: ''
                });
            }
        }

        semanasProcesadas.push({
            semana: semHeader,
            lectura: lectura,
            canciones: canciones,
            tipoSemana: 'normal',
            numSalas: 1,
            presidencia: '', oracionIni: '', repaso: '', oracionFin: '', domPresi: '', domLector: '',
            partes: partes
        });
    });

    return semanasProcesadas;
}
