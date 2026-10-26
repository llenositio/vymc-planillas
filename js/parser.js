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

        // Estructura base limpia
        const partes = {
            p1: { t: '10 min', tit: '1. Discurso', desc: '', asig: '' },
            p2: { t: '10 min', tit: '2. Busquemos perlas escondidas', desc: 'Preguntas y respuestas', asig: '' },
            p3: { t: '4 min', tit: '3. Lectura de la Biblia', desc: '', asig: '', asigB: '', asigC: '' },
            p4: { t: '2 min', tit: '', desc: '', asig: '', asigB: '', asigC: '' },
            p5: { t: '2 min', tit: '', desc: '', asig: '', asigB: '', asigC: '' },
            p6: { t: '4 min', tit: '', desc: '', asig: '', asigB: '', asigC: '' },
            p7: { t: '3 min', tit: '', desc: '', asig: '', asigB: '', asigC: '' },
            p8: { t: '15 min', tit: '', desc: '', asig: '' },
            p9: { t: '30 min', tit: 'Estudio bíblico de la congregación', desc: '', asig: '', lector: '' }
        };

        let smmCounter = 4;

        for (let i = 2; i < lineas.length; i++) {
            const linea = lineas[i];

            // Detectar el primer discurso de Tesoros
            if (linea.match(/^\b1\.\s+/i) || (linea.includes('(10 min)') && !linea.includes('perlas'))) {
                const matchMin = linea.match(/\((\d+)\s*min/i);
                partes.p1.t = matchMin ? `${matchMin[1]} min` : '10 min';
                partes.p1.tit = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();
                partes.p1.desc = 'Discurso';
            }
            // Detectar SMM (Seamos Mejores Maestros)
            else if (linea.match(/^\d+\.\s*(Empiece|Haga|Explique|Discurso|Video)/i) && smmCounter <= 7) {
                const matchMin = linea.match(/\((\d+)\s*min/i);
                const mins = matchMin ? `${matchMin[1]} min` : '3 min';
                const titLimpio = linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim();

                let descText = '';
                if (i + 1 < lineas.length && lineas[i + 1].startsWith('(')) {
                    descText = lineas[i + 1];
                    i++;
                }

                partes[`p${smmCounter}`] = {
                    t: mins,
                    tit: titLimpio,
                    desc: descText,
                    asig: '', asigB: '', asigC: ''
                };
                smmCounter++;
            }
            // Detectar NVC (Nuestra Vida Cristiana)
            else if (linea.includes('(15 min)') || linea.includes('(10 min)') && i > 8) {
                if (!linea.includes('Estudio bíblico')) {
                    const matchMin = linea.match(/\((\d+)\s*min/i);
                    partes.p8 = {
                        t: matchMin ? `${matchMin[1]} min` : '15 min',
                        tit: linea.replace(/\(\d+\s*mins?\b\.?\)/i, '').trim(),
                        desc: '',
                        asig: ''
                    };
                }
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
