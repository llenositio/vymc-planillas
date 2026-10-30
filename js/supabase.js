/**
 * Módulo de Integración con Supabase + Autenticación Multi-Inquilino + Vista Pública
 */

const SUPABASE_URL = "https://logscbqojxfyrewfoqas.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ycK_RSR1KXlpwFtMb9Skgg_d01qRpM-";

window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.usuarioActual = null;
window.congregacionIdActual = null;
window.slugCongregacionActual = "";

// Verificar sesión o activar Vista Pública al cargar la página
window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const congreSlugParam = urlParams.get('c');
    const mesParam = urlParams.get('m');

    // SI CONTIENE PARÁMETRO DE CONGREGACIÓN, ES VISTA PÚBLICA
    if (congreSlugParam) {
        document.body.classList.add('modo-publico');
        mostrarPantallaLogin(false);
        await cargarPlanillaVistaPublica(congreSlugParam, mesParam);
        return;
    }

    // MODO ADMINISTRACIÓN (REQUIERE AUTENTICACIÓN)
    const { data: { session } } = await db.auth.getSession();
    if (session) {
        await cargarPerfilUsuario(session.user);
    } else {
        mostrarPantallaLogin(true);
    }
    
    window.actualizarLinkPublico();
});

/**
 * Carga la planilla en modo público sin solicitar credenciales
 */
async function cargarPlanillaVistaPublica(slug, mes) {
    const mesBuscado = mes ? decodeURIComponent(mes).replace(/-/g, ' ').toUpperCase() : 'ACTUAL';

    // 1. Obtener la congregación por coincidencia de nombre o UUID
    const { data: congregaciones, error: congreError } = await db
        .from('congregaciones')
        .select('id, nombre');

    if (congreError || !congregaciones || congregaciones.length === 0) {
        console.error("Error obteniendo congregaciones para la vista pública");
        return;
    }

    // Buscar coincidencia limpia omitiendo espacios y mayúsculas
    const slugLimpio = slug.toLowerCase().replace(/\s+/g, '');
    let congreEncontrada = congregaciones.find(c => 
        c.nombre.toLowerCase().replace(/\s+/g, '') === slugLimpio || c.id === slug
    );

    if (!congreEncontrada) {
        console.error("Congregación no encontrada para la vista pública:", slug);
        return;
    }

    window.congregacionIdActual = congreEncontrada.id;

    // 2. Cargar la planilla correspondiente
    const { data: planillaData, error: planillaError } = await db
        .from('planillas')
        .select('*')
        .eq('congregacion_id', congreEncontrada.id)
        .eq('mes_ano', mesBuscado)
        .maybeSingle();

    if (planillaError) {
        console.error("Error cargando planilla pública:", planillaError);
        return;
    }

    if (planillaData) {
        window.programaMes = typeof planillaData.datos === 'string' ? JSON.parse(planillaData.datos) : (planillaData.datos || []);
        window.nombreMesGlobal = planillaData.mes_ano || mesBuscado;

        if (typeof actualizarTextoTituloMes === 'function') actualizarTextoTituloMes(window.nombreMesGlobal);
        if (typeof renderizarSelectorSemanas === 'function') renderizarSelectorSemanas();
        if (typeof cargarSemanaEnPlanilla === 'function') cargarSemanaEnPlanilla(0);
    } else {
        window.programaMes = [];
        if (typeof renderizarSelectorSemanas === 'function') renderizarSelectorSemanas();
    }
}

async function cargarPerfilUsuario(user) {
    window.usuarioActual = user;
    
    const { data, error } = await db
        .from('perfiles')
        .select('congregacion_id, rol')
        .eq('id', user.id)
        .single();

    if (error || !data) {
        alert("Tu usuario no tiene una congregación asignada. Contacta al administrador.");
        await db.auth.signOut();
        mostrarPantallaLogin(true);
        return;
    }

    window.congregacionIdActual = data.congregacion_id;
    mostrarPantallaLogin(false);

    if (data.rol === 'super_admin') {
        await renderizarSelectorSuperAdmin();
    } else {
        await obtenerSlugCongregacion(window.congregacionIdActual);
    }

    if (typeof cargarHermanosDesdeSupabase === 'function') await cargarHermanosDesdeSupabase();
    if (typeof cargarPlanillaDesdeSupabase === 'function') await cargarPlanillaDesdeSupabase();
    
    window.actualizarLinkPublico();
}

/**
 * Obtiene el nombre/slug de la congregación para armar URLs amigables
 */
