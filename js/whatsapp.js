/**
 * Módulo de envío de asignaciones S-89 por WhatsApp (Versión Ultra Compatible)
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

    // Estructura limpia y alineada con asteriscos bien ubicados
    let texto = `*ASIGNACIÓN PARA LA REUNIÓN VIDA Y MINISTERIO CRISTIANOS*\n\n`;
    texto += `• *Nombre:* ${nombreHermano}\n`;
    texto += `• *Ayudante:* ${nombreAyudante || '---'}\n`;
    texto += `• *Fecha:* ${fechaSemana || '---'}\n`;
    texto += `• *Intervención:* ${intervencion || '---'}\n`;
    texto += `• *Lugar:* ${sala}\n\n`;
    texto += `_Nota al estudiante:_\n`;
    texto += `En la Guía de actividades encontrará la información que necesita para su intervención. Repase también las indicaciones que se describen en las Instrucciones para la reunión Vida y Ministerio Cristianos (S-38).`;

    // Genera la URL con codificación segura de URI
    const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
};
