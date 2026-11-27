/**
 * Módulo de envío de asignaciones VyMC (S-89) y Individual/Fila/Planilla Completa AV por WhatsApp
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

    if (num.startsWith('549') && num.length >= 12) {
        return num;
    }
    if (num.startsWith('54') && !num.startsWith('549')) {
        return '549' + num.substring(2);
    }
    if (num.startsWith('0')) {
        num = num.substring(1);
    }
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

    const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
};

/**
 * Botón "Enviar" de cada fila (Cuadrilla): envía por WhatsApp la notificación individual
 * a cada publicador asignado en esa fila.
 */
window.enviarWhatsAppFilaPublicadoresAV = function(indexSemana, tipoDia) {
    const semana = window.programaMesAV ? window.programaMesAV[indexSemana] : null;
    if (!semana) {
        alert("No se encontró la información de la semana seleccionada.");
        return;
    }

    const campoPuestos = (tipoDia === 'ES') ? 'puestosES' : 'puestosFS';
    const puestosSemana = semana[campoPuestos] || {};
    const etiquetaReunion = (tipoDia === 'ES') ? 'Entre Semana' : 'Fin de Semana';

    const puestos = (Array.isArray(window.puestosConfigAV) && window.puestosConfigAV.length > 0)
        ? window.puestosConfigAV
        : Object.keys(puestosSemana).map(k => ({ key: k, label: k.toUpperCase() }));

    const envios = [];
    const sinTelefono = [];

    puestos.forEach(p => {
        const nombreAsignado = puestosSemana[p.key];
        if (!nombreAsignado || String(nombreAsignado).trim() === '') return;

        const hermano = buscarHermanoEnTodasLasListas(nombreAsignado);
        const celularRaw = hermano ? (hermano.celular || hermano.telefono) : null;
        const numeroLimpio = formatearNumeroWhatsApp(celularRaw);

        if (!numeroLimpio) {
            sinTelefono.push(`${nombreAsignado} (${p.label})`);
            return;
        }

        let texto = `*ASIGNACIÓN DE ACOMODADORES / AUDIO Y VIDEO*\n\n`;
        texto += `- *Hermano/a:* ${nombreAsignado}\n`;
        texto += `- *Función:* ${p.label}\n`;
        texto += `- *Reunión:* ${etiquetaReunion}\n`;
        texto += `- *Semana:* ${semana.fecha}\n\n`;
        texto += `Por favor, mandame un OK como respuesta`;

        envios.push(`https://wa.me/${numeroLimpio}?text=${encodeURIComponent(texto)}`);
    });

    if (envios.length === 0 && sinTelefono.length === 0) {
        alert("No hay hermanos asignados en esta fila para enviar por WhatsApp.");
        return;
    }

    if (sinTelefono.length > 0) {
        alert(`Los siguientes hermanos no tienen celular cargado en la Matriz y no se podrán abrir:\n- ${sinTelefono.join('\n- ')}`);
    }

    envios.forEach(url => {
        window.open(url, '_blank');
    });
};

window.enviarWhatsAppCuadrillaAV = window.enviarWhatsAppFilaPublicadoresAV;

// Asegurar que ningún script cargado después (como herramientas_av.js) vuelva a pisar esta función
window.addEventListener('DOMContentLoaded', () => {
    window.enviarWhatsAppCuadrillaAV = window.enviarWhatsAppFilaPublicadoresAV;
});

/**
 * Genera el enlace público de solo lectura ("modo foto") de la Planilla Mensual AV
 */
window.generarLinkPublicoAV = function() {
    const slug = window.slugCongregacionActual || window.congregacionIdActual || 'default';
    const inputMes = document.getElementById('inputNombreMes');
    const mesRaw = (inputMes && inputMes.value.trim())
        ? inputMes.value.trim().toUpperCase()
        : (window.nombreMesGlobal || 'ACTUAL');

    const mesSlug = mesRaw.replace(/\s+/g, '-');
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?c=${encodeURIComponent(slug)}&m=${encodeURIComponent(mesSlug)}&v=av`;
};

/**
 * Guarda la Planilla AV en Supabase y envía el enlace "modo foto" al teléfono configurado en Tel. Grupo
 */
window.enviarPlanillaCompletaAVAlGrupo = async function() {
    const inputTel = document.getElementById('inputTelGrupoAV');
    const telRaw = inputTel ? inputTel.value : '';
    const numeroGrupo = formatearNumeroWhatsApp(telRaw);

    if (!numeroGrupo) {
        alert("Ingresa un número de celular/grupo válido en el campo 'Tel. Grupo' arriba a la derecha.");
        if (inputTel) inputTel.focus();
        return;
    }

    // Abrir ventana de WhatsApp en el acto del clic para evitar bloqueo de popups tras el await
    const winWa = window.open('about:blank', '_blank');

    // Esperar a que termine de guardar en Supabase antes de enviar el enlace
    if (typeof window.guardarPlanillaAVEnSupabase === 'function') {
        await window.guardarPlanillaAVEnSupabase(true);
    }

    const inputMes = document.getElementById('inputNombreMes');
    const mesLabel = (inputMes && inputMes.value.trim())
        ? inputMes.value.trim().toUpperCase()
        : (window.nombreMesGlobal || 'MES ACTUAL');

    const linkFotoAV = window.generarLinkPublicoAV();

    let mensaje = `*PLANILLA MENSUAL - ACOMODADORES Y AUDIO / VIDEO*\n`;
    mensaje += `*Mes:* ${mesLabel}\n\n`;
    mensaje += `Comparto el programa completo del mes (solo lectura, se actualiza automáticamente ante cualquier cambio):\n`;
    mensaje += `${linkFotoAV}\n\n`;
    mensaje += `_Por favor, si alguno no puede cumplir con su asignación, avise con anticipación para coordinar el reemplazo._`;

    const url = `https://wa.me/${numeroGrupo}?text=${encodeURIComponent(mensaje)}`;
    if (winWa) {
        winWa.location.href = url;
    } else {
        window.open(url, '_blank');
    }
};
