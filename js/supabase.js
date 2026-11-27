/**
 * Módulo de Integración con Supabase + Autenticación Multi-Inquilino (Google OAuth) + Vista Pública en Tiempo Real (VyMC y AV)
 */

const SUPABASE_URL = "https://logscbqojxfyrewfoqas.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ycK_RSR1KXlpwFtMb9Skgg_d01qRpM-";

window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

window.usuarioActual = null;
window.perfilActual = null;
window.congregacionIdActual = null;
window.slugCongregacionActual = "";
window.rolUsuarioActual = null;
let canalRealtimePublico = null;

// Roles habilitados para ingresar al Gestor VyMC y AV
const ROLES_PERMITIDOS_GESTOR_VYMC_AV = [
    'super_admin',
    'admin_congregacion',
    'editor_vymc',
    'mensajero_vymc',
    'editor_av',
    'mensajero_acomodador'
];

// Verificar sesión o activar Vista Pública al cargar la página
window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const congreSlugParam = urlParams.get('c');
    const mesParam = urlParams.get('m');
    const vistaParam = (urlParams.get('v') || urlParams.get('vista') || '').toLowerCase();

    // MODO VISTA PÚBLICA (FOTO HTML DEL MES COMPLETO + ACTUALIZACIÓN EN TIEMPO REAL)
    if (congreSlugParam) {
        document.body.classList.add('modo-publico');
        mostrarPantallaLogin(false);
        if (vistaParam === 'av') {
            await cargarPlanillaAVVistaPublica(congreSlugParam, mesParam);
        } else {
            await cargarPlanillaVistaPublica(congreSlugParam, mesParam);
        }
        return;
    }

    // MODO ADMINISTRACIÓN (REQUIERE AUTENTICACIÓN CON GOOGLE)
    const { data: { session } } = await db.auth.getSession();
    if (session) {
        await cargarPerfilUsuario(session.user);
    } else {
        mostrarVistaLoginGoogle();
        mostrarPantallaLogin(true);
    }

    // Escuchar cambios de sesión OAuth al volver de Google
    db.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session && !window.usuarioActual) {
            await cargarPerfilUsuario(session.user);
        }
    });
});

/**
 * Renderiza el snapshot HTML público de VyMC y suscribe cambios en tiempo real
 */
async function renderizarSnapshotPublicoDesdeBD(congreId, mesBuscado) {
    const { data: planillaData, error: planillaError } = await db
        .from('planillas')
        .select('html_publico, mes_ano')
        .eq('congregacion_id', congreId)
        .eq('mes_ano', mesBuscado)
        .maybeSingle();

    if (planillaError) {
        console.error("Error cargando planilla pública:", planillaError);
        return;
    }

    const contenedor = document.querySelector('.print-area');
    if (planillaData && planillaData.html_publico && contenedor) {
        contenedor.innerHTML = planillaData.html_publico;
    } else if (contenedor) {
        contenedor.innerHTML = `
            <div class="text-center py-12 text-slate-500 font-bold">
                <p class="text-base">No hay un programa publicado aún para el mes de ${mesBuscado}.</p>
            </div>
        `;
    }
}

