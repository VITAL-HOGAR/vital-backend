const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'VITAL HOGAR PRO IPS - Backend' });
});

app.get('/api/users', async (req, res) => {
    try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/patients', async (req, res) => {
    try {
        const { data, error } = await supabase.from('patients').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/patients', async (req, res) => {
    try {
        const { first_name, last_name, document_type, document_number, phone, city, eps } = req.body;
        const { data, error } = await supabase
            .from('patients')
            .insert([{ first_name, last_name, document_type, document_number, phone, city, eps }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/actividades', async (req, res) => {
    try {
        const { patient_id, user_id, actividad, hora, observacion } = req.body;
        const { data, error } = await supabase
            .from('actividades')
            .insert([{ patient_id, user_id, actividad, hora, observacion }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/actividades/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase.from('actividades').select('*').eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/signos', async (req, res) => {
    try {
        const { patient_id, user_id, spo2, fc, fr, temp, bp, glucosa, hora, observacion, alerta } = req.body;
        const { data, error } = await supabase
            .from('signos')
            .insert([{ patient_id, user_id, spo2, fc, fr, temp, bp, glucosa, hora, observacion, alerta }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/signos/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase.from('signos').select('*').eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/medicamentos', async (req, res) => {
    try {
        const { patient_id, user_id, nombre, dosis, hora, observacion } = req.body;
        const { data, error } = await supabase
            .from('medicamentos')
            .insert([{ patient_id, user_id, nombre, dosis, hora, observacion }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/medicamentos/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase.from('medicamentos').select('*').eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/entregas', async (req, res) => {
    try {
        const { patient_id, user_id, resumen, pendientes, quien_recibe, firma_entrega, firma_recibe } = req.body;
        const { data, error } = await supabase
            .from('entregas')
            .insert([{ patient_id, user_id, resumen, pendientes, quien_recibe, firma_entrega, firma_recibe }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/entregas/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase.from('entregas').select('*').eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/recibos', async (req, res) => {
    try {
        const { patient_id, user_id, estado, quien_entrega, firma } = req.body;
        const { data, error } = await supabase
            .from('recibos')
            .insert([{ patient_id, user_id, estado, quien_entrega, firma }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/recibos/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase.from('recibos').select('*').eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/recursos', async (req, res) => {
    try {
        const { user_id, tipo, beneficiario, descripcion, fecha } = req.body;
        const { data, error } = await supabase
            .from('recursos')
            .insert([{ user_id, tipo, beneficiario, descripcion, fecha }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/recursos/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase.from('recursos').select('*').eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/beneficiarios', async (req, res) => {
    try {
        const { user_id, nombre, documento, direccion, ayuda } = req.body;
        const { data, error } = await supabase
            .from('beneficiarios')
            .insert([{ user_id, nombre, documento, direccion, ayuda }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/beneficiarios/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase.from('beneficiarios').select('*').eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/evaluaciones', async (req, res) => {
    try {
        const { user_id, patient_id, tipo, texto } = req.body;
        const { data, error } = await supabase
            .from('evaluaciones')
            .insert([{ user_id, patient_id, tipo, texto }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/evaluaciones/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase.from('evaluaciones').select('*').eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/dashboard', async (req, res) => {
    try {
        const { data: patients } = await supabase.from('patients').select('*');
        const { data: activities } = await supabase.from('actividades').select('*');
        const { data: vitalSigns } = await supabase.from('signos').select('*');
        res.json({
            success: true,
            data: {
                total_patients: patients?.length || 0,
                total_activities: activities?.length || 0,
                total_vital_signs: vitalSigns?.length || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🏥 VITAL HOGAR PRO IPS - Backend corriendo en puerto ${PORT}`);
});