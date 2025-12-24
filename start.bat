@echo off
echo 正在启动员工缺勤考勤系统...
echo.

REM 检查是否已配置Supabase
findstr /C:"SUPABASE_URL" .env >nul
if %ERRORLEVEL% == 0 (
    echo 错误：请先在.env文件中配置您的Supabase连接信息！
    echo.
    echo 配置步骤：
    echo 1. 在Supabase上创建新项目
    echo 2. 在SQL编辑器中执行database/schema.sql中的SQL语句
    echo 3. 获取项目的URL和API密钥
    echo 4. 更新.env文件中的SUPABASE_URL和SUPABASE_ANON_KEY
    echo.
    pause
    exit /b 1
)

echo 配置检查通过，正在启动服务器...
echo 服务器启动后，请在浏览器中访问 http://localhost:3000
echo.
npm start