async function cargarPlanillaVistaPublica(slug, mes) {
    const mesBuscado = mes ? decodeURIComponent(mes).replace(/-/g, ' ').toUpperCase() : 'ACTUAL';

    const { data: congregaciones, error: congreError } = await db
        .from('congregaciones')
        .select('id, nombre');

    if (congreError || !congregaciones || congregaciones.length === 0) {
        console.error("Error obteniendo congregaciones para la vista pública");
        return;
    }

    const slugLimpio = slug.toLowerCase().replace(/\s+/g, '');
    let congreEncontrada = congregaciones.find(c => 
        c.nombre.toLowerCase().replace(/\s+/g, '') === slugLimpio || c.id === slug
    );

    if (!congreEncontrada) {
        console.error("Congregación no encontrada para la vista pública:", slug);
        return;
    }

    window.congregacionIdActual = congreEncontrada.id;

    // 1. Carga inicial de la foto HTML
    await renderizarSnapshotPublicoDesdeBD(congreEncontrada.id, mesBuscado);

    // 2. Suscripción en tiempo real para actualizar la foto si cambia la planilla
    if (canalRealtimePublico) {
        db.removeChannel(canalRealtimePublico);
    }

    canalRealtimePublico = db
        .channel(`publico-${congreEncontrada.id}-${mesBuscado}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'planillas',
                filter: `congregacion_id=eq.${congreEncontrada.id}`
            },
            (payload) => {
                const registro = payload.new || payload.old;
                if (registro && registro.mes_ano === mesBuscado) {
                    renderizarSnapshotPublicoDesdeBD(congreEncontrada.id, mesBuscado);
                }
            }
        )
        .subscribe();
}

/**
 * Renderiza la vista pública ("modo foto" de solo lectura) de la Planilla Mensual AV
 */
async function renderizarSnapshotPublicoAVDesdeBD(congreId, nombreCongre, mesBuscado) {
    const { data: avData, error: avError } = await db
        .from('planillas_av')
        .select('datos, mes_ano, updated_at')
        .eq('congregacion_id', congreId)
        .eq('mes_ano', mesBuscado)
        .maybeSingle();

    const contenedor = document.querySelector('.print-area');
    if (!contenedor) return;

    if (avError || !avData || !avData.datos) {
        contenedor.innerHTML = `
            <div class="text-center py-12 text-slate-500 font-bold">
                <p class="text-base">No hay una Planilla de Acomodadores y Audio/Video publicada aún para ${mesBuscado}.</p>
            </div>
        `;
        return;
    }

    const semanasAV = typeof avData.datos === 'string' ? JSON.parse(avData.datos) : (avData.datos || []);
    const puestos = (Array.isArray(window.puestosConfigAV) && window.puestosConfigAV.length > 0)
        ? window.puestosConfigAV
        : [
            { key: 'puerta', label: 'PUERTA' },
            { key: 'aud1', label: 'AUD 1' },
            { key: 'aud2', label: 'AUD 2' },
            { key: 'mic1', label: 'MIC 1' },
            { key: 'mic2', label: 'MIC 2' },
            { key: 'audio', label: 'AUDIO' },
            { key: 'video', label: 'VIDEO' }
        ];

    let html = `
        <div class="text-center mb-4 border-b-2 border-slate-900 pb-2">
            <p class="text-xs font-bold text-emerald-700 uppercase tracking-wider">Congregación ${nombreCongre}</p>
            <h2 class="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wide">
                ACOMODADORES Y AUDIO / VIDEO — ${mesBuscado}
            </h2>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-xs border-collapse border-2 border-slate-900 bg-white">
                <thead>
                    <tr class="bg-slate-900 text-white uppercase text-[11px] font-extrabold">
                        <th class="border border-slate-600 px-2 py-2 text-center">Semana</th>
                        <th class="border border-slate-600 px-2 py-2 text-center">Reunión</th>
    `;

    puestos.forEach(p => {
        html += `<th class="border border-slate-600 px-2 py-2 text-center">${p.label}</th>`;
    });

    html += `</tr></thead><tbody>`;

    semanasAV.forEach((sem, sIdx) => {
        const filasDia = [
            { etiqueta: 'Entre Semana', badge: 'bg-sky-100 text-sky-900 border-sky-300', campo: 'puestosES' },
            { etiqueta: 'Fin de Semana', badge: 'bg-amber-100 text-amber-900 border-amber-300', campo: 'puestosFS' }
        ];

        filasDia.forEach((dia, dIdx) => {
            const asignados = sem[dia.campo] || {};
            const bgFila = (sIdx % 2 === 0) ? 'bg-white' : 'bg-slate-50';
            html += `<tr class="${bgFila}">`;

            if (dIdx === 0) {
                html += `
                    <td rowspan="2" class="border border-slate-400 px-2 py-2 font-black text-slate-900 text-center align-middle bg-slate-100 uppercase">
                        ${sem.fecha || ''}
                    </td>
                `;
            }

            html += `
                <td class="border border-slate-400 px-1.5 py-1.5 text-center align-middle">
                    <span class="inline-block px-1.5 py-0.5 rounded border text-[10px] font-extrabold ${dia.badge}">
                        ${dia.etiqueta}
                    </span>
                </td>
            `;

            puestos.forEach(p => {
                const nom = (asignados[p.key] || '').trim();
                html += `
                    <td class="border border-slate-400 px-2 py-1.5 text-center align-middle font-bold uppercase ${nom ? 'text-slate-900' : 'text-slate-300'}">
                        ${nom || '—'}
                    </td>
                `;
            });

            html += `</tr>`;
        });
    });

    html += `
                </tbody>
            </table>
        </div>
        <p class="text-[11px] text-slate-400 text-right mt-2">
            Vista de solo lectura · Actualizada automáticamente en tiempo real
        </p>
    `;

    contenedor.innerHTML = html;
}

async function cargarPlanillaAVVistaPublica(slug, mes) {
    const mesBuscado = mes ? decodeURIComponent(mes).replace(/-/g, ' ').toUpperCase() : 'ACTUAL';

    const { data: congregaciones, error: congreError } = await db
        .from('congregaciones')
        .select('id, nombre');

    if (congreError || !congregaciones || congregaciones.length === 0) return;

    const slugLimpio = slug.toLowerCase().replace(/\s+/g, '');
    const congreEncontrada = congregaciones.find(c =>
        c.nombre.toLowerCase().replace(/\s+/g, '') === slugLimpio || c.id === slug
    );

    if (!congreEncontrada) return;

    window.congregacionIdActual = congreEncontrada.id;

    // 1. Carga inicial
    await renderizarSnapshotPublicoAVDesdeBD(congreEncontrada.id, congreEncontrada.nombre, mesBuscado);

    // 2. Suscripción Realtime en Supabase
    if (canalRealtimePublico) {
        db.removeChannel(canalRealtimePublico);
    }

    canalRealtimePublico = db
        .channel(`publico-av-${congreEncontrada.id}-${mesBuscado}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'planillas_av',
                filter: `congregacion_id=eq.${congreEncontrada.id}`
            },
            (payload) => {
                const registro = payload.new || payload.old;
                if (registro && registro.mes_ano === mesBuscado) {
                    renderizarSnapshotPublicoAVDesdeBD(congreEncontrada.id, congreEncontrada.nombre, mesBuscado);
                }
            }
        )
        .subscribe();

    // 3. Refresco automático al volver a abrir la pestaña en el celular
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            renderizarSnapshotPublicoAVDesdeBD(congreEncontrada.id, congreEncontrada.nombre, mesBuscado);
        }
    });
}

function mostrarVistaLoginGoogle() {
    const vGoogle = document.getElementById('loginVistaGoogle');
    const vPendiente = document.getElementById('loginVistaPendiente');
    if (vGoogle) vGoogle.classList.remove('hidden');
    if (vPendiente) vPendiente.classList.add('hidden');
}

