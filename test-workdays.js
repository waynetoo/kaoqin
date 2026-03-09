const holidayAPIClient = require('./routes/holiday-api-client');

async function testWorkDays() {
    try {
        const startDate = '2026-03-01';
        const endDate = '2026-03-09';
        
        const holidayInfo = await holidayAPIClient.getHolidayInfoByRange(startDate, endDate);
        console.log('工作日天数:', holidayInfo.workDates.length);
        console.log('工作日日期:', holidayInfo.workDates);
        console.log('节假日日期:', holidayInfo.holidays);
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testWorkDays();