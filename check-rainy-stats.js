const http = require('http');

function getStatistics() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/statistics/monthly/2026/3',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (error) {
                    reject(new Error('无效的API响应'));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.end();
    });
}

async function checkStats() {
    try {
        const result = await getStatistics();
        console.log('3月份统计数据:');
        result.employee_statistics.forEach(emp => {
            console.log(`姓名: ${emp.name}`);
            console.log(`员工编号: ${emp.employee_number}`);
            console.log(`总缺勤天数: ${emp.total_absence_days}`);
            console.log(`当前缺勤天数: ${emp.current_absence_days}`);
            console.log(`上午缺勤: ${emp.morning_absences}次`);
            console.log(`下午缺勤: ${emp.afternoon_absences}次`);
            console.log(`全天缺勤: ${emp.full_day_absences}次`);
            console.log('---');
        });
        console.log('汇总数据:');
        console.log(`总工作日天数: ${result.summary.work_days}`);
        console.log(`到当前日期的工作日天数: ${result.summary.current_work_days}`);
    } catch (error) {
        console.error('检查失败:', error);
    }
}

checkStats();