// Estado global de la aplicación
if (typeof programaMes === 'undefined') window.programaMes = [];
if (typeof listaHermanos === 'undefined') window.listaHermanos = [];
window.semanaActivaIdx = 0;
window.nombreMesGlobal = "";

/* PREVENIR PEGAR FORMATO NO DESEADO EN CAMPOS EDITABLES */
window.limpiarTextoPegado = function(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
};

/* ACTUALIZAR TEXTO Y MES GLOBAL */
window.actualizarNombreMes = function(val) {
    window.nombreMesGlobal = val.trim().toUpperCase();
    actualizarTextoTituloMes(window.nombreMesGlobal);
    if (typeof notificarYGuardarAutosave === 'function') {
        notificarYGuardarAutosave();
    }
};

window.actualizarTextoTituloMes = function(txt) {
    const el = document.getElementById('txtNombreMes');
    if (el) el.innerText = txt || "---";
};

/* ESTRUCTURA INICIAL DE EJEMPLO */
window.crearEstructuraSemanaEjemplo = function() {
    return {
        semana: "FECHA",
        lectura: "LECTURA",
        canciones: ["", "", ""],
        tipoSemana: "normal",
        numSalas: 1,
        presidencia: "",
        oracionIni: "",
        repaso: "",
        oracionFin: "",
        temaViajanteEntreSemana: "Discurso del superintendente de circuito",
        asigViajanteEntreSemana: "",
        asigViajanteDiscPub: "",
        asigViajanteDiscFin: "",
        domPresi: "",
        domLector: "",
        cancionDomIni: "",
        temaDiscPub: "Discurso público:",
        cancionDomMid: "",
        temaAtalaya: "La Atalaya:",
        temaDiscFin: "Discurso final:",
        cancionDomFin: "",
        partes: [
            { seccion: "tesoros", t: "10 min", tit: "1. Tengamos un punto de vista equilibrado de la protección de Jehová", desc: "Discurso", participantes: 1, asig: "" },
            { seccion: "tesoros", t: "10 min", tit: "2. Busquemos perlas escondidas", desc: "Preguntas y respuestas", participantes: 1, asig: "" },
            { seccion: "tesoros", t: "4 min", tit: "3. Lectura de la Biblia", desc: "Jer 40:1-10 (th lección 2).", participantes: 1, asig: "" },
            
            { seccion: "maestros", t: "2 min", tit: "4. Empiece conversaciones", desc: "DE CASA EN CASA. (lmd lección 2 punto 3).", participantes: 2, asig: "", asigAyudante: "" },
            { seccion: "maestros", t: "2 min", tit: "5. Empiece conversaciones", desc: "PREDICACIÓN INFORMAL. (lmd lección 2 punto 5).", participantes: 2, asig: "", asigAyudante: "" },
            { seccion: "maestros", t: "4 min", tit: "6. Empiece conversaciones", desc: "PREDICACIÓN PÚBLICA. Una persona se queda mirando el carrito de publicaciones (lmd lección 5 punto 3).", participantes: 2, asig: "", asigAyudante: "" },
            { seccion: "maestros", t: "3 min", tit: "7. Explique sus creencias", desc: "Escenificación. ijwbq artículo 103. Tema: ¿Quién es Jehová? (th lección 17).", participantes: 2, asig: "", asigAyudante: "" },
            
            { seccion: "vida", t: "15 min", tit: "8. Jehová protege a las viudas", desc: "Análisis con el auditorio.", participantes: 1, asig: "" }
        ]
    };
};

window.inicializarMesDefault = function(cantSemanas = 4) {
    window.programaMes = [];
    for (let i = 0; i < cantSemanas; i++) {
        window.programaMes.push(crearEstructuraSemanaEjemplo());
    }
};
