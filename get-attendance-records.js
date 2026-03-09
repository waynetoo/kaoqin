const http = require('http');

function getAttendanceRecords() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/attendance?start_date=2026-03-01&end_date=2026-03-31',
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

async function checkAttendanceRecords() {
    try {
        const result = await getAttendanceRecords();
        console.log('3月份缺勤记录:');
        result.records.forEach(record => {
            console.log(`员工: ${record.employee ? record.employee.name : '未知'}`);
            console.log(`日期: ${record.date}`);
            console.log(`考勤类型: ${record.attendance_type}`);
            console.log(`缺勤类型: ${record.absence_type}`);
            console.log('---');
        });
    } catch (error) {
        console.error('检查失败:', error);
    }
}

checkAttendanceRecords();