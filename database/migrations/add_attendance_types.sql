-- 添加迟到早退相关字段到attendance_records表
-- 1. 添加考勤类型字段，区分缺勤、迟到、早退
ALTER TABLE attendance_records ADD COLUMN attendance_type VARCHAR(20) DEFAULT 'absence';

-- 2. 添加迟到/早退时间字段（分钟）
ALTER TABLE attendance_records ADD COLUMN late_minutes INTEGER DEFAULT 0;
ALTER TABLE attendance_records ADD COLUMN early_leave_minutes INTEGER DEFAULT 0;

-- 3. 添加上班/下班时间记录字段
ALTER TABLE attendance_records ADD COLUMN check_in_time TIME;
ALTER TABLE attendance_records ADD COLUMN check_out_time TIME;

-- 4. 更新现有记录的考勤类型为缺勤
UPDATE attendance_records SET attendance_type = 'absence' WHERE attendance_type IS NULL;

-- 5. 添加注释说明
COMMENT ON COLUMN attendance_records.attendance_type IS '考勤类型: absence(缺勤), late(迟到), early_leave(早退), normal(正常)';
COMMENT ON COLUMN attendance_records.late_minutes IS '迟到分钟数';
COMMENT ON COLUMN attendance_records.early_leave_minutes IS '早退分钟数';
COMMENT ON COLUMN attendance_records.check_in_time IS '上班打卡时间';
COMMENT ON COLUMN attendance_records.check_out_time IS '下班打卡时间';