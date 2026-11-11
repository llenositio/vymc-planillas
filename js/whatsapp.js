/**
 * Módulo de envío de asignaciones VyMC (S-89) y Cuadrilla/Individual AV por WhatsApp
 */

/**
 * Función auxiliar para limpiar y formatear números de teléfono al estándar internacional (Argentina +54 9)
 */
function formatearNumeroWhatsApp(telefonoRaw) {
    if (!telefonoRaw) return null;
    let num = telefonoRaw.toString().replace(/\D/g, '');
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
    // Si tiene 10 dígitos (ej: 1169070758 o 2804507929 como están en tu tabla)
    if (num.length === 10) {
        return '549' + num;
    }

    return num.length >= 10 ? '549' + num : num;
}

/**
 * Envia notificación individual S-89 por WhatsApp (VyMC)
 */
window.enviarWhatsAppAsignacion = function(nombreHermano, nombreAyudante, fechaSemana, intervencion, sala = "Sala Principal") {
    if (!nombreHermano) {
        alert("Primero debes seleccionar a un hermano en la asignación.");
        return;
    }

    // Busca al hermano cruzando las listas disponibles
    const hermano = (typeof listaHermanos !== 'undefined' ? listaHermanos.find(h => h.nombre === nombreHermano) : null) ||
                    (window.listaHermanosGeneral ? window.listaHermanosGeneral.find(h => h.nombre === nombreHermano) : null);

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

    const url = `https://api.whatsapp.com/send?phone=${numeroLimpio}&text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
};

/**
 * Envía el resumen de la cuadrilla de Acomodadores / AV por WhatsApp al número de grupo
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

    let mensaje = `📋 *ASIGNACIONES AV Y ACOMODADORES*\n`;
    mensaje += `🗓️ *Semana:* ${semana.fecha} (${etiquetaReunion})\n\n`;

    let hayAsignados = false;

    (window.puestosConfigAV || []).forEach(p => {
        const nombreAsignado = puestosSemana[p.key];
        if (nombreAsignado) {
            hayAsignados = true;
            mensaje += `• *${p.label}:* ${nombreAsignado}\n`;
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
        alert("Ingresa un número de celular/grupo válido en el campo 'Tel. Grupo'.");
        if (inputTel) inputTel.focus();
        return;
    }

    const url = `https://api.whatsapp.com/send?phone=${numeroGrupo}&text=${encodeURIComponent(mensaje)}`;
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

    // Buscar celular cruzando todas las listas de memoria
    const hermano = (window.listaHermanosAV || []).find(h => h.nombre === nombreHermano) || 
                    (window.listaHermanosGeneral || []).find(h => h.nombre === nombreHermano) ||
                    (typeof listaHermanos !== 'undefined' ? listaHermanos.find(h => h.nombre === nombreHermano) : null);

    const celularRaw = hermano ? (hermano.celular || hermano.telefono) : null;
    const numeroLimpio = formatearNumeroWhatsApp(celularRaw);

    if (!numeroLimpio) {
        alert(`No se encontró un número de celular registrado para "${nombreHermano}".`);
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

    const url = `https://api.whatsapp.com/send?phone=${numeroLimpio}&text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
};
