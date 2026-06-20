const { createClient } = require('@supabase/supabase-js');

// ==================== SUPABASE ====================
// ==================== SUPABASE ====================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY  // ← CORRECTO
);

// ============================================================
//  GET TOPICS - Listar todos los temas de educación
// ============================================================
async function getTopics(req, res) {
    try {
        // ✅ Ordenar por fecha de creación (más reciente primero)
        const { data, error } = await supabase
            .from('education_topics')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('❌ Error en getTopics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  CREATE TOPIC - Crear tema de educación
// ============================================================
async function createTopic(req, res) {
    try {
        const { title, description, created_by } = req.body;

        // ✅ Validar campos obligatorios
        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Título y descripción son obligatorios'
            });
        }

        // ✅ Validar que el título no exista (opcional)
        const { data: existing, error: checkError } = await supabase
            .from('education_topics')
            .select('title')
            .eq('title', title)
            .single();

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'El tema ya existe'
            });
        }

        // ✅ Crear tema
        const { data, error } = await supabase
            .from('education_topics')
            .insert([{
                title: title.trim(),
                description: description.trim(),
                created_by: created_by || null,
                created_at: new Date().toISOString()
            }])
            .select();

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Tema de educación creado exitosamente',
            data: data[0]
        });

    } catch (error) {
        console.error('❌ Error en createTopic:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  UPDATE TOPIC - Actualizar tema de educación
// ============================================================
async function updateTopic(req, res) {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de tema requerido'
            });
        }

        // ✅ Verificar que el tema existe
        const { data: existing, error: checkError } = await supabase
            .from('education_topics')
            .select('id')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Tema no encontrado'
            });
        }

        // ✅ Si se actualiza el título, verificar que no exista
        if (updates.title) {
            const { data: existingTitle } = await supabase
                .from('education_topics')
                .select('title')
                .eq('title', updates.title)
                .neq('id', id)
                .single();

            if (existingTitle) {
                return res.status(400).json({
                    success: false,
                    message: 'El título ya está en uso por otro tema'
                });
            }
            updates.title = updates.title.trim();
        }

        // ✅ Limpiar campos vacíos
        if (updates.description) {
            updates.description = updates.description.trim();
        }

        // ✅ Agregar fecha de actualización
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('education_topics')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Tema de educación actualizado exitosamente',
            data: data[0]
        });

    } catch (error) {
        console.error('❌ Error en updateTopic:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  DELETE TOPIC - Eliminar tema de educación
// ============================================================
async function deleteTopic(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de tema requerido'
            });
        }

        // ✅ Verificar que el tema existe
        const { data: existing, error: checkError } = await supabase
            .from('education_topics')
            .select('id')
            .eq('id', id)
            .single();

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Tema no encontrado'
            });
        }

        const { error } = await supabase
            .from('education_topics')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.json({
            success: true,
            message: '✅ Tema de educación eliminado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error en deleteTopic:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  GET TOPIC BY ID - Obtener tema específico
// ============================================================
async function getTopicById(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID de tema requerido'
            });
        }

        const { data, error } = await supabase
            .from('education_topics')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({
                success: false,
                message: 'Tema no encontrado'
            });
        }

        res.json({ success: true, data });

    } catch (error) {
        console.error('❌ Error en getTopicById:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

// ============================================================
//  EXPORTAR
// ============================================================
module.exports = {
    getTopics,
    getTopicById,
    createTopic,
    updateTopic,
    deleteTopic
};
