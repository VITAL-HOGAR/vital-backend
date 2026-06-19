const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function getShifts(req, res) {
    try {
        const { data, error } = await supabase.from('shifts').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function createShift(req, res) {
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
}

async function updateShift(req, res) {
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
}

module.exports = { getShifts, createShift, updateShift };