async function obtenerSlugCongregacion(id) {
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
 * Renderiza el menú desplegable para el Super Admin
 */
async function renderizarSelectorSuperAdmin() {
    const contenedor = document.getElementById('selector-congregacion-container');
    if (!contenedor) return;

    const { data: congregaciones, error } = await db
        .from('congregaciones')
        .select('id, nombre')
        .order('nombre', { ascending: true });

    if (error || !congregaciones || congregaciones.length === 0) return;

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

/**
 * Cambia la congregación activa para el Super Admin y recarga la pantalla
 */
window.cambiarCongregacionSuperAdmin = async function(nuevaCongreId) {
    window.congregacionIdActual = nuevaCongreId;
    
    const select = document.getElementById('selectCongreSuperAdmin');
    if (select && select.selectedOptions[0]) {
        window.slugCongregacionActual = select.selectedOptions[0].getAttribute('data-nombre').toLowerCase().replace(/\s+/g, '');
    }

    if (typeof cargarHermanosDesdeSupabase === 'function') await cargarHermanosDesdeSupabase();
    if (typeof cargarPlanillaDesdeSupabase === 'function') await cargarPlanillaDesdeSupabase();
    window.actualizarLinkPublico();
};

window.iniciarSesion = async function(email, password) {
    const btn = document.getElementById('btnLogin');
    if (btn) btn.disabled = true;

    const { data, error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
        alert("Error al iniciar sesión: " + error.message);
        if (btn) btn.disabled = false;
        return;
    }

    await cargarPerfilUsuario(data.user);
    if (btn) btn.disabled = false;
};

window.cerrarSesion = async function() {
    await db.auth.signOut();
    window.usuarioActual = null;
    window.congregacionIdActual = null;
    window.slugCongregacionActual = "";
    window.listaHermanos = [];
    window.programaMes = [];
    
    const contenedor = document.getElementById('selector-congregacion-container');
    if (contenedor) contenedor.innerHTML = '';

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

/* GENERADOR Y COPIADOR DE LINK PÚBLICO */
window.actualizarLinkPublico = function() {
    const inputMes = document.getElementById('inputNombreMes');
    const inputLink = document.getElementById('inputLinkPublico');
    if (!inputLink) return;

    const mesTexto = (inputMes && inputMes.value.trim()) ? inputMes.value.trim().toUpperCase().replace(/\s+/g, '-') : 'ACTUAL';
    const congreSlug = window.slugCongregacionActual || 'default';

    const urlBase = window.location.origin + window.location.pathname;
    inputLink.value = `${urlBase}?c=${encodeURIComponent(congreSlug)}&m=${encodeURIComponent(mesTexto)}`;
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
    const { error } = await db
        .from('hermanos')
        .update({ [campo]: valor })
        .eq('id', id);

    if (error) console.error("Error actualizando hermano:", error);
};

window.agregarNuevoHermanoBD = async function() {
    if (!window.congregacionIdActual) return;

    const nuevo = {
        nombre: "NUEVO HERMANO",
        sexo: "V",
        condicion: "Pub",
        grupo: 1,
        congregacion_id: window.congregacionIdActual
    };

    const { data, error } = await db
        .from('hermanos')
        .insert([nuevo])
        .select();

    if (error) {
        console.error("Error agregando hermano:", error);
        return;
    }

    if (data && data[0]) {
        window.listaHermanos.push(data[0]);
        if (typeof renderizarMatrizHermanos === 'function') renderizarMatrizHermanos();
    }
};

window.eliminarHermanoBD = async function(id) {
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

/* CARGAR Y GUARDAR PLANILLA MENSUAL */
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

    if (data) {
        window.programaMes = typeof data.datos === 'string' ? JSON.parse(data.datos) : (data.datos || []);
        window.nombreMesGlobal = data.mes_ano || "";
        
        if (inputMes) inputMes.value = window.nombreMesGlobal;
        if (typeof actualizarTextoTituloMes === 'function') actualizarTextoTituloMes(window.nombreMesGlobal);

        if (typeof renderizarSelectorSemanas === 'function') renderizarSelectorSemanas();
        if (typeof cargarSemanaEnPlanilla === 'function') cargarSemanaEnPlanilla(0);
    } else {
        window.programaMes = [];
        if (typeof renderizarSelectorSemanas === 'function') renderizarSelectorSemanas();
    }

    window.actualizarLinkPublico();
};

window.guardarPlanillaEnSupabase = async function() {
    if (!window.congregacionIdActual) {
        alert("Error: No hay sesión activa o congregación asignada.");
        return;
    }

    const inputMes = document.getElementById('inputNombreMes');
    if (inputMes && inputMes.value.trim()) {
        window.nombreMesGlobal = inputMes.value.trim().toUpperCase();
    }

    const mesClave = window.nombreMesGlobal || "ACTUAL";

    const payload = {
        mes_ano: mesClave,
        datos: window.programaMes,
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
        console.log("Guardado con éxito:", data);
        const estado = document.getElementById('estadoGuardado');
        if (estado) {
            estado.classList.remove('opacity-0');
            setTimeout(() => estado.classList.add('opacity-0'), 2500);
        }
    }
    
    window.actualizarLinkPublico();
};
