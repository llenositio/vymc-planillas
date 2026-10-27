/**
 * Módulo de envío de asignaciones S-89 por WhatsApp
 */

window.enviarWhatsAppAsignacion = function(nombreHermano, nombreAyudante, fechaSemana, intervencion, sala = "Sala A") {
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

    // Limpia el número quitando espacios, guiones o paréntesis
    let numeroLimpio = hermano.celular.replace(/\D/g, '');

    if (!numeroLimpio) {
        alert(`El número de celular de "${nombreHermano}" no tiene un formato válido.`);
        return;
    }

    // SI EL NÚMERO TIENE 10 DÍGITOS (Ej: 2604843389), LE AGREGAMOS EL CÓDIGO DE ARGENTINA (549)
    if (numeroLimpio.length === 10) {
        numeroLimpio = '549' + numeroLimpio;
    } else if (numeroLimpio.length === 11 && numeroLimpio.startsWith('0')) {
        // Si lo ingresaron como 02604843389, quita el 0 inicial y le pone 549
        numeroLimpio = '549' + numeroLimpio.substring(1);
    }

    // Plantilla oficial S-89 adaptada a texto de WhatsApp
    let texto = `*ASIGNACIÓN PARA LA REUNIÓN VIDA Y MINISTERIO CRISTIANOS*\n\n`;
    texto += `👤 *Nombre:* ${nombreHermano}\n`;
    texto += `👥 *Ayudante:* ${nombreAyudante || '---'}\n`;
    texto += `📅 *Fecha:* ${fechaSemana || '---'}\n`;
    texto += `📌 *Intervenc N°:* ${intervencion || '---'}\n`;
    texto += `🏛 *Se presenta en:* ${sala}\n\n`;
    texto += `_Nota al estudiante:_\n`;
    texto += `En la Guía de actividades encontrará la información que necesita para su intervención. Repase también las indicaciones que se describen en las Instrucciones para la reunión Vida y Ministerio Cristianos (S-38).`;

    // Enlace universal de API de WhatsApp
    const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(texto)}`;
    
    // Abre el chat en una pestaña nueva
    window.open(url, '_blank');
};
