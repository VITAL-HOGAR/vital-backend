const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ==================== IMPORTAR RUTAS ====================
const auth = require('./routes/auth');
const users = require('./routes/users');
// const patients = require('./routes/patients');  // ← Cuando lo tengas
// const education = require('./routes/education'); // ← Cuando lo tengas
// const shifts = require('./routes/shifts');       // ← Cuando lo tengas
// const reports = require('./routes/reports');     // ← Cuando lo tengas

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== SUPABASE ====================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// ==================== MIDDLEWARES ====================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==================== CREAR ADMIN POR DEFECTO ====================
auth.createDefaultAdmin();

// ==================== HEALTH CHECK ====================
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: '🏥 VITAL HOGAR PRO IPS - Backend' });
});

// ============================================================
//  RUTAS: AUTENTICACIÓN (PÚBLICAS)
// ============================================================

// POST /api/auth/login - Iniciar sesión
app.post('/api/auth/login', auth.login);

// POST /api/auth/verify - Verificar token
app.post('/api/auth/verify', auth.verifyToken);

// ============================================================
//  RUTAS: USUARIOS (PROTEGIDAS)
// ============================================================

// GET /api/users - Listar usuarios (autenticación requerida)
app.get('/api/users', auth.protect, users.getUsers);

// GET /api/users/:id - Obtener usuario específico (SOLO ADMIN)
app.get('/api/users/:id', auth.protect, auth.authorize('ADMIN'), users.getUserById);

// POST /api/users - Crear usuario (SOLO ADMIN)
app.post('/api/users', auth.protect, auth.authorize('ADMIN'), users.createUser);

// PUT /api/users/:id - Actualizar usuario (SOLO ADMIN)
app.put('/api/users/:id', auth.protect, auth.authorize('ADMIN'), users.updateUser);

// DELETE /api/users/:id - Eliminar usuario (SOLO ADMIN)
app.delete('/api/users/:id', auth.protect, auth.authorize('ADMIN'), users.deleteUser);

// ============================================================
//  RUTAS: PACIENTES (PROTEGIDAS)
// ============================================================

