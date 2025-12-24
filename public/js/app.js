// 全局变量
let currentPage = 1;
let currentFilter = {};
let recentChart = null;
let monthChart = null;
let quarterChart = null;
let statsAbsenceTypeChart = null;

// DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
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
    
    // 缺勤记录表单提交
    document.getElementById('save-attendance').addEventListener('click', saveAttendance);
    
    // 筛选按钮
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    
    // 统计类型切换
    document.getElementById('stats-type').addEventListener('change', function() {
        const monthField = document.getElementById('stats-month').parentElement.parentElement;
        if (this.value === 'yearly') {
            monthField.style.display = 'none';
        } else {
            monthField.style.display = 'block';
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
        const response = await fetch(url, {
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
        showAlert(error.message, 'danger');
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
            recentAttendanceTable.innerHTML = recentRecords.records.map(record => `
                <tr>
                    <td>${record.employee ? record.employee.name : '未知'}</td>
                    <td>${record.date}</td>
                    <td>${getAbsenceTypeText(record.absence_type)}</td>
                </tr>
            `).join('');
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
                <tr>
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
                <tr>
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
    
    // 统计缺勤类型
    const typeCounts = {
        '上午': 0,
        '下午': 0,
        '全天': 0
    };
    
    recentRecords.forEach(record => {
        typeCounts[getAbsenceTypeText(record.absence_type)]++;
    });
    
    recentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(typeCounts),
            datasets: [{
                label: '缺勤次数',
                data: Object.values(typeCounts),
                backgroundColor: [
                    'rgba(255, 193, 7, 0.7)',    // 黄色 - 上午
                    'rgba(13, 202, 240, 0.7)',  // 蓝色 - 下午
                    'rgba(220, 53, 69, 0.7)'     // 红色 - 全天
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
            attendanceTable.innerHTML = '<tr><td colspan="4" class="text-center">暂无记录</td></tr>';
            document.getElementById('attendance-pagination').innerHTML = '';
            return;
        }
        
        attendanceTable.innerHTML = attendanceData.records.map(record => `
            <tr>
                <td>${record.employee ? `${record.employee.name} (${record.employee.employee_id})` : '未知'}</td>
                <td>${record.date}</td>
                <td>${getAbsenceTypeText(record.absence_type)}</td>
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
        `).join('');
        
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

// 保存缺勤记录
async function saveAttendance() {
    try {
        const attendanceId = document.getElementById('attendance-id').value;
        const attendanceData = {
            employee_id: document.getElementById('attendance-employee').value,
            date: document.getElementById('attendance-date').value,
            absence_type: document.getElementById('attendance-type').value,
            reason: document.getElementById('attendance-reason').value,
            notes: document.getElementById('attendance-notes').value
        };
        
        if (attendanceId) {
            // 更新缺勤记录
            await apiRequest(`/api/attendance/${attendanceId}`, {
                method: 'PUT',
                body: JSON.stringify(attendanceData)
            });
            showAlert('缺勤记录更新成功', 'success');
        } else {
            // 添加新缺勤记录
            await apiRequest('/api/attendance', {
                method: 'POST',
                body: JSON.stringify(attendanceData)
            });
            showAlert('缺勤记录添加成功', 'success');
        }
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('attendanceModal'));
        modal.hide();
        
        // 重置表单
        document.getElementById('attendanceForm').reset();
        document.getElementById('attendance-id').value = '';
        
        // 重新加载缺勤记录
        loadAttendance(currentPage);
    } catch (error) {
        console.error('保存缺勤记录失败:', error);
    }
}

// 编辑缺勤记录
async function editAttendance(attendanceId) {
    try {
        const record = await apiRequest(`/api/attendance/${attendanceId}`);
        
        document.getElementById('attendance-id').value = record.id;
        document.getElementById('attendance-employee').value = record.employee_id;
        document.getElementById('attendance-date').value = record.date;
        document.getElementById('attendance-type').value = record.absence_type;
        document.getElementById('attendance-reason').value = record.reason || '';
        document.getElementById('attendance-notes').value = record.notes || '';
        
        document.getElementById('attendanceModalTitle').textContent = '编辑缺勤记录';
        
        const modal = new bootstrap.Modal(document.getElementById('attendanceModal'));
        modal.show();
    } catch (error) {
        console.error('编辑缺勤记录失败:', error);
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

// 更新统计汇总
function updateStatsSummary(statsData, statsType) {
    const summaryElement = document.getElementById('stats-summary');
    const periodText = statsType === 'monthly' ? 
        `${statsData.period.year}年${statsData.period.month}月` : 
        `${statsData.period.year}年`;
    
    summaryElement.innerHTML = `
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h5 class="card-title">${statsData.summary.total_employees}</h5>
                    <p class="card-text">员工总数</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h5 class="card-title">${statsData.summary.employees_with_absences}</h5>
                    <p class="card-text">缺勤员工数</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h5 class="card-title">${statsData.summary.total_absence_days}</h5>
                    <p class="card-text">${periodText}缺勤天数</p>
                </div>
            </div>
        </div>
        <div class="col-md-3">
            <div class="card text-center">
                <div class="card-body">
                    <h5 class="card-title">${statsData.summary.average_absence_days_per_employee || (statsData.summary.total_absence_days / statsData.summary.total_employees).toFixed(1)}</h5>
                    <p class="card-text">人均缺勤天数</p>
                </div>
            </div>
        </div>
        <div class="col-md-12 mt-3">
            <div class="card">
                <div class="card-body">
                    <h6>缺勤类型分布</h6>
                    <div class="row">
                        <div class="col-md-4">
                            <strong>全天缺勤:</strong> ${statsData.summary.total_full_day_absences} 天
                        </div>
                        <div class="col-md-4">
                            <strong>上午缺勤:</strong> ${statsData.summary.total_morning_absences} 次
                        </div>
                        <div class="col-md-4">
                            <strong>下午缺勤:</strong> ${statsData.summary.total_afternoon_absences} 次
                        </div>
                    </div>
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
            ['员工编号', '员工姓名', '日期', '缺勤类型', '备注']
        ];
        
        attendanceRecords.records.forEach(record => {
            worksheetData.push([
                record.employee ? record.employee.employee_number : '',
                record.employee ? record.employee.name : '未知',
                record.date,
                getAbsenceTypeText(record.absence_type),
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
            ['员工编号', '员工姓名', '日期', '缺勤类型', '备注']
        ];
        
        attendanceRecords.records.forEach(record => {
            worksheetData.push([
                record.employee ? record.employee.employee_number : '',
                record.employee ? record.employee.name : '未知',
                record.date,
                getAbsenceTypeText(record.absence_type),
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