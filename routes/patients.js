const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function getPatients(req, res) {
    try {
        const { data, error } = await supabase.from('patients').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function createPatient(req, res) {
    try {
        const { name, document, diagnosis, doctor } = req.body;
        const { data, error } = await supabase
            .from('patients')
            .insert([{ name, document, diagnosis, doctor }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function getPatientById(req, res) {
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
}

async function updatePatient(req, res) {
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
}

async function deletePatient(req, res) {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('patients')
            .update({ status: 'INACTIVE' })
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Paciente desactivado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = { getPatients, createPatient, getPatientById, updatePatient, deletePatient };
