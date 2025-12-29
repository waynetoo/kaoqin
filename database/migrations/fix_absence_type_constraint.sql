-- 修改attendance_records表，使absence_type字段允许为null
-- 1. 删除唯一约束，因为现在需要支持多种考勤类型
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_employee_id_date_absence_type_key;

-- 2. 创建新的唯一约束，基于员工ID、日期和考勤类型
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_unique_record 
UNIQUE(employee_id, date, attendance_type);

-- 3. 修改absence_type字段，允许为null（只有缺勤记录才需要此字段）
ALTER TABLE attendance_records ALTER COLUMN absence_type DROP NOT NULL;

-- 4. 添加注释说明
COMMENT ON COLUMN attendance_records.absence_type IS '缺勤类型: morning(上午), afternoon(下午), full_day(全天)，仅当attendance_type为absence时有效';