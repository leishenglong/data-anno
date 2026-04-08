# 数据标注系统

一个高质量数据集标注系统，支持多种标注类型（文本分类、实体识别、关系抽取、对话标注、评分评审），集成 AI 辅助标注功能。

## 功能特性

- **多类型标注支持**
  - 文本分类（单标签/多标签）
  - 实体识别（NER）
  - 关系抽取
  - 对话标注
  - 评分评审

- **AI 辅助标注**
  - 支持 OpenAI GPT 系列模型
  - 支持 Ollama 本地模型
  - 自定义 Prompt 模板

- **数据管理**
  - 支持 JSON、JSONL、CSV 格式导入
  - 多种格式导出（JSON、JSONL、CSV、Alpaca、ShareGPT）

- **项目管理**
  - 项目创建与配置
  - 数据集上传与管理
  - 标注进度跟踪

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+
- npm 或 yarn

### 方式一：使用启动脚本（推荐）

**Windows 用户：**
```bash
start.bat
```

**Linux/Mac 用户：**
```bash
chmod +x start.sh
./start.sh
```

### 方式二：手动启动

**1. 启动后端**

```bash
cd backend

# 创建虚拟环境（仅首次）
python -m venv venv

# 激活虚拟环境
# Windows:
call venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**2. 启动前端**

```bash
cd frontend

# 安装依赖（仅首次）
npm install

# 启动开发服务器
npm run dev
```

### 3. 访问系统

- 前端：http://localhost:5173
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

## 使用 Docker 部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 使用指南

### 1. 创建项目

1. 点击「新建项目」按钮
2. 输入项目名称和描述
3. 选择标注类型（文本分类、NER 等）
4. 配置标签集
5. 点击「创建项目」

### 2. 上传数据集

1. 进入项目详情页
2. 点击「上传数据集」
3. 选择数据文件（支持 JSON、JSONL、CSV）
4. 等待数据解析完成

### 3. 开始标注

1. 点击数据集列表中的「标注」按钮
2. 进入标注工作台
3. 根据数据类型进行标注
4. 点击「提交」保存标注结果

### 4. AI 辅助标注

1. 进入「AI 配置」页面
2. 选择 AI 服务提供商（OpenAI 或 Ollama）
3. 配置 API Key 或 Ollama 地址
4. 保存配置
5. 在标注工作台点击「AI 标注」按钮

### 5. 导出数据

1. 进入项目详情页
2. 点击数据集操作中的「导出」
3. 选择导出格式
4. 点击「导出」下载文件

## 数据格式

### 导入数据格式

**JSON:**
```json
[
  {"text": "这是一个示例文本"},
  {"text": "这是另一个示例"}
]
```

**JSONL:**
```json
{"text": "这是一个示例文本"}
{"text": "这是另一个示例"}
```

**CSV:**
```csv
text
这是一个示例文本
这是另一个示例
```

### 对话数据格式

```json
{
  "conversation": [
    {"role": "user", "content": "用户消息"},
    {"role": "assistant", "content": "助手回复"}
  ]
}
```

## 配置说明

### 环境变量

复制 `.env.example` 为 `.env` 并配置：

```env
# 数据库
DATABASE_URL=sqlite+aiosqlite:///./data/anno.db

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# OpenAI
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
```

## 技术栈

- **后端**: FastAPI + SQLAlchemy + SQLite
- **前端**: React + TypeScript + Ant Design + Vite
- **AI**: OpenAI API / Ollama

## 项目结构

```
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 入口
│   │   ├── config.py        # 配置管理
│   │   ├── database.py      # 数据库连接
│   │   ├── models/          # 数据模型
│   │   ├── routers/         # API 路由
│   │   ├── schemas/         # Pydantic schemas
│   │   └── services/        # 业务逻辑
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   ├── components/      # 通用组件
│   │   ├── services/        # API 调用
│   │   └── types/           # 类型定义
│   └── package.json
├── docker-compose.yml
└── README.md
```

## License

MIT
