/**
 * Módulo de Integración con Supabase + Autenticación Multi-Inquilino + Super Admin Selector
 */

const SUPABASE_URL = "https://logscbqojxfyrewfoqas.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ycK_RSR1KXlpwFtMb9Skgg_d01qRpM-";

window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.usuarioActual = null;
window.congregacionIdActual = null;

// Verificar sesión al cargar la página
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await db.auth.getSession();
    if (session) {
        await cargarPerfilUsuario(session.user);
    } else {
        mostrarPantallaLogin(true);
    }
});

async function cargarPerfilUsuario(user) {
    window.usuarioActual = user;
    
    // Consultamos congregacion_id Y rol
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

    // Si es Super Admin, renderizar el menú selector de congregaciones
    if (data.rol === 'super_admin') {
        await renderizarSelectorSuperAdmin();
    }

    // Cargar datos iniciales
    if (typeof cargarHermanosDesdeSupabase === 'function') await cargarHermanosDesdeSupabase();
    if (typeof cargarPlanillaDesdeSupabase === 'function') await cargarPlanillaDesdeSupabase();
}

/**
 * Renderiza el menú desplegable para el Super Admin
 */
async function renderizarSelectorSuperAdmin() {
    const contenedor = document.getElementById('selector-congregacion-container');
    if (!contenedor) return;

    // Obtener todas las congregaciones
    const { data: congregaciones, error } = await db
        .from('congregaciones')
        .select('id, nombre')
        .order('nombre', { ascending: true });

    if (error || !congregaciones || congregaciones.length === 0) return;

    // Si por alguna razón el super admin no tiene congregacionIdActual fijado, tomamos la primera
    if (!window.congregacionIdActual && congregaciones.length > 0) {
        window.congregacionIdActual = congregaciones[0].id;
    }

    let opciones = congregaciones.map(c => 
        `<option value="${c.id}" ${c.id === window.congregacionIdActual ? 'selected' : ''}>${c.nombre}</option>`
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
}

/**
 * Cambia la congregación activa para el Super Admin y recarga la pantalla
 */
window.cambiarCongregacionSuperAdmin = async function(nuevaCongreId) {
    window.congregacionIdActual = nuevaCongreId;
    console.log("Cambiando vista a congregación ID:", nuevaCongreId);

    // Recargar hermanos y planilla para la nueva congregación seleccionada
    if (typeof cargarHermanosDesdeSupabase === 'function') await cargarHermanosDesdeSupabase();
    if (typeof cargarPlanillaDesdeSupabase === 'function') await cargarPlanillaDesdeSupabase();
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
    window.listaHermanos = [];
    window.programaMes = [];
    
    // Limpiar selector si existía
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
        // Si no hay planilla creada para esta congregación en este mes, reiniciamos vista local
        window.programaMes = [];
        if (typeof renderizarSelectorSemanas === 'function') renderizarSelectorSemanas();
    }
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
        .upsert(payload, { onConflict: 'mes_ano,congregacion_id' })
        .select();

    if (error) {
        console.error("Error guardando en Supabase:", error);
        alert("Error al guardar en Supabase: " + error.message);
    } else {
        console.log("Guardado con éxito:", data);
    }
};