async function mostrarVistaSolicitudPendiente(perfil, motivoBloqueoRol = false) {
    const vGoogle = document.getElementById('loginVistaGoogle');
    const vPendiente = document.getElementById('loginVistaPendiente');
    if (vGoogle) vGoogle.classList.add('hidden');
    if (vPendiente) vPendiente.classList.remove('hidden');

    const saludo = document.getElementById('txtPendienteSaludo');
    const detalle = document.getElementById('txtPendienteDetalle');
    const bloqueSelect = document.getElementById('bloqueSeleccionCongreInicial');

    const nombre = perfil?.full_name || window.usuarioActual?.user_metadata?.full_name || window.usuarioActual?.email || 'Hermano/a';

    if (motivoBloqueoRol) {
        const rolNombre = formatearNombreRol(perfil?.role || perfil?.rol || 'publicador');
        if (saludo) saludo.textContent = `Hola, ${nombre}. Acceso restringido en este módulo.`;
        if (detalle) detalle.textContent = `Tu cuenta tiene asignado el rol "${rolNombre}", que corresponde únicamente al sistema de Territorios y no tiene permiso para ingresar al Gestor VyMC y AV.`;
        if (bloqueSelect) bloqueSelect.classList.add('hidden');
        return;
    }

    if (saludo) saludo.textContent = `¡Hola, ${nombre}! Tu cuenta está pendiente de aprobación.`;

    if (perfil?.status === 'blocked') {
        if (detalle) detalle.textContent = 'Tu acceso se encuentra bloqueado. Comunicate con el administrador de tu congregación.';
        if (bloqueSelect) bloqueSelect.classList.add('hidden');
        return;
    }

    if (perfil?.congregacion_id) {
        if (detalle) detalle.textContent = 'Ya enviaste tu solicitud para tu congregación. Cuando un administrador la apruebe, podrás ingresar.';
        if (bloqueSelect) bloqueSelect.classList.add('hidden');
        return;
    }

    if (bloqueSelect) bloqueSelect.classList.remove('hidden');
    const select = document.getElementById('selectCongregacionSolicitud');
    if (select) {
        const { data: congregaciones } = await db
            .from('congregaciones')
            .select('id, nombre, ciudad')
            .order('nombre', { ascending: true });

        if (congregaciones && congregaciones.length > 0) {
            select.innerHTML = `<option value="">-- Seleccioná tu congregación --</option>` +
                congregaciones.map(c => `<option value="${c.id}">${c.nombre}${c.ciudad ? ' (' + c.ciudad + ')' : ''}</option>`).join('');
        } else {
            select.innerHTML = `<option value="">No hay congregaciones disponibles aún</option>`;
        }
    }
}

window.enviarSolicitudCongregacion = async function() {
    const select = document.getElementById('selectCongregacionSolicitud');
    const btn = document.getElementById('btnEnviarSolicitudCongre');
    const congreId = select ? select.value : '';

    if (!congreId) {
        alert("Por favor seleccioná tu congregación.");
        return;
    }

    if (btn) btn.disabled = true;

    const { error } = await db
        .from('perfiles')
        .update({ congregacion_id: congreId })
        .eq('id', window.usuarioActual.id);

    if (btn) btn.disabled = false;

    if (error) {
        alert("Error al enviar la solicitud: " + error.message);
        return;
    }

    await cargarPerfilUsuario(window.usuarioActual);
};

async function cargarPerfilUsuario(user) {
    window.usuarioActual = user;

    let { data, error } = await db
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    // Si por alguna razón el perfil aún no se creó, crearlo en estado pending
    if (!data && !error) {
        const esSuper = user.email === 'claudiollenolio@gmail.com';
        const nuevoPerfil = {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
            role: esSuper ? 'super_admin' : 'publicador',
            status: esSuper ? 'approved' : 'pending',
            congregacion_id: null
        };
        const resInsert = await db.from('perfiles').upsert(nuevoPerfil).select().single();
        data = resInsert.data;
        error = resInsert.error;
    }

    if (error || !data) {
        console.error("Error cargando perfil:", error);
        mostrarVistaLoginGoogle();
        mostrarPantallaLogin(true);
        return;
    }

    window.perfilActual = data;
    const rolEfectivo = data.role || data.rol || 'publicador';
    const estadoEfectivo = data.status || 'approved';

    // 1. Si no está aprobado (y no es super_admin), mostrar pantalla de solicitud/espera
    if (rolEfectivo !== 'super_admin' && estadoEfectivo !== 'approved') {
        mostrarPantallaLogin(true);
        await mostrarVistaSolicitudPendiente(data, false);
        return;
    }

    // 2. Si está aprobado pero su rol pertenece exclusivamente a Territorios (publicador, conductor, etc.), bloquear acceso al Gestor VyMC y AV
    if (!ROLES_PERMITIDOS_GESTOR_VYMC_AV.includes(rolEfectivo)) {
        mostrarPantallaLogin(true);
        await mostrarVistaSolicitudPendiente(data, true);
        return;
    }

    window.congregacionIdActual = data.congregacion_id;
    window.rolUsuarioActual = rolEfectivo;

    // Actualizar subtítulo del header con nombre y rol
    const subtituloHeader = document.getElementById('subtituloUsuarioHeader');
    if (subtituloHeader) {
        subtituloHeader.textContent = `${data.full_name || user.email} · ${formatearNombreRol(rolEfectivo)}`;
    }

    mostrarPantallaLogin(false);

    if (rolEfectivo === 'super_admin') {
        await renderizarSelectorSuperAdmin();
    } else {
        await obtenerSlugCongregacion(window.congregacionIdActual);
    }

    // Aplicar restricciones visuales según el rol del usuario
    aplicarRestriccionesPorRol(window.rolUsuarioActual);

    if (typeof cargarHermanosDesdeSupabase === 'function') await cargarHermanosDesdeSupabase();
    if (typeof cargarPlanillaDesdeSupabase === 'function') await cargarPlanillaDesdeSupabase();
    if (typeof window.cargarElegiblesAVDesdeSupabase === 'function') await window.cargarElegiblesAVDesdeSupabase();
    if (typeof window.cargarPlanillaAVDesdeSupabase === 'function') await window.cargarPlanillaAVDesdeSupabase();
}

