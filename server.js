const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ==================== IMPORTAR RUTAS ====================
const auth = require('./routes/auth');
const users = require('./routes/users');
const patients = require('./routes/patients');
const education = require('./routes/education');
const educationAssignments = require('./routes/educationAssignments');
const shifts = require('./routes/shifts');
const reports = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== SUPABASE ====================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ==================== MIDDLEWARES ====================
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentado para fotos en base64
app.use(express.static('public'));

// ==================== CREAR ADMIN POR DEFECTO ====================
auth.createDefaultAdmin();

// ==================== HEALTH CHECK ====================
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: '🏥 VITAL HOGAR PRO IPS - Backend v2.2' });
});

// ============================================================
//  RUTAS: AUTENTICACIÓN (PÚBLICAS)
// ============================================================
app.post('/api/auth/login', auth.login);
app.post('/api/auth/verify', auth.verifyToken);

// ============================================================
//  RUTAS: USUARIOS (PROTEGIDAS)
// ============================================================
app.get('/api/users', auth.protect, users.getUsers);
app.get('/api/users/:id', auth.protect, auth.authorize('ADMIN'), users.getUserById);
app.post('/api/users', auth.protect, auth.authorize('ADMIN'), users.createUser);
app.put('/api/users/:id', auth.protect, auth.authorize('ADMIN'), users.updateUser);
app.delete('/api/users/:id', auth.protect, auth.authorize('ADMIN'), users.deleteUser);

// ============================================================
//  RUTAS: PACIENTES (PROTEGIDAS)
// ============================================================
app.get('/api/patients', auth.protect, patients.getPatients);
app.get('/api/patients/:id', auth.protect, patients.getPatientById);
app.post('/api/patients', auth.protect, patients.createPatient);
app.put('/api/patients/:id', auth.protect, patients.updatePatient);
app.delete('/api/patients/:id', auth.protect, auth.authorize('ADMIN'), patients.deletePatient);
app.put('/api/patients/:id/reactivate', auth.protect, auth.authorize('ADMIN'), patients.reactivatePatient);

