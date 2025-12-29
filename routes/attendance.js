const express = require('express');
const router = express.Router();
const supabase = require('../config/database');
const moment = require('moment');

// 获取所有缺勤记录
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      employee_id, 
      start_date, 
      end_date
    } = req.query;
    let query = supabase
      .from('attendance_records')
      .select('*')
      .order('date', { ascending: false });
    
    // 添加过滤条件
    if (employee_id) {
      query = query.eq('employee_id', employee_id);
    }
    
    if (start_date) {
      query = query.gte('date', start_date);
    }
    
    if (end_date) {
      query = query.lte('date', end_date);
    }
    
    // 分页
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    // 获取所有相关的员工信息
    const employeeIds = [...new Set(data.map(record => record.employee_id))];
    const { data: employees, error: employeeError } = await supabase
      .from('employees')
      .select('id, employee_id, name')
      .in('id', employeeIds);
    
    if (employeeError) throw employeeError;
    
    // 将员工信息合并到考勤记录中
    const recordsWithEmployeeInfo = data.map(record => {
      const employee = employees.find(emp => emp.id === record.employee_id);
      return {
        ...record,
        employee: employee || null
      };
    });
    
    res.json({
      records: recordsWithEmployeeInfo,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 根据ID获取单个缺勤记录
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: '缺勤记录不存在' });
    
    // 获取员工信息
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, employee_id, name')
      .eq('id', data.employee_id)
      .single();
    
    if (employeeError) throw employeeError;
    
    // 将员工信息合并到记录中
    const recordWithEmployeeInfo = {
      ...data,
      employee: employee || null
    };
    
    res.json(recordWithEmployeeInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 添加新的考勤记录
router.post('/', async (req, res) => {
  try {
    const { 
      employee_id, 
      date, 
      attendance_type = 'absence', // 默认为缺勤
      absence_type, 
      reason, 
      notes,
      late_minutes = 0,
      early_leave_minutes = 0,
      check_in_time,
      check_out_time
    } = req.body;
    
    // 验证必填字段
    if (!employee_id || !date || !attendance_type) {
      return res.status(400).json({ error: '员工ID、日期和考勤类型为必填项' });
    }
    
    // 验证考勤类型
    if (!['absence', 'late', 'early_leave'].includes(attendance_type)) {
      return res.status(400).json({ error: '考勤类型必须是absence、late或early_leave' });
    }
    
    // 如果是缺勤类型，验证缺勤类型
    if (attendance_type === 'absence' && !absence_type) {
      return res.status(400).json({ error: '缺勤记录必须指定缺勤类型' });
    }
    
    if (attendance_type === 'absence' && !['morning', 'afternoon', 'full_day'].includes(absence_type)) {
      return res.status(400).json({ error: '缺勤类型必须是morning、afternoon或full_day' });
    }
    
    // 如果是迟到类型，验证打卡时间
    if (attendance_type === 'late' && !check_in_time) {
      return res.status(400).json({ error: '迟到记录必须指定打卡时间' });
    }
    
    // 如果是早退类型，验证打卡时间
    if (attendance_type === 'early_leave' && !check_out_time) {
      return res.status(400).json({ error: '早退记录必须指定打卡时间' });
    }
    
    // 验证日期格式
    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ error: '日期格式无效，请使用YYYY-MM-DD格式' });
    }
    
    // 检查是否已存在相同的记录
    let existingQuery = supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employee_id)
      .eq('date', date)
      .eq('attendance_type', attendance_type);
    
    // 如果是缺勤类型，还要检查缺勤类型
    if (attendance_type === 'absence') {
      existingQuery = existingQuery.eq('absence_type', absence_type);
    }
    
    const { data: existingRecord } = await existingQuery.single();
    
    if (existingRecord) {
      return res.status(400).json({ error: '该员工在此日期的此类型考勤记录已存在' });
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .insert([{
        employee_id, 
        date, 
        attendance_type,
        absence_type: attendance_type === 'absence' ? absence_type : 'none',
        reason, 
        notes,
        late_minutes: attendance_type === 'late' ? late_minutes : 0,
        early_leave_minutes: attendance_type === 'early_leave' ? early_leave_minutes : 0,
        check_in_time: attendance_type === 'late' ? check_in_time : null,
        check_out_time: attendance_type === 'early_leave' ? check_out_time : null
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新考勤记录
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      employee_id, 
      date, 
      attendance_type, 
      absence_type, 
      reason, 
      notes,
      late_minutes,
      early_leave_minutes,
      check_in_time,
      check_out_time
    } = req.body;
    
    // 验证考勤类型
    if (attendance_type && !['absence', 'late', 'early_leave', 'normal'].includes(attendance_type)) {
      return res.status(400).json({ error: '考勤类型必须是absence、late、early_leave或normal' });
    }
    
    // 如果是缺勤类型，验证缺勤类型
    if (attendance_type === 'absence' && absence_type && !['morning', 'afternoon', 'full_day'].includes(absence_type)) {
      return res.status(400).json({ error: '缺勤类型必须是morning、afternoon或full_day' });
    }
    
    // 如果是迟到类型，验证迟到分钟数
    if (attendance_type === 'late' && late_minutes !== undefined && late_minutes <= 0) {
      return res.status(400).json({ error: '迟到分钟数必须大于0' });
    }
    
    // 如果是早退类型，验证早退分钟数
    if (attendance_type === 'early_leave' && early_leave_minutes !== undefined && early_leave_minutes <= 0) {
      return res.status(400).json({ error: '早退分钟数必须大于0' });
    }
    
    // 验证日期格式
    if (date && !moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ error: '日期格式无效，请使用YYYY-MM-DD格式' });
    }

    // 先获取当前记录
    const { data: currentRecord } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', id)
      .single();
    
    if (!currentRecord) {
      return res.status(404).json({ error: '考勤记录不存在' });
    }
    
    // 如果更新了员工、日期或类型，检查是否会产生重复记录
    if (employee_id || date || attendance_type) {
      const newEmployeeId = employee_id || currentRecord.employee_id;
      const newDate = date || currentRecord.date;
      const newAttendanceType = attendance_type || currentRecord.attendance_type;
      
      // 检查是否已存在相同的记录（排除当前记录）
      let existingQuery = supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', newEmployeeId)
        .eq('date', newDate)
        .eq('attendance_type', newAttendanceType)
        .neq('id', id);
      
      // 如果是缺勤类型，还要检查缺勤类型
      if (newAttendanceType === 'absence') {
        const newAbsenceType = absence_type || currentRecord.absence_type;
        existingQuery = existingQuery.eq('absence_type', newAbsenceType);
      }
      
      const { data: existingRecord } = await existingQuery.single();
      
      if (existingRecord) {
        return res.status(400).json({ error: '该员工在此日期的此类型考勤记录已存在' });
      }
    }

    // 构建更新对象
    const updateData = {};
    if (employee_id !== undefined) updateData.employee_id = employee_id;
    if (date !== undefined) updateData.date = date;
    if (attendance_type !== undefined) updateData.attendance_type = attendance_type;
    if (absence_type !== undefined) updateData.absence_type = attendance_type === 'absence' ? absence_type : null;
    if (reason !== undefined) updateData.reason = reason;
    if (notes !== undefined) updateData.notes = notes;
    if (late_minutes !== undefined) updateData.late_minutes = attendance_type === 'late' ? late_minutes : 0;
    if (early_leave_minutes !== undefined) updateData.early_leave_minutes = attendance_type === 'early_leave' ? early_leave_minutes : 0;
    if (check_in_time !== undefined) updateData.check_in_time = (attendance_type === 'late' || attendance_type === 'normal') ? check_in_time : null;
    if (check_out_time !== undefined) updateData.check_out_time = (attendance_type === 'early_leave' || attendance_type === 'normal') ? check_out_time : null;

    const { data, error } = await supabase
      .from('attendance_records')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: '考勤记录不存在' });
    
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除缺勤记录
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', id)
      .select();
        
    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: '缺勤记录不存在' });
        
    res.json({ message: '缺勤记录已删除', record: data[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 批量添加缺勤记录
router.post('/batch', async (req, res) => {
  try {
    const { records } = req.body;
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: '请提供有效的记录数组' });
    }
    
    // 验证每条记录
    for (const record of records) {
      if (!record.employee_id || !record.date || !record.absence_type) {
        return res.status(400).json({ error: '员工ID、日期和缺勤类型为必填项' });
      }
      
      if (!['morning', 'afternoon', 'full_day'].includes(record.absence_type)) {
        return res.status(400).json({ error: '缺勤类型必须是morning、afternoon或full_day' });
      }
      
      if (!moment(record.date, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({ error: '日期格式无效，请使用YYYY-MM-DD格式' });
      }
    }

    const { data, error } = await supabase
      .from('attendance_records')
      .insert(records)
      .select();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;