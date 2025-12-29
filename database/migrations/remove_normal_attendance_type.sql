-- 修改考勤记录表，去掉正常考勤类型并优化结构
-- 1. 更新考勤类型字段注释，去掉normal选项
COMMENT ON COLUMN attendance_records.attendance_type IS '考勤类型: absence(缺勤), late(迟到), early_leave(早退)';

-- 2. 删除所有normal类型的记录（如果存在）
DELETE FROM attendance_records WHERE attendance_type = 'normal';

-- 3. 添加约束确保考勤类型只能是absence, late, early_leave
ALTER TABLE attendance_records ADD CONSTRAINT check_attendance_type 
CHECK (attendance_type IN ('absence', 'late', 'early_leave'));

-- 4. 添加工作时间设置表（用于存储标准工作时间）
CREATE TABLE IF NOT EXISTS work_settings (
    id SERIAL PRIMARY KEY,
    work_start_time TIME DEFAULT '09:00:00',
    work_end_time TIME DEFAULT '18:00:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 插入默认工作时间设置
INSERT INTO work_settings (work_start_time, work_end_time) 
VALUES ('09:00:00', '18:00:00')
ON CONFLICT DO NOTHING;

-- 6. 创建自动计算迟到早退时间的函数
CREATE OR REPLACE FUNCTION calculate_attendance_time()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果有上班打卡时间，计算迟到分钟数
    IF NEW.check_in_time IS NOT NULL THEN
        -- 计算迟到分钟数（如果上班时间晚于9点）
        NEW.late_minutes = EXTRACT(EPOCH FROM (NEW.check_in_time - (SELECT work_start_time FROM work_settings LIMIT 1))) / 60;
        -- 如果不迟到，设置为0
        IF NEW.late_minutes < 0 THEN
            NEW.late_minutes = 0;
        END IF;
    END IF;
    
    -- 如果有下班打卡时间，计算早退分钟数
    IF NEW.check_out_time IS NOT NULL THEN
        -- 计算早退分钟数（如果下班时间早于18点）
        NEW.early_leave_minutes = EXTRACT(EPOCH FROM ((SELECT work_end_time FROM work_settings LIMIT 1) - NEW.check_out_time)) / 60;
        -- 如果不早退，设置为0
        IF NEW.early_leave_minutes < 0 THEN
            NEW.early_leave_minutes = 0;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建触发器，在插入或更新考勤记录时自动计算迟到早退时间
DROP TRIGGER IF EXISTS trigger_calculate_attendance_time ON attendance_records;
CREATE TRIGGER trigger_calculate_attendance_time
BEFORE INSERT OR UPDATE ON attendance_records
FOR EACH ROW EXECUTE FUNCTION calculate_attendance_time();