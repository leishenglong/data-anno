@echo off
echo ========================================
echo   数据标注系统启动脚本 (Windows)
echo ========================================
echo.

:: 检查 Python 是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Python，请先安装 Python 3.10+
    pause
    exit /b 1
)

:: 检查 Node.js 是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

echo [1/4] 初始化目录...
if not exist "backend\data" mkdir backend\data
if not exist "frontend\node_modules" (
    echo [2/4] 安装前端依赖...
    cd frontend
    call npm install
    cd ..
)

if not exist "backend\venv" (
    echo [3/4] 创建 Python 虚拟环境...
    python -m venv backend\venv
)

echo [4/4] 启动服务...
echo.

:: 启动后端（在新的命令行窗口）
echo 启动后端服务 (http://localhost:8000) ...
start "DataAnno Backend" cmd /k "cd backend && call ..\backend\venv\Scripts\activate && set PYTHONPATH=.. && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: 等待后端启动
timeout /t 3 /nobreak >nul

:: 启动前端
echo 启动前端服务 (http://localhost:5173) ...
cd frontend
call npm run dev

pause
