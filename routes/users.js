const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// ==================== SUPABASE ====================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY  // ← CORRECTO
);

// ============================================================
//  GET USERS - Listar todos los usuarios (sin contraseñas)
// ============================================================
async function getUsers(req, res) {
    try {
        // ✅ NO devolver password_hash
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, role, created_at');

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ Error en getUsers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  CREATE USER - Crear usuario (con contraseña encriptada)
// ============================================================
async function createUser(req, res) {
    try {
        const { name, email, role, password } = req.body;

        // ✅ Validar campos obligatorios
        if (!name || !email || !role || !password) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios: name, email, role, password'
            });
        }

        // ✅ Validar que el email no exista
        const { data: existing, error: checkError } = await supabase
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

        // ✅ Validar rol válido
        const validRoles = [
            'ADMIN', 'AUXILIAR', 'ENFERMERO', 'FISIOTERAPEUTA',
            'TERAPEUTA_OCUPACIONAL', 'FONOAUDIOLOGO', 'PSICOLOGO',
            'NUTRICIONISTA', 'TRABAJADOR_SOCIAL', 'TERAPEUTA_RESPIRATORIO',
            'MEDICO', 'COORDINADOR'
        ];

        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Rol inválido. Roles válidos: ${validRoles.join(', ')}`
            });
        }

        // ✅ Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // ✅ Guardar usuario (sin password en texto plano)
        const { data, error } = await supabase
            .from('users')
            .insert([{
                name,
                email,
                role,
                password_hash  // ← Guarda el hash, no la contraseña
            }])
            .select('id, name, email, role, created_at');  // ✅ NO devolver password_hash

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
//  DELETE USER - Eliminar usuario
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

        // ✅ Verificar que el usuario existe
        const { data: existing, error: checkError } = await supabase
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

        // ✅ No permitir eliminar al ADMIN
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
            message: '✅ Usuario eliminado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error en deleteUser:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  GET USER BY ID - Obtener usuario específico
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

        // ✅ NO devolver password_hash
        const { data, error } = await supabase
            .from('users')
            .select('id, name, email, role, created_at')
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
//  UPDATE USER - Actualizar usuario
// ============================================================
async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const { name, email, role, password } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de usuario requerido'
            });
        }

        // ✅ Verificar que el usuario existe
        const { data: existing, error: checkError } = await supabase
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

        // ✅ Construir objeto de actualización
        const updates = {};
        if (name) updates.name = name;
        if (email) updates.email = email;
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
                    message: `Rol inválido. Roles válidos: ${validRoles.join(', ')}`
                });
            }
            updates.role = role;
        }

        // ✅ Si se actualiza contraseña, encriptarla
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updates.password_hash = await bcrypt.hash(password, salt);
        }

        // ✅ Si se actualiza email, verificar que no exista
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
            .select('id, name, email, role, created_at');

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

// ============================================================
//  EXPORTAR
// ============================================================
module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};
