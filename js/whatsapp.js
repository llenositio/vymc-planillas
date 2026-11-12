/**
 * Módulo de envío de asignaciones VyMC (S-89) y Cuadrilla/Individual AV por WhatsApp
 */

/**
 * Función auxiliar para limpiar y formatear números de teléfono al estándar internacional (Argentina +54 9)
 */
function formatearNumeroWhatsApp(telefonoRaw) {
    if (!telefonoRaw) return null;
    const strRaw = String(telefonoRaw).trim();
    if (!strRaw || strRaw.toLowerCase().includes('sin tel')) return null;

    let num = strRaw.replace(/\D/g, '');
    if (!num) return null;

    // Si ya empieza con 549 y tiene la longitud internacional correcta (12 a 13 dígitos)
    if (num.startsWith('549') && num.length >= 12) {
        return num;
    }
    // Si empieza con 54 pero le falta el 9 (ej: 541169070758)
    if (num.startsWith('54') && !num.startsWith('549')) {
        return '549' + num.substring(2);
    }
    // Si empieza con 0 (ej: 01169070758 o 02804507929)
    if (num.startsWith('0')) {
        num = num.substring(1);
    }
    // Si tiene 10 dígitos (ej: 1169070758 o 2804507929)
    if (num.length === 10) {
        return '549' + num;
    }

    return num.length >= 10 ? '549' + num : num;
}

/**
 * Función interna unificada para buscar un hermano por nombre en todas las listas cargadas en memoria
 */
function buscarHermanoEnTodasLasListas(nombreHermano) {
    if (!nombreHermano) return null;
    const objetivo = nombreHermano.trim().toLowerCase();

    const fuentes = [
        typeof listaHermanos !== 'undefined' ? listaHermanos : null,
        window.listaHermanos,
        window.listaHermanosGeneral,
        window.listaHermanosAV
    ];

    for (const lista of fuentes) {
        if (Array.isArray(lista) && lista.length > 0) {
            const encontrado = lista.find(h => h && h.nombre && h.nombre.trim().toLowerCase() === objetivo);
            if (encontrado && (encontrado.celular || encontrado.telefono)) {
                return encontrado;
            }
        }
    }

    for (const lista of fuentes) {
        if (Array.isArray(lista) && lista.length > 0) {
            const encontrado = lista.find(h => h && h.nombre && h.nombre.trim().toLowerCase() === objetivo);
            if (encontrado) return encontrado;
        }
    }

    return null;
}

/**
 * Envía notificación individual S-89 por WhatsApp (VyMC)
 */
window.enviarWhatsAppAsignacion = function(nombreHermano, nombreAyudante, fechaSemana, intervencion, sala = "Sala Principal") {
    if (!nombreHermano) {
        alert("Primero debes seleccionar a un hermano en la asignación.");
        return;
    }

    const hermano = buscarHermanoEnTodasLasListas(nombreHermano);
    const celularRaw = hermano ? (hermano.celular || hermano.telefono) : null;
    const numeroLimpio = formatearNumeroWhatsApp(celularRaw);

    if (!numeroLimpio) {
        alert(`No se encontró un número de celular válido registrado para "${nombreHermano}".`);
        return;
    }

    let texto = `*ASIGNACIÓN PARA LA REUNIÓN VIDA Y MINISTERIO CRISTIANOS*\n\n`;
    texto += `- *Nombre:* ${nombreHermano}\n`;
    texto += `- *Ayudante:* ${nombreAyudante || '---'}\n`;
    texto += `- *Fecha:* ${fechaSemana || '---'}\n`;
    texto += `- *Intervención:* ${intervencion || '---'}\n`;
    texto += `- *Se presenta en:* ${sala}\n\n`;
    texto += `_Nota:_\n`;
    texto += `En la Guía de actividades encontrará la información que necesita para su intervención. Repase también las indicaciones que se describen en las Instrucciones para la reunión Vida y Ministerio Cristianos (S-38).\n\n`;
    texto += `Por favor, mandame un OK como respuesta`;

    const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
};

/**
 * Envía el resumen de la cuadrilla de Acomodadores / AV (fila completa) por WhatsApp al número de grupo
 */
