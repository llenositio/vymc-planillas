function procesarTextoGuiaActividades(texto) {
    if (!texto || !texto.trim()) return [];

    const bloquesSemanas = texto.split(/(?=\b\d{1,2}-\d{1,2}\s+DE\s+[A-ZÁÉÍÓÚÑ]+\b)/i);
    const semanasProcesadas = [];

    bloquesSemanas.forEach(bloque => {
        if (!bloque.trim()) return;

        const lineas = bloque.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lineas.length < 3) return;

        const semHeader = lineas[0];
        const lectura = lineas[1];

        const canciones = [];
        lineas.forEach(l => {
            const match = l.match(/Canción\s+(\d+)/i);
            if (match && !canciones.includes(match[1])) {
                canciones.push(match[1]);
            }
        });

        const partes = {
            p1: { t: '10 min', tit: '1. Discurso', desc: 'Discurso', asig: '' },
            p2: { t: '10 min', tit: '2. Busquemos perlas escondidas', desc: 'Preguntas y respuestas', asig: '' },
            p3: { t: '4 min', tit: '3. Lectura de la Biblia', desc: '', asig: '', asigB: '', asigC: '' },
            p4: { t: '2 min', tit: '', desc: '', asig: '', asigB: '', asigC: '' },
            p5: { t: '2 min', tit: '', desc: '', asig: '', asigB: '', asigC: '' },
            p6: { t: '4 min', tit: '', desc: '', asig: '', asigB: '', asigC: '' },
            p7: { t: '3 min', tit: '', desc: '', asig: '', asigB: '', asigC: '' },
            p8: { t: '15 min', tit: '', desc: '', asig: '' },
            p9: { t: '30 min', tit: 'Estudio bíblico de la congregación', desc: '', asig: '', lector: '' }
        };

        let smmIdx = 4;
        for (let i = 2; i < lineas.length; i++) {
            const l = lineas[i];
            
            if (l.match(/^\d+\.\s+Empiece|^\d+\.\s+Haga|^\d+\.\s+Explique|^\d+\.\s+Discurso|^\d+\.\s+Video/i)) {
                if (smmIdx <= 7) {
                    const matchMin = l.match(/\((\d+)\s*min/i);
                    const mins = matchMin ? `${matchMin[1]} min` : '3 min';
                    const titSolo = l.replace(/^\d+\.\s*/, '').replace(/\(\d+\s*mins?\.\)/i, '').trim();
                    
                    let descText = '';
                    if (i + 1 < lineas.length && lineas[i+1].includes('(')) {
                        descText = lineas[i+1];
                    }

                    partes[`p${smmIdx}`] = {
                        t: mins,
                        tit: `${smmIdx}. ${titSolo}`,
                        desc: descText,
                        asig: '', asigB: '', asigC: ''
                    };
                    smmIdx++;
                }
            }

            if (l.includes('Estudio bíblico de la congregación')) {
                partes.p9.tit = l;
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