function formatearNombreRol(rol) {
    const nombres = {
        super_admin: 'Super Admin',
        admin_congregacion: 'Admin Congregación',
        editor_vymc: 'Editor VyMC',
        mensajero_vymc: 'Mensajero VyMC',
        editor_av: 'Editor Acomodadores/AV',
        mensajero_acomodador: 'Mensajero Acomodador',
        editor_territorios: 'Editor Territorios',
        mensajero_territorios: 'Mensajero Territorios',
        conductor: 'Conductor',
        publicador: 'Publicador'
    };
    return nombres[rol] || rol;
}

/**
 * Controla la visibilidad y edición de elementos de la interfaz según los 10 roles
 */
function aplicarRestriccionesPorRol(rol) {
    const puedeEditarVyMC = ['super_admin', 'admin_congregacion', 'editor_vymc'].includes(rol);
    const puedeEditarAV = ['super_admin', 'admin_congregacion', 'editor_av'].includes(rol);
    const puedeGestionarUsuarios = ['super_admin', 'admin_congregacion', 'editor_vymc', 'editor_av'].includes(rol);

    // Mostrar u ocultar pestaña de Usuarios y bloque de Super Admin
    const tabUsuarios = document.getElementById('tab-usuarios');
    if (tabUsuarios) {
        if (puedeGestionarUsuarios) tabUsuarios.classList.remove('hidden');
        else tabUsuarios.classList.add('hidden');
    }

    const bloqueNuevaCongre = document.getElementById('bloqueNuevaCongregacion');
    if (bloqueNuevaCongre) {
        if (rol === 'super_admin') bloqueNuevaCongre.classList.remove('hidden');
        else bloqueNuevaCongre.classList.add('hidden');
    }

    // Bloqueo selectivo por sección (VyMC vs AV) manteniendo intactos botones de WhatsApp, Imprimir y Navegación
    let estiloRestriccion = document.getElementById('estilo-restriccion-mensajero');
    if (!puedeEditarVyMC || !puedeEditarAV) {
        if (!estiloRestriccion) {
            estiloRestriccion = document.createElement('style');
            estiloRestriccion.id = 'estilo-restriccion-mensajero';
            document.head.appendChild(estiloRestriccion);
        }
        let css = '';
        if (!puedeEditarVyMC) {
            css += `
                #sec-planilla .select-asig,
                #sec-planilla [contenteditable="true"],
                #sec-planilla .input-inline,
                #sec-hermanos input,
                #sec-hermanos select {
                    pointer-events: none !important;
                }
                #sec-planilla .select-asig,
                #sec-hermanos select {
                    background: transparent !important;
                    border: none !important;
                    appearance: none !important;
                    -webkit-appearance: none !important;
                }
            `;
        }
        if (!puedeEditarAV) {
            css += `
                #sec-av_planilla select,
                #sec-av_planilla #inputTelGrupoAV,
                #sec-av_planilla [contenteditable="true"],
                #sec-av_matriz input,
                #sec-av_matriz select {
                    pointer-events: none !important;
                }
                #sec-av_planilla select {
                    background: transparent !important;
                    border: none !important;
                    appearance: none !important;
                    -webkit-appearance: none !important;
                }
            `;
        }
        estiloRestriccion.innerHTML = css;
    } else if (estiloRestriccion) {
        estiloRestriccion.remove();
    }

    const botonesEdicionVyMC = [
        document.querySelector("button[onclick='guardarMesManual()']"),
        document.querySelector("button[onclick='resetearPlanillaMes()']"),
        document.querySelector("button[onclick='agregarNuevaSemana()']"),
        document.querySelector("button[onclick='abrirModalImportador()']"),
        document.querySelector("button[onclick='eliminarSemanaActiva()']"),
        document.querySelector("button[onclick='agregarNuevoHermano()']")
    ];

    botonesEdicionVyMC.forEach(btn => {
        if (btn) btn.style.display = puedeEditarVyMC ? '' : 'none';
    });

    const btnGuardarAV = document.querySelector("button[onclick*='guardarPlanillaAVEnSupabase']");
    if (btnGuardarAV) btnGuardarAV.style.display = puedeEditarAV ? '' : 'none';

    const inputMes = document.getElementById('inputNombreMes');
    if (inputMes) inputMes.disabled = !puedeEditarVyMC;

    const radiosTipoSemana = document.querySelectorAll("input[name='tipoSemana']");
    radiosTipoSemana.forEach(r => r.disabled = !puedeEditarVyMC);

    const selectSalas = document.getElementById('selectNumSalas');
    if (selectSalas) selectSalas.disabled = !puedeEditarVyMC;
}

/**
 * Obtiene el slug de la congregación
 */
async function obtenerSlugCongregacion(id) {
    if (!id) return;
    const { data } = await db
        .from('congregaciones')
        .select('nombre')
        .eq('id', id)
        .single();

    if (data && data.nombre) {
        window.slugCongregacionActual = data.nombre.toLowerCase().replace(/\s+/g, '');
    } else {
        window.slugCongregacionActual = id;
    }
}

/**
 * Renderiza el selector para Super Admin
 */
