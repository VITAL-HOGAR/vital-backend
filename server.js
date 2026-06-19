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
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const userRoutes = require('./routes/users');
const shiftRoutes = require('./routes/shifts');
const educationRoutes = require('./routes/education');
const reportRoutes = require('./routes/reports');

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'VITAL HOGAR PRO IPS - Backend' });
});

// Auth
app.post('/api/auth/login', authRoutes.login);
app.post('/api/auth/verify', authRoutes.verifyToken);

// Patients
app.get('/api/patients', patientRoutes.getPatients);
app.post('/api/patients', patientRoutes.createPatient);
app.get('/api/patients/:id', patientRoutes.getPatientById);
app.put('/api/patients/:id', patientRoutes.updatePatient);
app.delete('/api/patients/:id', patientRoutes.deletePatient);

// Users (Admin)
app.get('/api/users', userRoutes.getUsers);
app.post('/api/users', userRoutes.createUser);
app.delete('/api/users/:id', userRoutes.deleteUser);

// Shifts (Coordinador)
app.get('/api/shifts', shiftRoutes.getShifts);
app.post('/api/shifts', shiftRoutes.createShift);
app.put('/api/shifts/:id', shiftRoutes.updateShift);

// Education (Admin, Coordinador, Enfermero)
app.get('/api/education', educationRoutes.getTopics);
app.post('/api/education', educationRoutes.createTopic);
app.put('/api/education/:id', educationRoutes.updateTopic);
app.delete('/api/education/:id', educationRoutes.deleteTopic);

// Reports
app.get('/api/reports/global', reportRoutes.getGlobalReports);
app.get('/api/reports/coverage', reportRoutes.getCoverageReport);

// ==================== INICIAR SERVIDOR ====================
app.listen(PORT, () => {
    console.log(`🏥 VITAL HOGAR PRO IPS - Backend corriendo en puerto ${PORT}`);
});
