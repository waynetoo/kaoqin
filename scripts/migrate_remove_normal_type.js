const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // 需要服务密钥来执行DDL

if (!supabaseUrl || !supabaseKey) {
  throw new Error('缺少Supabase配置信息，请检查环境变量');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('开始执行数据库迁移...');

    // 1. 删除所有normal类型的记录
    console.log('删除normal类型记录...');
    const { error: deleteError } = await supabase
      .from('attendance_records')
      .delete()
      .eq('attendance_type', 'normal');
    
    if (deleteError) {
      console.error('删除normal类型记录失败:', deleteError);
    } else {
      console.log('成功删除normal类型记录');
    }

    // 2. 创建工作时间设置表
    console.log('创建工作时间设置表...');
    const { error: tableError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS work_settings (
          id SERIAL PRIMARY KEY,
          work_start_time TIME DEFAULT '09:00:00',
          work_end_time TIME DEFAULT '18:00:00',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT INTO work_settings (work_start_time, work_end_time) 
        VALUES ('09:00:00', '18:00:00')
        ON CONFLICT DO NOTHING;
      `
    });
    
    if (tableError) {
      console.error('创建工作时间设置表失败:', tableError);
      // 尝试直接插入设置，假设表已存在
      const { error: insertError } = await supabase
        .from('work_settings')
        .upsert([{ work_start_time: '09:00:00', work_end_time: '18:00:00' }]);
      
      if (insertError) {
        console.error('插入工作时间设置失败:', insertError);
      } else {
        console.log('成功插入工作时间设置');
      }
    } else {
      console.log('成功创建工作时间设置表');
    }

    console.log('数据库迁移完成！');
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
  }
}

runMigration();