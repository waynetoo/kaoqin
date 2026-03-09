const express = require('express');
const router = express.Router();
const moment = require('moment');
const holidayCalculator = require('./holidays-data');

router.get('/year/:year', async (req, res) => {
    try {
        const { year } = req.params;
        const yearNum = parseInt(year);
        
        if (!year || isNaN(yearNum)) {
            return res.status(400).json({ error: '请提供有效的年份' });
        }
        
        const workDays = await holidayCalculator.getYearWorkDays(yearNum);
        const holidays = await holidayCalculator.getHolidaysByYear(yearNum);
        
        res.json({
            year: yearNum,
            work_days: workDays,
            holidays: holidays
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/month/:year/:month', async (req, res) => {
    try {
        const { year, month } = req.params;
        const yearNum = parseInt(year);
        const monthNum = parseInt(month);
        
        if (!year || !month || isNaN(yearNum) || isNaN(monthNum)) {
            return res.status(400).json({ error: '请提供有效的年份和月份' });
        }
        
        if (monthNum < 1 || monthNum > 12) {
            return res.status(400).json({ error: '月份必须在1-12之间' });
        }
        
        const workDays = await holidayCalculator.getMonthWorkDays(yearNum, monthNum);
        const startDate = moment(`${yearNum}-${monthNum.toString().padStart(2, '0')}-01`).startOf('month').format('YYYY-MM-DD');
        const endDate = moment(`${yearNum}-${monthNum.toString().padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');
        const holidayInfo = await holidayCalculator.getHolidayInfo(startDate, endDate);
        
        res.json({
            year: yearNum,
            month: monthNum,
            work_days: workDays,
            holidays: holidayInfo.holidays,
            work_dates: holidayInfo.workDates
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/info', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ error: '请提供开始日期和结束日期' });
        }
        
        const holidayInfo = await holidayCalculator.getHolidayInfo(start_date, end_date);
        const workDays = await holidayCalculator.calculateWorkDays(start_date, end_date);
        
        res.json({
            start_date,
            end_date,
            work_days: workDays,
            holidays: holidayInfo.holidays,
            work_dates: holidayInfo.workDates
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
