const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function getUsers(req, res) {
    try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function createUser(req, res) {
    try {
        const { name, email, role, password } = req.body;
        const { data, error } = await supabase
            .from('users')
            .insert([{ name, email, role, password }])
            .select();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Usuario eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = { getUsers, createUser, deleteUser };
