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

async function fixSpecificAttendanceRecord() {
    try {
        // 修复小凡 (EMP003) 在 2026-03-10 的缺勤记录
        const attendanceId = '055b8834-4bd5-42ed-a880-bc847b70917c';
        
        console.log('修复小凡 (EMP003) 在 2026-03-10 的缺勤记录');
        
        try {
            const updatedRecord = await updateAttendanceRecord(attendanceId, {
                attendance_type: 'absence',
                absence_type: 'full_day'
            });
            console.log('修复成功');
        } catch (error) {
            console.error('修复失败:', error.message);
        }
    } catch (error) {
        console.error('修复失败:', error);
    }
}

fixSpecificAttendanceRecord();