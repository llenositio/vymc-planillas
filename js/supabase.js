const SUPABASE_URL = 'https://logscbqojxfyrewfoqas.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ycK_RSR1KXlpwFtMb9Skgg_d01qRpM-';

let db = null;
if (window.supabase && window.supabase.createClient) {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let listaHermanos = [];
let programaMes = [];

/* CARGAR HERMANOS DESDE SUPABASE MANTENIENDO TODOS LOS CAMPOS Y BOOLEANOS DIRECTOS */
async function cargarHermanosDesdeSupabase() {
    if (!db) return [];
    const { data, error } = await db.from('hermanos').select('*').order('id');
    if (error) {
        console.error("Error al cargar hermanos:", error);
        return [];
    }
    if (data) {
        listaHermanos = data;
    }
    return listaHermanos;
}

/* CARGAR PLANILLA MENSUAL DESDE SUPABASE */
async function cargarPlanillaDesdeSupabase() {
    if (!db) return [];
    
    // Si hay un mes definido, consulta la clave en Supabase; si no, toma la más reciente
    const claveMes = (typeof nombreMesGlobal !== 'undefined' && nombreMesGlobal) ? nombreMesGlobal : 'ACTUAL';
    
    const { data, error } = await db.from('planillas').select('datos, mes_ano').eq('mes_ano', claveMes).maybeSingle();
    
    if (data && data.datos && data.datos.length > 0) {
        programaMes = data.datos;
        if (typeof nombreMesGlobal !== 'undefined') {
            nombreMesGlobal = data.mes_ano;
            const inputMes = document.getElementById('inputNombreMes');
            if (inputMes) inputMes.value = nombreMesGlobal;
            if (typeof actualizarTextoTituloMes === 'function') actualizarTextoTituloMes(nombreMesGlobal);
        }
    }
    return programaMes;
}

/* GUARDAR PLANILLA CON EL MES DINÁMICO INGRESADO POR EL USUARIO */
async function guardarPlanillaEnSupabase() {
    if (!db) return;

    const claveMes = (typeof nombreMesGlobal !== 'undefined' && nombreMesGlobal) ? nombreMesGlobal : 'ACTUAL';

    const { error } = await db.from('planillas').upsert({
        mes_ano: claveMes,
        datos: programaMes,
        updated_at: new Date()
    }, { onConflict: 'mes_ano' });

    if (error) {
        console.error("Error al guardar planilla en Supabase:", error);
    }
}

/* ACTUALIZAR CUALQUIER CAMPO DEL HERMANO (INCLUYENDO CELULAR, GRUPO, RESPONSABILIDADES) */
async function actualizarHermanoBD(id, campo, valor) {
    const h = listaHermanos.find(item => item.id === id);
    if (h) {
        h[campo] = valor;
    }

    if (!db) return;

    const { error } = await db.from('hermanos').update({ [campo]: valor }).eq('id', id);
    if (error) {
        console.error(`Error al actualizar el campo ${campo} en Supabase:`, error);
    }
}

/* AGREGAR UN NUEVO HERMANO A SUPABASE CON VALORES POR DEFECTO */
async function agregarNuevoHermanoBD() {
    if (db) {
        const nuevoHermano = { 
            nombre: 'NUEVO HERMANO', 
            sexo: 'V',
            condicion: 'Publicador',
            grupo: 1,
            responsabilidades: '',
            celular: '',
            oracion: false,
            pres_vymc: false,
            disc_tesoros: false,
            perlas: false,
            lec_biblia: false,
            smm: false,
            nvc: false,
            ebc: false,
            lector_ebc: false,
            pres_pub: false,
            lector_atalaya: false
        };

        const { data, error } = await db.from('hermanos').insert([nuevoHermano]).select();
        if (!error && data) {
            await cargarHermanosDesdeSupabase();
            return;
        }
    }
    
    // Fallback local en caso de no tener conexión a la BD
    const nuevoId = listaHermanos.length ? Math.max(...listaHermanos.map(h => h.id)) + 1 : 1;
    listaHermanos.push({
        id: nuevoId, 
        nombre: 'NUEVO HERMANO', 
        sexo: 'V', 
        condicion: 'Publicador',
        grupo: 1,
        responsabilidades: '',
        celular: ''
    });
}

/* ELIMINAR HERMANO DE SUPABASE */
async function eliminarHermanoBD(id) {
    if (db) {
        await db.from('hermanos').delete().eq('id', id);
        await cargarHermanosDesdeSupabase();
    } else {
        listaHermanos = listaHermanos.filter(h => h.id !== id);
    }
}
