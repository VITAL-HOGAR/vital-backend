const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==================== SUPABASE ====================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY  // SERVICE_KEY para backend (NO ANON_KEY)
);

// ============================================================
//  LOGIN - Autenticación de usuarios
// ============================================================
async function login(req, res) {
    try {
        const { email, password } = req.body;

        // Validar campos obligatorios
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }

        // Buscar usuario por email
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

        // VERIFICAR CONTRASEÑA (comparar hash)
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // GENERAR TOKEN JWT SEGURO
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

        // Devolver usuario (sin password) + token
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
//  VERIFY TOKEN - Validar token JWT
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

        // VERIFICAR TOKEN JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar usuario en la base de datos
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
        // Manejar errores específicos de JWT
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
//  MIDDLEWARE - Proteger rutas (autenticación requerida)
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

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar usuario
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

        // Agregar usuario a la request
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
//  MIDDLEWARE - Verificar rol (autorización)
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
//  CREAR ADMIN POR DEFECTO (si no existe)
// ============================================================
async function createDefaultAdmin() {
    try {
        // Verificar si ya existe un admin
        const { data: existing, error } = await supabase
            .from('users')
            .select('id')
            .eq('email', 'admin@vitalhogar.com')
            .single();

        if (existing) {
            console.log('✅ Admin ya existe');
            return;
        }

        // Crear admin
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
