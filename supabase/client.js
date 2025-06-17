const { createClient } = require('@supabase/supabase-js');
// console.log(process.env.SUPABASE_KEY, process.env.SUPABASE_URL);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = { supabase };
