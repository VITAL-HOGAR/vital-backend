const { createClient } = require('@supabase/supabase-js');

// ==================== SUPABASE ====================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY  // ← CORRECTO
);

// ============================================================
//  GET GLOBAL REPORTS - Reporte global del sistema
// ============================================================
async function getGlobalReports(req, res) {
    try {
        // ✅ Obtener todas las métricas en paralelo
        const [
            { data: patients, error: patientsError },
            { data: users, error: usersError },
            { data: shifts, error: shiftsError },
            { data: activities, error: activitiesError },
            { data: signos, error: signosError },
            { data: medicamentos, error: medicamentosError },
            { data: entregas, error: entregasError }
        ] = await Promise.all([
            supabase.from('patients').select('*').is('status', null).or('status.eq.ACTIVE'),
            supabase.from('users').select('*'),
            supabase.from('shifts').select('*'),
            supabase.from('actividades').select('*'),
            supabase.from('signos').select('*'),
            supabase.from('medicamentos').select('*'),
            supabase.from('entregas').select('*')
        ]);

        // ✅ Calcular estadísticas adicionales
        const totalPatients = patients?.length || 0;
        const totalUsers = users?.length || 0;
        const totalShifts = shifts?.length || 0;
        const totalActivities = activities?.length || 0;
        const totalSignos = signos?.length || 0;
        const totalMedicamentos = medicamentos?.length || 0;
        const totalEntregas = entregas?.length || 0;

        // ✅ Turnos por tipo
        const shiftsByType = {};
        shifts?.forEach(s => {
            shiftsByType[s.type] = (shiftsByType[s.type] || 0) + 1;
        });

        // ✅ Usuarios por rol
        const usersByRole = {};
        users?.forEach(u => {
            usersByRole[u.role] = (usersByRole[u.role] || 0) + 1;
        });

        // ✅ Actividades recientes (últimos 7 días)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentActivities = activities?.filter(a => 
            new Date(a.created_at) > sevenDaysAgo
        )?.length || 0;

        res.json({
            success: true,
            data: {
                // Métricas generales
                total_patients: totalPatients,
                total_users: totalUsers,
                total_shifts: totalShifts,
                total_activities: totalActivities,
                total_signos: totalSignos,
                total_medicamentos: totalMedicamentos,
                total_entregas: totalEntregas,
                recent_activities: recentActivities,
                
                // Desgloses
                shifts_by_type: shiftsByType,
                users_by_role: usersByRole,
                
                // Fechas
                generated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error en getGlobalReports:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  GET COVERAGE REPORT - Reporte de cobertura 24h
// ============================================================
async function getCoverageReport(req, res) {
    try {
        const { data: shifts, error } = await supabase
            .from('shifts')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;

        const total = shifts?.length || 0;
        const with24h = shifts?.filter(s => s.type === '24h').length || 0;
        const with12h = shifts?.filter(s => s.type === '12h').length || 0;
        const with8h = shifts?.filter(s => s.type === '8h').length || 0;
        const with6h = shifts?.filter(s => s.type === '6h').length || 0;

        // ✅ Turnos por estado
        const pending = shifts?.filter(s => s.status === 'PENDING').length || 0;
        const completed = shifts?.filter(s => s.status === 'COMPLETED').length || 0;
        const cancelled = shifts?.filter(s => s.status === 'CANCELLED').length || 0;

        // ✅ Turnos activos (próximos 7 días)
        const now = new Date();
        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
        const upcoming = shifts?.filter(s => {
            const shiftDate = new Date(s.date);
            return shiftDate >= now && shiftDate <= sevenDaysLater;
        })?.length || 0;

        res.json({
            success: true,
            data: {
                // Resumen
                total_shifts: total,
                coverage_24h: with24h,
                coverage_12h: with12h,
                coverage_8h: with8h,
                coverage_6h: with6h,
                
                // Porcentajes
                coverage_percentage: total > 0 ? Math.round((with24h / total) * 100) : 0,
                
                // Estados
                pending,
                completed,
                cancelled,
                upcoming,
                
                // Fecha del reporte
                generated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error en getCoverageReport:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  GET PROFESSIONAL REPORT - Reporte por profesional
// ============================================================
async function getProfessionalReport(req, res) {
    try {
        const { professionalId } = req.params;

        if (!professionalId) {
            return res.status(400).json({
                success: false,
                message: 'ID de profesional requerido'
            });
        }

        // ✅ Obtener datos del profesional
        const { data: professional, error: profError } = await supabase
            .from('users')
            .select('id, name, email, role')
            .eq('id', professionalId)
            .single();

        if (!professional) {
            return res.status(404).json({
                success: false,
                message: 'Profesional no encontrado'
            });
        }

        // ✅ Obtener turnos del profesional
        const { data: shifts, error: shiftsError } = await supabase
            .from('shifts')
            .select('*')
            .eq('professional_id', professionalId);

        // ✅ Obtener actividades del profesional
        const { data: activities, error: actError } = await supabase
            .from('actividades')
            .select('*')
            .eq('user_id', professionalId);

        // ✅ Obtener signos del profesional
        const { data: signos, error: signosError } = await supabase
            .from('signos')
            .select('*')
            .eq('user_id', professionalId);

        res.json({
            success: true,
            data: {
                professional: {
                    id: professional.id,
                    name: professional.name,
                    email: professional.email,
                    role: professional.role
                },
                metrics: {
                    total_shifts: shifts?.length || 0,
                    total_activities: activities?.length || 0,
                    total_signos: signos?.length || 0,
                    shifts_by_type: shifts?.reduce((acc, s) => {
                        acc[s.type] = (acc[s.type] || 0) + 1;
                        return acc;
                    }, {})
                },
                generated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error en getProfessionalReport:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  GET PATIENT REPORT - Reporte por paciente
// ============================================================
async function getPatientReport(req, res) {
    try {
        const { patientId } = req.params;

        if (!patientId) {
            return res.status(400).json({
                success: false,
                message: 'ID de paciente requerido'
            });
        }

        // ✅ Obtener datos del paciente
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single();

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        // ✅ Obtener turnos del paciente
        const { data: shifts, error: shiftsError } = await supabase
            .from('shifts')
            .select('*')
            .eq('patient_id', patientId);

        // ✅ Obtener actividades del paciente
        const { data: activities, error: actError } = await supabase
            .from('actividades')
            .select('*')
            .eq('patient_id', patientId);

        // ✅ Obtener signos del paciente
        const { data: signos, error: signosError } = await supabase
            .from('signos')
            .select('*')
            .eq('patient_id', patientId);

        // ✅ Obtener medicamentos del paciente
        const { data: medicamentos, error: medError } = await supabase
            .from('medicamentos')
            .select('*')
            .eq('patient_id', patientId);

        res.json({
            success: true,
            data: {
                patient: {
                    id: patient.id,
                    name: patient.name,
                    document: patient.document,
                    diagnosis: patient.diagnosis,
                    doctor: patient.doctor
                },
                metrics: {
                    total_shifts: shifts?.length || 0,
                    total_activities: activities?.length || 0,
                    total_signos: signos?.length || 0,
                    total_medicamentos: medicamentos?.length || 0
                },
                generated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error en getPatientReport:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  GET ACTIVITY REPORT - Reporte de actividades por fecha
// ============================================================
async function getActivityReport(req, res) {
    try {
        const { startDate, endDate } = req.query;

        // ✅ Validar fechas
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Fechas startDate y endDate son requeridas'
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Fechas inválidas'
            });
        }

        // ✅ Obtener actividades en el rango
        const { data: activities, error } = await supabase
            .from('actividades')
            .select(`
                *,
                patients:patient_id (id, name),
                users:user_id (id, name, role)
            `)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;

        // ✅ Agrupar por tipo de actividad
        const byType = {};
        activities?.forEach(a => {
            byType[a.actividad] = (byType[a.actividad] || 0) + 1;
        });

        res.json({
            success: true,
            data: {
                total: activities?.length || 0,
                start_date: start.toISOString(),
                end_date: end.toISOString(),
                by_type: byType,
                activities: activities || []
            }
        });

    } catch (error) {
        console.error('❌ Error en getActivityReport:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  EXPORTAR
// ============================================================
module.exports = {
    getGlobalReports,
    getCoverageReport,
    getProfessionalReport,
    getPatientReport,
    getActivityReport
};
