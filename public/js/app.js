// 全局变量
let currentPage = 1;
let currentFilter = {};
let recentChart = null;
let monthChart = null;
let quarterChart = null;
let statsAbsenceTypeChart = null;

// 确保Chart.js加载
function ensureChartLoaded() {
    return new Promise((resolve) => {
        if (typeof Chart !== 'undefined') {
            resolve();
            return;
        }
        
        // 如果Chart未加载，动态加载Chart.js
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = resolve;
        script.onerror = resolve; // 即使加载失败也继续执行
        document.head.appendChild(script);
    });
}

// DOM加载完成后执行
document.addEventListener('DOMContentLoaded', async function() {
    // 确保Chart.js加载
    await ensureChartLoaded();
    
    // 初始化导航
    initNavigation();
    
    // 加载仪表盘数据
    loadDashboardData();
    
    // 初始化事件监听器
    initEventListeners();
    
    // 初始化年份选项
    initYearOptions();
    
    // 设置当前日期为默认值
    setCurrentDate();
});

// 初始化导航
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 移除所有活动状态
            navLinks.forEach(l => l.classList.remove('active'));
            
            // 添加当前活动状态
            this.classList.add('active');
            
            // 隐藏所有内容部分
            document.querySelectorAll('.content-section').forEach(section => {
                section.style.display = 'none';
            });
            
            // 显示对应内容部分
            const sectionId = this.getAttribute('data-section');
            const section = document.getElementById(`${sectionId}-section`);
            if (section) {
                section.style.display = 'block';
                
                // 根据不同部分加载相应数据
                if (sectionId === 'employees') {
                    loadEmployees();
                } else if (sectionId === 'attendance') {
                    loadAttendance();
                    loadEmployeesForSelect();
                } else if (sectionId === 'statistics') {
                    // 不需要加载部门选择列表
                }
            }
        });
    });
}

// 初始化事件监听器
function initEventListeners() {
    // 员工表单提交
    document.getElementById('save-employee').addEventListener('click', saveEmployee);
    
    // 考勤记录表单提交
    document.getElementById('save-attendance').addEventListener('click', saveAttendance);
    
    // 考勤类型切换
    document.getElementById('attendance-type').addEventListener('change', function() {
        const attendanceType = this.value;
        
        // 隐藏所有选项组
        document.getElementById('absence-type-group').style.display = 'none';
        document.getElementById('late-options-group').style.display = 'none';
        document.getElementById('early-leave-options-group').style.display = 'none';
        
        // 根据选择的考勤类型显示对应的选项组
        if (attendanceType === 'absence') {
            document.getElementById('absence-type-group').style.display = 'block';
        } else if (attendanceType === 'late') {
            document.getElementById('late-options-group').style.display = 'block';
        } else if (attendanceType === 'early_leave') {
            document.getElementById('early-leave-options-group').style.display = 'block';
        }
    });
    
    // 筛选按钮
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    
    // 统计类型切换
    document.getElementById('stats-type').addEventListener('change', function() {
        const monthCol = document.getElementById('stats-month').closest('.col-md-4');
        const yearCol = document.getElementById('stats-year').closest('.col-md-4');
        
        if (this.value === 'yearly') {
            monthCol.style.display = 'none';
            yearCol.className = 'col-md-6';
            document.getElementById('stats-type').closest('.col-md-4').className = 'col-md-6';
        } else {
            monthCol.style.display = 'block';
            yearCol.className = 'col-md-4';
            document.getElementById('stats-type').closest('.col-md-4').className = 'col-md-4';
            // 重置月份为当前月份
            const currentMonth = new Date().getMonth() + 1;
            document.getElementById('stats-month').value = currentMonth;
        }
    });
    
    // 生成统计按钮
    document.getElementById('generate-stats').addEventListener('click', generateStatistics);
    
    // 导出按钮
    document.getElementById('export-monthly').addEventListener('click', exportMonthlyRecords);
    document.getElementById('export-yearly').addEventListener('click', exportYearlyRecords);
}

// 初始化年份选项
function initYearOptions() {
    const currentYear = new Date().getFullYear();
    const statsYearSelect = document.getElementById('stats-year');
    
    for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + '年';
        if (year === currentYear) {
            option.selected = true;
        }
        statsYearSelect.appendChild(option);
    }
    
    // 设置当前月份
    const currentMonth = new Date().getMonth() + 1;
    document.getElementById('stats-month').value = currentMonth;
}

// 设置当前日期为默认值
function setCurrentDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendance-date').value = today;
    document.getElementById('filter-start-date').value = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('filter-end-date').value = today;
}

// API请求函数
async function apiRequest(url, options = {}) {
    try {
        // 添加完整的URL
        const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
        
        const response = await fetch(fullUrl, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '请求失败');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API请求错误:', error);
        // 不要显示错误提示，因为这会打扰用户
        // showAlert(error.message, 'danger');
        throw error;
    }
}

// 显示提示信息
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.querySelector('.container').insertAdjacentElement('afterbegin', alertDiv);
    
    // 5秒后自动关闭
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// 加载仪表盘数据
async function loadDashboardData() {
    try {
        // 加载员工总数
        const employees = await apiRequest('/api/employees');
        document.getElementById('total-employees').textContent = employees.length;
        
        // 加载今日缺勤次数
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = await apiRequest(`/api/attendance?start_date=${today}&end_date=${today}`);
        document.getElementById('today-absences').textContent = todayRecords.records.length;
        
        // 加载本月缺勤天数
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const monthlyStats = await apiRequest(`/api/statistics/monthly/${currentYear}/${currentMonth}`);
        document.getElementById('monthly-absences').textContent = monthlyStats.summary.total_absence_days;
        
        // 加载本年缺勤天数
        const yearlyStats = await apiRequest(`/api/statistics/yearly/${currentYear}`);
        document.getElementById('yearly-absences').textContent = yearlyStats.summary.total_absence_days;
        
        // 加载最近缺勤记录
        const recentRecords = await apiRequest('/api/attendance?limit=5');
        const recentAttendanceTable = document.getElementById('recent-attendance');
        
        if (recentRecords.records.length === 0) {
            recentAttendanceTable.innerHTML = '<tr><td colspan="3" class="text-center">暂无记录</td></tr>';
        } else {
            recentAttendanceTable.innerHTML = recentRecords.records.map(record => {
                // 根据考勤类型显示不同的信息
                let typeText = '';
                let rowClass = '';
                
                if (record.attendance_type === 'absence') {
                    typeText = getAbsenceTypeText(record.absence_type);
                    // 缺勤记录使用浅红色背景
                    rowClass = 'table-light-danger';
                } else if (record.attendance_type === 'late') {
                    typeText = '迟到';
                    // 迟到记录使用浅黄色背景
                    rowClass = 'table-light-warning';
                } else if (record.attendance_type === 'early_leave') {
                    typeText = '早退';
                    // 早退记录使用浅蓝色背景
                    rowClass = 'table-light-info';
                } else {
                    typeText = getAttendanceTypeText(record.attendance_type);
                }
                
                return `
                    <tr class="${rowClass}">
                        <td>${record.employee ? record.employee.name : '未知'}</td>
                        <td>${record.date}</td>
                        <td>${typeText}</td>
                    </tr>
                `;
            }).join('');
        }
        
        // 加载最近一个月缺勤记录
        await loadMonthAttendanceData();
        
        // 加载最近三个月缺勤记录
        await loadQuarterAttendanceData();
        
        // 绘制最近记录的缺勤类型分布图表
        drawRecentTypeChart(recentRecords.records);
        
        // 绘制最近一个月缺勤人员天数对比图表
        drawMonthChart(monthlyStats.employee_statistics);
        
        // 绘制最近三个月缺勤人员天数对比图表
        await drawQuarterChart(monthlyStats.employee_statistics);
    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
    }
}

