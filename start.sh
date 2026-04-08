#!/bin/bash

echo "========================================"
echo "   数据标注系统启动脚本 (Linux/Mac)"
echo "========================================"
echo ""

# 检查 Python 是否安装
if ! command -v python3 &> /dev/null; then
    echo "[错误] 未检测到 Python，请先安装 Python 3.10+"
    exit 1
fi

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请先安装 Node.js 18+"
    exit 1
fi

echo "[1/5] 初始化目录..."
mkdir -p backend/data

echo "[2/5] 安装前端依赖..."
if [ ! -d "frontend/node_modules" ]; then
    cd frontend && npm install && cd ..
fi

echo "[3/5] 创建 Python 虚拟环境..."
if [ ! -d "backend/venv" ]; then
    python3 -m venv backend/venv
fi

echo "[4/5] 复制环境配置文件..."
if [ ! -f "backend/.env" ]; then
    cp .env.example backend/.env 2>/dev/null || true
fi

echo "[5/5] 启动服务..."
echo ""

# 启动后端（在后台）
echo "启动后端服务 (http://localhost:8000) ..."
cd backend
source venv/bin/activate
export PYTHONPATH=..
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动前端
echo "启动前端服务 (http://localhost:5173) ..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo "   服务已启动！"
echo "   后端: http://localhost:8000"
echo "   前端: http://localhost:5173"
echo "   API 文档: http://localhost:8000/docs"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待信号
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
