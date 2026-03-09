const express = require('express');
const router = express.Router();
const supabase = require('../config/database');
const moment = require('moment');
const holidayCalculator = require('./holidays-data');

// 获取员工月度缺勤统计
router.get('/monthly/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    // 验证年份和月份
    if (!year || !month || isNaN(year) || isNaN(month)) {
      return res.status(400).json({ error: '请提供有效的年份和月份' });
    }
    
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: '月份必须在1-12之间' });
    }
    
    // 计算月份的开始和结束日期
    const startDate = moment(`${year}-${monthNum.toString().padStart(2, '0')}-01`).startOf('month').format('YYYY-MM-DD');
    const endDate = moment(`${year}-${monthNum.toString().padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');
    
    // 获取当前日期
    const currentDate = moment().format('YYYY-MM-DD');
    // 确定实际结束日期（不超过当前日期）
    const actualEndDate = moment(currentDate).isBefore(endDate) ? currentDate : endDate;
    
    // 使用节假日计算器计算工作日天数
    const workDays = await holidayCalculator.getMonthWorkDays(yearNum, monthNum);
    
    // 计算到当前日期为止的工作日天数
    let currentWorkDays = 0;
    try {
      if (moment(actualEndDate).isAfter(startDate) || moment(actualEndDate).isSame(startDate)) {
        // 获取从开始日期到实际结束日期的节假日信息
        const holidayInfo = await holidayCalculator.getHolidayInfo(startDate, actualEndDate);
        currentWorkDays = holidayInfo.workDates.length;
      }
    } catch (error) {
      console.error('计算当前工作日天数失败:', error);
      // 如果计算失败，使用本地计算作为备份
      let start = moment(startDate);
      const end = moment(actualEndDate);
      while (start.isSameOrBefore(end)) {
        const dayOfWeek = start.day();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          currentWorkDays++;
        }
        start.add(1, 'days');
      }
    }
    
    // 获取所有员工
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, employee_id, name');
    
    if (employeesError) throw employeesError;
    
    // 获取该月份的所有缺勤记录
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (attendanceError) throw attendanceError;
    
    // 为每个员工统计考勤情况
    const statistics = employees.map(employee => {
      const employeeRecords = attendanceRecords.filter(record => 
        record.employee_id === employee.id
      );
      
      // 计算各种缺勤类型的次数
      const morningAbsences = employeeRecords.filter(record => 
        record.attendance_type === 'absence' && record.absence_type === 'morning'
      ).length;
      
      const afternoonAbsences = employeeRecords.filter(record => 
        record.attendance_type === 'absence' && record.absence_type === 'afternoon'
      ).length;
      
      const fullDayAbsences = employeeRecords.filter(record => 
        record.attendance_type === 'absence' && record.absence_type === 'full_day'
      ).length;
      
      // 计算迟到早退次数
      const lateCount = employeeRecords.filter(record => 
        record.attendance_type === 'late'
      ).length;
      
      const earlyLeaveCount = employeeRecords.filter(record => 
        record.attendance_type === 'early_leave'
      ).length;
      
      // 计算总迟到和早退分钟数
      const totalLateMinutes = employeeRecords
        .filter(record => record.attendance_type === 'late')
        .reduce((sum, record) => sum + (record.late_minutes || 0), 0);
        
      const totalEarlyLeaveMinutes = employeeRecords
        .filter(record => record.attendance_type === 'early_leave')
        .reduce((sum, record) => sum + (record.early_leave_minutes || 0), 0);
      
      // 计算总缺勤天数（全天缺勤算1天，上午或下午缺勤算0.5天）
      const totalAbsenceDays = fullDayAbsences + (morningAbsences + afternoonAbsences) * 0.5;
      
      // 计算到当前日期为止的缺勤天数
      const currentAbsenceDays = employeeRecords
        .filter(record => new Date(record.date) <= new Date(actualEndDate) && record.attendance_type === 'absence')
        .reduce((sum, record) => {
          if (record.absence_type === 'full_day') {
            return sum + 1;
          } else if (record.absence_type === 'morning' || record.absence_type === 'afternoon') {
            return sum + 0.5;
          }
          return sum;
        }, 0);
      
      // 计算考勤异常次数
      const abnormalCount = lateCount + earlyLeaveCount + fullDayAbsences + morningAbsences + afternoonAbsences;
      
      // 计算应到天数和实到天数
      const shouldAttendDays = workDays;
      const actualAttendDays = shouldAttendDays - totalAbsenceDays;
      
      // 计算到当前日期为止的应到天数和实到天数
      const currentShouldAttendDays = currentWorkDays;
      const currentActualAttendDays = currentShouldAttendDays - currentAbsenceDays;
      
      // 确定使用的工作天数（如果月份已过去，使用完整工作天数；否则使用到当前日期的工作天数）
      const isMonthPast = moment().isAfter(endDate);
      const usedWorkDays = isMonthPast ? workDays : currentWorkDays;
      const usedAbsenceDays = isMonthPast ? totalAbsenceDays : currentAbsenceDays;
      
      // 计算缺勤比（缺勤天数/上班总天数）
      const absenceRatio = usedWorkDays > 0 ? parseFloat((usedAbsenceDays / usedWorkDays).toFixed(3)) : 0;
      
      // 计算实时出勤率
      const currentAttendanceRate = currentShouldAttendDays > 0 ? parseFloat(((currentActualAttendDays / currentShouldAttendDays) * 100).toFixed(1)) : 0;
      
      return {
        employee_id: employee.id,
        employee_number: employee.employee_id,
        name: employee.name,
        month: parseInt(month),
        year: parseInt(year),
        morning_absences: morningAbsences,
        afternoon_absences: afternoonAbsences,
        full_day_absences: fullDayAbsences,
        total_absence_days: parseFloat(totalAbsenceDays.toFixed(1)),
        current_absence_days: parseFloat(currentAbsenceDays.toFixed(1)),
        late_count: lateCount,
        early_leave_count: earlyLeaveCount,
        total_late_minutes: totalLateMinutes,
        total_early_leave_minutes: totalEarlyLeaveMinutes,
        should_attend_days: shouldAttendDays,
        actual_attend_days: actualAttendDays,
        current_should_attend_days: currentShouldAttendDays,
        current_actual_attend_days: currentActualAttendDays,
        abnormal_count: abnormalCount,
        absence_ratio: absenceRatio,
        current_attendance_rate: currentAttendanceRate
      };
    });
    
    // 按总缺勤天数降序排序
    statistics.sort((a, b) => b.total_absence_days - a.total_absence_days);
    
    // 计算汇总数据
    const totalCurrentAbsenceDays = parseFloat(statistics.reduce((sum, s) => sum + s.current_absence_days, 0).toFixed(1));
    const totalCurrentShouldAttendDays = statistics[0] ? statistics[0].current_should_attend_days : 0;
    const averageCurrentAttendanceRate = totalCurrentShouldAttendDays > 0 ? 
      parseFloat(((totalCurrentShouldAttendDays * statistics.length - totalCurrentAbsenceDays) / (totalCurrentShouldAttendDays * statistics.length) * 100).toFixed(1)) : 0;
    
    res.json({
      period: {
        year: parseInt(year),
        month: parseInt(month),
        start_date: startDate,
        end_date: endDate,
        actual_end_date: actualEndDate
      },
      employee_statistics: statistics,
      summary: {
        total_employees: employees.length,
        work_days: workDays,
        current_work_days: currentWorkDays,
        employees_with_absences: statistics.filter(s => s.total_absence_days > 0).length,
        total_absence_days: parseFloat(statistics.reduce((sum, s) => sum + s.total_absence_days, 0).toFixed(1)),
        current_absence_days: totalCurrentAbsenceDays,
        total_full_day_absences: statistics.reduce((sum, s) => sum + s.full_day_absences, 0),
        total_morning_absences: statistics.reduce((sum, s) => sum + s.morning_absences, 0),
        total_afternoon_absences: statistics.reduce((sum, s) => sum + s.afternoon_absences, 0),
        total_late_count: statistics.reduce((sum, s) => sum + s.late_count, 0),
        total_early_leave_count: statistics.reduce((sum, s) => sum + s.early_leave_count, 0),
        total_late_minutes: statistics.reduce((sum, s) => sum + s.total_late_minutes, 0),
        total_early_leave_minutes: statistics.reduce((sum, s) => sum + s.total_early_leave_minutes, 0),
        average_absence_days_per_employee: parseFloat((statistics.reduce((sum, s) => sum + s.total_absence_days, 0) / employees.length).toFixed(1)),
        average_late_count_per_employee: parseFloat((statistics.reduce((sum, s) => sum + s.late_count, 0) / employees.length).toFixed(1)),
        average_early_leave_count_per_employee: parseFloat((statistics.reduce((sum, s) => sum + s.early_leave_count, 0) / employees.length).toFixed(1)),
        total_abnormal_count: statistics.reduce((sum, s) => sum + s.abnormal_count, 0),
        average_absence_ratio: parseFloat((statistics.reduce((sum, s) => sum + s.absence_ratio, 0) / employees.length).toFixed(3)),
        average_current_attendance_rate: averageCurrentAttendanceRate
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取员工年度缺勤统计
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
    
    // 获取当前日期
    const currentDate = moment().format('YYYY-MM-DD');
    // 确定实际结束日期（不超过当前日期）
    const actualEndDate = moment(currentDate).isBefore(endDate) ? currentDate : endDate;
    
    // 使用节假日计算器计算工作日天数
    const workDays = await holidayCalculator.getYearWorkDays(yearNum);
    
    // 计算到当前日期为止的工作日天数
    let currentWorkDays = 0;
    try {
      if (moment(actualEndDate).isAfter(startDate) || moment(actualEndDate).isSame(startDate)) {
        // 获取从开始日期到实际结束日期的节假日信息
        const holidayInfo = await holidayCalculator.getHolidayInfo(startDate, actualEndDate);
        currentWorkDays = holidayInfo.workDates.length;
      }
    } catch (error) {
      console.error('计算当前工作日天数失败:', error);
      // 如果计算失败，使用本地计算作为备份
      let start = moment(startDate);
      const end = moment(actualEndDate);
      while (start.isSameOrBefore(end)) {
        const dayOfWeek = start.day();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          currentWorkDays++;
        }
        start.add(1, 'days');
      }
    }
    
    // 获取所有员工
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, employee_id, name');
    
    if (employeesError) throw employeesError;
    
    // 获取该年份的所有缺勤记录
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (attendanceError) throw attendanceError;
    
    // 为每个员工统计年度考勤情况
    const statistics = employees.map(employee => {
      const employeeRecords = attendanceRecords.filter(record => 
        record.employee_id === employee.id
      );
      
      // 计算各种缺勤类型的次数
      const morningAbsences = employeeRecords.filter(record => 
        record.attendance_type === 'absence' && record.absence_type === 'morning'
      ).length;
      
      const afternoonAbsences = employeeRecords.filter(record => 
        record.attendance_type === 'absence' && record.absence_type === 'afternoon'
      ).length;
      
      const fullDayAbsences = employeeRecords.filter(record => 
        record.attendance_type === 'absence' && record.absence_type === 'full_day'
      ).length;
      
      // 计算迟到早退次数
      const lateCount = employeeRecords.filter(record => 
        record.attendance_type === 'late'
      ).length;
      
      const earlyLeaveCount = employeeRecords.filter(record => 
        record.attendance_type === 'early_leave'
      ).length;
      
      // 计算总迟到和早退分钟数
      const totalLateMinutes = employeeRecords
        .filter(record => record.attendance_type === 'late')
        .reduce((sum, record) => sum + (record.late_minutes || 0), 0);
        
      const totalEarlyLeaveMinutes = employeeRecords
        .filter(record => record.attendance_type === 'early_leave')
        .reduce((sum, record) => sum + (record.early_leave_minutes || 0), 0);
      
      // 计算总缺勤天数（全天缺勤算1天，上午或下午缺勤算0.5天）
      const totalAbsenceDays = fullDayAbsences + (morningAbsences + afternoonAbsences) * 0.5;
      
      // 计算到当前日期为止的缺勤天数
      const currentAbsenceDays = employeeRecords
        .filter(record => new Date(record.date) <= new Date(actualEndDate) && record.attendance_type === 'absence')
        .reduce((sum, record) => {
          if (record.absence_type === 'full_day') {
            return sum + 1;
          } else if (record.absence_type === 'morning' || record.absence_type === 'afternoon') {
            return sum + 0.5;
          }
          return sum;
        }, 0);
      
      // 计算考勤异常次数（迟到+早退+缺勤）
      const abnormalCount = lateCount + earlyLeaveCount + fullDayAbsences + morningAbsences + afternoonAbsences;
      
      // 计算应到天数（已排除周末）
      const shouldAttendDays = workDays;
      
      // 计算实到天数
      const actualAttendDays = shouldAttendDays - totalAbsenceDays;
      
      // 计算到当前日期为止的应到天数和实到天数
      const currentShouldAttendDays = currentWorkDays;
      const currentActualAttendDays = currentShouldAttendDays - currentAbsenceDays;
      
      // 计算出勤率
      const attendanceRate = workDays > 0 ? parseFloat(((actualAttendDays / workDays) * 100).toFixed(1)) : 0;
      
      // 计算实时出勤率
      const currentAttendanceRate = currentShouldAttendDays > 0 ? parseFloat(((currentActualAttendDays / currentShouldAttendDays) * 100).toFixed(1)) : 0;
      
      // 计算迟到率
      const lateRate = workDays > 0 ? parseFloat(((lateCount / workDays) * 100).toFixed(1)) : 0;
      
      // 计算早退率
      const earlyLeaveRate = workDays > 0 ? parseFloat(((earlyLeaveCount / workDays) * 100).toFixed(1)) : 0;
      
      // 计算缺勤率
      const absenceRate = workDays > 0 ? parseFloat(((totalAbsenceDays / workDays) * 100).toFixed(1)) : 0;
      
      // 计算实时缺勤率
      const currentAbsenceRate = currentShouldAttendDays > 0 ? parseFloat(((currentAbsenceDays / currentShouldAttendDays) * 100).toFixed(1)) : 0;
      
      // 确定使用的工作天数（如果年份已过去，使用完整工作天数；否则使用到当前日期的工作天数）
      const isYearPast = moment().isAfter(endDate);
      const usedWorkDays = isYearPast ? workDays : currentWorkDays;
      const usedAbsenceDays = isYearPast ? totalAbsenceDays : currentAbsenceDays;
      
      // 计算缺勤比（缺勤天数/上班总天数）
      const absenceRatio = usedWorkDays > 0 ? parseFloat((usedAbsenceDays / usedWorkDays).toFixed(3)) : 0;
      
      // 按月统计
      const monthlyStats = {};
      for (let month = 1; month <= 12; month++) {
        const monthStart = moment(`${yearNum}-${month.toString().padStart(2, '0')}-01`).startOf('month').format('YYYY-MM-DD');
        const monthEnd = moment(`${yearNum}-${month.toString().padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');
        
        const monthRecords = employeeRecords.filter(record => 
          record.date >= monthStart && record.date <= monthEnd
        );
        
        const monthMorning = monthRecords.filter(r => r.absence_type === 'morning').length;
        const monthAfternoon = monthRecords.filter(r => r.absence_type === 'afternoon').length;
        const monthFullDay = monthRecords.filter(r => r.absence_type === 'full_day').length;
        const monthTotal = monthFullDay + (monthMorning + monthAfternoon) * 0.5;
        
        // 计算每月迟到早退统计
        const monthLateCount = monthRecords.filter(r => r.attendance_type === 'late').length;
        const monthEarlyLeaveCount = monthRecords.filter(r => r.attendance_type === 'early_leave').length;
        const monthLateMinutes = monthRecords
          .filter(r => r.attendance_type === 'late')
          .reduce((sum, record) => sum + (record.late_minutes || 0), 0);
        const monthEarlyLeaveMinutes = monthRecords
          .filter(r => r.attendance_type === 'early_leave')
          .reduce((sum, record) => sum + (record.early_leave_minutes || 0), 0);
        
        monthlyStats[month] = {
          morning_absences: monthMorning,
          afternoon_absences: monthAfternoon,
          full_day_absences: monthFullDay,
          total_absence_days: parseFloat(monthTotal.toFixed(1)),
          late_count: monthLateCount,
          early_leave_count: monthEarlyLeaveCount,
          late_minutes: monthLateMinutes,
          early_leave_minutes: monthEarlyLeaveMinutes
        };
      }
      
      return {
        employee_id: employee.id,
        employee_number: employee.employee_id,
        name: employee.name,
        year: yearNum,
        morning_absences: morningAbsences,
        afternoon_absences: afternoonAbsences,
        full_day_absences: fullDayAbsences,
        total_absence_days: parseFloat(totalAbsenceDays.toFixed(1)),
        current_absence_days: parseFloat(currentAbsenceDays.toFixed(1)),
        late_count: lateCount,
        early_leave_count: earlyLeaveCount,
        total_late_minutes: totalLateMinutes,
        total_early_leave_minutes: totalEarlyLeaveMinutes,
        abnormal_count: abnormalCount,
        should_attend_days: shouldAttendDays,
        actual_attend_days: actualAttendDays,
        current_should_attend_days: currentShouldAttendDays,
        current_actual_attend_days: currentActualAttendDays,
        attendance_rate: attendanceRate,
        current_attendance_rate: currentAttendanceRate,
        late_rate: lateRate,
        early_leave_rate: earlyLeaveRate,
        absence_rate: absenceRate,
        current_absence_rate: currentAbsenceRate,
        absence_ratio: absenceRatio,
        monthly_statistics: monthlyStats
      };
    });
    
    // 按总缺勤天数降序排序
    statistics.sort((a, b) => b.total_absence_days - a.total_absence_days);
    
    // 计算月度趋势
    const monthlyTrend = [];
    for (let month = 1; month <= 12; month++) {
      const monthStats = statistics.reduce((acc, stat) => {
        const monthData = stat.monthly_statistics[month];
        return {
          total_absence_days: acc.total_absence_days + monthData.total_absence_days,
          full_day_absences: acc.full_day_absences + monthData.full_day_absences,
          morning_absences: acc.morning_absences + monthData.morning_absences,
          afternoon_absences: acc.afternoon_absences + monthData.afternoon_absences,
          late_count: acc.late_count + monthData.late_count,
          early_leave_count: acc.early_leave_count + monthData.early_leave_count,
          late_minutes: acc.late_minutes + monthData.late_minutes,
          early_leave_minutes: acc.early_leave_minutes + monthData.early_leave_minutes
        };
      }, {
        total_absence_days: 0,
        full_day_absences: 0,
        morning_absences: 0,
        afternoon_absences: 0,
        late_count: 0,
        early_leave_count: 0,
        late_minutes: 0,
        early_leave_minutes: 0
      });
      
      monthlyTrend.push({
        month,
        month_name: moment(`${yearNum}-${month.toString().padStart(2, '0')}-01`).format('MMMM'),
        ...monthStats,
        total_absence_days: parseFloat(monthStats.total_absence_days.toFixed(1))
      });
    }
    
    // 计算汇总数据
    const totalCurrentAbsenceDays = parseFloat(statistics.reduce((sum, s) => sum + s.current_absence_days, 0).toFixed(1));
    const totalCurrentShouldAttendDays = statistics[0] ? statistics[0].current_should_attend_days : 0;
    const averageCurrentAttendanceRate = totalCurrentShouldAttendDays > 0 ? 
      parseFloat(((totalCurrentShouldAttendDays * statistics.length - totalCurrentAbsenceDays) / (totalCurrentShouldAttendDays * statistics.length) * 100).toFixed(1)) : 0;
    
    res.json({
      period: {
        year: yearNum,
        start_date: startDate,
        end_date: endDate,
        actual_end_date: actualEndDate
      },
      employee_statistics: statistics,
      monthly_trend: monthlyTrend,
      summary: {
        total_employees: employees.length,
        work_days: workDays,
        current_work_days: currentWorkDays,
        employees_with_absences: statistics.filter(s => s.total_absence_days > 0).length,
        total_absence_days: parseFloat(statistics.reduce((sum, s) => sum + s.total_absence_days, 0).toFixed(1)),
        current_absence_days: totalCurrentAbsenceDays,
        total_full_day_absences: statistics.reduce((sum, s) => sum + s.full_day_absences, 0),
        total_morning_absences: statistics.reduce((sum, s) => sum + s.morning_absences, 0),
        total_afternoon_absences: statistics.reduce((sum, s) => sum + s.afternoon_absences, 0),
        total_late_count: statistics.reduce((sum, s) => sum + s.late_count, 0),
        total_early_leave_count: statistics.reduce((sum, s) => sum + s.early_leave_count, 0),
        total_late_minutes: statistics.reduce((sum, s) => sum + s.total_late_minutes, 0),
        total_early_leave_minutes: statistics.reduce((sum, s) => sum + s.total_early_leave_minutes, 0),
        average_absence_days_per_employee: parseFloat((statistics.reduce((sum, s) => sum + s.total_absence_days, 0) / employees.length).toFixed(1)),
        average_late_count_per_employee: parseFloat((statistics.reduce((sum, s) => sum + s.late_count, 0) / employees.length).toFixed(1)),
        average_early_leave_count_per_employee: parseFloat((statistics.reduce((sum, s) => sum + s.early_leave_count, 0) / employees.length).toFixed(1)),
        total_abnormal_count: statistics.reduce((sum, s) => sum + s.abnormal_count, 0),
        average_absence_ratio: parseFloat((statistics.reduce((sum, s) => sum + s.absence_ratio, 0) / employees.length).toFixed(3)),
        average_current_attendance_rate: averageCurrentAttendanceRate
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取员工个人缺勤统计
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
      .eq('employee_id', id);
    
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
    
    // 计算各种缺勤类型的次数
    const morningAbsences = attendanceRecords.filter(record => 
      record.absence_type === 'morning'
    ).length;
    
    const afternoonAbsences = attendanceRecords.filter(record => 
      record.absence_type === 'afternoon'
    ).length;
    
    const fullDayAbsences = attendanceRecords.filter(record => 
      record.absence_type === 'full_day'
    ).length;
    
    // 计算迟到早退次数
    const lateCount = attendanceRecords.filter(record => 
      record.attendance_type === 'late'
    ).length;
    
    const earlyLeaveCount = attendanceRecords.filter(record => 
      record.attendance_type === 'early_leave'
    ).length;
    
    // 计算总迟到和早退分钟数
    const totalLateMinutes = attendanceRecords
      .filter(record => record.attendance_type === 'late')
      .reduce((sum, record) => sum + (record.late_minutes || 0), 0);
      
    const totalEarlyLeaveMinutes = attendanceRecords
      .filter(record => record.attendance_type === 'early_leave')
      .reduce((sum, record) => sum + (record.early_leave_minutes || 0), 0);
    
    // 计算总缺勤天数
    const totalAbsenceDays = fullDayAbsences + (morningAbsences + afternoonAbsences) * 0.5;
    
    // 按月统计
    const monthlyStats = {};
    attendanceRecords.forEach(record => {
      const month = moment(record.date).format('YYYY-MM');
      
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          month,
          records: [],
          morning_absences: 0,
          afternoon_absences: 0,
          full_day_absences: 0,
          total_absence_days: 0,
          late_count: 0,
          early_leave_count: 0,
          late_minutes: 0,
          early_leave_minutes: 0
        };
      }
      
      monthlyStats[month].records.push(record);
      
      if (record.absence_type === 'morning') {
        monthlyStats[month].morning_absences += 1;
        monthlyStats[month].total_absence_days += 0.5;
      } else if (record.absence_type === 'afternoon') {
        monthlyStats[month].afternoon_absences += 1;
        monthlyStats[month].total_absence_days += 0.5;
      } else if (record.absence_type === 'full_day') {
        monthlyStats[month].full_day_absences += 1;
        monthlyStats[month].total_absence_days += 1;
      } else if (record.attendance_type === 'late') {
        monthlyStats[month].late_count += 1;
        monthlyStats[month].late_minutes += record.late_minutes || 0;
      } else if (record.attendance_type === 'early_leave') {
        monthlyStats[month].early_leave_count += 1;
        monthlyStats[month].early_leave_minutes += record.early_leave_minutes || 0;
      }
    });
    
    // 转换为数组并按月份排序
    const monthlyStatistics = Object.values(monthlyStats)
      .map(stat => ({
        ...stat,
        total_absence_days: parseFloat(stat.total_absence_days.toFixed(1))
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
        morning_absences: morningAbsences,
        afternoon_absences: afternoonAbsences,
        full_day_absences: fullDayAbsences,
        total_absence_days: parseFloat(totalAbsenceDays.toFixed(1)),
        late_count: lateCount,
        early_leave_count: earlyLeaveCount,
        total_late_minutes: totalLateMinutes,
        total_early_leave_minutes: totalEarlyLeaveMinutes
      },
      monthly_statistics: monthlyStatistics,
      records: attendanceRecords
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;