// 加载最近一个月缺勤记录
async function loadMonthAttendanceData() {
    try {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const monthlyStats = await apiRequest(`/api/statistics/monthly/${currentYear}/${currentMonth}`);
        const monthAttendanceTable = document.getElementById('month-attendance');
        
        // 过滤出有缺勤记录的员工
        const employeesWithAbsences = monthlyStats.employee_statistics.filter(emp => emp.total_absence_days > 0);
        
        if (employeesWithAbsences.length === 0) {
            monthAttendanceTable.innerHTML = '<tr><td colspan="3" class="text-center">暂无记录</td></tr>';
        } else {
            // 按缺勤天数降序排序
            employeesWithAbsences.sort((a, b) => b.total_absence_days - a.total_absence_days);
            
            monthAttendanceTable.innerHTML = employeesWithAbsences.map(emp => `
                <tr class="table-light-danger">
                    <td>${emp.name}</td>
                    <td>${emp.total_absence_days} 天</td>
                    <td>
                        <small>
                            上午: ${emp.morning_absences}次, 
                            下午: ${emp.afternoon_absences}次, 
                            全天: ${emp.full_day_absences}次
                        </small>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('加载最近一个月缺勤记录失败:', error);
        document.getElementById('month-attendance').innerHTML = '<tr><td colspan="3" class="text-center">加载失败</td></tr>';
    }
}

// 加载最近三个月缺勤记录
async function loadQuarterAttendanceData() {
    try {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        // 计算最近三个月的统计数据
        let quarterStats = [];
        
        for (let i = 0; i < 3; i++) {
            let month = currentMonth - i;
            let year = currentYear;
            
            if (month <= 0) {
                month += 12;
                year -= 1;
            }
            
            const monthlyStats = await apiRequest(`/api/statistics/monthly/${year}/${month}`);
            quarterStats.push(...monthlyStats.employee_statistics);
        }
        
        // 按员工ID分组并汇总缺勤天数
        const employeeMap = new Map();
        
        quarterStats.forEach(emp => {
            if (emp.total_absence_days > 0) {
                if (employeeMap.has(emp.employee_id)) {
                    const existing = employeeMap.get(emp.employee_id);
                    existing.total_absence_days += emp.total_absence_days;
                    existing.morning_absences += emp.morning_absences;
                    existing.afternoon_absences += emp.afternoon_absences;
                    existing.full_day_absences += emp.full_day_absences;
                } else {
                    employeeMap.set(emp.employee_id, { ...emp });
                }
            }
        });
        
        const quarterAttendanceTable = document.getElementById('quarter-attendance');
        const employeesWithAbsences = Array.from(employeeMap.values());
        
        if (employeesWithAbsences.length === 0) {
            quarterAttendanceTable.innerHTML = '<tr><td colspan="3" class="text-center">暂无记录</td></tr>';
        } else {
            // 按缺勤天数降序排序
            employeesWithAbsences.sort((a, b) => b.total_absence_days - a.total_absence_days);
            
            quarterAttendanceTable.innerHTML = employeesWithAbsences.map(emp => `
                <tr class="table-light-danger">
                    <td>${emp.name}</td>
                    <td>${emp.total_absence_days.toFixed(1)} 天</td>
                    <td>
                        <small>
                            上午: ${emp.morning_absences}次, 
                            下午: ${emp.afternoon_absences}次, 
                            全天: ${emp.full_day_absences}次
                        </small>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('加载最近三个月缺勤记录失败:', error);
        document.getElementById('quarter-attendance').innerHTML = '<tr><td colspan="3" class="text-center">加载失败</td></tr>';
    }
}

// 绘制缺勤人员天数分布图表
// 绘制最近记录的缺勤类型分布图表
function drawRecentTypeChart(recentRecords) {
    const ctx = document.getElementById('recent-chart').getContext('2d');
    
    // 销毁旧图表
    if (recentChart) {
        recentChart.destroy();
    }
    
    // 统计考勤类型
    const typeCounts = {};
    
    recentRecords.forEach(record => {
        let typeText = '';
        if (record.attendance_type === 'absence') {
            // 只统计非none的缺勤类型
            if (record.absence_type && record.absence_type !== 'none') {
                typeText = getAbsenceTypeText(record.absence_type);
            }
        } else if (record.attendance_type === 'late') {
            typeText = '迟到';
        } else if (record.attendance_type === 'early_leave') {
            typeText = '早退';
        }
        
        // 只统计有效的类型
        if (typeText) {
            typeCounts[typeText] = (typeCounts[typeText] || 0) + 1;
        }
    });
    
    // 如果没有数据，显示提示
    if (Object.keys(typeCounts).length === 0) {
        typeCounts['暂无数据'] = 1;
    }
    
    // 为不同类型设置颜色
    const colors = {
        '上午': 'rgba(255, 193, 7, 0.7)',      // 黄色
        '下午': 'rgba(13, 202, 240, 0.7)',    // 蓝色
        '全天': 'rgba(220, 53, 69, 0.7)',      // 红色
        '迟到': 'rgba(255, 99, 132, 0.7)',     // 粉红色
        '早退': 'rgba(54, 162, 235, 0.7)',     // 浅蓝色
        '暂无数据': 'rgba(200, 200, 200, 0.7)' // 灰色
    };
    
    const borderColors = {
        '上午': 'rgba(255, 193, 7, 1)',
        '下午': 'rgba(13, 202, 240, 1)',
        '全天': 'rgba(220, 53, 69, 1)',
        '迟到': 'rgba(255, 99, 132, 1)',
        '早退': 'rgba(54, 162, 235, 1)',
        '暂无数据': 'rgba(200, 200, 200, 1)'
    };
    
    // 获取对应的颜色数组
    const backgroundColors = Object.keys(typeCounts).map(type => colors[type] || 'rgba(153, 102, 255, 0.7)');
    const borderColorsArray = Object.keys(typeCounts).map(type => borderColors[type] || 'rgba(153, 102, 255, 1)');
    
    recentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(typeCounts),
            datasets: [{
                label: '考勤次数',
                data: Object.values(typeCounts),
                backgroundColor: backgroundColors,
                borderColor: borderColorsArray,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value}次 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 绘制最近一个月缺勤人员天数对比图表
function drawMonthChart(employeeStatistics) {
    const ctx = document.getElementById('month-chart').getContext('2d');
    
    // 销毁旧图表
    if (monthChart) {
        monthChart.destroy();
    }
    
    // 过滤出有缺勤记录的员工并按缺勤天数降序排序
    const employeesWithAbsences = employeeStatistics
        .filter(emp => emp.total_absence_days > 0)
        .sort((a, b) => b.total_absence_days - a.total_absence_days);
    
    // 如果没有缺勤记录，显示空图表
    if (employeesWithAbsences.length === 0) {
        monthChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['无缺勤记录'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['rgba(200, 200, 200, 0.7)'],
                    borderColor: ['rgba(200, 200, 200, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
        return;
    }
    
    // 生成颜色数组
    const colors = [
        'rgba(220, 53, 69, 0.7)',     // 红色
        'rgba(255, 133, 27, 0.7)',    // 橙色
        'rgba(255, 193, 7, 0.7)',     // 黄色
        'rgba(40, 167, 69, 0.7)',     // 绿色
        'rgba(13, 202, 240, 0.7)',   // 蓝色
        'rgba(111, 66, 193, 0.7)',   // 紫色
        'rgba(214, 51, 132, 0.7)',   // 粉色
        'rgba(32, 201, 151, 0.7)',   // 青色
        'rgba(108, 117, 125, 0.7)',  // 灰色
        'rgba(253, 126, 20, 0.7)'    // 深橙色
    ];
    
    const borderColors = colors.map(color => color.replace('0.7', '1'));
    
    // 准备图表数据
    const chartData = {
        labels: employeesWithAbsences.map(emp => emp.name),
        datasets: [{
            label: '缺勤天数',
            data: employeesWithAbsences.map(emp => emp.total_absence_days),
            backgroundColor: colors.slice(0, employeesWithAbsences.length),
            borderColor: borderColors.slice(0, employeesWithAbsences.length),
            borderWidth: 1
        }]
    };
    
    monthChart = new Chart(ctx, {
        type: 'pie',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const dataset = data.datasets[0];
                                    const value = dataset.data[i];
                                    return {
                                        text: `${label}: ${value}天`,
                                        fillStyle: dataset.backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value}天 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 绘制最近三个月缺勤人员天数对比图表
async function drawQuarterChart(currentMonthStats) {
    const ctx = document.getElementById('quarter-chart').getContext('2d');
    
    // 销毁旧图表
    if (quarterChart) {
        quarterChart.destroy();
    }
    
    // 获取最近三个月的统计数据
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const quarterStats = [];
    
    // 获取最近三个月的数据
    for (let i = 0; i < 3; i++) {
        let month = currentMonth - i;
        let year = currentYear;
        
        if (month <= 0) {
            month += 12;
            year -= 1;
        }
        
        try {
            const monthlyStats = await apiRequest(`/api/statistics/monthly/${year}/${month}`);
            quarterStats.push(...monthlyStats.employee_statistics);
        } catch (error) {
            console.error(`获取${year}年${month}月数据失败:`, error);
        }
    }
    
    // 按员工ID分组并汇总缺勤天数
    const employeeMap = new Map();
    
    quarterStats.forEach(emp => {
        if (emp.total_absence_days > 0) {
            if (employeeMap.has(emp.employee_id)) {
                const existing = employeeMap.get(emp.employee_id);
                existing.total_absence_days += emp.total_absence_days;
                existing.morning_absences += emp.morning_absences;
                existing.afternoon_absences += emp.afternoon_absences;
                existing.full_day_absences += emp.full_day_absences;
            } else {
                employeeMap.set(emp.employee_id, { ...emp });
            }
        }
    });
    
    // 转换为数组并按缺勤天数降序排序
    const employeesWithAbsences = Array.from(employeeMap.values())
        .sort((a, b) => b.total_absence_days - a.total_absence_days);
    
    // 如果没有缺勤记录，显示空图表
    if (employeesWithAbsences.length === 0) {
        quarterChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['无缺勤记录'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['rgba(200, 200, 200, 0.7)'],
                    borderColor: ['rgba(200, 200, 200, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
        return;
    }
    
    // 生成颜色数组
    const colors = [
        'rgba(220, 53, 69, 0.7)',     // 红色
        'rgba(255, 133, 27, 0.7)',    // 橙色
        'rgba(255, 193, 7, 0.7)',     // 黄色
        'rgba(40, 167, 69, 0.7)',     // 绿色
        'rgba(13, 202, 240, 0.7)',   // 蓝色
        'rgba(111, 66, 193, 0.7)',   // 紫色
        'rgba(214, 51, 132, 0.7)',   // 粉色
        'rgba(32, 201, 151, 0.7)',   // 青色
        'rgba(108, 117, 125, 0.7)',  // 灰色
        'rgba(253, 126, 20, 0.7)'    // 深橙色
    ];
    
    const borderColors = colors.map(color => color.replace('0.7', '1'));
    
    // 准备图表数据
    const chartData = {
        labels: employeesWithAbsences.map(emp => emp.name),
        datasets: [{
            label: '缺勤天数',
            data: employeesWithAbsences.map(emp => emp.total_absence_days),
            backgroundColor: colors.slice(0, employeesWithAbsences.length),
            borderColor: borderColors.slice(0, employeesWithAbsences.length),
            borderWidth: 1
        }]
    };
    
    quarterChart = new Chart(ctx, {
        type: 'pie',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const dataset = data.datasets[0];
                                    const value = dataset.data[i];
                                    return {
                                        text: `${label}: ${value}天`,
                                        fillStyle: dataset.backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value}天 (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 加载员工列表
async function loadEmployees() {
    try {
        const employees = await apiRequest('/api/employees');
        const employeesTable = document.getElementById('employees-table');
        
        if (employees.length === 0) {
            employeesTable.innerHTML = '<tr><td colspan="6" class="text-center">暂无员工数据</td></tr>';
            return;
        }
        
        employeesTable.innerHTML = employees.map(employee => `
            <tr>
                <td>${employee.employee_id}</td>
                <td>${employee.name}</td>
                <td>${employee.position || '-'}</td>
                <td>${employee.hire_date}</td>
                <td><span class="badge ${employee.status === 'active' ? 'bg-success' : 'bg-secondary'}">${employee.status === 'active' ? '在职' : '离职'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editEmployee('${employee.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteEmployee('${employee.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('加载员工列表失败:', error);
    }
}

// 加载员工选择列表
async function loadEmployeesForSelect() {
    try {
        const employees = await apiRequest('/api/employees');
        const activeEmployees = employees.filter(emp => emp.status === 'active');
        
        // 更新缺勤记录中的员工选择
        const attendanceEmployeeSelect = document.getElementById('attendance-employee');
        attendanceEmployeeSelect.innerHTML = '<option value="">请选择员工</option>' +
            activeEmployees.map(employee => 
                `<option value="${employee.id}">${employee.name} (${employee.employee_id})</option>`
            ).join('');
        
        // 更新筛选器中的员工选择
        const filterEmployeeSelect = document.getElementById('filter-employee');
        filterEmployeeSelect.innerHTML = '<option value="">全部员工</option>' +
            activeEmployees.map(employee => 
                `<option value="${employee.id}">${employee.name} (${employee.employee_id})</option>`
            ).join('');
    } catch (error) {
        console.error('加载员工选择列表失败:', error);
    }
}

// 此函数已不再需要，因为不再有部门选择
// async function loadDepartmentsForSelect(selectId = 'filter-department') {
//     try {
//         const employees = await apiRequest('/api/employees');
//         const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))];
//         
//         const selectElement = document.getElementById(selectId);
//         selectElement.innerHTML = '<option value="">全部部门</option>' +
//             departments.map(dept => `<option value="${dept}">${dept}</option>`).join('');
//     } catch (error) {
//         console.error('加载部门选择列表失败:', error);
//     }
// }

// 保存员工
async function saveEmployee() {
    try {
        const employeeId = document.getElementById('employee-id').value;
        const employeeData = {
            employee_id: document.getElementById('employee-number').value,
            name: document.getElementById('employee-name').value,
            position: document.getElementById('employee-position').value,
            hire_date: document.getElementById('employee-hire-date').value,
            phone: document.getElementById('employee-phone').value,
            email: document.getElementById('employee-email').value
        };
        
        if (employeeId) {
            // 更新员工
            await apiRequest(`/api/employees/${employeeId}`, {
                method: 'PUT',
                body: JSON.stringify(employeeData)
            });
            showAlert('员工信息更新成功', 'success');
        } else {
            // 添加新员工
            await apiRequest('/api/employees', {
                method: 'POST',
                body: JSON.stringify(employeeData)
            });
            showAlert('员工添加成功', 'success');
        }
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('employeeModal'));
        modal.hide();
        
        // 重置表单
        document.getElementById('employeeForm').reset();
        document.getElementById('employee-id').value = '';
        
        // 重新加载员工列表
        loadEmployees();
    } catch (error) {
        console.error('保存员工失败:', error);
    }
}

// 编辑员工
async function editEmployee(employeeId) {
    try {
        const employee = await apiRequest(`/api/employees/${employeeId}`);
        
        document.getElementById('employee-id').value = employee.id;
        document.getElementById('employee-number').value = employee.employee_id;
        document.getElementById('employee-name').value = employee.name;
        document.getElementById('employee-position').value = employee.position || '';
        document.getElementById('employee-hire-date').value = employee.hire_date;
        document.getElementById('employee-phone').value = employee.phone || '';
        document.getElementById('employee-email').value = employee.email || '';
        
        document.getElementById('employeeModalTitle').textContent = '编辑员工';
        
        const modal = new bootstrap.Modal(document.getElementById('employeeModal'));
        modal.show();
    } catch (error) {
        console.error('编辑员工失败:', error);
    }
}

// 删除员工
async function deleteEmployee(employeeId) {
    if (!confirm('确定要删除此员工吗？如果该员工有考勤记录，状态将被设为离职而不是删除。')) {
        return;
    }
    
    try {
        await apiRequest(`/api/employees/${employeeId}`, {
            method: 'DELETE'
        });
        showAlert('员工删除成功', 'success');
        loadEmployees();
    } catch (error) {
        console.error('删除员工失败:', error);
    }
}

// 加载缺勤记录
async function loadAttendance(page = 1) {
    try {
        currentPage = page;
        
        // 构建查询参数
        const params = new URLSearchParams({
            page: page,
            limit: 10,
            ...currentFilter
        });
        
        const attendanceData = await apiRequest(`/api/attendance?${params}`);
        const attendanceTable = document.getElementById('attendance-table');
        
        if (attendanceData.records.length === 0) {
            attendanceTable.innerHTML = '<tr><td colspan="6" class="text-center">暂无记录</td></tr>';
            document.getElementById('attendance-pagination').innerHTML = '';
            return;
        }
        
        attendanceTable.innerHTML = attendanceData.records.map(record => {
            // 根据考勤类型显示不同的信息
            let typeInfo = '';
            let rowClass = '';
            
            if (record.attendance_type === 'absence') {
                typeInfo = getAbsenceTypeText(record.absence_type);
                // 缺勤记录使用浅红色背景
                rowClass = 'table-light-danger';
            } else if (record.attendance_type === 'late') {
                typeInfo = `迟到 ${record.late_minutes || 0} 分钟`;
                if (record.check_in_time) {
                    typeInfo += ` (打卡时间: ${record.check_in_time})`;
                }
                // 迟到记录使用浅黄色背景
                rowClass = 'table-light-warning';
            } else if (record.attendance_type === 'early_leave') {
                typeInfo = `早退 ${record.early_leave_minutes || 0} 分钟`;
                if (record.check_out_time) {
                    typeInfo += ` (打卡时间: ${record.check_out_time})`;
                }
                // 早退记录使用浅蓝色背景
                rowClass = 'table-light-info';
            }
            
            return `
                <tr class="${rowClass}">
                    <td>${record.employee ? `${record.employee.name} (${record.employee.employee_id})` : '未知'}</td>
                    <td>${record.date}</td>
                    <td>${getAttendanceTypeText(record.attendance_type)}</td>
                    <td>${typeInfo}</td>
                    <td>${record.reason || '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editAttendance('${record.id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAttendance('${record.id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // 生成分页
        generatePagination(attendanceData.pagination);
    } catch (error) {
        console.error('加载缺勤记录失败:', error);
    }
}

// 生成分页
function generatePagination(pagination) {
    const paginationElement = document.getElementById('attendance-pagination');
    const { page, limit, total } = pagination;
    const totalPages = Math.ceil(total / limit);
    
    if (totalPages <= 1) {
        paginationElement.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // 上一页
    paginationHTML += `
        <li class="page-item ${page === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadAttendance(${page - 1}); return false;">上一页</a>
        </li>
    `;
    
    // 页码
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
            paginationHTML += `
                <li class="page-item ${i === page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="loadAttendance(${i}); return false;">${i}</a>
                </li>
            `;
        } else if (i === page - 3 || i === page + 3) {
            paginationHTML += `
                <li class="page-item disabled">
                    <a class="page-link" href="#">...</a>
                </li>
            `;
        }
    }
    
    // 下一页
    paginationHTML += `
        <li class="page-item ${page === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="loadAttendance(${page + 1}); return false;">下一页</a>
        </li>
    `;
    
    paginationElement.innerHTML = paginationHTML;
}

// 保存考勤记录
async function saveAttendance() {
    try {
        const attendanceId = document.getElementById('attendance-id').value;
        const attendanceType = document.getElementById('attendance-type').value;
        
        // 构建基础考勤数据
        const attendanceData = {
            employee_id: document.getElementById('attendance-employee').value,
            date: document.getElementById('attendance-date').value,
            attendance_type: attendanceType,
            reason: document.getElementById('attendance-reason').value,
            notes: document.getElementById('attendance-notes').value
        };
        
        // 根据考勤类型添加特定字段
        if (attendanceType === 'absence') {
            const absenceType = document.getElementById('absence-type').value;
            if (!absenceType) {
                showAlert('请选择缺勤类型', 'danger');
                return;
            }
            attendanceData.absence_type = absenceType;
        } else if (attendanceType === 'late') {
            // 自动计算迟到时间
            const checkInTime = document.getElementById('check-in-time').value;
            attendanceData.check_in_time = checkInTime;
            
            // 计算迟到分钟数（9:00后为迟到）
            if (checkInTime) {
                const [hours, minutes] = checkInTime.split(':').map(Number);
                const totalMinutes = hours * 60 + minutes;
                const standardMinutes = 9 * 60; // 9:00 = 540分钟
                
                if (totalMinutes > standardMinutes) {
                    attendanceData.late_minutes = totalMinutes - standardMinutes;
                } else {
                    attendanceData.late_minutes = 0;
                }
            }
        } else if (attendanceType === 'early_leave') {
            // 自动计算早退时间
            const checkOutTime = document.getElementById('check-out-time').value;
            attendanceData.check_out_time = checkOutTime;
            
            // 计算早退分钟数（18:00前为早退）
            if (checkOutTime) {
                const [hours, minutes] = checkOutTime.split(':').map(Number);
                const totalMinutes = hours * 60 + minutes;
                const standardMinutes = 18 * 60; // 18:00 = 1080分钟
                
                if (totalMinutes < standardMinutes) {
                    attendanceData.early_leave_minutes = standardMinutes - totalMinutes;
                } else {
                    attendanceData.early_leave_minutes = 0;
                }
            }
        }
        
        if (attendanceId) {
            // 更新考勤记录
            await apiRequest(`/api/attendance/${attendanceId}`, {
                method: 'PUT',
                body: JSON.stringify(attendanceData)
            });
            showAlert('考勤记录更新成功', 'success');
        } else {
            // 添加新考勤记录
            await apiRequest('/api/attendance', {
                method: 'POST',
                body: JSON.stringify(attendanceData)
            });
            showAlert('考勤记录添加成功', 'success');
        }
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('attendanceModal'));
        modal.hide();
        
        // 重置表单
        document.getElementById('attendanceForm').reset();
        document.getElementById('attendance-id').value = '';
        
        // 重新加载考勤记录
        loadAttendance(currentPage);
    } catch (error) {
        console.error('保存考勤记录失败:', error);
    }
}

// 编辑考勤记录
async function editAttendance(attendanceId) {
    try {
        const record = await apiRequest(`/api/attendance/${attendanceId}`);
        
        document.getElementById('attendance-id').value = record.id;
        document.getElementById('attendance-employee').value = record.employee_id;
        document.getElementById('attendance-date').value = record.date;
        document.getElementById('attendance-type').value = record.attendance_type || 'absence';
        document.getElementById('attendance-reason').value = record.reason || '';
        document.getElementById('attendance-notes').value = record.notes || '';
        
        // 触发考勤类型切换事件，以显示相应的选项组
        const attendanceTypeSelect = document.getElementById('attendance-type');
        attendanceTypeSelect.dispatchEvent(new Event('change'));
        
        // 根据考勤类型填充特定字段
        if (record.attendance_type === 'absence') {
            document.getElementById('absence-type').value = record.absence_type || '';
        } else if (record.attendance_type === 'late') {
            document.getElementById('check-in-time').value = record.check_in_time || '';
        } else if (record.attendance_type === 'early_leave') {
            document.getElementById('check-out-time').value = record.check_out_time || '';
        }
        
        document.getElementById('attendanceModalTitle').textContent = '编辑考勤记录';
        
        const modal = new bootstrap.Modal(document.getElementById('attendanceModal'));
        modal.show();
    } catch (error) {
        console.error('编辑考勤记录失败:', error);
    }
}

// 审批相关函数已移除，因为不再需要审批流程
// async function approveAttendance(attendanceId) {
//     try {
//         const record = await apiRequest(`/api/attendance/${attendanceId}`);
//         
//         document.getElementById('approval-id').value = record.id;
//         document.getElementById('approval-status').value = '';
//         document.getElementById('approval-notes').value = '';
//         
//         const modal = new bootstrap.Modal(document.getElementById('approvalModal'));
//         modal.show();
//     } catch (error) {
//         console.error('审批缺勤记录失败:', error);
//     }
// }

// async function submitApproval() {
//     try {
//         const approvalId = document.getElementById('approval-id').value;
//         const approvalData = {
//             approved_by: document.getElementById('approval-approver').value,
//             status: document.getElementById('approval-status').value,
//             notes: document.getElementById('approval-notes').value
//         };
//         
//         await apiRequest(`/api/attendance/${approvalId}/approve`, {
//             method: 'PUT',
//             body: JSON.stringify(approvalData)
//         });
//         
//         showAlert('审批提交成功', 'success');
//         
//         // 关闭模态框
//         const modal = bootstrap.Modal.getInstance(document.getElementById('approvalModal'));
//         modal.hide();
//         
//         // 重新加载缺勤记录
//         loadAttendance(currentPage);
//     } catch (error) {
//         console.error('提交审批失败:', error);
//     }
// }

// 删除缺勤记录
async function deleteAttendance(attendanceId) {
    if (!confirm('确定要删除此缺勤记录吗？')) {
        return;
    }
    
    try {
        await apiRequest(`/api/attendance/${attendanceId}`, {
            method: 'DELETE'
        });
        showAlert('缺勤记录删除成功', 'success');
        loadAttendance(currentPage);
    } catch (error) {
        console.error('删除缺勤记录失败:', error);
    }
}

// 应用筛选
function applyFilters() {
    currentFilter = {
        employee_id: document.getElementById('filter-employee').value,
        start_date: document.getElementById('filter-start-date').value,
        end_date: document.getElementById('filter-end-date').value
    };
    
    // 移除空值
    Object.keys(currentFilter).forEach(key => {
        if (!currentFilter[key]) {
            delete currentFilter[key];
        }
    });
    
    loadAttendance(1);
}

// 重置筛选
function resetFilters() {
    currentFilter = {};
    document.getElementById('filter-employee').value = '';
    document.getElementById('filter-start-date').value = '';
    document.getElementById('filter-end-date').value = '';
    
    loadAttendance(1);
}

// 生成统计
async function generateStatistics() {
    try {
        const statsType = document.getElementById('stats-type').value;
        const year = document.getElementById('stats-year').value;
        const month = document.getElementById('stats-month').value;
        
        let statsData;
        if (statsType === 'monthly') {
            statsData = await apiRequest(`/api/statistics/monthly/${year}/${month}`);
        } else {
            statsData = await apiRequest(`/api/statistics/yearly/${year}`);
        }
        
        // 更新员工排名表格
        const employeeRankingTable = document.getElementById('stats-employee-ranking');
        employeeRankingTable.innerHTML = statsData.employee_statistics
            .filter(emp => emp.total_absence_days > 0)
            .slice(0, 10)
            .map((emp, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${emp.name} (${emp.employee_number})</td>
                    <td>${emp.total_absence_days}</td>
                </tr>
            `).join('');
        
        // 更新缺勤类型统计图表
        drawStatsAbsenceTypeChart(statsData.summary);
        
        // 更新缺勤率统计图表
        drawStatsAbsenceRatioChart(statsData.employee_statistics);
        
        // 更新统计汇总
        updateStatsSummary(statsData, statsType);
    } catch (error) {
        console.error('生成统计失败:', error);
    }
}

// 绘制统计缺勤类型图表
function drawStatsAbsenceTypeChart(summary) {
    const ctx = document.getElementById('stats-absence-type-chart').getContext('2d');
    
    // 销毁旧图表
    if (statsAbsenceTypeChart) {
        statsAbsenceTypeChart.destroy();
    }
    
    statsAbsenceTypeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['上午缺勤', '下午缺勤', '全天缺勤'],
            datasets: [{
                label: '缺勤次数',
                data: [
                    summary.total_morning_absences || 0,
                    summary.total_afternoon_absences || 0,
                    summary.total_full_day_absences || 0
                ],
                backgroundColor: [
                    'rgba(255, 193, 7, 0.7)',
                    'rgba(13, 202, 240, 0.7)',
                    'rgba(220, 53, 69, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 193, 7, 1)',
                    'rgba(13, 202, 240, 1)',
                    'rgba(220, 53, 69, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

let statsAbsenceRatioChart = null;

function drawStatsAbsenceRatioChart(employeeStats) {
    const ctx = document.getElementById('stats-absence-ratio-chart').getContext('2d');
    
    if (statsAbsenceRatioChart) {
        statsAbsenceRatioChart.destroy();
    }
    
    const labels = employeeStats.map(emp => emp.name).slice(0, 10);
    const absenceRatios = employeeStats.map(emp => (emp.absence_ratio * 100).toFixed(1)).slice(0, 10);
    
    statsAbsenceRatioChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '缺勤率 (%)',
                data: absenceRatios,
                backgroundColor: absenceRatios.map(ratio => {
                    if (ratio >= 10) return 'rgba(220, 53, 69, 0.7)';
                    if (ratio >= 5) return 'rgba(255, 193, 7, 0.7)';
                    return 'rgba(25, 135, 84, 0.7)';
                }),
                borderColor: absenceRatios.map(ratio => {
                    if (ratio >= 10) return 'rgba(220, 53, 69, 1)';
                    if (ratio >= 5) return 'rgba(255, 193, 7, 1)';
                    return 'rgba(25, 135, 84, 1)';
                }),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '缺勤率 (%)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const emp = employeeStats[context.dataIndex];
                            // 确定使用的工作天数（如果时间范围已过去，使用完整工作天数；否则使用到当前日期的工作天数）
                            const usedWorkDays = emp.current_should_attend_days > 0 ? emp.current_should_attend_days : emp.should_attend_days;
                            const usedAbsenceDays = emp.current_absence_days > 0 ? emp.current_absence_days : emp.total_absence_days;
                            return `缺勤率: ${context.raw}% (缺勤${usedAbsenceDays}天/上班${usedWorkDays}天)`;
                        }
                    }
                }
            }
        }
    });
}

// 更新统计汇总
function updateStatsSummary(statsData, statsType) {
    const summaryElement = document.getElementById('stats-summary');
    const periodText = statsType === 'monthly' ? 
        `${statsData.period.year}年${statsData.period.month}月` : 
        `${statsData.period.year}年`;
    
    // 生成员工出勤情况表格
    summaryElement.innerHTML = `
        <div class="row">
            <div class="col-md-12">
                <h6 class="mb-3">${periodText} 员工出勤情况</h6>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead class="table-primary text-white">
                            <tr>
                                <th>员工姓名</th>
                                <th>总缺勤天数</th>
                                <th>应该出勤天数</th>
                                <th>全天缺勤天数</th>
                                <th>上午缺勤天数</th>
                                <th>下午缺勤天数</th>
                                <th>迟到次数</th>
                                <th>总迟到时长</th>
                                <th>缺勤异常总数</th>
                                <th>缺勤率</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${statsData.employee_statistics.map(emp => `
                                <tr style="cursor: pointer;" onclick="viewEmployeeAttendanceDetails('${emp.employee_id}', ${emp.year}, ${emp.month})">
                                    <td>${emp.name}</td>
                                    <td>${emp.total_absence_days}</td>
                                    <td>${emp.should_attend_days}</td>
                                    <td>${emp.full_day_absences}</td>
                                    <td>${emp.morning_absences}</td>
                                    <td>${emp.afternoon_absences}</td>
                                    <td>${emp.late_count}</td>
                                    <td>${Math.floor(emp.total_late_minutes / 60)}小时${emp.total_late_minutes % 60}分钟</td>
                                    <td>${emp.abnormal_count}</td>
                                    <td>${(emp.absence_ratio * 100).toFixed(1)}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// 辅助函数：获取缺勤类型文本
function getAbsenceTypeText(type) {
    const types = {
        'morning': '上午',
        'afternoon': '下午',
        'full_day': '全天'
    };
    return types[type] || type;
}

// 辅助函数：获取考勤类型文本
function getAttendanceTypeText(type) {
    const types = {
        'absence': '缺勤',
        'late': '迟到',
        'early_leave': '早退',
        'normal': '正常'
    };
    return types[type] || type;
}

// 查看员工考勤详情
async function viewEmployeeAttendanceDetails(employeeId, year, month) {
    try {
        console.log('查看员工考勤详情:', { employeeId, year, month });
        // 构建日期范围
        let startDate, endDate;
        if (month) {
            // 月度统计
            startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
            endDate = moment(`${year}-${month.toString().padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');
        } else {
            // 年度统计
            startDate = `${year}-01-01`;
            endDate = `${year}-12-31`;
        }
        
        console.log('日期范围:', { startDate, endDate });
        
        // 获取员工的考勤记录
        const apiUrl = `/api/attendance?employee_id=${employeeId}&start_date=${startDate}&end_date=${endDate}`;
        console.log('API URL:', apiUrl);
        
        const records = await apiRequest(apiUrl);
        console.log('API 响应:', records);
        
        // 过滤出缺勤和迟到记录
        const absenceLateRecords = records.records.filter(record => 
            record.attendance_type === 'absence' || record.attendance_type === 'late'
        );
        
        // 按日期排序
        absenceLateRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // 生成详情HTML
        let detailsHTML = `
            <h6 class="mb-3">员工考勤详情</h6>
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-primary text-white">
                        <tr>
                            <th>日期</th>
                            <th>考勤类型</th>
                            <th>缺勤类型</th>
                            <th>迟到时长</th>
                            <th>原因</th>
                            <th>备注</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (absenceLateRecords.length === 0) {
            detailsHTML += `
                <tr>
                    <td colspan="6" class="text-center">该员工在此期间无缺勤或迟到记录</td>
                </tr>
            `;
        } else {
            absenceLateRecords.forEach(record => {
                detailsHTML += `
                    <tr>
                        <td>${record.date}</td>
                        <td>${getAttendanceTypeText(record.attendance_type)}</td>
                        <td>${record.attendance_type === 'absence' ? getAbsenceTypeText(record.absence_type) : '-'}</td>
                        <td>${record.attendance_type === 'late' ? `${Math.floor(record.late_minutes / 60)}小时${record.late_minutes % 60}分钟` : '-'}</td>
                        <td>${record.reason || '-'}</td>
                        <td>${record.notes || '-'}</td>
                    </tr>
                `;
            });
        }
        
        detailsHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        // 更新模态框内容
        document.getElementById('employeeAttendanceDetails').innerHTML = detailsHTML;
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('employeeAttendanceModal'));
        modal.show();
    } catch (error) {
        console.error('获取员工考勤详情失败:', error);
        showAlert(`获取员工考勤详情失败: ${error.message}`, 'danger');
    }
}

// 导出月度记录
async function exportMonthlyRecords() {
    try {
        const year = document.getElementById('stats-year').value;
        const month = document.getElementById('stats-month').value;
        
        // 获取月度考勤记录
        const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // 当月最后一天
        
        const attendanceRecords = await apiRequest(`/api/attendance?start_date=${startDate}&end_date=${endDate}`);
        
        if (attendanceRecords.records.length === 0) {
            showAlert('所选月份没有考勤记录', 'warning');
            return;
        }
        
        // 准备Excel数据
        const worksheetData = [
            ['员工编号', '员工姓名', '日期', '考勤类型', '缺勤类型', '迟到分钟数', '早退分钟数', '上班打卡时间', '下班打卡时间', '备注']
        ];
        
        attendanceRecords.records.forEach(record => {
            worksheetData.push([
                record.employee ? record.employee.employee_number : '',
                record.employee ? record.employee.name : '未知',
                record.date,
                getAttendanceTypeText(record.attendance_type),
                record.attendance_type === 'absence' ? getAbsenceTypeText(record.absence_type) : '',
                record.late_minutes || '',
                record.early_leave_minutes || '',
                record.check_in_time || '',
                record.check_out_time || '',
                record.notes || ''
            ]);
        });
        
        // 创建工作簿
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `${year}年${month}月考勤记录`);
        
        // 下载Excel文件
        XLSX.writeFile(workbook, `${year}年${month}月考勤记录.xlsx`);
        
        showAlert('月度记录导出成功', 'success');
    } catch (error) {
        console.error('导出月度记录失败:', error);
        showAlert('导出月度记录失败', 'danger');
    }
}

// 导出年度记录
async function exportYearlyRecords() {
    try {
        const year = document.getElementById('stats-year').value;
        
        // 获取年度考勤记录
        const startDate = new Date(year, 0, 1).toISOString().split('T')[0]; // 当年第一天
        const endDate = new Date(year, 11, 31).toISOString().split('T')[0]; // 当年最后一天
        
        const attendanceRecords = await apiRequest(`/api/attendance?start_date=${startDate}&end_date=${endDate}`);
        
        if (attendanceRecords.records.length === 0) {
            showAlert('所选年份没有考勤记录', 'warning');
            return;
        }
        
        // 准备Excel数据
        const worksheetData = [
            ['员工编号', '员工姓名', '日期', '考勤类型', '缺勤类型', '迟到分钟数', '早退分钟数', '上班打卡时间', '下班打卡时间', '备注']
        ];
        
        attendanceRecords.records.forEach(record => {
            worksheetData.push([
                record.employee ? record.employee.employee_number : '',
                record.employee ? record.employee.name : '未知',
                record.date,
                getAttendanceTypeText(record.attendance_type),
                record.attendance_type === 'absence' ? getAbsenceTypeText(record.absence_type) : '',
                record.late_minutes || '',
                record.early_leave_minutes || '',
                record.check_in_time || '',
                record.check_out_time || '',
                record.notes || ''
            ]);
        });
        
        // 创建工作簿
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `${year}年考勤记录`);
        
        // 下载Excel文件
        XLSX.writeFile(workbook, `${year}年考勤记录.xlsx`);
        
        showAlert('年度记录导出成功', 'success');
    } catch (error) {
        console.error('导出年度记录失败:', error);
        showAlert('导出年度记录失败', 'danger');
    }
}

// 辅助函数：获取状态文本（已不再需要，因为不再有审批流程）
// function getStatusText(status) {
//     const statuses = {
//         'pending': '待审批',
//         'approved': '已批准',
//         'rejected': '已拒绝'
//     };
//     return statuses[status] || status;
// }

// 辅助函数：获取状态徽章类（已不再需要，因为不再有审批流程）
// function getStatusBadgeClass(status) {
//     const classes = {
//         'pending': 'badge-pending',
//         'approved': 'badge-approved',
//         'rejected': 'badge-rejected'
//     };
//     return classes[status] || 'bg-secondary';
// }

// 迟到早退统计相关函数
async function loadLateEarlyMonthlyStats() {
    try {
        const monthInput = document.getElementById('lateEarlyMonth');
        if (!monthInput.value) {
            showAlert('请选择月份', 'warning');
            return;
        }
        
        const [year, month] = monthInput.value.split('-');
        
        // 显示加载状态
        document.getElementById('lateEarlyStatsResult').style.display = 'block';
        document.getElementById('lateEarlyStatsTableBody').innerHTML = '<tr><td colspan="7" class="text-center">加载中...</td></tr>';
        
        // 调用API获取月度统计数据
        const response = await apiRequest(`/api/late-early-statistics/monthly/${year}/${month}`);
        
        if (response && response.employee_statistics) {
            displayLateEarlyStats(response.employee_statistics, 'monthly', `${year}年${month}月`);
        } else {
            document.getElementById('lateEarlyStatsTableBody').innerHTML = '<tr><td colspan="7" class="text-center">暂无数据</td></tr>';
        }
    } catch (error) {
        console.error('加载月度迟到早退统计失败:', error);
        document.getElementById('lateEarlyStatsTableBody').innerHTML = '<tr><td colspan="7" class="text-center text-danger">加载失败</td></tr>';
    }
}

async function loadLateEarlyYearlyStats() {
    try {
        const year = document.getElementById('lateEarlyYear').value;
        
        // 显示加载状态
        document.getElementById('lateEarlyStatsResult').style.display = 'block';
        document.getElementById('lateEarlyStatsTableBody').innerHTML = '<tr><td colspan="7" class="text-center">加载中...</td></tr>';
        
        // 调用API获取年度统计数据
        const response = await apiRequest(`/api/late-early-statistics/yearly/${year}`);
        
        if (response && response.employee_statistics) {
            displayLateEarlyStats(response.employee_statistics, 'yearly', `${year}年`);
        } else {
            document.getElementById('lateEarlyStatsTableBody').innerHTML = '<tr><td colspan="7" class="text-center">暂无数据</td></tr>';
        }
    } catch (error) {
        console.error('加载年度迟到早退统计失败:', error);
        document.getElementById('lateEarlyStatsTableBody').innerHTML = '<tr><td colspan="7" class="text-center text-danger">加载失败</td></tr>';
    }
}

function displayLateEarlyStats(statsData, type, periodTitle) {
    // 更新标题
    document.getElementById('statsPeriodTitle').innerHTML = `<i class="bi bi-bar-chart"></i> ${periodTitle}迟到早退统计`;
    
    // 清空表格
    const tableBody = document.getElementById('lateEarlyStatsTableBody');
    tableBody.innerHTML = '';
    
    if (!statsData || statsData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">暂无数据</td></tr>';
        return;
    }
    
    // 填充表格数据
    statsData.forEach(stat => {
        const row = document.createElement('tr');
        
        // 根据迟到早退情况添加背景色
        if (stat.late_count > 0 && stat.early_leave_count > 0) {
            row.className = 'table-light-danger'; // 既有迟到又有早退，使用红色
        } else if (stat.late_count > 0) {
            row.className = 'table-light-warning'; // 只有迟到，使用黄色
        } else if (stat.early_leave_count > 0) {
            row.className = 'table-light-info'; // 只有早退，使用蓝色
        }
        
        // 添加迟到次数样式
        const lateCountClass = stat.late_count > 0 ? 'text-danger' : '';
        const earlyLeaveCountClass = stat.early_leave_count > 0 ? 'text-warning' : '';
        
        row.innerHTML = `
            <td>${stat.employee_number || '-'}</td>
            <td>${stat.name}</td>
            <td class="${lateCountClass}">${stat.late_count}</td>
            <td class="${lateCountClass}">${stat.formatted_late_time}</td>
            <td class="${earlyLeaveCountClass}">${stat.early_leave_count}</td>
            <td class="${earlyLeaveCountClass}">${stat.formatted_early_leave_time}</td>
            <td>
                <button class="btn btn-sm btn-outline-info" onclick="showEmployeeLateEarlyDetails('${stat.employee_id}', '${type}', '${periodTitle}')">
                    <i class="bi bi-eye"></i> 详情
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

async function showEmployeeLateEarlyDetails(employeeId, type, periodTitle) {
    try {
        // 显示加载状态
        const modalContent = document.getElementById('employeeLateEarlyDetailsContent');
        modalContent.innerHTML = '<div class="text-center">加载中...</div>';
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('employeeLateEarlyDetailsModal'));
        modal.show();
        
        // 根据统计类型调用不同的API
        let url;
        if (type === 'monthly') {
            const [year, month] = periodTitle.match(/\d+/g);
            url = `/api/late-early-statistics/monthly/${year}/${month}/employee/${employeeId}`;
        } else {
            const year = periodTitle.match(/\d+/g)[0];
            url = `/api/late-early-statistics/yearly/${year}/employee/${employeeId}`;
        }
        
        // 获取员工详细统计数据
        const response = await apiRequest(url);
        
        if (response && response.data) {
            displayEmployeeLateEarlyDetails(response.data);
        } else {
            modalContent.innerHTML = '<div class="alert alert-info">暂无详细数据</div>';
        }
    } catch (error) {
        console.error('加载员工迟到早退详情失败:', error);
        document.getElementById('employeeLateEarlyDetailsContent').innerHTML = '<div class="alert alert-danger">加载失败</div>';
    }
}

function displayEmployeeLateEarlyDetails(detailData) {
    const modalContent = document.getElementById('employeeLateEarlyDetailsContent');
    
    // 创建详情HTML
    let detailsHTML = `
        <div class="card mb-3">
            <div class="card-header">
                <h6><i class="bi bi-person-badge"></i> 员工信息</h6>
            </div>
            <div class="card-body">
                <p><strong>员工编号:</strong> ${detailData.employee_number}</p>
                <p><strong>姓名:</strong> ${detailData.name}</p>
                <p><strong>统计周期:</strong> ${detailData.year}年${detailData.month ? detailData.month + '月' : ''}</p>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header bg-danger text-white">
                        <h6><i class="bi bi-clock"></i> 迟到统计</h6>
                    </div>
                    <div class="card-body">
                        <p><strong>迟到次数:</strong> <span class="text-danger">${detailData.late_count}</span></p>
                        <p><strong>总迟到时长:</strong> <span class="text-danger">${detailData.formatted_late_time}</span></p>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header bg-warning text-dark">
                        <h6><i class="bi bi-clock-history"></i> 早退统计</h6>
                    </div>
                    <div class="card-body">
                        <p><strong>早退次数:</strong> <span class="text-warning">${detailData.early_leave_count}</span></p>
                        <p><strong>总早退时长:</strong> <span class="text-warning">${detailData.formatted_early_leave_time}</span></p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 添加详细记录
    if (detailData.late_records && detailData.late_records.length > 0) {
        detailsHTML += `
            <div class="card mb-3">
                <div class="card-header bg-danger text-white">
                    <h6><i class="bi bi-list-ul"></i> 迟到详细记录</h6>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm table-striped">
                            <thead>
                                <tr>
                                    <th>日期</th>
                                    <th>打卡时间</th>
                                    <th>迟到分钟</th>
                                    <th>原因</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${detailData.late_records.map(record => `
                                    <tr>
                                        <td>${record.date}</td>
                                        <td>${record.check_in_time || '-'}</td>
                                        <td>${record.late_minutes || 0}分钟</td>
                                        <td>${record.reason || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (detailData.early_leave_records && detailData.early_leave_records.length > 0) {
        detailsHTML += `
            <div class="card mb-3">
                <div class="card-header bg-warning text-dark">
                    <h6><i class="bi bi-list-ul"></i> 早退详细记录</h6>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-sm table-striped">
                            <thead>
                                <tr>
                                    <th>日期</th>
                                    <th>打卡时间</th>
                                    <th>早退分钟</th>
                                    <th>原因</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${detailData.early_leave_records.map(record => `
                                    <tr>
                                        <td>${record.date}</td>
                                        <td>${record.check_out_time || '-'}</td>
                                        <td>${record.early_leave_minutes || 0}分钟</td>
                                        <td>${record.reason || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
    
    modalContent.innerHTML = detailsHTML;
}

async function exportLateEarlyStats() {
    try {
        // 检查当前是否有统计数据
        const tableBody = document.getElementById('lateEarlyStatsTableBody');
        if (!tableBody || tableBody.children.length === 0 || 
            (tableBody.children.length === 1 && tableBody.children[0].textContent.includes('暂无数据'))) {
            showAlert('没有可导出的数据', 'warning');
            return;
        }
        
        // 获取当前统计类型和周期
        const periodTitle = document.getElementById('statsPeriodTitle').textContent;
        let type = 'monthly';
        let url;
        
        if (periodTitle.includes('年') && !periodTitle.includes('月')) {
            type = 'yearly';
            const year = periodTitle.match(/\d+/g)[0];
            url = `/api/late-early-statistics/yearly/${year}/export`;
        } else {
            const [year, month] = periodTitle.match(/\d+/g);
            url = `/api/late-early-statistics/monthly/${year}/${month}/export`;
        }
        
        // 显示加载状态
        showAlert('正在导出数据...', 'info');
        
        // 调用导出API
        const response = await apiRequest(url);
        
        if (response && response.download_url) {
            // 创建下载链接
            const link = document.createElement('a');
            link.href = response.download_url;
            link.download = response.filename || `${periodTitle}迟到早退统计.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showAlert('导出成功', 'success');
        } else {
            showAlert('导出失败', 'danger');
        }
    } catch (error) {
        console.error('导出迟到早退统计失败:', error);
        showAlert('导出失败', 'danger');
    }
}