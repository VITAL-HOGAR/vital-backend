const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ============================================================
//  GET USERS - Listar todos los usuarios (CON cedula y rethus)
// ============================================================
async function getUsers(req, res) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, role, cedula, rethus, created_at');

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ Error en getUsers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  CREATE USER - Crear usuario (CON cedula y rethus)
// ============================================================
async function createUser(req, res) {
    try {
        const { name, email, role, password, cedula, rethus } = req.body;

        if (!name || !email || !role || !password) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios: name, email, role, password'
            });
        }

        const { data: existing } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        const validRoles = [
            'ADMIN', 'AUXILIAR', 'ENFERMERO', 'FISIOTERAPEUTA',
            'TERAPEUTA_OCUPACIONAL', 'FONOAUDIOLOGO', 'PSICOLOGO',
            'NUTRICIONISTA', 'TRABAJADOR_SOCIAL', 'TERAPEUTA_RESPIRATORIO',
            'MEDICO', 'COORDINADOR'
        ];

        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Rol inválido`
            });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const { data, error } = await supabase
            .from('users')
            .insert([{
                name,
                email,
                role,
                password_hash,
                cedula: cedula || null,
                rethus: rethus || null
            }])
            .select('id, name, email, role, cedula, rethus, created_at');

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Usuario creado exitosamente',
            data: data[0]
        });

    } catch (error) {
        console.error('❌ Error en createUser:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  DELETE USER - Eliminación PERMANENTE
// ============================================================
async function deleteUser(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de usuario requerido'
            });
        }

        const { data: existing } = await supabase
            .from('users')
            .select('id, email')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        if (existing.email === 'admin@vitalhogar.com') {
            return res.status(403).json({
                success: false,
                message: 'No se puede eliminar al administrador principal'
            });
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Usuario eliminado permanentemente'
        });

    } catch (error) {
        console.error('❌ Error en deleteUser:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  GET USER BY ID
// ============================================================
async function getUserById(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de usuario requerido'
            });
        }

        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, role, cedula, rethus, created_at')
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({ success: true, data });

    } catch (error) {
        console.error('❌ Error en getUserById:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  UPDATE USER (CON cedula y rethus)
// ============================================================
async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const { name, email, role, password, cedula, rethus } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de usuario requerido'
            });
        }

        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const updates = {};
        if (name) updates.name = name;
        if (email) updates.email = email;
        if (cedula !== undefined) updates.cedula = cedula;
        if (rethus !== undefined) updates.rethus = rethus;
        
        if (role) {
            const validRoles = [
                'ADMIN', 'AUXILIAR', 'ENFERMERO', 'FISIOTERAPEUTA',
                'TERAPEUTA_OCUPACIONAL', 'FONOAUDIOLOGO', 'PSICOLOGO',
                'NUTRICIONISTA', 'TRABAJADOR_SOCIAL', 'TERAPEUTA_RESPIRATORIO',
                'MEDICO', 'COORDINADOR'
            ];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: `Rol inválido`
                });
            }
            updates.role = role;
        }

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updates.password_hash = await bcrypt.hash(password, salt);
        }

        if (email) {
            const { data: existingEmail } = await supabase
                .from('users')
                .select('email')
                .eq('email', email)
                .neq('id', id)
                .single();

            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'El email ya está registrado por otro usuario'
                });
            }
        }

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select('id, name, email, role, cedula, rethus, created_at');

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Usuario actualizado exitosamente',
            data: data[0]
        });

    } catch (error) {
        console.error('❌ Error en updateUser:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};
