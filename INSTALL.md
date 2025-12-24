# 员工缺勤考勤系统 - 快速安装指南

## 步骤1：安装依赖

在项目根目录下运行：

```bash
npm install
```

## 步骤2：配置Supabase

1. 访问 [Supabase官网](https://supabase.com/) 并创建账户
2. 点击"New Project"创建新项目
3. 选择组织，输入项目名称和数据库密码
4. 等待项目创建完成

## 步骤3：初始化数据库

1. 在Supabase项目中，进入左侧菜单的"SQL Editor"
2. 点击"New query"创建新查询
3. 复制项目中的 `database/init.sql` 文件内容
4. 粘贴到SQL编辑器中
5. 点击"Run"执行SQL语句

## 步骤4：获取连接信息

1. 在Supabase项目中，进入左侧菜单的"Settings" > "API"
2. 复制"Project URL"和"anon public"密钥

## 步骤5：配置环境变量

1. 打开项目根目录下的 `.env` 文件
2. 将以下内容替换为您的实际信息：

```
SUPABASE_URL=您的项目URL
SUPABASE_ANON_KEY=您的anon密钥
```

例如：

```
SUPABASE_URL=https://yourprojectid.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 步骤6：启动系统

### 方法1：使用启动脚本（推荐）

双击运行 `start.bat` 文件，或在命令行中运行：

```bash
start.bat
```

### 方法2：使用npm命令

```bash
npm start
```

## 步骤7：访问系统

打开浏览器，访问：http://localhost:3000

## 常见问题

### PowerShell执行策略问题

如果遇到"无法加载文件...因为在此系统上禁止运行脚本"的错误，请在PowerShell中运行：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 端口占用问题

如果3000端口被占用，可以修改 `.env` 文件中的 `PORT` 值，例如：

```
PORT=3001
```

然后访问 http://localhost:3001

### 数据库连接失败

1. 检查 `.env` 文件中的URL和密钥是否正确
2. 确保Supabase项目已正确创建
3. 确保已执行数据库初始化脚本

## 系统功能

1. **员工管理**：添加、编辑、删除员工信息
2. **缺勤记录**：记录员工的上午、下午或全天缺勤情况
3. **审批流程**：支持缺勤记录的审批流程
4. **统计分析**：提供月度和年度缺勤统计，包括个人和部门统计
5. **可视化图表**：使用图表展示部门缺勤情况

## 默认账户

系统已预置了5个示例员工账号：

- 工号：EMP001，姓名：张三，部门：技术部
- 工号：EMP002，姓名：李四，部门：技术部
- 工号：EMP003，姓名：王五，部门：人事部
- 工号：EMP004，姓名：赵六，部门：财务部
- 工号：EMP005，姓名：钱七，部门：市场部

您可以使用这些账号测试系统功能，也可以添加自己的员工数据。

## 技术支持

如需技术支持，请参考项目README.md文件或联系开发人员。