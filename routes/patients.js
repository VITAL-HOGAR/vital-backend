const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ============================================================
//  GET PATIENTS - Solo pacientes ACTIVOS
// ============================================================
async function getPatients(req, res) {
    try {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .or('status.eq.ACTIVE,status.is.null');

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('❌ Error en getPatients:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  CREATE PATIENT (CON ciudad, fecha_inicio, acudiente)
// ============================================================
async function createPatient(req, res) {
    try {
        const { 
            name, document, diagnosis, doctor, 
            ciudad, fecha_inicio_atencion,
            acudiente_nombre, acudiente_cedula, 
            acudiente_parentesco, acudiente_telefono,
            direccion, telefono, eps
        } = req.body;

        if (!name || !document) {
            return res.status(400).json({
                success: false,
                message: 'Nombre y documento son obligatorios'
            });
        }

        const { data: existing } = await supabase
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

        const { data, error } = await supabase
            .from('patients')
            .insert([{
                name,
                document,
                diagnosis: diagnosis || '',
                doctor: doctor || '',
                status: 'ACTIVE',
                ciudad: ciudad || 'Bogotá',
                fecha_inicio_atencion: fecha_inicio_atencion || new Date().toISOString().split('T')[0],
                acudiente_nombre: acudiente_nombre || null,
                acudiente_cedula: acudiente_cedula || null,
                acudiente_parentesco: acudiente_parentesco || null,
                acudiente_telefono: acudiente_telefono || null,
                direccion: direccion || null,
                telefono: telefono || null,
                eps: eps || null
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
//  GET PATIENT BY ID
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
//  UPDATE PATIENT
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

        const { data: existing } = await supabase
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
//  DELETE PATIENT - ELIMINACIÓN PERMANENTE (Opción A)
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

        const { data: existing } = await supabase
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

        // ELIMINACIÓN PERMANENTE
        const { error } = await supabase
            .from('patients')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Paciente eliminado permanentemente'
        });

    } catch (error) {
        console.error('❌ Error en deletePatient:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  REACTIVATE PATIENT (Mantener por compatibilidad)
// ============================================================
async function reactivatePatient(req, res) {
    try {
        const { id } = req.params;

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
            message: '✅ Paciente reactivado'
        });

    } catch (error) {
        console.error('❌ Error en reactivatePatient:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = {
    getPatients,
    getPatientById,
    createPatient,
    updatePatient,
    deletePatient,
    reactivatePatient
};
