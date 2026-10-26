/**
 * Parser dinámico para la Guía de Actividades VyMC.
 * Extrae semanas, canciones, tiempos, puntos y lecciones 
 * clasificando secciones y modalidades de forma exacta.
 */
function procesarTextoGuiaActividades(texto) {
    if (!texto || !texto.trim()) return [];

    // Separar por bloques de semana (ej: "14-20 DE SEPTIEMBRE")
    const bloquesSemanas = texto.split(/(?=\b\d{1,2}-\d{1,2}\s+DE\s+[A-ZÁÉÍÓÚÑ]+\b)/i);
    const semanasProcesadas = [];

    bloquesSemanas.forEach(bloque => {
        if (!bloque.trim()) return;

        const lineas = bloque.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lineas.length < 2) return;

        const semHeader = lineas[0];
        const lectura = lineas[1] || '';

        // Extraer canciones registradas en la semana
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

            // Detección de cambios de sección
            if (/TESOROS DE LA BIBLIA/i.test(linea)) {
                seccionActual = 'tesoros';
                continue;
            } else if (/SEAMOS MEJORES MAESTROS/i.test(linea)) {
                seccionActual = 'maestros';
                continue;
            } else if (/NUESTRA VIDA CRISTIANA/i.test(linea)) {
                seccionActual = 'vida';
                continue;
            }

            // Detección de marcas de tiempo: (10 mins.), (4 mins.), (1 min.), etc.
            const matchMin = linea.match(/\((\d+)\s*mins?\b\.?\)/i);
            
            if (matchMin) {
                const minutos = `${matchMin[1]} mins.`;
                let titulo = '';
                let descripcion = '';
                let participantes = 1;

                // 1. Caso TESOROS DE LA BIBLIA
                if (seccionActual === 'tesoros') {
                    // Si la línea actual empieza con el número (Punto 1), o el título estaba en la línea anterior
                    if (/^\d+\./.test(linea)) {
                        titulo = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();
                    } else if (i > 0 && /^\d+\./.test(lineas[i - 1])) {
                        titulo = lineas[i - 1];
                    } else {
                        titulo = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();
                    }

                    // Evaluar modal / tipo para el Punto 1
                    if (/^\d+\./.test(titulo) && !titulo.includes('perlas') && !titulo.includes('Lectura')) {
                        // Escanear líneas cercanas buscando la palabra VIDEO
                        let tieneVideo = false;
                        for (let j = i; j < Math.min(i + 4, lineas.length); j++) {
                            if (/video/i.test(lineas[j])) {
                                tieneVideo = true;
                                break;
                            }
                        }
                        descripcion = tieneVideo ? 'Discurso con video' : 'Discurso';
                    } 
                    // Punto 2: Perlas Escondidas
                    else if (/perlas/i.test(titulo)) {
                        titulo = '2. Busquemos perlas escondidas.';
                        descripcion = `Preguntas y respuestas ${lectura.toUpperCase()}`;
                    } 
                    // Punto 3: Lectura de la Biblia
                    else if (/Lectura/i.test(titulo)) {
                        let detalleLectura = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();
                        if (i + 1 < lineas.length && lineas[i + 1].startsWith('(')) {
                            detalleLectura += ' ' + lineas[i + 1];
                            i++;
                        }
                        titulo = `3. Lectura de la Biblia: ${detalleLectura}`;
                        descripcion = ''; // Fusionado en título para ocupar Ancho B+C
                    }
                }
                // 2. Caso SEAMOS MEJORES MAESTROS
                else if (seccionActual === 'maestros') {
                    titulo = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();
                    if (!/^\d+\./.test(titulo) && i > 0 && /^\d+\./.test(lineas[i - 1])) {
                        titulo = lineas[i - 1];
                    }

                    // Extraer marco de circunstancias / lección
                    if (i + 1 < lineas.length && !/^\d+\./.test(lineas[i + 1]) && !lineas[i + 1].includes('NUESTRA VIDA')) {
                        descripcion = lineas[i + 1];
                        i++;
                    }

                    // Determinar participantes por defecto (Demostración/Revisita = 2, Discurso = 1)
                    if (/conversaciones|revisitas|discípulos|escenificación/i.test(titulo) || /DE CASA|PREDICACIÓN/i.test(descripcion)) {
                        participantes = 2;
                    }
                }
                // 3. Caso NUESTRA VIDA CRISTIANA
                else if (seccionActual === 'vida') {
                    titulo = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();
                    if (!/^\d+\./.test(titulo) && i > 0 && /^\d+\./.test(lineas[i - 1])) {
                        titulo = lineas[i - 1];
                    }

                    if (i + 1 < lineas.length && (lineas[i + 1].startsWith('Análisis') || lineas[i + 1].startsWith('Ponga') || lineas[i + 1].startsWith('Discurso'))) {
                        descripcion = lineas[i + 1];
                        i++;
                    }

                    // Si es el Estudio Bíblico de la Congregación
                    if (/Estudio bíblico/i.test(titulo)) {
                        let pub = descripcion || (i + 1 < lineas.length ? lineas[i + 1] : '');
                        titulo = `Estudio bíblico de la congregación: ${pub}`;
                        descripcion = '';
                    }
                }

                partes.push({
                    seccion: seccionActual,
                    t: minutos,
                    tit: titulo,
                    desc: descripcion,
                    participantes: participantes, // 1 o 2 subfilas
                    asig: '',
                    asigAyudante: '',
                    asigB: '',
                    asigBAyudante: '',
                    asigC: '',
                    asigCAyudante: ''
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
