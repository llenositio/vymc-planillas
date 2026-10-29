/**
 * Módulo de Integración con Supabase + Autenticación Multi-Inquilino
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
    
    const { data, error } = await db
        .from('perfiles')
        .select('congregacion_id')
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

    if (typeof cargarHermanosDesdeSupabase === 'function') await cargarHermanosDesdeSupabase();
    if (typeof cargarPlanillaDesdeSupabase === 'function') await cargarPlanillaDesdeSupabase();
}

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
        .upsert(payload, { onConflict: 'mes_ano' })
        .select();

    if (error) {
        console.error("Error guardando en Supabase:", error);
        alert("Error al guardar en Supabase: " + error.message);
    } else {
        console.log("Guardado con éxito:", data);
    }
};
