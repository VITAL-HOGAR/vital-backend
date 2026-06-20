const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==================== SUPABASE ====================
// ✅ USAR ANON_KEY (la misma que en server.js)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ============================================================
//  LOGIN - Autenticación de usuarios
// ============================================================
async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }

        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email);

        if (error) throw error;

        if (!users || users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        const user = users[0];

        // VERIFICAR CONTRASEÑA
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // GENERAR TOKEN
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        res.json({
            success: true,
            data: { user: userData, token }
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// ============================================================
//  VERIFY TOKEN
// ============================================================
async function verifyToken(req, res) {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token no proporcionado'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, name, role')
            .eq('id', decoded.id)
            .single();

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Token inválido o usuario no existe'
            });
        }

        res.json({
            success: true,
            data: { user }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado'
            });
        }

        console.error('❌ Error en verifyToken:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// ============================================================
//  MIDDLEWARE - PROTECT
// ============================================================
async function protect(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado - Token requerido'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, name, role')
            .eq('id', decoded.id)
            .single();

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado - Usuario no encontrado'
            });
        }

        req.user = user;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado - Inicie sesión nuevamente'
            });
        }

        console.error('❌ Error en protect:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// ============================================================
//  MIDDLEWARE - AUTHORIZE
// ============================================================
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autorizado'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado - Rol no autorizado'
            });
        }

        next();
    };
}

// ============================================================
//  CREAR ADMIN POR DEFECTO
// ============================================================
async function createDefaultAdmin() {
    try {
        const { data: existing, error } = await supabase
            .from('users')
            .select('id')
            .eq('email', 'admin@vitalhogar.com')
            .single();

        if (existing) {
            console.log('✅ Admin ya existe');
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash('admin123', salt);

        const { data, error: insertError } = await supabase
            .from('users')
            .insert([{
                name: 'Administrador',
                email: 'admin@vitalhogar.com',
                role: 'ADMIN',
                password_hash
            }]);

        if (insertError) throw insertError;
        console.log('✅ Admin creado por defecto');
        console.log('📧 Email: admin@vitalhogar.com');
        console.log('🔑 Contraseña: admin123');

    } catch (error) {
        console.error('❌ Error creando admin:', error.message);
    }
}

// ============================================================
//  EXPORTAR
// ============================================================
module.exports = {
    login,
    verifyToken,
    protect,
    authorize,
    createDefaultAdmin
};
