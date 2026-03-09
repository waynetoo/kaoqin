const http = require('http');

function getAttendanceRecords() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/attendance?limit=100',
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
        console.log('所有考勤记录:');
        console.log('总记录数:', result.records.length);
        console.log('---');
        
        // 检查迟到和早退记录的 absence_type 字段
        const lateEarlyRecords = result.records.filter(record => 
            record.attendance_type === 'late' || record.attendance_type === 'early_leave'
        );
        
        console.log('迟到和早退记录:');
        lateEarlyRecords.forEach(record => {
            console.log(`员工: ${record.employee ? record.employee.name : '未知'}`);
            console.log(`日期: ${record.date}`);
            console.log(`考勤类型: ${record.attendance_type}`);
            console.log(`缺勤类型: ${record.absence_type}`);
            console.log(`迟到分钟数: ${record.late_minutes}`);
            console.log(`早退分钟数: ${record.early_leave_minutes}`);
            console.log('---');
        });
        
        // 检查异常记录（absence_type 不为 'none' 的迟到/早退记录）
        const abnormalRecords = lateEarlyRecords.filter(record => record.absence_type !== 'none');
        console.log('异常记录（缺勤类型不为 none 的迟到/早退记录）:');
        abnormalRecords.forEach(record => {
            console.log(`员工: ${record.employee ? record.employee.name : '未知'}`);
            console.log(`日期: ${record.date}`);
            console.log(`考勤类型: ${record.attendance_type}`);
            console.log(`缺勤类型: ${record.absence_type}`);
            console.log('---');
        });
        
        if (abnormalRecords.length === 0) {
            console.log('没有发现异常记录，所有迟到和早退记录的缺勤类型都正确设置为 none。');
        }
    } catch (error) {
        console.error('检查失败:', error);
    }
}

checkAttendanceRecords();