// GET /api/patients - Listar pacientes (autenticación requerida)
app.get('/api/patients', auth.protect, async (req, res) => {
    try {
        const { data, error } = await supabase.from('patients').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/patients - Crear paciente (autenticación requerida)
app.post('/api/patients', auth.protect, async (req, res) => {
    try {
        const { name, document, diagnosis, doctor } = req.body;
        
        if (!name || !document) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nombre y documento son obligatorios' 
            });
        }

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

// GET /api/patients/:id - Obtener paciente (autenticación requerida)
app.get('/api/patients/:id', auth.protect, async (req, res) => {
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

// PUT /api/patients/:id - Actualizar paciente (autenticación requerida)
app.put('/api/patients/:id', auth.protect, async (req, res) => {
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

// DELETE /api/patients/:id - Eliminar paciente (SOLO ADMIN)
app.delete('/api/patients/:id', auth.protect, auth.authorize('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: '✅ Paciente eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
//  RUTAS: ACTIVIDADES (PROTEGIDAS)
// ============================================================

// POST /api/actividades - Crear actividad (AUXILIAR o ENFERMERO)
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

// GET /api/actividades/:userId - Obtener actividades (autenticación requerida)
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

// POST /api/signos - Guardar signos (AUXILIAR o ENFERMERO)
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

// GET /api/signos/:userId - Obtener signos (autenticación requerida)
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

// POST /api/medicamentos - Guardar medicamento (AUXILIAR o ENFERMERO)
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

// GET /api/medicamentos/:userId - Obtener medicamentos (autenticación requerida)
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

// POST /api/entregas - Guardar entrega (AUXILIAR o ENFERMERO)
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

// GET /api/entregas/:userId - Obtener entregas (autenticación requerida)
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

// POST /api/recibos - Guardar recibo (AUXILIAR o ENFERMERO)
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

// GET /api/recibos/:userId - Obtener recibos (autenticación requerida)
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

// GET /api/education - Listar temas (autenticación requerida)
app.get('/api/education', auth.protect, async (req, res) => {
    try {
        const { data, error } = await supabase.from('education_topics').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/education - Crear tema (SOLO ADMIN)
app.post('/api/education', auth.protect, auth.authorize('ADMIN'), async (req, res) => {
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

// DELETE /api/education/:id - Eliminar tema (SOLO ADMIN)
app.delete('/api/education/:id', auth.protect, auth.authorize('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('education_topics')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: '✅ Tema eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
//  RUTAS: REPORTES (PROTEGIDAS)
// ============================================================

// GET /api/reports/global - Reporte global (SOLO ADMIN y COORDINADOR)
app.get('/api/reports/global', auth.protect, auth.authorize('ADMIN', 'COORDINADOR'), async (req, res) => {
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

// GET /api/reports/coverage - Reporte de cobertura (SOLO ADMIN y COORDINADOR)
app.get('/api/reports/coverage', auth.protect, auth.authorize('ADMIN', 'COORDINADOR'), async (req, res) => {
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

// ============================================================
//  RUTAS: TURNOS (PROTEGIDAS)
// ============================================================

// GET /api/shifts - Listar turnos (autenticación requerida)
app.get('/api/shifts', auth.protect, async (req, res) => {
    try {
        const { data, error } = await supabase.from('shifts').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/shifts - Crear turno (SOLO COORDINADOR)
app.post('/api/shifts', auth.protect, auth.authorize('COORDINADOR'), async (req, res) => {
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

// PUT /api/shifts/:id - Actualizar turno (SOLO COORDINADOR)
app.put('/api/shifts/:id', auth.protect, auth.authorize('COORDINADOR'), async (req, res) => {
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
// Importar patients
const patients = require('./routes/patients');

// ============================================================
//  RUTAS: PACIENTES (PROTEGIDAS)
// ============================================================

// GET /api/patients - Listar pacientes (autenticación requerida)
app.get('/api/patients', auth.protect, patients.getPatients);

// GET /api/patients/:id - Obtener paciente específico (autenticación requerida)
app.get('/api/patients/:id', auth.protect, patients.getPatientById);

// POST /api/patients - Crear paciente (autenticación requerida)
app.post('/api/patients', auth.protect, patients.createPatient);

// PUT /api/patients/:id - Actualizar paciente (autenticación requerida)
app.put('/api/patients/:id', auth.protect, patients.updatePatient);

// DELETE /api/patients/:id - Desactivar paciente (SOLO ADMIN)
app.delete('/api/patients/:id', auth.protect, auth.authorize('ADMIN'), patients.deletePatient);

// PUT /api/patients/:id/reactivate - Reactivar paciente (SOLO ADMIN)
app.put('/api/patients/:id/reactivate', auth.protect, auth.authorize('ADMIN'), patients.reactivatePatient);
// Importar education
const education = require('./routes/education');

// ============================================================
//  RUTAS: TEMAS DE EDUCACIÓN (PROTEGIDAS)
// ============================================================

// GET /api/education - Listar temas (autenticación requerida)
app.get('/api/education', auth.protect, education.getTopics);

// GET /api/education/:id - Obtener tema específico (autenticación requerida)
app.get('/api/education/:id', auth.protect, education.getTopicById);

// POST /api/education - Crear tema (SOLO ADMIN)
app.post('/api/education', auth.protect, auth.authorize('ADMIN'), education.createTopic);

// PUT /api/education/:id - Actualizar tema (SOLO ADMIN)
app.put('/api/education/:id', auth.protect, auth.authorize('ADMIN'), education.updateTopic);

// DELETE /api/education/:id - Eliminar tema (SOLO ADMIN)
app.delete('/api/education/:id', auth.protect, auth.authorize('ADMIN'), education.deleteTopic);
// Importar shifts
const shifts = require('./routes/shifts');

// ============================================================
//  RUTAS: TURNOS (PROTEGIDAS)
// ============================================================

// GET /api/shifts - Listar turnos (autenticación requerida)
app.get('/api/shifts', auth.protect, shifts.getShifts);

// GET /api/shifts/:id - Obtener turno específico (autenticación requerida)
app.get('/api/shifts/:id', auth.protect, shifts.getShiftById);

// POST /api/shifts - Crear turno (SOLO COORDINADOR)
app.post('/api/shifts', auth.protect, auth.authorize('COORDINADOR'), shifts.createShift);

// PUT /api/shifts/:id - Actualizar turno (SOLO COORDINADOR)
app.put('/api/shifts/:id', auth.protect, auth.authorize('COORDINADOR'), shifts.updateShift);

// DELETE /api/shifts/:id - Eliminar turno (SOLO COORDINADOR)
app.delete('/api/shifts/:id', auth.protect, auth.authorize('COORDINADOR'), shifts.deleteShift);

// GET /api/shifts/professional/:professionalId - Turnos por profesional (autenticación requerida)
app.get('/api/shifts/professional/:professionalId', auth.protect, shifts.getShiftsByProfessional);

// GET /api/shifts/patient/:patientId - Turnos por paciente (autenticación requerida)
app.get('/api/shifts/patient/:patientId', auth.protect, shifts.getShiftsByPatient);
// Importar reports
const reports = require('./routes/reports');

// ============================================================
//  RUTAS: REPORTES (PROTEGIDAS)
// ============================================================

// GET /api/reports/global - Reporte global (SOLO ADMIN y COORDINADOR)
app.get('/api/reports/global', auth.protect, auth.authorize('ADMIN', 'COORDINADOR'), reports.getGlobalReports);

// GET /api/reports/coverage - Reporte de cobertura (SOLO ADMIN y COORDINADOR)
app.get('/api/reports/coverage', auth.protect, auth.authorize('ADMIN', 'COORDINADOR'), reports.getCoverageReport);

// GET /api/reports/professional/:professionalId - Reporte por profesional (autenticación requerida)
app.get('/api/reports/professional/:professionalId', auth.protect, reports.getProfessionalReport);

// GET /api/reports/patient/:patientId - Reporte por paciente (autenticación requerida)
app.get('/api/reports/patient/:patientId', auth.protect, reports.getPatientReport);

// GET /api/reports/activities - Reporte de actividades por fecha (autenticación requerida)
app.get('/api/reports/activities', auth.protect, reports.getActivityReport);