async function renderizarSelectorSuperAdmin() {
    const contenedor = document.getElementById('selector-congregacion-container');
    if (!contenedor) return;

    const { data: congregaciones, error } = await db
        .from('congregaciones')
        .select('id, nombre')
        .order('nombre', { ascending: true });

    if (error || !congregaciones || congregaciones.length === 0) {
        contenedor.innerHTML = `<span class="text-xs text-amber-300 font-bold">Sin congregaciones aún</span>`;
        return;
    }

    if (!window.congregacionIdActual && congregaciones.length > 0) {
        window.congregacionIdActual = congregaciones[0].id;
    }

    let opciones = congregaciones.map(c => 
        `<option value="${c.id}" data-nombre="${c.nombre}" ${c.id === window.congregacionIdActual ? 'selected' : ''}>${c.nombre}</option>`
    ).join('');

    contenedor.innerHTML = `
        <div class="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl text-xs border border-slate-700 shadow-inner">
            <span class="font-extrabold text-amber-400 flex items-center gap-1">
                <i class="fa-solid fa-building-columns"></i> Congre:
            </span>
            <select id="selectCongreSuperAdmin" onchange="cambiarCongregacionSuperAdmin(this.value)" class="bg-slate-900 text-white font-bold rounded-lg px-2 py-1 outline-none border border-slate-600 cursor-pointer hover:border-amber-500 transition">
                ${opciones}
            </select>
        </div>
    `;

    const select = document.getElementById('selectCongreSuperAdmin');
    if (select && select.selectedOptions[0]) {
        window.slugCongregacionActual = select.selectedOptions[0].getAttribute('data-nombre').toLowerCase().replace(/\s+/g, '');
    }
}

window.cambiarCongregacionSuperAdmin = async function(nuevaCongreId) {
    window.congregacionIdActual = nuevaCongreId;
    
    const select = document.getElementById('selectCongreSuperAdmin');
    if (select && select.selectedOptions[0]) {
        window.slugCongregacionActual = select.selectedOptions[0].getAttribute('data-nombre').toLowerCase().replace(/\s+/g, '');
    }

    if (typeof cargarHermanosDesdeSupabase === 'function') await cargarHermanosDesdeSupabase();
    if (typeof cargarPlanillaDesdeSupabase === 'function') await cargarPlanillaDesdeSupabase();
    if (typeof window.cargarElegiblesAVDesdeSupabase === 'function') await window.cargarElegiblesAVDesdeSupabase();
    if (typeof window.cargarPlanillaAVDesdeSupabase === 'function') await window.cargarPlanillaAVDesdeSupabase();
    if (typeof window.cargarGestionUsuarios === 'function' && !document.getElementById('sec-usuarios')?.classList.contains('hidden')) {
        await window.cargarGestionUsuarios();
    }
};

window.iniciarSesionConGoogle = async function() {
    const btn = document.getElementById('btnLoginGoogle');
    if (btn) btn.disabled = true;

    const { error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });

    if (error) {
        alert("Error al iniciar sesión con Google: " + error.message);
        if (btn) btn.disabled = false;
    }
};

window.cerrarSesion = async function() {
    await db.auth.signOut();
    window.usuarioActual = null;
    window.perfilActual = null;
    window.congregacionIdActual = null;
    window.slugCongregacionActual = "";
    window.rolUsuarioActual = null;
    window.listaHermanos = [];
    window.programaMes = [];
    
    const contenedor = document.getElementById('selector-congregacion-container');
    if (contenedor) contenedor.innerHTML = '';

    aplicarRestriccionesPorRol('super_admin');
    mostrarVistaLoginGoogle();
    mostrarPantallaLogin(true);
};

function mostrarPantallaLogin(mostrar) {
    const modalLogin = document.getElementById('modalLogin');
    if (modalLogin) {
        if (mostrar) {
            modalLogin.classList.remove('hidden');
        } else {
            modalLogin.classList.add('hidden');
        }
    }
}

/* ============================================================================
   GESTIÓN JERÁRQUICA DE USUARIOS Y CONGREGACIONES (CON DELEGACIÓN POR SECCIÓN)
   ============================================================================ */

window.crearCongregacionSuperAdmin = async function() {
    if (window.rolUsuarioActual !== 'super_admin') return;

    const inputNombre = document.getElementById('inputNuevaCongreNombre');
    const inputCiudad = document.getElementById('inputNuevaCongreCiudad');
    const nombre = inputNombre ? inputNombre.value.trim() : '';
    const ciudad = inputCiudad ? inputCiudad.value.trim() : 'Mar del Plata';

    if (!nombre) {
        alert("Ingresá el nombre de la congregación.");
        return;
    }

    const slug = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-');

    const { data, error } = await db
        .from('congregaciones')
        .insert([{ nombre, ciudad, slug, activa: true }])
        .select()
        .single();

    if (error) {
        alert("Error creando congregación: " + error.message);
        return;
    }

    if (inputNombre) inputNombre.value = '';
    window.congregacionIdActual = data.id;
    await renderizarSelectorSuperAdmin();
    await window.cargarGestionUsuarios();
};

function obtenerRolesAsignablesSegunMiRol(miRol) {
    if (miRol === 'super_admin' || miRol === 'admin_congregacion') {
        return [
            { value: 'admin_congregacion', label: 'Admin Congregación' },
            { value: 'editor_vymc', label: 'Editor VyMC' },
            { value: 'mensajero_vymc', label: 'Mensajero VyMC' },
            { value: 'editor_av', label: 'Editor Acomodadores/AV' },
            { value: 'mensajero_acomodador', label: 'Mensajero Acomodador' },
            { value: 'editor_territorios', label: 'Editor Territorios' },
            { value: 'mensajero_territorios', label: 'Mensajero Territorios' },
            { value: 'conductor', label: 'Conductor' },
            { value: 'publicador', label: 'Publicador' }
        ];
    }
    if (miRol === 'editor_vymc') {
        return [
            { value: 'editor_vymc', label: 'Editor VyMC' },
            { value: 'mensajero_vymc', label: 'Mensajero VyMC' }
        ];
    }
    if (miRol === 'editor_av') {
        return [
            { value: 'editor_av', label: 'Editor Acomodadores/AV' },
            { value: 'mensajero_acomodador', label: 'Mensajero Acomodador' }
        ];
    }
    if (miRol === 'editor_territorios') {
        return [
            { value: 'editor_territorios', label: 'Editor Territorios' },
            { value: 'mensajero_territorios', label: 'Mensajero Territorios' },
            { value: 'conductor', label: 'Conductor' },
            { value: 'publicador', label: 'Publicador' }
        ];
    }
    return [];
}

