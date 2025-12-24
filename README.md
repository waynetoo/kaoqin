# 员工缺勤考勤系统

这是一个基于Supabase数据库的员工缺勤考勤系统，专注于记录和统计员工的缺勤情况。

## 功能特点

- **员工管理**：添加、编辑、删除员工信息
- **缺勤记录**：记录员工的上午、下午或全天缺勤情况
- **审批流程**：支持缺勤记录的审批流程
- **统计分析**：提供月度和年度缺勤统计，包括个人和部门统计
- **可视化图表**：使用图表展示部门缺勤情况

## 技术栈

- **后端**：Node.js + Express
- **数据库**：Supabase (PostgreSQL)
- **前端**：HTML + CSS + JavaScript + Bootstrap 5
- **图表**：Chart.js

## 安装和配置

### 1. 克隆项目

```bash
git clone <repository-url>
cd kaoqin
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置Supabase

1. 在Supabase上创建新项目
2. 在SQL编辑器中执行`database/schema.sql`中的SQL语句，创建数据库表
3. 获取项目的URL和API密钥
4. 创建`.env`文件，配置以下信息：

```
# Supabase配置
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# 服务器配置
PORT=3000
NODE_ENV=development
```

### 4. 启动服务器

```bash
npm start
```

或者使用开发模式（自动重启）：

```bash
npm run dev
```

### 5. 访问系统

打开浏览器访问：`http://localhost:3000`

## 数据库表结构

### 员工表 (employees)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| employee_id | VARCHAR(20) | 员工工号 |
| name | VARCHAR(100) | 员工姓名 |
| department | VARCHAR(100) | 部门 |
| position | VARCHAR(100) | 职位 |
| hire_date | DATE | 入职日期 |
| phone | VARCHAR(20) | 电话 |
| email | VARCHAR(100) | 邮箱 |
| status | VARCHAR(20) | 状态：active/inactive |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 缺勤记录表 (attendance_records)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| employee_id | UUID | 员工ID（外键） |
| date | DATE | 缺勤日期 |
| absence_type | VARCHAR(20) | 缺勤类型：morning/afternoon/full_day |
| reason | TEXT | 缺勤原因 |
| approved_by | UUID | 审批人ID（外键） |
| approved_at | TIMESTAMP | 审批时间 |
| status | VARCHAR(20) | 状态：pending/approved/rejected |
| notes | TEXT | 备注 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## API接口

### 员工管理

- `GET /api/employees` - 获取所有员工
- `GET /api/employees/:id` - 获取单个员工
- `POST /api/employees` - 添加新员工
- `PUT /api/employees/:id` - 更新员工信息
- `DELETE /api/employees/:id` - 删除员工

### 缺勤记录

- `GET /api/attendance` - 获取缺勤记录（支持分页和筛选）
- `GET /api/attendance/:id` - 获取单个缺勤记录
- `POST /api/attendance` - 添加缺勤记录
- `PUT /api/attendance/:id` - 更新缺勤记录
- `PUT /api/attendance/:id/approve` - 审批缺勤记录
- `DELETE /api/attendance/:id` - 删除缺勤记录
- `POST /api/attendance/batch` - 批量添加缺勤记录

### 统计分析

- `GET /api/statistics/monthly/:year/:month` - 获取月度统计
- `GET /api/statistics/yearly/:year` - 获取年度统计
- `GET /api/statistics/employee/:id` - 获取员工个人统计

## 使用说明

### 1. 添加员工

在"员工管理"页面，点击"添加员工"按钮，填写员工信息并保存。

### 2. 记录缺勤

在"缺勤记录"页面，点击"添加缺勤记录"按钮，选择员工、日期、缺勤类型并填写原因。

### 3. 审批缺勤记录

对于状态为"待审批"的记录，点击审批按钮，选择审批结果和审批人。

### 4. 查看统计

在"统计分析"页面，选择统计类型（月度/年度）、时间范围和部门，点击"生成统计"查看结果。

## 注意事项

1. 缺勤天数计算规则：
   - 全天缺勤：1天
   - 上午或下午缺勤：0.5天

2. 员工删除逻辑：
   - 如果员工没有考勤记录，直接删除
   - 如果员工有考勤记录，将状态设为"离职"而不是删除

3. 重复记录检查：
   - 同一员工同一天同类型的缺勤记录不能重复添加

## 许可证

MIT License