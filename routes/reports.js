const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function getGlobalReports(req, res) {
    try {
        const { data: patients } = await supabase.from('patients').select('*');
        const { data: users } = await supabase.from('users').select('*');
        const { data: shifts } = await supabase.from('shifts').select('*');
        res.json({
            success: true,
            data: {
                total_patients: patients?.length || 0,
                total_users: users?.length || 0,
                total_shifts: shifts?.length || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function getCoverageReport(req, res) {
    try {
        const { data: shifts } = await supabase.from('shifts').select('*');
        const total = shifts?.length || 0;
        const with24h = shifts?.filter(s => s.type === '24h').length || 0;
        res.json({
            success: true,
            data: {
                total_shifts: total,
                coverage_24h: with24h,
                coverage_percentage: total > 0 ? Math.round((with24h / total) * 100) : 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = { getGlobalReports, getCoverageReport };
