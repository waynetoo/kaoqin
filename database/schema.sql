-- 员工表
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR(20) UNIQUE NOT NULL,  -- 员工工号
  name VARCHAR(100) NOT NULL,              -- 员工姓名
  position VARCHAR(100),                   -- 职位
  hire_date DATE NOT NULL,                 -- 入职日期
  phone VARCHAR(20),                       -- 电话
  email VARCHAR(100),                      -- 邮箱
  status VARCHAR(20) DEFAULT 'active',     -- 状态：active(在职), inactive(离职)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 缺勤记录表
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,                      -- 缺勤日期
  absence_type VARCHAR(20) NOT NULL,       -- 缺勤类型：morning(上午), afternoon(下午), full_day(全天)
  reason TEXT,                             -- 缺勤原因
  notes TEXT,                              -- 备注
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, date, absence_type)  -- 防止重复记录
);

-- 创建索引以提高查询性能
CREATE INDEX idx_attendance_employee_id ON attendance_records(employee_id);
CREATE INDEX idx_attendance_date ON attendance_records(date);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为员工表创建更新时间触发器
CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 为考勤记录表创建更新时间触发器
CREATE TRIGGER update_attendance_records_updated_at 
    BEFORE UPDATE ON attendance_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 插入一些示例数据
INSERT INTO employees (employee_id, name, position, hire_date, phone, email) VALUES
('EMP001', '张三', '前端开发', '2022-01-15', '13800138001', 'zhangsan@example.com'),
('EMP002', '李四', '后端开发', '2022-02-20', '13800138002', 'lisi@example.com'),
('EMP003', '王五', 'HR专员', '2022-03-10', '13800138003', 'wangwu@example.com'),
('EMP004', '赵六', '会计', '2022-04-05', '13800138004', 'zhaoliu@example.com'),
('EMP005', '钱七', '市场专员', '2022-05-12', '13800138005', 'qianqi@example.com');