// ============================================================
//  RUTAS: ACTIVIDADES (PROTEGIDAS) - CORREGIDO
// ============================================================
app.post('/api/actividades', auth.protect, auth.authorize('AUXILIAR', 'ENFERMERO'), async (req, res) => {
    try {
        const { patient_id, user_id, actividad, hora, observacion, educacion, novedad, fotos } = req.body;
        const { data, error } = await supabase
            .from('actividades')
            .insert([{ patient_id, user_id, actividad, hora, observacion, educacion, novedad, fotos: fotos || [] }])
            .select();
        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('❌ Error en actividades:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ NUEVO: GET actividades por paciente (para PDF y historial)
app.get('/api/actividades/patient/:patientId', auth.protect, async (req, res) => {
    try {
        const { patientId } = req.params;
        const { date } = req.query;
        let query = supabase
            .from('actividades')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });
        
        if (date) {
            const startOfDay = `${date}T00:00:00`;
            const endOfDay = `${date}T23:59:59`;
            query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/actividades/user/:userId', auth.protect, async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase
            .from('actividades')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
//  RUTAS: SIGNOS VITALES (PROTEGIDOS) - CORREGIDO
// ============================================================
app.post('/api/signos', auth.protect, auth.authorize('AUXILIAR', 'ENFERMERO'), async (req, res) => {
    try {
        const { patient_id, user_id, spo2, fc, fr, temp, bp, glucosa, braden, hora, obs } = req.body;
        const { data, error } = await supabase
            .from('signos')
            .insert([{ patient_id, user_id, spo2, fc, fr, temp, bp, glucosa, braden, hora, obs }])
            .select();
        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('❌ Error en signos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ NUEVO: GET signos por paciente
app.get('/api/signos/patient/:patientId', auth.protect, async (req, res) => {
    try {
        const { patientId } = req.params;
        const { date } = req.query;
        let query = supabase
            .from('signos')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });
        
        if (date) {
            const startOfDay = `${date}T00:00:00`;
            const endOfDay = `${date}T23:59:59`;
            query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/signos/user/:userId', auth.protect, async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase
            .from('signos')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
//  RUTAS: MEDICAMENTOS (PROTEGIDOS) - CORREGIDO
// ============================================================
app.post('/api/medicamentos', auth.protect, auth.authorize('AUXILIAR', 'ENFERMERO'), async (req, res) => {
    try {
        const { patient_id, user_id, nombre, dosis, hora, obs } = req.body;
        const { data, error } = await supabase
            .from('medicamentos')
            .insert([{ patient_id, user_id, nombre, dosis, hora, obs }])
            .select();
        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('❌ Error en medicamentos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ NUEVO: GET medicamentos por paciente
app.get('/api/medicamentos/patient/:patientId', auth.protect, async (req, res) => {
    try {
        const { patientId } = req.params;
        const { date } = req.query;
        let query = supabase
            .from('medicamentos')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });
        
        if (date) {
            const startOfDay = `${date}T00:00:00`;
            const endOfDay = `${date}T23:59:59`;
            query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/medicamentos/user/:userId', auth.protect, async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase
            .from('medicamentos')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
//  RUTAS: RECIBOS (PROTEGIDOS) - CORREGIDO
// ============================================================
app.post('/api/recibos', auth.protect, auth.authorize('AUXILIAR', 'ENFERMERO'), async (req, res) => {
    try {
        const { patient_id, user_id, estado, quienEntrega, hora } = req.body;
        const { data, error } = await supabase
            .from('recibos')
            .insert([{ 
                patient_id, 
                user_id, 
                estado, 
                quien_entrega: quienEntrega,
                hora: hora || new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
            }])
            .select();
        if (error) throw error;
        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('❌ Error en recibos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ NUEVO: GET recibos por paciente
app.get('/api/recibos/patient/:patientId', auth.protect, async (req, res) => {
    try {
        const { patientId } = req.params;
        const { date } = req.query;
        let query = supabase
            .from('recibos')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });
        
        if (date) {
            const startOfDay = `${date}T00:00:00`;
            const endOfDay = `${date}T23:59:59`;
            query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
//  RUTAS: ENTREGAS (PROTEGIDAS) - CORREGIDO (NOMBRES DE COLUMNAS)
// ============================================================
app.post('/api/entregas', auth.protect, auth.authorize('AUXILIAR', 'ENFERMERO'), async (req, res) => {
    try {
        const { patient_id, user_id, resumen, pendientes, quienRecibe, horaEntrega, sbar, firmaEntrega, firmaRecibe } = req.body;
        
        // ✅ CORREGIDO: nombres de columnas SIN guión bajo
        const { data, error } = await supabase
            .from('entregas')
            .insert([{ 
                patient_id, 
                user_id, 
                resumen, 
                pendientes, 
                quienrecibe: quienRecibe,      // ← SIN guión bajo
                horaentrega: horaEntrega,       // ← SIN guión bajo
                sbar,
                firma_entrega: firmaEntrega,
                firma_recibe: firmaRecibe
            }])
            .select();

        if (error) {
            console.error('❌ Error Supabase:', error);
            throw error;
        }

        res.json({ success: true, data: data[0] });
    } catch (error) {
        console.error('❌ Error en entregas POST:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ NUEVO: GET entregas por paciente
app.get('/api/entregas/patient/:patientId', auth.protect, async (req, res) => {
    try {
        const { patientId } = req.params;
        const { date } = req.query;
        let query = supabase
            .from('entregas')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });
        
        if (date) {
            const startOfDay = `${date}T00:00:00`;
            const endOfDay = `${date}T23:59:59`;
            query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/entregas/user/:userId', auth.protect, async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase
            .from('entregas')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
//  RUTAS: TEMAS DE EDUCACIÓN (PROTEGIDAS) - CORREGIDO
// ============================================================
app.get('/api/education', auth.protect, education.getTopics);
app.get('/api/education/:id', auth.protect, education.getTopicById);

// ✅ CORREGIDO: pasar UUID del usuario, no el nombre
app.post('/api/education', auth.protect, auth.authorize('ADMIN', 'COORDINADOR'), async (req, res) => {
    try {
        const { title, description } = req.body;
        const created_by = req.user?.id || null; // ← UUID del usuario
        
        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Título y descripción son obligatorios'
            });
        }
        
        const { data, error } = await supabase
            .from('education_topics')
            .insert([{
                title: title.trim(),
                description: description.trim(),
                created_by: created_by
            }])
            .select();
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: '✅ Tema creado',
            data: data[0]
        });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/education/:id', auth.protect, auth.authorize('ADMIN', 'COORDINADOR'), education.updateTopic);
app.delete('/api/education/:id', auth.protect, auth.authorize('ADMIN', 'COORDINADOR'), education.deleteTopic);

// ============================================================
//  RUTAS: ASIGNACIONES DE EDUCACIÓN (CORREGIDO)
// ============================================================
app.get('/api/education-assignments', auth.protect, educationAssignments.getAssignments);
app.get('/api/education-assignments/professional/:professionalId', auth.protect, educationAssignments.getAssignmentsByProfessional);
app.post('/api/education-assignments', auth.protect, auth.authorize('ADMIN', 'COORDINADOR'), educationAssignments.createAssignment);
app.put('/api/education-assignments/:id/complete', auth.protect, educationAssignments.completeAssignment);
app.delete('/api/education-assignments/:id', auth.protect, auth.authorize('ADMIN', 'COORDINADOR'), educationAssignments.deleteAssignment);

// ============================================================
//  RUTAS: REPORTES (PROTEGIDAS)
// ============================================================
app.get('/api/reports/global', auth.protect, auth.authorize('ADMIN', 'COORDINADOR'), reports.getGlobalReports);
app.get('/api/reports/coverage', auth.protect, auth.authorize('ADMIN', 'COORDINADOR'), reports.getCoverageReport);
app.get('/api/reports/professional/:professionalId', auth.protect, reports.getProfessionalReport);
app.get('/api/reports/patient/:patientId', auth.protect, reports.getPatientReport);
app.get('/api/reports/activities', auth.protect, reports.getActivityReport);

// ============================================================
//  RUTAS: TURNOS (PROTEGIDAS)
// ============================================================
app.get('/api/shifts', auth.protect, shifts.getShifts);
app.get('/api/shifts/:id', auth.protect, shifts.getShiftById);
app.post('/api/shifts', auth.protect, auth.authorize('COORDINADOR'), shifts.createShift);
app.put('/api/shifts/:id', auth.protect, auth.authorize('COORDINADOR'), shifts.updateShift);
app.delete('/api/shifts/:id', auth.protect, auth.authorize('COORDINADOR'), shifts.deleteShift);
app.get('/api/shifts/professional/:professionalId', auth.protect, shifts.getShiftsByProfessional);
app.get('/api/shifts/patient/:patientId', auth.protect, shifts.getShiftsByPatient);

// ============================================================
//  INICIAR SERVIDOR
// ============================================================
app.listen(PORT, () => {
    console.log(`🏥 VITAL HOGAR PRO IPS v2.2 - Puerto ${PORT}`);
});

module.exports = app;
