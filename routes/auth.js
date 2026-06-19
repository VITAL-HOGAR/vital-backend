const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email requerido' });
        }
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);
        if (error) throw error;
        if (!users || users.length === 0) {
            return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
        }
        const user = users[0];
        res.json({
            success: true,
            data: {
                user: { id: user.id, email: user.email, name: user.name, role: user.role },
                token: Buffer.from(`${user.id}:${Date.now()}`).toString('base64')
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function verifyToken(req, res) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Token no proporcionado' });
        }
        const decoded = Buffer.from(token, 'base64').toString();
        const [userId] = decoded.split(':');
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, name, role')
            .eq('id', userId)
            .single();
        if (error || !user) {
            return res.status(401).json({ success: false, message: 'Token inválido' });
        }
        res.json({ success: true, data: { user } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = { login, verifyToken };