window.enviarWhatsAppCuadrillaAV = function(indexSemana, tipoDia) {
    const semana = window.programaMesAV ? window.programaMesAV[indexSemana] : null;
    if (!semana) {
        alert("No se encontró la información de la semana seleccionada.");
        return;
    }

    const campoPuestos = (tipoDia === 'ES') ? 'puestosES' : 'puestosFS';
    const puestosSemana = semana[campoPuestos] || {};
    const etiquetaReunion = (tipoDia === 'ES') ? 'ENTRE SEMANA' : 'FIN DE SEMANA';

    let mensaje = `*ASIGNACIONES AV Y ACOMODADORES*\n`;
    mensaje += `*Semana:* ${semana.fecha} (${etiquetaReunion})\n\n`;

    let hayAsignados = false;
    const puestos = (Array.isArray(window.puestosConfigAV) && window.puestosConfigAV.length > 0)
        ? window.puestosConfigAV
        : Object.keys(puestosSemana).map(k => ({ key: k, label: k.toUpperCase() }));

    puestos.forEach(p => {
        const nombreAsignado = puestosSemana[p.key];
        if (nombreAsignado && String(nombreAsignado).trim() !== '') {
            hayAsignados = true;
            mensaje += `- *${p.label}:* ${nombreAsignado}\n`;
        }
    });

    if (!hayAsignados) {
        alert("No hay hermanos asignados en esta reunión para enviar por WhatsApp.");
        return;
    }

    mensaje += `\n_Por favor, si alguno no puede cumplir con su asignación, avise con anticipación para coordinar el reemplazo._\n\n`;
    mensaje += `Por favor, mandame un OK como respuesta`;

    const inputTel = document.getElementById('inputTelGrupoAV');
    const telRaw = inputTel ? inputTel.value : '';
    const numeroGrupo = formatearNumeroWhatsApp(telRaw);

    if (!numeroGrupo) {
        alert("Ingresa un número de celular/grupo válido en el campo 'Tel. Grupo' arriba a la derecha.");
        if (inputTel) inputTel.focus();
        return;
    }

    const url = `https://wa.me/${numeroGrupo}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
};

/**
 * Envía una notificación individual de asignación AV por WhatsApp a un hermano específico
 */
window.enviarWhatsAppIndividualAV = function(indexSemana, tipoDia, puestoKey) {
    const semana = window.programaMesAV ? window.programaMesAV[indexSemana] : null;
    if (!semana) {
        alert("No se encontró la información de la semana.");
        return;
    }

    const campoPuestos = (tipoDia === 'ES') ? 'puestosES' : 'puestosFS';
    const nombreHermano = semana[campoPuestos] ? semana[campoPuestos][puestoKey] : null;

    if (!nombreHermano) {
        alert("Primero debes seleccionar a un hermano en esta función.");
        return;
    }

    const hermano = buscarHermanoEnTodasLasListas(nombreHermano);
    const celularRaw = hermano ? (hermano.celular || hermano.telefono) : null;
    const numeroLimpio = formatearNumeroWhatsApp(celularRaw);

    if (!numeroLimpio) {
        alert(`No se encontró un número de celular válido registrado para "${nombreHermano}".`);
        return;
    }

    const puestoObj = (window.puestosConfigAV || []).find(p => p.key === puestoKey);
    const nombrePuesto = puestoObj ? puestoObj.label : puestoKey.toUpperCase();
    const etiquetaReunion = (tipoDia === 'ES') ? 'Entre Semana' : 'Fin de Semana';

    let texto = `*ASIGNACIÓN DE ACOMODADORES / AUDIO Y VIDEO*\n\n`;
    texto += `- *Hermano/a:* ${nombreHermano}\n`;
    texto += `- *Función:* ${nombrePuesto}\n`;
    texto += `- *Reunión:* ${etiquetaReunion}\n`;
    texto += `- *Semana:* ${semana.fecha}\n\n`;
    texto += `Por favor, mandame un OK como respuesta`;

    const url = `https://wa.me/${numeroLimpio}&text=${encodeURIComponent(texto)}`.replace('&text=', '?text=');
    window.open(url, '_blank');
};
