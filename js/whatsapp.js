/**
 * Módulo de envío de asignaciones VyMC (S-89) y Cuadrilla/Individual AV por WhatsApp
 */

/**
 * Envia notificación individual S-89 por WhatsApp (VyMC)
 */
window.enviarWhatsAppAsignacion = function(nombreHermano, nombreAyudante, fechaSemana, intervencion, sala = "Sala Principal") {
    if (!nombreHermano) {
        alert("Primero debes seleccionar a un hermano en la asignación.");
        return;
    }

    // Busca los datos del hermano en la lista cargada desde Supabase
    const hermano = (typeof listaHermanos !== 'undefined') ? listaHermanos.find(h => h.nombre === nombreHermano) : null;

    if (!hermano || !hermano.celular) {
        alert(`No se encontró un número de celular registrado para "${nombreHermano}" en Supabase.`);
        return;
    }

    // Limpia el número quitando caracteres no numéricos
    let numeroLimpio = hermano.celular.replace(/\D/g, '');

    if (!numeroLimpio) {
        alert(`El número de celular de "${nombreHermano}" no tiene un formato válido.`);
        return;
    }

    // Ajuste automático de código de país (Argentina)
    if (numeroLimpio.length === 10) {
        numeroLimpio = '549' + numeroLimpio;
    } else if (numeroLimpio.length === 11 && numeroLimpio.startsWith('0')) {
        numeroLimpio = '549' + numeroLimpio.substring(1);
    }

    // Plantilla 100% texto plano con formato estándar
    let texto = `*ASIGNACIÓN PARA LA REUNIÓN VIDA Y MINISTERIO CRISTIANOS*\n\n`;
    texto += `- *Nombre:* ${nombreHermano}\n`;
    texto += `- *Ayudante:* ${nombreAyudante || '---'}\n`;
    texto += `- *Fecha:* ${fechaSemana || '---'}\n`;
    texto += `- *Intervención:* ${intervencion || '---'}\n`;
    texto += `- *Se presenta en:* ${sala}\n\n`;
    texto += `_Nota:_\n`;
    texto += `En la Guía de actividades encontrará la información que necesita para su intervención. Repase también las indicaciones que se describen en las Instrucciones para la reunión Vida y Ministerio Cristianos (S-38).\n\n`;
    texto += `Por favor, mandame un OK como respuesta`;

    // Genera la URL codificada de forma segura
    const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(texto)}`;
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

    // Pie de mensaje con solicitud de confirmación
    mensaje += `\nPor favor, mandame un OK como respuesta`;

    // Obtener el número del grupo escrito en el campo de la interfaz
    const inputTel = document.getElementById('inputTelGrupoAV');
    let numeroGrupo = inputTel ? inputTel.value.replace(/\D/g, '') : '';

    if (!numeroGrupo) {
        alert("Ingresa un número de celular/grupo en el campo 'Tel. Grupo' ubicado al lado del botón 'Guardar Planilla AV'.");
        if (inputTel) inputTel.focus();
        return;
    }

    // Formatear código de país si es necesario (Argentina)
    if (numeroGrupo.length === 10) {
        numeroGrupo = '549' + numeroGrupo;
    } else if (numeroGrupo.length === 11 && numeroGrupo.startsWith('0')) {
        numeroGrupo = '549' + numeroGrupo.substring(1);
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

    // Buscar celular en las listas de hermanos disponibles en memoria
    const hermano = (window.listaHermanosAV || []).find(h => h.nombre === nombreHermano) || 
                    (window.listaHermanosGeneral || []).find(h => h.nombre === nombreHermano) ||
                    (typeof listaHermanos !== 'undefined' ? listaHermanos.find(h => h.nombre === nombreHermano) : null);

    const celular = hermano ? (hermano.celular || hermano.telefono) : null;

    if (!celular) {
        alert(`No se encontró un número de celular registrado para "${nombreHermano}" en Supabase.`);
        return;
    }

    let numeroLimpio = celular.replace(/\D/g, '');
    if (!numeroLimpio) {
        alert(`El número de celular de "${nombreHermano}" no tiene un formato válido.`);
        return;
    }

    if (numeroLimpio.length === 10) {
        numeroLimpio = '549' + numeroLimpio;
    } else if (numeroLimpio.length === 11 && numeroLimpio.startsWith('0')) {
        numeroLimpio = '549' + numeroLimpio.substring(1);
    }

    // Determinar la etiqueta del puesto
    const puestoObj = (window.puestosConfigAV || []).find(p => p.key === puestoKey);
    const nombrePuesto = puestoObj ? puestoObj.label : puestoKey.toUpperCase();
    const etiquetaReunion = (tipoDia === 'ES') ? 'Entre Semana' : 'Fin de Semana';

    let texto = `*ASIGNACIÓN DE ACOMODADORES / AUDIO Y VIDEO*\n\n`;
    texto += `- *Hermano/a:* ${nombreHermano}\n`;
    texto += `- *Función:* ${nombrePuesto}\n`;
    texto += `- *Reunión:* ${etiquetaReunion}\n`;
    texto += `- *Semana:* ${semana.fecha}\n\n`;
    texto += `Por favor, mandame un OK como respuesta`;

    const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
};
