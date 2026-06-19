const { createClient } = require('@supabase/supabase-js');

// ==================== SUPABASE ====================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY  // ← CAMBIADO: SERVICE_KEY
);

// ============================================================
//  GET SHIFTS - Listar todos los turnos
// ============================================================
async function getShifts(req, res) {
    try {
        // ✅ Incluir información del paciente y profesional
        const { data, error } = await supabase
            .from('shifts')
            .select(`
                *,
                patients:patient_id (id, name, document),
                users:professional_id (id, name, email, role)
            `)
            .order('date', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ Error en getShifts:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  GET SHIFT BY ID - Obtener turno específico
// ============================================================
async function getShiftById(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de turno requerido'
            });
        }

        const { data, error } = await supabase
            .from('shifts')
            .select(`
                *,
                patients:patient_id (id, name, document),
                users:professional_id (id, name, email, role)
            `)
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({
                success: false,
                message: 'Turno no encontrado'
            });
        }

        res.json({ success: true, data });

    } catch (error) {
        console.error('❌ Error en getShiftById:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  CREATE SHIFT - Crear turno
// ============================================================
async function createShift(req, res) {
    try {
        const { patient_id, professional_id, date, type, notes } = req.body;

        // ✅ Validar campos obligatorios
        if (!patient_id || !professional_id || !date || !type) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios: patient_id, professional_id, date, type'
            });
        }

        // ✅ Validar tipo de turno válido
        const validTypes = ['6h', '8h', '12h', '24h'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                message: `Tipo de turno inválido. Tipos válidos: ${validTypes.join(', ')}`
            });
        }

        // ✅ Validar que el paciente existe
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id')
            .eq('id', patient_id)
            .single();

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        // ✅ Validar que el profesional existe
        const { data: professional, error: profError } = await supabase
            .from('users')
            .select('id')
            .eq('id', professional_id)
            .single();

        if (!professional) {
            return res.status(404).json({
                success: false,
                message: 'Profesional no encontrado'
            });
        }

        // ✅ Validar fecha
        const shiftDate = new Date(date);
        if (isNaN(shiftDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Fecha inválida'
            });
        }

        // ✅ Crear turno
        const { data, error } = await supabase
            .from('shifts')
            .insert([{
                patient_id,
                professional_id,
                date: shiftDate.toISOString(),
                type,
                notes: notes || '',
                status: 'PENDING',  // ← Estado por defecto
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Turno creado exitosamente',
            data: data[0]
        });

    } catch (error) {
        console.error('❌ Error en createShift:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  UPDATE SHIFT - Actualizar turno
// ============================================================
async function updateShift(req, res) {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de turno requerido'
            });
        }

        // ✅ Verificar que el turno existe
        const { data: existing, error: checkError } = await supabase
            .from('shifts')
            .select('id')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Turno no encontrado'
            });
        }

        // ✅ Validar tipo de turno si se actualiza
        if (updates.type) {
            const validTypes = ['6h', '8h', '12h', '24h'];
            if (!validTypes.includes(updates.type)) {
                return res.status(400).json({
                    success: false,
                    message: `Tipo de turno inválido. Tipos válidos: ${validTypes.join(', ')}`
                });
            }
        }

        // ✅ Validar paciente si se actualiza
        if (updates.patient_id) {
            const { data: patient } = await supabase
                .from('patients')
                .select('id')
                .eq('id', updates.patient_id)
                .single();

            if (!patient) {
                return res.status(404).json({
                    success: false,
                    message: 'Paciente no encontrado'
                });
            }
        }

        // ✅ Validar profesional si se actualiza
        if (updates.professional_id) {
            const { data: professional } = await supabase
                .from('users')
                .select('id')
                .eq('id', updates.professional_id)
                .single();

            if (!professional) {
                return res.status(404).json({
                    success: false,
                    message: 'Profesional no encontrado'
                });
            }
        }

        // ✅ Validar fecha si se actualiza
        if (updates.date) {
            const shiftDate = new Date(updates.date);
            if (isNaN(shiftDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Fecha inválida'
                });
            }
            updates.date = shiftDate.toISOString();
        }

        // ✅ Validar status si se actualiza
        if (updates.status) {
            const validStatus = ['PENDING', 'COMPLETED', 'CANCELLED'];
            if (!validStatus.includes(updates.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Estado inválido. Estados válidos: ${validStatus.join(', ')}`
                });
            }
        }

        // ✅ Agregar fecha de actualización
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('shifts')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Turno actualizado exitosamente',
            data: data[0]
        });

    } catch (error) {
        console.error('❌ Error en updateShift:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  DELETE SHIFT - Eliminar turno
// ============================================================
async function deleteShift(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de turno requerido'
            });
        }

        // ✅ Verificar que el turno existe
        const { data: existing, error: checkError } = await supabase
            .from('shifts')
            .select('id')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Turno no encontrado'
            });
        }

        const { error } = await supabase
            .from('shifts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Turno eliminado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error en deleteShift:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  GET SHIFTS BY PROFESSIONAL - Obtener turnos por profesional
// ============================================================
async function getShiftsByProfessional(req, res) {
    try {
        const { professionalId } = req.params;

        if (!professionalId) {
            return res.status(400).json({
                success: false,
                message: 'ID de profesional requerido'
            });
        }

        const { data, error } = await supabase
            .from('shifts')
            .select(`
                *,
                patients:patient_id (id, name, document)
            `)
            .eq('professional_id', professionalId)
            .order('date', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });

    } catch (error) {
        console.error('❌ Error en getShiftsByProfessional:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  GET SHIFTS BY PATIENT - Obtener turnos por paciente
// ============================================================
async function getShiftsByPatient(req, res) {
    try {
        const { patientId } = req.params;

        if (!patientId) {
            return res.status(400).json({
                success: false,
                message: 'ID de paciente requerido'
            });
        }

        const { data, error } = await supabase
            .from('shifts')
            .select(`
                *,
                users:professional_id (id, name, email, role)
            `)
            .eq('patient_id', patientId)
            .order('date', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });

    } catch (error) {
        console.error('❌ Error en getShiftsByPatient:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  EXPORTAR
// ============================================================
module.exports = {
    getShifts,
    getShiftById,
    createShift,
    updateShift,
    deleteShift,
    getShiftsByProfessional,
    getShiftsByPatient
};
