const http = require('http');

function updateAttendanceRecord(id, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/api/attendance/${id}`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        console.log(`发送更新请求: ID=${id}, 数据=${JSON.stringify(data)}`);

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    console.log(`更新响应: ${JSON.stringify(result)}`);
                    resolve(result);
                } catch (error) {
                    console.error('无效的API响应:', responseData);
                    reject(new Error('无效的API响应'));
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('请求错误:', error);
            reject(error);
        });
        
        req.write(JSON.stringify(data));
        req.end();
    });
}

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

async function fixAttendanceRecords() {
    try {
        // 获取所有考勤记录
        const result = await getAttendanceRecords();
        
        // 找出异常记录（缺勤类型不为 none 的迟到/早退记录）
        const abnormalRecords = result.records.filter(record => 
            (record.attendance_type === 'late' || record.attendance_type === 'early_leave') && 
            record.absence_type !== 'none'
        );
        
        console.log('发现异常记录:', abnormalRecords.length, '条');
        
        // 修复异常记录
        for (const record of abnormalRecords) {
            console.log(`修复记录: ${record.employee ? record.employee.name : '未知'} - ${record.date} - ${record.attendance_type}`);
            console.log(`原缺勤类型: ${record.absence_type}`);
            
            try {
                const updatedRecord = await updateAttendanceRecord(record.id, {
                    attendance_type: record.attendance_type,
                    absence_type: 'none'
                });
                console.log(`修复后缺勤类型: ${updatedRecord.absence_type}`);
                console.log('修复成功');
            } catch (error) {
                console.error('修复失败:', error.message);
            }
            console.log('---');
        }
        
        if (abnormalRecords.length === 0) {
            console.log('没有发现异常记录，所有迟到和早退记录的缺勤类型都正确设置为 none。');
        }
    } catch (error) {
        console.error('修复失败:', error);
    }
}

fixAttendanceRecords();