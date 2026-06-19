const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== SUPABASE ====================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ==================== MIDDLEWARES ====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==================== RUTAS ====================

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'VITAL HOGAR PRO IPS - Backend' });
});

// ==================== USUARIOS ====================
app.get('/api/users', async (req, res) => {
    try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { name, email, role, password } = req.body;
        const { data, error } = await supabase
            .from('users')
            .insert([{ name, email, role, password }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Usuario eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== PACIENTES ====================
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
        const { name, document, diagnosis, doctor } = req.body;
        const { data, error } = await supabase
            .from('patients')
            .insert([{ name, document, diagnosis, doctor }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/patients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/patients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { data, error } = await supabase
            .from('patients')
            .update(updates)
            .eq('id', id)
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/patients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('patients')
            .update({ status: 'INACTIVE' })
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Paciente desactivado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== AUTENTICACIÓN ====================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email requerido' });
        }
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);
        if (error) throw error;
        if (!users || users.length === 0) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }
        const user = users[0];
        res.json({
            success: true,
            data: {
                user: { id: user.id, email: user.email, name: user.name, role: user.role },
                token: Buffer.from(`${user.id}:${Date.now()}`).toString('base64')
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== ACTIVIDADES ====================
app.post('/api/actividades', async (req, res) => {
    try {
        const { patient_id, user_id, actividad, hora, observacion, educacion, novedad, fotos } = req.body;
        const { data, error } = await supabase
            .from('actividades')
            .insert([{ patient_id, user_id, actividad, hora, observacion, educacion, novedad, fotos }])
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
        const { data, error } = await supabase
            .from('actividades')
            .select('*')
            .eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== SIGNOS VITALES ====================
app.post('/api/signos', async (req, res) => {
    try {
        const { patient_id, user_id, spo2, fc, fr, temp, bp, glucosa, braden, hora, obs } = req.body;
        const { data, error } = await supabase
            .from('signos')
            .insert([{ patient_id, user_id, spo2, fc, fr, temp, bp, glucosa, braden, hora, obs }])
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
        const { data, error } = await supabase
            .from('signos')
            .select('*')
            .eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== MEDICAMENTOS ====================
app.post('/api/medicamentos', async (req, res) => {
    try {
        const { patient_id, user_id, nombre, dosis, hora, obs } = req.body;
        const { data, error } = await supabase
            .from('medicamentos')
            .insert([{ patient_id, user_id, nombre, dosis, hora, obs }])
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
        const { data, error } = await supabase
            .from('medicamentos')
            .select('*')
            .eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== ENTREGAS ====================
app.post('/api/entregas', async (req, res) => {
    try {
        const { patient_id, user_id, resumen, pendientes, quienRecibe, horaEntrega, sbar } = req.body;
        const { data, error } = await supabase
            .from('entregas')
            .insert([{ patient_id, user_id, resumen, pendientes, quienRecibe, horaEntrega, sbar }])
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
        const { data, error } = await supabase
            .from('entregas')
            .select('*')
            .eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== RECIBOS ====================
app.post('/api/recibos', async (req, res) => {
    try {
        const { patient_id, user_id, estado, quienEntrega } = req.body;
        const { data, error } = await supabase
            .from('recibos')
            .insert([{ patient_id, user_id, estado, quienEntrega }])
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
        const { data, error } = await supabase
            .from('recibos')
            .select('*')
            .eq('user_id', userId);
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== TEMAS DE EDUCACIÓN ====================
app.get('/api/education', async (req, res) => {
    try {
        const { data, error } = await supabase.from('education_topics').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/education', async (req, res) => {
    try {
        const { title, description, created_by } = req.body;
        const { data, error } = await supabase
            .from('education_topics')
            .insert([{ title, description, created_by }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/education/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('education_topics')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Tema eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== REPORTES ====================
app.get('/api/reports/global', async (req, res) => {
    try {
        const { data: patients } = await supabase.from('patients').select('*');
        const { data: users } = await supabase.from('users').select('*');
        const { data: shifts } = await supabase.from('shifts').select('*');
        res.json({
            success: true,
            data: {
                total_patients: patients?.length || 0,
                total_users: users?.length || 0,
                total_shifts: shifts?.length || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/reports/coverage', async (req, res) => {
    try {
        const { data: shifts } = await supabase.from('shifts').select('*');
        const total = shifts?.length || 0;
        const with24h = shifts?.filter(s => s.type === '24h').length || 0;
        res.json({
            success: true,
            data: {
                total_shifts: total,
                coverage_24h: with24h,
                coverage_percentage: total > 0 ? Math.round((with24h / total) * 100) : 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== TURNOS ====================
app.get('/api/shifts', async (req, res) => {
    try {
        const { data, error } = await supabase.from('shifts').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/shifts', async (req, res) => {
    try {
        const { patient_id, professional_id, date, type } = req.body;
        const { data, error } = await supabase
            .from('shifts')
            .insert([{ patient_id, professional_id, date, type }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/shifts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { data, error } = await supabase
            .from('shifts')
            .update(updates)
            .eq('id', id)
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
    console.log(`🏥 VITAL HOGAR PRO IPS - Backend corriendo en puerto ${PORT}`);
});
