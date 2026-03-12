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

async function checkSpecificAttendanceRecord() {
    try {
        const result = await getAttendanceRecords();
        console.log('所有考勤记录:');
        console.log('总记录数:', result.records.length);
        console.log('---');
        
        // 查找特定的记录：小凡 (EMP003) 在 2026-03-10 的缺勤记录
        const specificRecord = result.records.find(record => 
            record.employee && record.employee.employee_id === 'EMP003' &&
            record.date === '2026-03-10' &&
            record.attendance_type === 'absence'
        );
        
        if (specificRecord) {
            console.log('找到特定记录:');
            console.log(`员工: ${specificRecord.employee.name} (${specificRecord.employee.employee_id})`);
            console.log(`日期: ${specificRecord.date}`);
            console.log(`考勤类型: ${specificRecord.attendance_type}`);
            console.log(`缺勤类型: ${specificRecord.absence_type}`);
            console.log(`原因: ${specificRecord.reason}`);
            console.log(`备注: ${specificRecord.notes}`);
            console.log(`状态: ${specificRecord.status}`);
            console.log(`ID: ${specificRecord.id}`);
        } else {
            console.log('未找到特定记录');
        }
    } catch (error) {
        console.error('检查失败:', error);
    }
}

checkSpecificAttendanceRecord();