window.cargarGestionUsuarios = async function() {
    const contenedor = document.getElementById('contenedorGestionUsuarios');
    if (!contenedor) return;

    const miRol = window.rolUsuarioActual;
    const rolesAsignables = obtenerRolesAsignablesSegunMiRol(miRol);
    if (rolesAsignables.length === 0) {
        contenedor.innerHTML = `<p class="p-4 text-xs text-slate-500">No tenés permisos para gestionar usuarios.</p>`;
        return;
    }

    let query = db
        .from('perfiles')
        .select('id, email, full_name, role, status, congregacion_id, created_at')
        .order('status', { ascending: false })
        .order('full_name', { ascending: true });

    if (miRol !== 'super_admin') {
        query = query.eq('congregacion_id', window.congregacionIdActual);
    }

    const [{ data: usuarios, error }, { data: congregaciones }] = await Promise.all([
        query,
        db.from('congregaciones').select('id, nombre').order('nombre', { ascending: true })
    ]);

    if (error) {
        contenedor.innerHTML = `<p class="p-4 text-xs text-rose-600 font-bold">Error cargando usuarios: ${error.message}</p>`;
        return;
    }

    const listaCongres = congregaciones || [];
    const mapaCongres = Object.fromEntries(listaCongres.map(c => [c.id, c.nombre]));

    const filas = (usuarios || []).filter(u => u.role !== 'super_admin').map(u => {
        const estadoBadge = u.status === 'approved'
            ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Aprobado</span>`
            : u.status === 'blocked'
                ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">Bloqueado</span>`
                : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Pendiente</span>`;

        const esMiMismoUsuario = window.usuarioActual && u.id === window.usuarioActual.id;
        const puedeEditarEsteUsuario = !esMiMismoUsuario && (
            miRol === 'super_admin' ||
            miRol === 'admin_congregacion' ||
            u.status === 'pending' ||
            rolesAsignables.some(r => r.value === u.role)
        );

        const opcionesRol = rolesAsignables.map(r =>
            `<option value="${r.value}" ${u.role === r.value ? 'selected' : ''}>${r.label}</option>`
        ).join('');

        const selectorRolHtml = puedeEditarEsteUsuario
            ? `<select id="rol-user-${u.id}" data-status-actual="${u.status || 'approved'}" onchange="window.guardarEstadoYRolUsuario('${u.id}', this.dataset.statusActual)" class="border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-white cursor-pointer">
                ${!rolesAsignables.some(r => r.value === u.role) ? `<option value="${u.role}" selected>${formatearNombreRol(u.role)}</option>` : ''}
                ${opcionesRol}
               </select>`
            : `<span class="text-xs font-bold text-slate-700">${formatearNombreRol(u.role)}</span>`;

        const selectorCongreHtml = miRol === 'super_admin'
            ? `<select id="congre-user-${u.id}" data-status-actual="${u.status || 'approved'}" onchange="window.guardarEstadoYRolUsuario('${u.id}', this.dataset.statusActual)" class="border border-slate-300 rounded px-2 py-1 text-xs font-semibold bg-white cursor-pointer">
                <option value="">-- Sin asignar --</option>
                ${listaCongres.map(c => `<option value="${c.id}" ${u.congregacion_id === c.id ? 'selected' : ''}>${c.nombre}</option>`).join('')}
               </select>`
            : `<span class="text-xs text-slate-600">${mapaCongres[u.congregacion_id] || 'Sin asignar'}</span>`;

        const accionesHtml = puedeEditarEsteUsuario
            ? `<div class="flex items-center justify-center gap-1.5">
                <button type="button" onclick="window.guardarEstadoYRolUsuario('${u.id}', 'approved')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded transition">
                    Aprobar / Guardar
                </button>
                <button type="button" onclick="window.guardarEstadoYRolUsuario('${u.id}', 'blocked')" class="bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-bold px-2.5 py-1 rounded transition">
                    Bloquear
                </button>
               </div>`
            : `<span class="text-[11px] text-slate-400">${esMiMismoUsuario ? 'Tu usuario' : 'Solo lectura'}</span>`;

        return `
            <tr class="border-b border-slate-200 hover:bg-slate-50">
                <td class="p-2.5 text-left">
                    <div class="font-bold text-xs text-slate-900">${u.full_name || 'Sin nombre'}</div>
                    <div class="text-[11px] text-slate-500">${u.email || ''}</div>
                </td>
                <td class="p-2.5 text-center">${selectorCongreHtml}</td>
                <td class="p-2.5 text-center">${selectorRolHtml}</td>
                <td class="p-2.5 text-center">${estadoBadge}</td>
                <td class="p-2.5 text-center">${accionesHtml}</td>
            </tr>
        `;
    }).join('');

    contenedor.innerHTML = `
        <table class="w-full text-left border-collapse">
            <thead class="bg-slate-100 text-slate-700 text-[11px] uppercase font-extrabold border-b border-slate-300">
                <tr>
                    <th class="p-2.5">Hermano / Gmail</th>
                    <th class="p-2.5 text-center">Congregación</th>
                    <th class="p-2.5 text-center">Rol Asignado</th>
                    <th class="p-2.5 text-center">Estado</th>
                    <th class="p-2.5 text-center">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${filas || `<tr><td colspan="5" class="p-6 text-center text-xs text-slate-500">No hay usuarios registrados en esta congregación.</td></tr>`}
            </tbody>
        </table>
    `;
};

window.guardarEstadoYRolUsuario = async function(userId, nuevoStatus) {
    const rolesAsignables = obtenerRolesAsignablesSegunMiRol(window.rolUsuarioActual);
    if (rolesAsignables.length === 0) {
        alert("No tenés permisos para modificar usuarios.");
        return;
    }

    const selRol = document.getElementById(`rol-user-${userId}`);
    const selCongre = document.getElementById(`congre-user-${userId}`);

    const nuevoRol = selRol ? selRol.value : undefined;
    const nuevaCongre = selCongre ? (selCongre.value || null) : window.congregacionIdActual;

    if (nuevoRol && !rolesAsignables.some(r => r.value === nuevoRol)) {
        alert("No tenés permisos para asignar ese rol.");
        return;
    }

    if (nuevoStatus === 'approved' && !nuevaCongre) {
        alert("Debés asignar una congregación antes de aprobar al usuario.");
        return;
    }

    const payload = {
        status: nuevoStatus || 'approved',
        congregacion_id: nuevaCongre
    };
    if (nuevoRol) payload.role = nuevoRol;

    const { data, error } = await db
        .from('perfiles')
        .update(payload)
        .eq('id', userId)
        .select();

    if (error) {
        alert("Error al actualizar el usuario: " + error.message);
        await window.cargarGestionUsuarios();
        return;
    }

    if (!data || data.length === 0) {
        alert("Supabase bloqueó el cambio por permisos RLS en la tabla 'perfiles'. Ejecutá la política SQL de UPDATE para administradores en Supabase.");
        await window.cargarGestionUsuarios();
        return;
    }

    await window.cargarGestionUsuarios();
};

/* GENERADOR Y COPIADOR DE LINK PÚBLICO */
window.actualizarLinkPublico = function() {
    const inputMes = document.getElementById('inputNombreMes');
    const inputLink = document.getElementById('inputLinkPublico');
    if (!inputLink) return;

    const textoRaw = inputMes ? inputMes.value : '';
    const mesFormateado = textoRaw.trim() ? textoRaw.trim().toUpperCase().replace(/\s+/g, '-') : 'ACTUAL';

    const congreSlug = window.slugCongregacionActual || 'default';
    const urlBase = window.location.origin + window.location.pathname;

    inputLink.value = `${urlBase}?c=${encodeURIComponent(congreSlug)}&m=${encodeURIComponent(mesFormateado)}`;
};

window.copiarLinkPublico = function() {
    const inputLink = document.getElementById('inputLinkPublico');
    const lbl = document.getElementById('lblCopiarLink');
    if (!inputLink || !inputLink.value) return;

    navigator.clipboard.writeText(inputLink.value).then(() => {
        if (lbl) {
            const original = lbl.innerText;
            lbl.innerText = "¡Copiado!";
            setTimeout(() => { lbl.innerText = original; }, 2000);
        }
    }).catch(err => {
        console.error("Error al copiar link:", err);
    });
};

/* CARGAR Y GUARDAR HERMANOS */
window.cargarHermanosDesdeSupabase = async function() {
    if (!window.congregacionIdActual) return;

    const { data, error } = await db
        .from('hermanos')
        .select('*')
        .eq('congregacion_id', window.congregacionIdActual)
        .order('nombre', { ascending: true });

    if (error) {
        console.error("Error cargando hermanos:", error);
        return;
    }

    window.listaHermanos = data || [];
    if (typeof renderizarMatrizHermanos === 'function') renderizarMatrizHermanos();
    if (typeof renderizarTablaHistorial === 'function') renderizarTablaHistorial();
};

window.actualizarHermanoBD = async function(id, campo, valor) {
    if (!['super_admin', 'admin_congregacion', 'editor_vymc'].includes(window.rolUsuarioActual)) {
        return;
    }

    const { error } = await db
        .from('hermanos')
        .update({ [campo]: valor })
        .eq('id', id);

    if (error) console.error("Error actualizando hermano:", error);
};

window.agregarNuevoHermanoBD = async function() {
    if (!['super_admin', 'admin_congregacion', 'editor_vymc'].includes(window.rolUsuarioActual)) {
        alert("Tu usuario no tiene permisos para agregar hermanos.");
        return;
    }

    if (!window.congregacionIdActual) return;

    const nuevo = {
        nombre: "NUEVO HERMANO",
        sexo: "V",
        condicion: "Pub",
        grupo: 1,
        congregacion_id: window.congregacionIdActual
    };

    const { error } = await db
        .from('hermanos')
        .insert([nuevo]);

    if (error) {
        console.error("Error agregando hermano:", error);
        return;
    }

    if (typeof cargarHermanosDesdeSupabase === 'function') {
        await cargarHermanosDesdeSupabase();
    }
};

window.eliminarHermanoBD = async function(id) {
    if (!['super_admin', 'admin_congregacion', 'editor_vymc'].includes(window.rolUsuarioActual)) {
        alert("Tu usuario no tiene permisos para eliminar hermanos.");
        return;
    }

    const { error } = await db
        .from('hermanos')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Error eliminando hermano:", error);
        return;
    }

    window.listaHermanos = window.listaHermanos.filter(h => h.id !== id);
    if (typeof renderizarMatrizHermanos === 'function') renderizarMatrizHermanos();
};

/* CARGAR PLANILLA (DESDE EDITOR) */
window.cargarPlanillaDesdeSupabase = async function() {
    if (!window.congregacionIdActual) return;

    const inputMes = document.getElementById('inputNombreMes');
    const mesBuscado = (inputMes && inputMes.value.trim()) ? inputMes.value.trim().toUpperCase() : 'ACTUAL';

    const { data, error } = await db
        .from('planillas')
        .select('*')
        .eq('congregacion_id', window.congregacionIdActual)
        .eq('mes_ano', mesBuscado)
        .maybeSingle();

    if (error) {
        console.error("Error cargando planilla:", error);
        return;
    }

    const idxActual = (typeof window.semanaActivaIdx === 'number' && window.semanaActivaIdx >= 0) ? window.semanaActivaIdx : 0;

    if (data && data.datos) {
        window.programaMes = typeof data.datos === 'string' ? JSON.parse(data.datos) : (data.datos || []);
        window.nombreMesGlobal = data.mes_ano || "";
        
        if (inputMes) inputMes.value = window.nombreMesGlobal;
        if (typeof actualizarTextoTituloMes === 'function') actualizarTextoTituloMes(window.nombreMesGlobal);

        const idxValido = Math.min(idxActual, Math.max(0, window.programaMes.length - 1));

        if (typeof renderizarSelectorSemanas === 'function') renderizarSelectorSemanas();
        if (typeof cargarSemanaEnPlanilla === 'function') cargarSemanaEnPlanilla(idxValido);
    } else {
        if (typeof inicializarMesDefault === 'function') {
            inicializarMesDefault(4);
        } else {
            window.programaMes = [];
        }
        if (typeof renderizarSelectorSemanas === 'function') renderizarSelectorSemanas();
        if (typeof cargarSemanaEnPlanilla === 'function') cargarSemanaEnPlanilla(0);
    }

    if (typeof window.actualizarLinkPublico === 'function') window.actualizarLinkPublico();
};

/**
 * Genera la "foto estática HTML" unificada con TODAS las semanas del mes
 */
function generarSnapshotHTMLPublico() {
    if (!window.programaMes || window.programaMes.length === 0) return '';

    const semanaActivaOriginal = (typeof window.semanaActivaIdx === 'number') ? window.semanaActivaIdx : 0;

    const tempDiv = document.createElement('div');
    tempDiv.className = 'print-area bg-white p-3 sm:p-6 rounded-xl border border-slate-300';

    tempDiv.innerHTML = `
        <div class="text-center mb-4 border-b-2 border-slate-900 pb-2">
            <h2 class="text-xl font-black text-slate-900 uppercase tracking-widest">
                PROGRAMA DE REUNIONES - MES DE ${window.nombreMesGlobal || '---'}
            </h2>
        </div>
    `;

    window.programaMes.forEach((semana, index) => {
        if (typeof cargarSemanaEnPlanilla === 'function') {
            cargarSemanaEnPlanilla(index);
        }

        const areaPrint = document.querySelector('.print-area');
        if (!areaPrint) return;

        const tablaOriginal = areaPrint.querySelector('#tablaPlanillaCompleta');
        if (!tablaOriginal) return;

        const clonTabla = tablaOriginal.cloneNode(true);

        const selectsOriginales = tablaOriginal.querySelectorAll('select');
        const selectsClonados = clonTabla.querySelectorAll('select');

        selectsOriginales.forEach((sel, i) => {
            const textoSeleccionado = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
            const esVacio = !textoSeleccionado || textoSeleccionado.includes('-- ELEGIR --') || textoSeleccionado.includes('-- ASIGNAR --');
            
            const span = document.createElement('span');
            span.className = 'font-bold uppercase text-slate-900 text-[11px]';
            span.textContent = esVacio ? '' : textoSeleccionado.split('(')[0].trim();
            
            if (selectsClonados[i]) {
                selectsClonados[i].parentNode.replaceChild(span, selectsClonados[i]);
            }
        });

        clonTabla.querySelectorAll('.btn-accion-tabla, .fa-whatsapp, button').forEach(el => el.remove());

        const bloqueSemana = document.createElement('div');
        bloqueSemana.className = 'mb-6 semana-bloque-print';
        bloqueSemana.appendChild(clonTabla);
        tempDiv.appendChild(bloqueSemana);
    });

    if (typeof cargarSemanaEnPlanilla === 'function') {
        cargarSemanaEnPlanilla(semanaActivaOriginal);
    }

    return tempDiv.innerHTML;
}

/* GUARDAR EN SUPABASE (GENERA PAYLOAD + SNAPSHOT DEL MES COMPLETO) */
window.guardarPlanillaEnSupabase = async function() {
    if (!['super_admin', 'admin_congregacion', 'editor_vymc'].includes(window.rolUsuarioActual)) {
        alert("Tu usuario no tiene permisos para modificar la planilla VyMC.");
        return;
    }

    if (!window.congregacionIdActual) {
        alert("Error: No hay sesión activa o congregación asignada.");
        return;
    }

    const inputMes = document.getElementById('inputNombreMes');
    if (inputMes && inputMes.value.trim()) {
        window.nombreMesGlobal = inputMes.value.trim().toUpperCase();
    }

    const mesClave = window.nombreMesGlobal || "ACTUAL";
    const htmlFoto = generarSnapshotHTMLPublico();

    const payload = {
        mes_ano: mesClave,
        datos: window.programaMes,
        html_publico: htmlFoto,
        congregacion_id: window.congregacionIdActual,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await db
        .from('planillas')
        .upsert(payload, { onConflict: 'congregacion_id,mes_ano' })
        .select();

    if (error) {
        console.error("Error guardando en Supabase:", error);
        alert("Error al guardar en Supabase: " + error.message);
    } else {
        console.log("Guardado y snapshot completo generado con éxito:", data);
        const estado = document.getElementById('estadoGuardado');
        if (estado) {
            estado.classList.remove('opacity-0');
            setTimeout(() => estado.classList.add('opacity-0'), 2500);
        }
    }
};
