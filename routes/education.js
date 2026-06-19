const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function getTopics(req, res) {
    try {
        const { data, error } = await supabase.from('education_topics').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function createTopic(req, res) {
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
}

async function updateTopic(req, res) {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { data, error } = await supabase
            .from('education_topics')
            .update(updates)
            .eq('id', id)
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function deleteTopic(req, res) {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('education_topics')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Tema eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = { getTopics, createTopic, updateTopic, deleteTopic };
