const { createClient } = require('@supabase/supabase-js');

// ==================== SUPABASE ====================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY  // ← CORRECTO
);

// ============================================================
//  GET PATIENTS - Listar todos los pacientes
// ============================================================
async function getPatients(req, res) {
    try {
        // ✅ Mostrar TODOS los pacientes (sin filtro de status)
        const { data, error } = await supabase
            .from('patients')
            .select('*');

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ Error en getPatients:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  CREATE PATIENT - Crear paciente
// ============================================================
async function createPatient(req, res) {
    try {
        const { name, document, diagnosis, doctor } = req.body;

        // ✅ Validar campos obligatorios
        if (!name || !document) {
            return res.status(400).json({
                success: false,
                message: 'Nombre y documento son obligatorios'
            });
        }

        // ✅ Validar que el documento no exista
        const { data: existing, error: checkError } = await supabase
            .from('patients')
            .select('document')
            .eq('document', document)
            .single();

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'El documento ya está registrado'
            });
        }

        // ✅ Crear paciente con status ACTIVE por defecto
        const { data, error } = await supabase
            .from('patients')
            .insert([{
                name,
                document,
                diagnosis: diagnosis || '',
                doctor: doctor || '',
                status: 'ACTIVE'  // ← Estado por defecto
            }])
            .select();

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Paciente creado exitosamente',
            data: data[0]
        });

    } catch (error) {
        console.error('❌ Error en createPatient:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  GET PATIENT BY ID - Obtener paciente específico
// ============================================================
async function getPatientById(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de paciente requerido'
            });
        }

        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        res.json({ success: true, data });

    } catch (error) {
        console.error('❌ Error en getPatientById:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  UPDATE PATIENT - Actualizar paciente
// ============================================================
async function updatePatient(req, res) {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de paciente requerido'
            });
        }

        // ✅ Verificar que el paciente existe
        const { data: existing, error: checkError } = await supabase
            .from('patients')
            .select('id')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        // ✅ Si se actualiza documento, verificar que no exista
        if (updates.document) {
            const { data: existingDoc } = await supabase
                .from('patients')
                .select('document')
                .eq('document', updates.document)
                .neq('id', id)
                .single();

            if (existingDoc) {
                return res.status(400).json({
                    success: false,
                    message: 'El documento ya está registrado por otro paciente'
                });
            }
        }

        // ✅ Eliminar campos vacíos
        Object.keys(updates).forEach(key => {
            if (updates[key] === '' || updates[key] === null || updates[key] === undefined) {
                delete updates[key];
            }
        });

        const { data, error } = await supabase
            .from('patients')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Paciente actualizado exitosamente',
            data: data[0]
        });

    } catch (error) {
        console.error('❌ Error en updatePatient:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  DELETE PATIENT - Eliminar/Desactivar paciente
// ============================================================
async function deletePatient(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de paciente requerido'
            });
        }

        // ✅ Verificar que el paciente existe
        const { data: existing, error: checkError } = await supabase
            .from('patients')
            .select('id')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        // ✅ Soft delete (desactivar) en lugar de eliminar
        const { error } = await supabase
            .from('patients')
            .update({ 
                status: 'INACTIVE',
                deleted_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Paciente desactivado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error en deletePatient:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  REACTIVATE PATIENT - Reactivar paciente
// ============================================================
async function reactivatePatient(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de paciente requerido'
            });
        }

        // ✅ Verificar que el paciente existe
        const { data: existing, error: checkError } = await supabase
            .from('patients')
            .select('id')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Paciente no encontrado'
            });
        }

        const { error } = await supabase
            .from('patients')
            .update({ 
                status: 'ACTIVE',
                deleted_at: null
            })
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Paciente reactivado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error en reactivatePatient:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  EXPORTAR
// ============================================================
module.exports = {
    getPatients,
    getPatientById,
    createPatient,
    updatePatient,
    deletePatient,
    reactivatePatient
};
