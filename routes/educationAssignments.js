const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ============================================================
//  GET ALL ASSIGNMENTS
// ============================================================
async function getAssignments(req, res) {
    try {
        const { data, error } = await supabase
            .from('education_assignments')
            .select('*, topic:education_topics(title, description), patient:patients(name, document), professional:users(name, role)')
            .order('assigned_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('❌ Error en getAssignments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  GET ASSIGNMENTS BY PROFESSIONAL
// ============================================================
async function getAssignmentsByProfessional(req, res) {
    try {
        const { professionalId } = req.params;
        
        const { data, error } = await supabase
            .from('education_assignments')
            .select('*, topic:education_topics(title, description), patient:patients(name, document)')
            .eq('professional_id', professionalId)
            .order('assigned_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  CREATE ASSIGNMENT
// ============================================================
async function createAssignment(req, res) {
    try {
        const { topic_id, patient_id, professional_id, assigned_by } = req.body;

        if (!topic_id || !patient_id || !professional_id) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios'
            });
        }

        const { data, error } = await supabase
            .from('education_assignments')
            .insert([{
                topic_id,
                patient_id,
                professional_id,
                assigned_by: assigned_by || null,
                status: 'PENDIENTE',
                assigned_at: new Date().toISOString()
            }])
            .select();

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Educación asignada',
            data: data[0]
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  COMPLETE ASSIGNMENT (con fotos)
// ============================================================
async function completeAssignment(req, res) {
    try {
        const { id } = req.params;
        const { evidencia, fotos_evidencia } = req.body;

        const { data, error } = await supabase
            .from('education_assignments')
            .update({
                status: 'COMPLETADO',
                completed_at: new Date().toISOString(),
                evidencia: evidencia,
                fotos_evidencia: fotos_evidencia || []
            })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Educación completada',
            data: data[0]
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  DELETE ASSIGNMENT
// ============================================================
async function deleteAssignment(req, res) {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('education_assignments')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Asignación eliminada'
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = {
    getAssignments,
    getAssignmentsByProfessional,
    createAssignment,
    completeAssignment,
    deleteAssignment
};
