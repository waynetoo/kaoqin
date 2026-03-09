const https = require('https');
const http = require('http');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

class HolidayAPIClient {
    constructor() {
        this.apiUrl = 'https://timor.tech/api/holiday';
        this.cache = new Map();
        this.cacheExpiry = 7 * 24 * 60 * 60 * 1000;
        this.storagePath = path.join(__dirname, '../cache/holidays.json');
        
        this.ensureCacheDir();
        this.loadCache();
    }

    ensureCacheDir() {
        const cacheDir = path.join(__dirname, '../cache');
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
    }

    loadCache() {
        try {
            if (fs.existsSync(this.storagePath)) {
                const data = fs.readFileSync(this.storagePath, 'utf8');
                const cacheData = JSON.parse(data);
                Object.keys(cacheData).forEach(key => {
                    this.cache.set(key, cacheData[key]);
                });
            }
        } catch (error) {
            console.error('加载缓存失败:', error);
        }
    }

    saveCache() {
        try {
            const cacheData = {};
            this.cache.forEach((value, key) => {
                cacheData[key] = value;
            });
            fs.writeFileSync(this.storagePath, JSON.stringify(cacheData, null, 2));
        } catch (error) {
            console.error('保存缓存失败:', error);
        }
    }

    async getYearHolidayData(year) {
        const cacheKey = `year_holidays_${year}`;
        
        const cachedData = this.cache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < this.cacheExpiry) {
            return cachedData.data;
        }

        try {
            const data = await this.fetchYearHolidayData(year);
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            this.saveCache();
            return data;
        } catch (error) {
            console.error(`获取${year}年节假日数据失败:`, error);
            if (cachedData) {
                return cachedData.data;
            }
            throw error;
        }
    }

    fetchYearHolidayData(year) {
        return new Promise((resolve, reject) => {
            const url = `${this.apiUrl}/year/${year}/`;
            const protocol = url.startsWith('https') ? https : http;
            
            protocol.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (result.code === 0) {
                            resolve(result.holiday);
                        } else {
                            reject(new Error(`API错误: ${result.msg || '未知错误'}`));
                        }
                    } catch (error) {
                        reject(new Error('无效的API响应'));
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    async getMonthHolidayData(year, month) {
        const cacheKey = `month_holidays_${year}_${month}`;
        
        const cachedData = this.cache.get(cacheKey);
        if (cachedData && Date.now() - cachedData.timestamp < this.cacheExpiry) {
            return cachedData.data;
        }

        try {
            const data = await this.fetchMonthHolidayData(year, month);
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            this.saveCache();
            return data;
        } catch (error) {
            console.error(`获取${year}年${month}月节假日数据失败:`, error);
            if (cachedData) {
                return cachedData.data;
            }
            throw error;
        }
    }

    fetchMonthHolidayData(year, month) {
        return new Promise((resolve, reject) => {
            const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
            const url = `${this.apiUrl}/year/${monthStr}`;
            const protocol = url.startsWith('https') ? https : http;
            
            protocol.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        if (result.code === 0) {
                            resolve(result.holiday);
                        } else {
                            reject(new Error(`API错误: ${result.msg || '未知错误'}`));
                        }
                    } catch (error) {
                        reject(new Error('无效的API响应'));
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    calculateMonthWorkDays(year, month, holidayData) {
        const startDate = moment(`${year}-${month.toString().padStart(2, '0')}-01`).startOf('month');
        const endDate = moment(`${year}-${month.toString().padStart(2, '0')}-01`).endOf('month');
        
        let workDays = 0;
        let holidays = [];
        let workDates = [];
        
        let current = startDate.clone();
        while (current.isSameOrBefore(endDate)) {
            const dateStr = current.format('YYYY-MM-DD');
            const monthDay = current.format('MM-DD');
            const dayOfWeek = current.day();
            
            const holidayInfo = holidayData[monthDay];
            
            if (holidayInfo) {
                if (holidayInfo.holiday) {
                    holidays.push({ date: dateStr, type: holidayInfo.name });
                } else {
                    workDates.push(dateStr);
                    workDays++;
                }
            } else {
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    workDates.push(dateStr);
                    workDays++;
                } else {
                    holidays.push({ date: dateStr, type: '周末' });
                }
            }
            
            current.add(1, 'days');
        }
        
        return {
            workDays: workDays,
            holidays: holidays,
            workDates: workDates
        };
    }

    calculateYearWorkDays(year, holidayData) {
        const startDate = moment(`${year}-01-01`);
        const endDate = moment(`${year}-12-31`);
        
        let workDays = 0;
        let holidays = [];
        let workDates = [];
        
        let current = startDate.clone();
        while (current.isSameOrBefore(endDate)) {
            const dateStr = current.format('YYYY-MM-DD');
            const monthDay = current.format('MM-DD');
            const dayOfWeek = current.day();
            
            const holidayInfo = holidayData[monthDay];
            
            if (holidayInfo) {
                if (holidayInfo.holiday) {
                    holidays.push({ date: dateStr, type: holidayInfo.name });
                } else {
                    workDates.push(dateStr);
                    workDays++;
                }
            } else {
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    workDates.push(dateStr);
                    workDays++;
                } else {
                    holidays.push({ date: dateStr, type: '周末' });
                }
            }
            
            current.add(1, 'days');
        }
        
        return {
            workDays: workDays,
            holidays: holidays,
            workDates: workDates
        };
    }

    async getMonthWorkDays(year, month) {
        const holidayData = await this.getMonthHolidayData(year, month);
        const result = this.calculateMonthWorkDays(year, month, holidayData);
        return result.workDays;
    }

    async getYearWorkDays(year) {
        const holidayData = await this.getYearHolidayData(year);
        const result = this.calculateYearWorkDays(year, holidayData);
        return result.workDays;
    }

    async getHolidayInfoByRange(startDate, endDate) {
        const start = moment(startDate);
        const end = moment(endDate);
        const year = start.year();
        
        const holidayData = await this.getYearHolidayData(year);
        
        const result = {
            holidays: [],
            workDates: []
        };
        
        let current = start.clone();
        while (current.isSameOrBefore(end)) {
            const dateStr = current.format('YYYY-MM-DD');
            const monthDay = current.format('MM-DD');
            const dayOfWeek = current.day();
            
            const holidayInfo = holidayData[monthDay];
            
            if (holidayInfo) {
                if (holidayInfo.holiday) {
                    result.holidays.push({ date: dateStr, type: holidayInfo.name });
                } else {
                    result.workDates.push(dateStr);
                }
            } else {
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    result.workDates.push(dateStr);
                } else {
                    result.holidays.push({ date: dateStr, type: '周末' });
                }
            }
            
            current.add(1, 'days');
        }
        
        return result;
    }

    clearCache() {
        this.cache.clear();
        try {
            if (fs.existsSync(this.storagePath)) {
                fs.unlinkSync(this.storagePath);
            }
        } catch (error) {
            console.error('清除缓存失败:', error);
        }
    }
}

module.exports = new HolidayAPIClient();
