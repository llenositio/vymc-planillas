// Configuración de Supabase
const SUPABASE_URL = 'https://logscbqojxfyrewfoqas.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ycK_RSR1KXlpwFtMb9Skgg_d01qRpM-'; // Reemplazar con tu clave pública completa

let db = null;
if (window.supabase && window.supabase.createClient) {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let listaHermanos = [];
let mesActualClave = "2026-10";
let programaMes = [];

// Cargar Hermanos desde Supabase
async function cargarHermanosDesdeSupabase() {
    if (!db) return [];
    const { data, error } = await db.from('hermanos').select('*').order('id');
    if (error) {
        console.error("Error al cargar hermanos:", error);
        return [];
    }
    if (data && data.length > 0) {
        listaHermanos = data.map(h => ({
            id: h.id,
            sexo: h.sexo || 'V',
            orac: h.oracion ? 'X' : '',
            pres: h.pres_vymc ? 'X' : '',
            disc: h.disc_tesoros ? 'X' : '',
            perlas: h.perlas ? 'X' : '',
            lec: h.lec_biblia ? 'X' : '',
            smm: h.smm ? 'X' : '',
            nvc: h.nvc ? 'X' : '',
            eb: h.ebc ? 'X' : '',
            lectorL: h.lector_ebc ? 'X' : '',
            presPub: h.pres_pub ? 'X' : '',
            lectorW: h.lector_atalaya ? 'X' : '',
            nombre: h.nombre
        }));
    }
    return listaHermanos;
}

// Cargar Planilla del mes activo desde Supabase
async function cargarPlanillaDesdeSupabase() {
    if (!db) return [];
    const { data, error } = await db.from('planillas').select('datos').eq('mes_ano', mesActualClave).single();
    if (data && data.datos && data.datos.length > 0) {
        programaMes = data.datos;
    }
    return programaMes;
}

// Guardar Planilla del mes activo en Supabase
async function guardarPlanillaEnSupabase() {
    if (!db) return;
    const el = document.getElementById('estadoGuardado');
    if (el) el.classList.remove('opacity-0');

    await db.from('planillas').upsert({
        mes_ano: mesActualClave,
        datos: programaMes,
        updated_at: new Date()
    }, { onConflict: 'mes_ano' });

    setTimeout(() => {
        if (el) el.classList.add('opacity-0');
    }, 1800);
}

// Actualizar un campo de la matriz de hermanos
async function actualizarHermanoBD(id, campo, valor) {
    const h = listaHermanos.find(item => item.id === id);
    if (!h) return;
    
    h[campo] = valor;

    if (!db) return;

    const dbMap = {
        sexo: 'sexo', nombre: 'nombre',
        orac: 'oracion', pres: 'pres_vymc', disc: 'disc_tesoros',
        perlas: 'perlas', lec: 'lec_biblia', smm: 'smm',
        nvc: 'nvc', eb: 'ebc', lectorL: 'lector_ebc',
        presPub: 'pres_pub', lectorW: 'lector_atalaya'
    };

    const dbCampo = dbMap[campo];
    if (dbCampo) {
        const dbValor = (typeof valor === 'string' && valor === 'X') ? true : (valor === '' ? false : valor);
        await db.from('hermanos').update({ [dbCampo]: dbValor }).eq('id', id);
    }
}

// Agregar hermano en BD
async function agregarNuevoHermanoBD() {
    if (db) {
        const { data, error } = await db.from('hermanos').insert([{ nombre: 'NUEVO HERMANO', sexo: 'V' }]).select();
        if (!error && data) {
            await cargarHermanosDesdeSupabase();
            return;
        }
    }
    const nuevoId = listaHermanos.length ? Math.max(...listaHermanos.map(h => h.id)) + 1 : 1;
    listaHermanos.push({
        id: nuevoId, sexo: 'V', orac: 'X', pres: '', disc: '', perlas: '', lec: 'X', smm: 'X', nvc: '', eb: '', lectorL: '', presPub: '', lectorW: '', nombre: 'NUEVO HERMANO'
    });
}

// Eliminar hermano en BD
async function eliminarHermanoBD(id) {
    if (db) {
        await db.from('hermanos').delete().eq('id', id);
        await cargarHermanosDesdeSupabase();
    } else {
        listaHermanos = listaHermanos.filter(h => h.id !== id);
    }
}
