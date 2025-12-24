const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('缺少Supabase配置信息，请检查环境变量');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;