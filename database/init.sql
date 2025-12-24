-- 员工缺勤考勤系统数据库初始化脚本
-- 请在Supabase项目的SQL编辑器中执行此脚本

-- 员工表
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(20) UNIQUE NOT NULL,  -- 员工工号
  name VARCHAR(100) NOT NULL,              -- 员工姓名
  department VARCHAR(100),                  -- 部门
  position VARCHAR(100),                   -- 职位
  hire_date DATE NOT NULL,                 -- 入职日期
  phone VARCHAR(20),                       -- 电话
  email VARCHAR(100),                      -- 邮箱
  status VARCHAR(20) DEFAULT 'active',     -- 状态：active(在职), inactive(离职)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 缺勤记录表
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,                      -- 缺勤日期
  absence_type VARCHAR(20) NOT NULL,       -- 缺勤类型：morning(上午), afternoon(下午), full_day(全天)
  reason TEXT,                             -- 缺勤原因
  approved_by UUID REFERENCES employees(id), -- 审批人ID
  approved_at TIMESTAMP WITH TIME ZONE,     -- 审批时间
  status VARCHAR(20) DEFAULT 'pending',     -- 状态：pending(待审批), approved(已批准), rejected(已拒绝)
  notes TEXT,                              -- 备注
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, date, absence_type)  -- 防止重复记录
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);

-- 创建更新时间触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为员工表创建更新时间触发器（如果不存在）
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 为考勤记录表创建更新时间触发器（如果不存在）
DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON attendance_records;
CREATE TRIGGER update_attendance_records_updated_at 
    BEFORE UPDATE ON attendance_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 插入一些示例数据（如果表为空）
INSERT INTO employees (employee_id, name, department, position, hire_date, phone, email)
SELECT 'EMP001', '张三', '技术部', '前端开发', '2022-01-15', '13800138001', 'zhangsan@example.com'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'EMP001');

INSERT INTO employees (employee_id, name, department, position, hire_date, phone, email)
SELECT 'EMP002', '李四', '技术部', '后端开发', '2022-02-20', '13800138002', 'lisi@example.com'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'EMP002');

INSERT INTO employees (employee_id, name, department, position, hire_date, phone, email)
SELECT 'EMP003', '王五', '人事部', 'HR专员', '2022-03-10', '13800138003', 'wangwu@example.com'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'EMP003');

INSERT INTO employees (employee_id, name, department, position, hire_date, phone, email)
SELECT 'EMP004', '赵六', '财务部', '会计', '2022-04-05', '13800138004', 'zhaoliu@example.com'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'EMP004');

INSERT INTO employees (employee_id, name, department, position, hire_date, phone, email)
SELECT 'EMP005', '钱七', '市场部', '市场专员', '2022-05-12', '13800138005', 'qianqi@example.com'
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = 'EMP005');

-- 插入一些示例缺勤记录（如果表为空）
INSERT INTO attendance_records (employee_id, date, absence_type, reason, status)
SELECT e.id, CURRENT_DATE - INTERVAL '7 days', 'morning', '身体不适', 'approved'
FROM employees e WHERE e.employee_id = 'EMP001'
AND NOT EXISTS (SELECT 1 FROM attendance_records ar JOIN employees e ON ar.employee_id = e.id WHERE e.employee_id = 'EMP001' AND ar.date = CURRENT_DATE - INTERVAL '7 days');

INSERT INTO attendance_records (employee_id, date, absence_type, reason, status)
SELECT e.id, CURRENT_DATE - INTERVAL '5 days', 'full_day', '家中有事', 'approved'
FROM employees e WHERE e.employee_id = 'EMP002'
AND NOT EXISTS (SELECT 1 FROM attendance_records ar JOIN employees e ON ar.employee_id = e.id WHERE e.employee_id = 'EMP002' AND ar.date = CURRENT_DATE - INTERVAL '5 days');

INSERT INTO attendance_records (employee_id, date, absence_type, reason, status)
SELECT e.id, CURRENT_DATE - INTERVAL '3 days', 'afternoon', '医院就诊', 'pending'
FROM employees e WHERE e.employee_id = 'EMP003'
AND NOT EXISTS (SELECT 1 FROM attendance_records ar JOIN employees e ON ar.employee_id = e.id WHERE e.employee_id = 'EMP003' AND ar.date = CURRENT_DATE - INTERVAL '3 days');

-- 显示表创建成功信息
DO $$
BEGIN
    RAISE NOTICE '数据库表初始化完成！';
    RAISE NOTICE '员工表和缺勤记录表已创建，并插入了示例数据。';
END $$;