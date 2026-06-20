const { createClient } = require('@supabase/supabase-js');

// ==================== SUPABASE ====================
// ✅ USAR ANON_KEY (la misma que en server.js)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY  // ← CAMBIADO: ANON_KEY
);

// ============================================================
//  GET SHIFTS - Listar todos los turnos
// ============================================================
async function getShifts(req, res) {
    try {
        const { data, error } = await supabase
            .from('shifts')
            .select(`
                *,
                patients:patient_id (id, name, document),
                users:professional_id (id, name, email, role)
            `)
            .order('shift_date', { ascending: false });  // ← CAMBIADO: shift_date

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
        const { patient_id, professional_id, shift_date, shift_type, notes } = req.body;  // ← CAMBIADO

        // ✅ Validar campos obligatorios
        if (!patient_id || !professional_id || !shift_date || !shift_type) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios: patient_id, professional_id, shift_date, shift_type'
            });
        }

        // ✅ Validar tipo de turno válido
        const validTypes = ['6h', '8h', '12h', '24h'];
        if (!validTypes.includes(shift_type)) {
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

        if (patientError || !patient) {
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

        if (profError || !professional) {
            return res.status(404).json({
                success: false,
                message: 'Profesional no encontrado'
            });
        }

        // ✅ Validar fecha
        const shiftDate = new Date(shift_date);
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
                shift_date: shiftDate.toISOString().split('T')[0],  // ← CAMBIADO: shift_date
                shift_type,  // ← CAMBIADO: shift_type
                notes: notes || '',
                estado: 'PENDIENTE',  // ← CAMBIADO: estado (coincide con la BD)
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

        if (checkError || !existing) {
            return res.status(404).json({
                success: false,
                message: 'Turno no encontrado'
            });
        }

        // ✅ Mapear campos para la BD
        const dbUpdates = {};
        
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
            dbUpdates.patient_id = updates.patient_id;
        }

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
            dbUpdates.professional_id = updates.professional_id;
        }

        if (updates.shift_date) {  // ← CAMBIADO
            const shiftDate = new Date(updates.shift_date);
            if (isNaN(shiftDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Fecha inválida'
                });
            }
            dbUpdates.shift_date = shiftDate.toISOString().split('T')[0];  // ← CAMBIADO
        }

        if (updates.shift_type) {  // ← CAMBIADO
            const validTypes = ['6h', '8h', '12h', '24h'];
            if (!validTypes.includes(updates.shift_type)) {
                return res.status(400).json({
                    success: false,
                    message: `Tipo de turno inválido. Tipos válidos: ${validTypes.join(', ')}`
                });
            }
            dbUpdates.shift_type = updates.shift_type;  // ← CAMBIADO
        }

        if (updates.estado) {  // ← CAMBIADO
            const validStatus = ['PENDIENTE', 'COMPLETADO', 'CANCELADO'];  // ← CAMBIADO
            if (!validStatus.includes(updates.estado)) {
                return res.status(400).json({
                    success: false,
                    message: `Estado inválido. Estados válidos: ${validStatus.join(', ')}`
                });
            }
            dbUpdates.estado = updates.estado;  // ← CAMBIADO
        }

        if (updates.notes !== undefined) {
            dbUpdates.notes = updates.notes;
        }

        // ✅ Agregar fecha de actualización
        dbUpdates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('shifts')
            .update(dbUpdates)
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

        const { data: existing, error: checkError } = await supabase
            .from('shifts')
            .select('id')
            .eq('id', id)
            .single();

        if (checkError || !existing) {
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
            .order('shift_date', { ascending: false });  // ← CAMBIADO

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
            .order('shift_date', { ascending: false });  // ← CAMBIADO

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
