/**
 * Módulo de Herramientas Inferiores, Buscador Amarillo, Conteo Verde y WhatsApp (AV)
 */

/**
 * 1. BUSCADOR Y RESALTADOR VISUAL (CAMPO AMARILLO)
 */
window.actualizarResaltadoBuscador = function() {
    const inputNombre = document.getElementById('inputBuscarHermanoAV');
    const textoConteo = document.getElementById('textoConteoBuscadoAV');
    if (!inputNombre) return;

    const nombreBuscado = inputNombre.value.trim().toUpperCase();

    // Limpiar resaltados previos en las celdas de la planilla
    const celdas = document.querySelectorAll('.celda-asignacion-av');
    let contador = 0;

    celdas.forEach(celda => {
        const val = (celda.value || celda.innerText || '').trim().toUpperCase();
        
        if (nombreBuscado !== '' && val === nombreBuscado) {
            celda.classList.add('bg-red-600', 'text-white', 'font-bold');
            celda.classList.remove('bg-white');
            contador++;
        } else {
            celda.classList.remove('bg-red-600', 'text-white', 'font-bold');
        }
    });

    // Actualizar indicador de repeticiones del buscado
    if (textoConteo) {
        if (nombreBuscado === '') {
            textoConteo.innerText = '';
        } else {
            textoConteo.innerText = `Está repetido ${contador} ${contador === 1 ? 'vez' : 'veces'}`;
        }
    }
};

/**
 * 2. TABLA VERDE DE REPETICIONES DEL MES
 */
window.actualizarTablaVerdeRepeticiones = function() {
    const contenedor = document.getElementById('contenedorTablaVerdeAV');
    if (!contenedor) return;

    const conteoMes = {};

    // Contar asignaciones en la planilla activa
    (window.programaMesAV || []).forEach(semana => {
        Object.values(semana.puestos || {}).forEach(nombre => {
            if (nombre && nombre !== '' && nombre !== 'ASAMBLEA' && !nombre.startsWith('--')) {
                conteoMes[nombre] = (conteoMes[nombre] || 0) + 1;
            }
        });
    });

    // Convertir a array y ordenar por cantidad descendente
    const listaAsignados = Object.entries(conteoMes).map(([nombre, cantidad]) => ({
        nombre,
        cantidad
    })).sort((a, b) => b.cantidad - a.cantidad);

    let html = `
        <div class="bg-emerald-50 border border-emerald-300 rounded-lg p-3 shadow-sm max-w-xs">
            <h4 class="text-xs font-bold text-emerald-900 uppercase mb-2 border-b border-emerald-200 pb-1">
                Resumen de Participación Mensual
            </h4>
            <div class="space-y-1 text-xs max-h-60 overflow-y-auto">
    `;

    if (listaAsignados.length === 0) {
        html += `<p class="text-slate-500 italic">No hay asignaciones registradas.</p>`;
    } else {
        listaAsignados.forEach(item => {
            // Estilo visual según nivel de repetición
            let bgStyle = 'bg-emerald-100 text-emerald-900';
            if (item.cantidad >= 3) {
                bgStyle = 'bg-yellow-200 text-yellow-900 font-bold'; // Alerta de carga
            }

            html += `
                <div class="flex justify-between items-center px-2 py-1 rounded ${bgStyle}">
                    <span>${item.nombre}</span>
                    <span class="text-[11px]">Está repetido <strong>${item.cantidad}</strong> ${item.cantidad === 1 ? 'vez' : 'veces'}</span>
                </div>
            `;
        });
    }

    html += `
            </div>
        </div>
    `;

    contenedor.innerHTML = html;
};

/**
 * 3. MENSAJERÍA WHATSAPP (INDIVIDUAL Y GENERAL / CUADRILLA)
 */

// Mensaje Individual
window.enviarWhatsAppIndividualAV = function(nombreHermano, puesto, fechaStr) {
    const hermano = (window.listaHermanosAV || []).find(h => h.nombre === nombreHermano);
    if (!hermano || !hermano.telefono) {
        alert(`No se encontró un número de teléfono registrado para ${nombreHermano}`);
        return;
    }

    const texto = `Hola ${nombreHermano}, te recordamos tu asignación en Acomodadores / AV:
📌 *Puesto:* ${puesto}
📅 *Fecha:* ${fechaStr}

¡Muchas gracias por tu valiosa colaboración!`;

    const url = `https://wa.me/${hermano.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
};

// Mensaje General / Cuadrilla (Resumen de la semana)
window.enviarWhatsAppCuadrillaAV = function(indexSemana) {
    const semana = window.programaMesAV[indexSemana];
    if (!semana) return;

    let texto = `📋 *EQUIPO DE ACOMODADORES Y AUDIO/VIDEO*\n`;
    texto += `📅 *Fecha:* ${semana.fecha || 'Reunión'}\n\n`;

    Object.entries(semana.puestos || {}).forEach(([puesto, nombre]) => {
        if (nombre && nombre !== 'ASAMBLEA') {
            texto += `🔹 *${puesto.toUpperCase()}:* ${nombre}\n`;
        }
    });

    texto += `\n_Por favor, si alguno no puede cumplir con su asignación, avise con anticipación para coordinar el reemplazo._`;

    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
};
