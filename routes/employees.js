const express = require('express');
const router = express.Router();
const supabase = require('../config/database');

// 获取所有员工
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 根据ID获取单个员工
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: '员工不存在' });
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 添加新员工
router.post('/', async (req, res) => {
  try {
    const { employee_id, name, position, hire_date, phone, email } = req.body;
    
    // 检查员工工号是否已存在
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('employee_id')
      .eq('employee_id', employee_id)
      .single();
    
    if (existingEmployee) {
      return res.status(400).json({ error: '员工工号已存在' });
    }

    const { data, error } = await supabase
      .from('employees')
      .insert([{ employee_id, name, position, hire_date, phone, email }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新员工信息
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id, name, position, hire_date, phone, email, status } = req.body;
    
    // 如果更新了员工工号，检查新工号是否已被其他员工使用
    if (employee_id) {
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_id', employee_id)
        .neq('id', id)
        .single();
      
      if (existingEmployee) {
        return res.status(400).json({ error: '员工工号已存在' });
      }
    }

    const { data, error } = await supabase
      .from('employees')
      .update({ employee_id, name, position, hire_date, phone, email, status })
      .eq('id', id)
      .select();

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: '员工不存在' });
    
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除员工
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 先检查该员工是否有考勤记录
    const { data: attendanceRecords } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('employee_id', id)
      .limit(1);
    
    if (attendanceRecords && attendanceRecords.length > 0) {
      // 如果有考勤记录，只是将状态设为inactive而不是删除
      const { data, error } = await supabase
        .from('employees')
        .update({ status: 'inactive' })
        .eq('id', id)
        .select();
        
      if (error) throw error;
      if (data.length === 0) return res.status(404).json({ error: '员工不存在' });
      
      return res.json({ message: '员工状态已设为离职', employee: data[0] });
    } else {
      // 如果没有考勤记录，可以直接删除
      const { data, error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)
        .select();
        
      if (error) throw error;
      if (data.length === 0) return res.status(404).json({ error: '员工不存在' });
      
      return res.json({ message: '员工已删除', employee: data[0] });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;