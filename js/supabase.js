const SUPABASE_URL = 'https://logscbqojxfyrewfoqas.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ycK_RSR1KXlpwFtMb9Skgg_d01qRpM-';

let db = null;
if (window.supabase && window.supabase.createClient) {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let listaHermanos = [];
let mesActualClave = "2026-09";
let programaMes = [];

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

async function cargarPlanillaDesdeSupabase() {
    if (!db) return [];
    const { data, error } = await db.from('planillas').select('datos').eq('mes_ano', mesActualClave).single();
    if (data && data.datos && data.datos.length > 0) {
        programaMes = data.datos;
    }
    return programaMes;
}

async function guardarPlanillaEnSupabase() {
    if (!db) return;
    const el = document.getElementById('estadoGuardado');
    if (el) el.classList.remove('opacity-0');

    if (programaMes && programaMes.length > 0 && programaMes[0].semana) {
        const textoSemana = programaMes[0].semana;
        if (textoSemana.includes('SEPTIEMBRE')) mesActualClave = '2026-09';
        else if (textoSemana.includes('OCTUBRE')) mesActualClave = '2026-10';
        else if (textoSemana.includes('NOVIEMBRE')) mesActualClave = '2026-11';
        else if (textoSemana.includes('DICIEMBRE')) mesActualClave = '2026-12';
        else if (textoSemana.includes('ENERO')) mesActualClave = '2026-01';
        else if (textoSemana.includes('FEBRERO')) mesActualClave = '2026-02';
        else if (textoSemana.includes('MARZO')) mesActualClave = '2026-03';
        else if (textoSemana.includes('ABRIL')) mesActualClave = '2026-04';
        else if (textoSemana.includes('MAYO')) mesActualClave = '2026-05';
        else if (textoSemana.includes('JUNIO')) mesActualClave = '2026-06';
        else if (textoSemana.includes('JULIO')) mesActualClave = '2026-07';
        else if (textoSemana.includes('AGOSTO')) mesActualClave = '2026-08';
    }

    await db.from('planillas').upsert({
        mes_ano: mesActualClave,
        datos: programaMes,
        updated_at: new Date()
    }, { onConflict: 'mes_ano' });

    setTimeout(() => {
        if (el) el.classList.add('opacity-0');
    }, 1800);
}

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

async function eliminarHermanoBD(id) {
    if (db) {
        await db.from('hermanos').delete().eq('id', id);
        await cargarHermanosDesdeSupabase();
    } else {
        listaHermanos = listaHermanos.filter(h => h.id !== id);
    }
}
