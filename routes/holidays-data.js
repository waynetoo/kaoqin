const holidayAPIClient = require('./holiday-api-client');

// 兼容旧的方法名，确保现有代码继续工作
async function getHolidaysByYear(year) {
    // API不直接提供节假日列表，返回空对象
    return {};
}

async function getAllHolidayDates(year) {
    // API不直接提供节假日列表，返回空数组
    return [];
}

async function getWorkDates(year) {
    // API不直接提供调休日期列表，返回空数组
    return [];
}

async function calculateWorkDays(startDate, endDate) {
    return await holidayAPIClient.calculateWorkDays(startDate, endDate);
}

async function getMonthWorkDays(year, month) {
    return await holidayAPIClient.getMonthWorkDays(year, month);
}

async function getYearWorkDays(year) {
    return await holidayAPIClient.getYearWorkDays(year);
}

async function getHolidayInfo(startDate, endDate) {
    return await holidayAPIClient.getHolidayInfoByRange(startDate, endDate);
}

// 同步版本的方法，用于兼容现有代码
function getMonthWorkDaysSync(year, month) {
    // 降级方案：使用本地计算
    const moment = require('moment');
    const startDate = moment(`${year}-${month.toString().padStart(2, '0')}-01`).startOf('month');
    const endDate = moment(`${year}-${month.toString().padStart(2, '0')}-01`).endOf('month');
    
    let workDays = 0;
    let current = startDate.clone();
    
    while (current.isSameOrBefore(endDate)) {
        const dayOfWeek = current.day();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workDays++;
        }
        current.add(1, 'days');
    }
    
    return workDays;
}

function getYearWorkDaysSync(year) {
    // 降级方案：使用本地计算
    const moment = require('moment');
    const startDate = moment(`${year}-01-01`);
    const endDate = moment(`${year}-12-31`);
    
    let workDays = 0;
    let current = startDate.clone();
    
    while (current.isSameOrBefore(endDate)) {
        const dayOfWeek = current.day();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workDays++;
        }
        current.add(1, 'days');
    }
    
    return workDays;
}

module.exports = {
    getHolidaysByYear,
    getAllHolidayDates,
    getWorkDates,
    calculateWorkDays,
    getMonthWorkDays,
    getYearWorkDays,
    getHolidayInfo,
    getMonthWorkDaysSync,
    getYearWorkDaysSync
};
