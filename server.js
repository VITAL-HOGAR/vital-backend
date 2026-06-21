const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ==================== IMPORTAR RUTAS ====================
const auth = require('./routes/auth');
const users = require('./routes/users');
const patients = require('./routes/patients');
const education = require('./routes/education');
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
app.use(express.json({ limit: '10mb' }));  // ← CRÍTICO PARA EL LOGIN
app.use(express.static('public'));

// ==================== CREAR ADMIN POR DEFECTO ====================
auth.createDefaultAdmin();

// ==================== HEALTH CHECK ====================
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: '🏥 VITAL HOGAR PRO IPS - Backend' });
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
//  RUTAS: ACTIVIDADES (PROTEGIDAS)
// ============================================================

app.post('/api/actividades', auth.protect, auth.authorize('AUXILIAR', 'ENFERMERO'), async (req, res) => {
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

app.get('/api/actividades/:userId', auth.protect, async (req, res) => {
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
//  RUTAS: SIGNOS VITALES (PROTEGIDAS)
// ============================================================

app.post('/api/signos', auth.protect, auth.authorize('AUXILIAR', 'ENFERMERO'), async (req, res) => {
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

app.get('/api/signos/:userId', auth.protect, async (req, res) => {
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
//  RUTAS: MEDICAMENTOS (PROTEGIDAS)
// ============================================================

app.post('/api/medicamentos', auth.protect, auth.authorize('AUXILIAR', 'ENFERMERO'), async (req, res) => {
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

app.get('/api/medicamentos/:userId', auth.protect, async (req, res) => {
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
//  RUTAS: ENTREGAS (PROTEGIDAS)
// ============================================================

app.post('/api/entregas', auth.protect, auth.authorize('AUXILIAR', 'ENFERMERO'), async (req, res) => {
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

app.get('/api/entregas/:userId', auth.protect, async (req, res) => {
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
//  RUTAS: RECIBOS (PROTEGIDAS)
// ============================================================

app.post('/api/recibos', auth.protect, auth.authorize('AUXILIAR', 'ENFERMERO'), async (req, res) => {
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

app.get('/api/recibos/:userId', auth.protect, async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase
            .from('recibos')
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
//  RUTAS: TEMAS DE EDUCACIÓN (PROTEGIDAS)
// ============================================================

app.get('/api/education', auth.protect, education.getTopics);
app.get('/api/education/:id', auth.protect, education.getTopicById);
app.post('/api/education', auth.protect, auth.authorize('ADMIN'), education.createTopic);
app.put('/api/education/:id', auth.protect, auth.authorize('ADMIN'), education.updateTopic);
app.delete('/api/education/:id', auth.protect, auth.authorize('ADMIN'), education.deleteTopic);

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
    console.log(`🏥 VITAL HOGAR PRO IPS - Backend corriendo en puerto ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/`);
    console.log(`🔐 Login: POST http://localhost:${PORT}/api/auth/login`);
    console.log(`👥 Usuarios: GET http://localhost:${PORT}/api/users`);
});

module.exports = app;
