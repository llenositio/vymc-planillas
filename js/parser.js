function procesarTextoGuiaActividades(texto) {
    return [];
}

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

            // Ignorar textos sueltos de introducción/conclusión
            if (/Palabras de introducción/i.test(linea) || /Palabras de conclusión/i.test(linea)) {
                continue;
            }

            if (/TESOROS DE LA BIBLIA/i.test(linea)) { seccionActual = 'tesoros'; continue; }
            if (/SEAMOS MEJORES MAESTROS/i.test(linea)) { seccionActual = 'maestros'; continue; }
            if (/NUESTRA VIDA CRISTIANA/i.test(linea)) { seccionActual = 'vida'; continue; }

            // Buscar números de punto (1., 2., 3., 4., etc.)
            const matchPunto = linea.match(/^(\d+)\.\s*(.+)/);

            if (matchPunto) {
                const numPunto = matchPunto[1];
                let titulo = `${numPunto}. ${matchPunto[2]}`;
                let minutos = '5 mins.';
                let descripcion = '';
                let participantes = 1;

                // Buscar el tiempo en la misma línea o en la siguiente
                let matchMin = linea.match(/\((\d+)\s*mins?\b\.?\)/i);
                if (!matchMin && i + 1 < lineas.length) {
                    matchMin = lineas[i + 1].match(/\((\d+)\s*mins?\b\.?\)/i);
                }

                if (matchMin) {
                    minutos = `${matchMin[1]} mins.`;
                }

                // Extraer detalles según la sección
                if (seccionActual === 'tesoros') {
                    if (numPunto === '1') {
                        let tieneVideo = false;
                        for (let j = i; j < Math.min(i + 5, lineas.length); j++) {
                            if (/video/i.test(lineas[j])) { tieneVideo = true; break; }
                        }
                        descripcion = tieneVideo ? 'Discurso con video' : 'Discurso';
                    } else if (numPunto === '2') {
                        titulo = '2. Busquemos perlas escondidas.';
                        descripcion = `Preguntas y respuestas ${lectura.toUpperCase()}`;
                    } else if (numPunto === '3') {
                        let det = '';
                        if (i + 1 < lineas.length) det = lineas[i + 1].replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();
                        titulo = `3. Lectura de la Biblia: ${det}`;
                        descripcion = '';
                    }
                } 
                else if (seccionActual === 'maestros') {
                    // La descripción/circunstancia está en la línea siguiente
                    if (i + 1 < lineas.length && !/^\d+\./.test(lineas[i + 1]) && !/NUESTRA VIDA/i.test(lineas[i + 1])) {
                        descripcion = lineas[i + 1].replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();
                    }
                    participantes = 2; // Por defecto 2 para SMM
                } 
                else if (seccionActual === 'vida') {
                    if (i + 1 < lineas.length && !/^\d+\./.test(lineas[i + 1]) && !/Estudio bíblico/i.test(lineas[i + 1])) {
                        descripcion = lineas[i + 1].replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();
                    }

                    if (/Estudio bíblico/i.test(titulo)) {
                        let pubStr = 'wcg cap.';
                        for (let j = i; j < Math.min(i + 3, lineas.length); j++) {
                            let matchPub = lineas[j].match(/wcg\s+cap\.\s*\d+/i);
                            if (matchPub) { pubStr = matchPub[0]; break; }
                        }
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
