/**
 * Módulo de envío de asignaciones S-89 por WhatsApp
 * Utiliza secuencias Unicode para garantizar compatibilidad total sin caracteres corruptos.
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

    // Definición de símbolos mediante secuencias Unicode a prueba de fallos de codificación
    const iconNombre = "\uD83D\uDC64";  // 👤
    const iconAyudante = "\uD83D\uDC65"; // 👥
    const iconFecha = "\uD83D\uDCC5";    // 📅
    const iconInterv = "\uD83D\uDCCD";   // 📌
    const iconSala = "\uD83C\uDFDB\uFE0F"; // 🏛️

    // Armado del texto con saltos de línea y negritas bien delimitadas
    let texto = `*ASIGNACIÓN PARA LA REUNIÓN VIDA Y MINISTERIO CRISTIANOS*\n\n`;
    texto += `${iconNombre} *Nombre:* ${nombreHermano}\n`;
    texto += `${iconAyudante} *Ayudante:* ${nombreAyudante || '---'}\n`;
    texto += `${iconFecha} *Fecha:* ${fechaSemana || '---'}\n`;
    texto += `${iconInterv} *Intervenc N°:* ${intervencion || '---'}\n`;
    texto += `${iconSala} *Se presenta en:* ${sala}\n\n`;
    texto += `_Nota al estudiante:_\n`;
    texto += `En la Guía de actividades encontrará la información que necesita para su intervención. Repase también las indicaciones que se describen en las Instrucciones para la reunión Vida y Ministerio Cristianos (S-38).`;

    // Generación de URL codificada
    const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
};
