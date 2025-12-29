const express = require('express');
const router = express.Router();
const supabase = require('../config/database');
const moment = require('moment');

// 获取员工月度迟到早退统计
router.get('/monthly/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    
    // 验证年份和月份
    if (!year || !month || isNaN(year) || isNaN(month)) {
      return res.status(400).json({ error: '请提供有效的年份和月份' });
    }
    
    const monthNum = parseInt(month);
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: '月份必须在1-12之间' });
    }
    
    // 计算月份的开始和结束日期
    const startDate = moment(`${year}-${monthNum.toString().padStart(2, '0')}-01`).startOf('month').format('YYYY-MM-DD');
    const endDate = moment(`${year}-${monthNum.toString().padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');
    
    // 获取所有员工
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, employee_id, name');
    
    if (employeesError) throw employeesError;
    
    // 获取该月份的所有考勤记录
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .in('attendance_type', ['late', 'early_leave']);
    
    if (attendanceError) throw attendanceError;
    
    // 为每个员工统计迟到早退情况
    const statistics = employees.map(employee => {
      const employeeRecords = attendanceRecords.filter(record => 
        record.employee_id === employee.id
      );
      
      // 计算迟到次数和总分钟数
      const lateRecords = employeeRecords.filter(record => 
        record.attendance_type === 'late'
      );
      
      const lateCount = lateRecords.length;
      const totalLateMinutes = lateRecords.reduce((sum, record) => sum + (record.late_minutes || 0), 0);
      
      // 计算早退次数和总分钟数
      const earlyLeaveRecords = employeeRecords.filter(record => 
        record.attendance_type === 'early_leave'
      );
      
      const earlyLeaveCount = earlyLeaveRecords.length;
      const totalEarlyLeaveMinutes = earlyLeaveRecords.reduce((sum, record) => sum + (record.early_leave_minutes || 0), 0);
      
      // 格式化迟到早退时间
      const formatTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}小时${mins}分钟`;
      };
      
      return {
        employee_id: employee.id,
        employee_number: employee.employee_id,
        name: employee.name,
        month: parseInt(month),
        year: parseInt(year),
        late_count: lateCount,
        early_leave_count: earlyLeaveCount,
        total_late_minutes: totalLateMinutes,
        total_early_leave_minutes: totalEarlyLeaveMinutes,
        formatted_late_time: formatTime(totalLateMinutes),
        formatted_early_leave_time: formatTime(totalEarlyLeaveMinutes),
        late_records: lateRecords.map(record => ({
          date: record.date,
          check_in_time: record.check_in_time,
          late_minutes: record.late_minutes,
          reason: record.reason
        })),
        early_leave_records: earlyLeaveRecords.map(record => ({
          date: record.date,
          check_out_time: record.check_out_time,
          early_leave_minutes: record.early_leave_minutes,
          reason: record.reason
        }))
      };
    });
    
    // 只显示有迟到或早退记录的员工
    const filteredStatistics = statistics.filter(stat => 
      stat.late_count > 0 || stat.early_leave_count > 0
    );
    
    // 按迟到+早退总时间降序排序
    filteredStatistics.sort((a, b) => 
      (b.total_late_minutes + b.total_early_leave_minutes) - 
      (a.total_late_minutes + a.total_early_leave_minutes)
    );
    
    // 计算汇总数据
    const summary = {
      total_employees: employees.length,
      employees_with_late_or_early_leave: filteredStatistics.length,
      total_late_count: filteredStatistics.reduce((sum, s) => sum + s.late_count, 0),
      total_early_leave_count: filteredStatistics.reduce((sum, s) => sum + s.early_leave_count, 0),
      total_late_minutes: filteredStatistics.reduce((sum, s) => sum + s.total_late_minutes, 0),
      total_early_leave_minutes: filteredStatistics.reduce((sum, s) => sum + s.total_early_leave_minutes, 0),
      average_late_minutes_per_employee: filteredStatistics.length > 0 ? 
        Math.round(filteredStatistics.reduce((sum, s) => sum + s.total_late_minutes, 0) / filteredStatistics.length) : 0,
      average_early_leave_minutes_per_employee: filteredStatistics.length > 0 ? 
        Math.round(filteredStatistics.reduce((sum, s) => sum + s.total_early_leave_minutes, 0) / filteredStatistics.length) : 0
    };
    
    res.json({
      period: {
        year: parseInt(year),
        month: parseInt(month),
        start_date: startDate,
        end_date: endDate
      },
      employee_statistics: filteredStatistics,
      summary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取员工年度迟到早退统计
router.get('/yearly/:year', async (req, res) => {
  try {
    const { year } = req.params;
    
    // 验证年份
    if (!year || isNaN(year)) {
      return res.status(400).json({ error: '请提供有效的年份' });
    }
    
    const yearNum = parseInt(year);
    
    // 计算年份的开始和结束日期
    const startDate = moment(`${yearNum}-01-01`).startOf('year').format('YYYY-MM-DD');
    const endDate = moment(`${yearNum}-12-31`).endOf('year').format('YYYY-MM-DD');
    
    // 获取所有员工
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, employee_id, name');
    
    if (employeesError) throw employeesError;
    
    // 获取该年份的所有迟到早退记录
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .in('attendance_type', ['late', 'early_leave']);
    
    if (attendanceError) throw attendanceError;
    
    // 为每个员工统计年度迟到早退情况
    const statistics = employees.map(employee => {
      const employeeRecords = attendanceRecords.filter(record => 
        record.employee_id === employee.id
      );
      
      // 计算迟到次数和总分钟数
      const lateRecords = employeeRecords.filter(record => 
        record.attendance_type === 'late'
      );
      
      const lateCount = lateRecords.length;
      const totalLateMinutes = lateRecords.reduce((sum, record) => sum + (record.late_minutes || 0), 0);
      
      // 计算早退次数和总分钟数
      const earlyLeaveRecords = employeeRecords.filter(record => 
        record.attendance_type === 'early_leave'
      );
      
      const earlyLeaveCount = earlyLeaveRecords.length;
      const totalEarlyLeaveMinutes = earlyLeaveRecords.reduce((sum, record) => sum + (record.early_leave_minutes || 0), 0);
      
      // 按月统计迟到早退
      const monthlyStats = {};
      for (let month = 1; month <= 12; month++) {
        const monthStart = moment(`${yearNum}-${month.toString().padStart(2, '0')}-01`).startOf('month').format('YYYY-MM-DD');
        const monthEnd = moment(`${yearNum}-${month.toString().padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');
        
        const monthRecords = employeeRecords.filter(record => 
          record.date >= monthStart && record.date <= monthEnd
        );
        
        const monthLateCount = monthRecords.filter(r => r.attendance_type === 'late').length;
        const monthEarlyLeaveCount = monthRecords.filter(r => r.attendance_type === 'early_leave').length;
        const monthLateMinutes = monthRecords
          .filter(r => r.attendance_type === 'late')
          .reduce((sum, record) => sum + (record.late_minutes || 0), 0);
        const monthEarlyLeaveMinutes = monthRecords
          .filter(r => r.attendance_type === 'early_leave')
          .reduce((sum, record) => sum + (record.early_leave_minutes || 0), 0);
        
        monthlyStats[month] = {
          late_count: monthLateCount,
          early_leave_count: monthEarlyLeaveCount,
          late_minutes: monthLateMinutes,
          early_leave_minutes: monthEarlyLeaveMinutes
        };
      }
      
      // 格式化迟到早退时间
      const formatTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}小时${mins}分钟`;
      };
      
      return {
        employee_id: employee.id,
        employee_number: employee.employee_id,
        name: employee.name,
        year: yearNum,
        late_count: lateCount,
        early_leave_count: earlyLeaveCount,
        total_late_minutes: totalLateMinutes,
        total_early_leave_minutes: totalEarlyLeaveMinutes,
        formatted_late_time: formatTime(totalLateMinutes),
        formatted_early_leave_time: formatTime(totalEarlyLeaveMinutes),
        monthly_statistics: monthlyStats
      };
    });
    
    // 只显示有迟到或早退记录的员工
    const filteredStatistics = statistics.filter(stat => 
      stat.late_count > 0 || stat.early_leave_count > 0
    );
    
    // 按迟到+早退总时间降序排序
    filteredStatistics.sort((a, b) => 
      (b.total_late_minutes + b.total_early_leave_minutes) - 
      (a.total_late_minutes + a.total_early_leave_minutes)
    );
    
    // 计算月度趋势
    const monthlyTrend = [];
    for (let month = 1; month <= 12; month++) {
      const monthStats = filteredStatistics.reduce((acc, stat) => {
        const monthData = stat.monthly_statistics[month];
        return {
          late_count: acc.late_count + monthData.late_count,
          early_leave_count: acc.early_leave_count + monthData.early_leave_count,
          late_minutes: acc.late_minutes + monthData.late_minutes,
          early_leave_minutes: acc.early_leave_minutes + monthData.early_leave_minutes
        };
      }, {
        late_count: 0,
        early_leave_count: 0,
        late_minutes: 0,
        early_leave_minutes: 0
      });
      
      monthlyTrend.push({
        month,
        month_name: moment(`${yearNum}-${month.toString().padStart(2, '0')}-01`).format('MMMM'),
        ...monthStats
      });
    }
    
    // 计算汇总数据
    const summary = {
      total_employees: employees.length,
      employees_with_late_or_early_leave: filteredStatistics.length,
      total_late_count: filteredStatistics.reduce((sum, s) => sum + s.late_count, 0),
      total_early_leave_count: filteredStatistics.reduce((sum, s) => sum + s.early_leave_count, 0),
      total_late_minutes: filteredStatistics.reduce((sum, s) => sum + s.total_late_minutes, 0),
      total_early_leave_minutes: filteredStatistics.reduce((sum, s) => sum + s.total_early_leave_minutes, 0),
      average_late_minutes_per_employee: filteredStatistics.length > 0 ? 
        Math.round(filteredStatistics.reduce((sum, s) => sum + s.total_late_minutes, 0) / filteredStatistics.length) : 0,
      average_early_leave_minutes_per_employee: filteredStatistics.length > 0 ? 
        Math.round(filteredStatistics.reduce((sum, s) => sum + s.total_early_leave_minutes, 0) / filteredStatistics.length) : 0
    };
    
    res.json({
      period: {
        year: yearNum,
        start_date: startDate,
        end_date: endDate
      },
      employee_statistics: filteredStatistics,
      monthly_trend: monthlyTrend,
      summary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取员工月度迟到早退详情
router.get('/monthly/:year/:month/employee/:id', async (req, res) => {
  try {
    const { year, month, id } = req.params;
    
    // 验证年份和月份
    if (!year || !month || isNaN(year) || isNaN(month)) {
      return res.status(400).json({ error: '请提供有效的年份和月份' });
    }
    
    const monthNum = parseInt(month);
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: '月份必须在1-12之间' });
    }
    
    // 计算月份的开始和结束日期
    const startDate = moment(`${year}-${monthNum.toString().padStart(2, '0')}-01`).startOf('month').format('YYYY-MM-DD');
    const endDate = moment(`${year}-${monthNum.toString().padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');
    
    // 获取员工信息
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();
    
    if (employeeError) throw employeeError;
    if (!employee) return res.status(404).json({ error: '员工不存在' });
    
    // 获取该月份的迟到早退记录
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', id)
      .gte('date', startDate)
      .lte('date', endDate)
      .in('attendance_type', ['late', 'early_leave'])
      .order('date', { ascending: true });
    
    if (attendanceError) throw attendanceError;
    
    // 分离迟到和早退记录
    const lateRecords = attendanceRecords.filter(record => record.attendance_type === 'late');
    const earlyLeaveRecords = attendanceRecords.filter(record => record.attendance_type === 'early_leave');
    
    // 计算统计数据
    const lateCount = lateRecords.length;
    const earlyLeaveCount = earlyLeaveRecords.length;
    const totalLateMinutes = lateRecords.reduce((sum, record) => sum + (record.late_minutes || 0), 0);
    const totalEarlyLeaveMinutes = earlyLeaveRecords.reduce((sum, record) => sum + (record.early_leave_minutes || 0), 0);
    
    // 格式化时间
    const formatTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}小时${mins}分钟`;
    };
    
    res.json({
      data: {
        employee_number: employee.employee_id,
        name: employee.name,
        year: parseInt(year),
        month: parseInt(month),
        late_count: lateCount,
        early_leave_count: earlyLeaveCount,
        formatted_late_time: formatTime(totalLateMinutes),
        formatted_early_leave_time: formatTime(totalEarlyLeaveMinutes),
        late_records: lateRecords.map(record => ({
          date: record.date,
          check_in_time: record.check_in_time,
          late_minutes: record.late_minutes || 0,
          reason: record.reason || ''
        })),
        early_leave_records: earlyLeaveRecords.map(record => ({
          date: record.date,
          check_out_time: record.check_out_time,
          early_leave_minutes: record.early_leave_minutes || 0,
          reason: record.reason || ''
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取员工年度迟到早退详情
router.get('/yearly/:year/employee/:id', async (req, res) => {
  try {
    const { year, id } = req.params;
    
    // 验证年份
    if (!year || isNaN(year)) {
      return res.status(400).json({ error: '请提供有效的年份' });
    }
    
    const yearNum = parseInt(year);
    
    // 计算年份的开始和结束日期
    const startDate = moment(`${yearNum}-01-01`).startOf('year').format('YYYY-MM-DD');
    const endDate = moment(`${yearNum}-12-31`).endOf('year').format('YYYY-MM-DD');
    
    // 获取员工信息
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();
    
    if (employeeError) throw employeeError;
    if (!employee) return res.status(404).json({ error: '员工不存在' });
    
    // 获取该年份的迟到早退记录
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', id)
      .gte('date', startDate)
      .lte('date', endDate)
      .in('attendance_type', ['late', 'early_leave'])
      .order('date', { ascending: true });
    
    if (attendanceError) throw attendanceError;
    
    // 分离迟到和早退记录
    const lateRecords = attendanceRecords.filter(record => record.attendance_type === 'late');
    const earlyLeaveRecords = attendanceRecords.filter(record => record.attendance_type === 'early_leave');
    
    // 计算统计数据
    const lateCount = lateRecords.length;
    const earlyLeaveCount = earlyLeaveRecords.length;
    const totalLateMinutes = lateRecords.reduce((sum, record) => sum + (record.late_minutes || 0), 0);
    const totalEarlyLeaveMinutes = earlyLeaveRecords.reduce((sum, record) => sum + (record.early_leave_minutes || 0), 0);
    
    // 格式化时间
    const formatTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}小时${mins}分钟`;
    };
    
    res.json({
      data: {
        employee_number: employee.employee_id,
        name: employee.name,
        year: parseInt(year),
        month: null, // 年度统计不包含月份
        late_count: lateCount,
        early_leave_count: earlyLeaveCount,
        formatted_late_time: formatTime(totalLateMinutes),
        formatted_early_leave_time: formatTime(totalEarlyLeaveMinutes),
        late_records: lateRecords.map(record => ({
          date: record.date,
          check_in_time: record.check_in_time,
          late_minutes: record.late_minutes || 0,
          reason: record.reason || ''
        })),
        early_leave_records: earlyLeaveRecords.map(record => ({
          date: record.date,
          check_out_time: record.check_out_time,
          early_leave_minutes: record.early_leave_minutes || 0,
          reason: record.reason || ''
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取员工个人迟到早退统计
router.get('/employee/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;
    
    // 获取员工信息
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();
    
    if (employeeError) throw employeeError;
    if (!employee) return res.status(404).json({ error: '员工不存在' });
    
    // 构建查询条件
    let query = supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', id)
      .in('attendance_type', ['late', 'early_leave']);
    
    if (start_date) {
      query = query.gte('date', start_date);
    }
    
    if (end_date) {
      query = query.lte('date', end_date);
    }
    
    // 如果没有指定日期范围，默认查询当年
    if (!start_date && !end_date) {
      const currentYear = new Date().getFullYear();
      query = query.gte('date', `${currentYear}-01-01`).lte('date', `${currentYear}-12-31`);
    }
    
    const { data: attendanceRecords, error: attendanceError } = await query.order('date', { ascending: true });
    
    if (attendanceError) throw attendanceError;
    
    // 分离迟到和早退记录
    const lateRecords = attendanceRecords.filter(record => record.attendance_type === 'late');
    const earlyLeaveRecords = attendanceRecords.filter(record => record.attendance_type === 'early_leave');
    
    // 计算统计数据
    const lateCount = lateRecords.length;
    const earlyLeaveCount = earlyLeaveRecords.length;
    const totalLateMinutes = lateRecords.reduce((sum, record) => sum + (record.late_minutes || 0), 0);
    const totalEarlyLeaveMinutes = earlyLeaveRecords.reduce((sum, record) => sum + (record.early_leave_minutes || 0), 0);
    
    // 格式化时间
    const formatTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}小时${mins}分钟`;
    };
    
    // 按月统计
    const monthlyStats = {};
    attendanceRecords.forEach(record => {
      const month = moment(record.date).format('YYYY-MM');
      
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          month,
          late_records: [],
          early_leave_records: [],
          late_count: 0,
          early_leave_count: 0,
          late_minutes: 0,
          early_leave_minutes: 0
        };
      }
      
      if (record.attendance_type === 'late') {
        monthlyStats[month].late_records.push(record);
        monthlyStats[month].late_count += 1;
        monthlyStats[month].late_minutes += record.late_minutes || 0;
      } else if (record.attendance_type === 'early_leave') {
        monthlyStats[month].early_leave_records.push(record);
        monthlyStats[month].early_leave_count += 1;
        monthlyStats[month].early_leave_minutes += record.early_leave_minutes || 0;
      }
    });
    
    // 转换为数组并按月份排序
    const monthlyStatistics = Object.values(monthlyStats)
      .map(stat => ({
        month: stat.month,
        late_count: stat.late_count,
        early_leave_count: stat.early_leave_count,
        late_minutes: stat.late_minutes,
        early_leave_minutes: stat.early_leave_minutes,
        formatted_late_time: formatTime(stat.late_minutes),
        formatted_early_leave_time: formatTime(stat.early_leave_minutes),
        late_records: stat.late_records.map(record => ({
          date: record.date,
          check_in_time: record.check_in_time,
          late_minutes: record.late_minutes,
          reason: record.reason
        })),
        early_leave_records: stat.early_leave_records.map(record => ({
          date: record.date,
          check_out_time: record.check_out_time,
          early_leave_minutes: record.early_leave_minutes,
          reason: record.reason
        }))
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    res.json({
      employee: {
        id: employee.id,
        employee_id: employee.employee_id,
        name: employee.name,
        position: employee.position
      },
      statistics: {
        late_count: lateCount,
        early_leave_count: earlyLeaveCount,
        total_late_minutes: totalLateMinutes,
        total_early_leave_minutes: totalEarlyLeaveMinutes,
        formatted_late_time: formatTime(totalLateMinutes),
        formatted_early_leave_time: formatTime(totalEarlyLeaveMinutes)
      },
      monthly_statistics: monthlyStatistics,
      late_records: lateRecords.map(record => ({
        date: record.date,
        check_in_time: record.check_in_time,
        late_minutes: record.late_minutes,
        reason: record.reason
      })),
      early_leave_records: earlyLeaveRecords.map(record => ({
        date: record.date,
        check_out_time: record.check_out_time,
        early_leave_minutes: record.early_leave_minutes,
        reason: record.reason
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;