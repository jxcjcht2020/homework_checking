# Homework Checking Platform

金融工程课程作业管理、在线批改与成长追踪平台。

当前仓库包含两部分：
- `frontend/`：正式前端工程
- `backend/`：正式后端工程

该版本已完成前后端主干开发，可用于学院机房测试环境虚拟机部署与联调。

## 1. 系统功能

### 教师端
- 学段管理：本科生、硕士生、博士生
- 课程工作台：按学段查看课程、切换课程上下文
- 学生管理：卡片/列表视图、添加学生、Excel 导入、学生列表
- 作业管理：发布作业、查看作业列表、查看作业详情
- 批改结果：查看作业下学生评语、分项得分、标准执行矩阵
- 成长路径：查看学生历次作业后的能力变化，并跳转到对应作业详情

### 学生端
- 作业总览：查看本人已分配的作业
- 提交作业：上传文件后立即进入后台批改流程
- 批改查询：按课程与作业查看本人批改结果
- 成长路径：查看个人多次提交后的能力变化

### 在线批改链路
- 学生上传作业
- 后端保存文件并提取正文
- 后端立即调用 `grading_service`
- 生成：
  - `review.md`
  - `review-record.json`
  - `report.html`
- 结果写入 PostgreSQL，并同步供教师端、学生端读取

## 2. 技术栈

### 前端
- React
- TypeScript
- Vite
- React Router

### 后端
- FastAPI
- SQLAlchemy 2.x
- Pydantic
- PostgreSQL

### 文件与批改
- 本地磁盘目录存储标准文件、作业文件、评语产物
- Python 批改服务承接 `/homework-checking` skill 的输出契约
- 当前支持通过模型 API 实现“上传后立即在线批改”

## 3. 仓库结构

```text
platform/
├─ frontend/                # React 前端
├─ backend/                 # FastAPI 后端
│  ├─ app/
│  │  ├─ api/               # 路由层
│  │  ├─ core/              # 配置、鉴权、依赖
│  │  ├─ db/                # 数据库连接与初始化
│  │  ├─ models/            # ORM 模型
│  │  ├─ schemas/           # Pydantic 模型
│  │  └─ services/          # 批改、提取、存储等服务
│  ├─ storage/              # 本地文件存储根目录
│  └─ tests/                # 基础测试
└─ README.md
```

## 4. 运行环境要求

### 基础软件
- Node.js 20+
- Python 3.11+
- PostgreSQL 17

### 当前开发环境约定
- PostgreSQL 安装目录：`E:\PostgreSQL\17`
- PostgreSQL 数据目录：`backend/storage/postgres-data`

正式部署到学院机房测试虚拟机时，可根据实际磁盘挂载路径调整。

## 5. 本地启动方式

### 5.1 启动后端

进入目录：

```powershell
cd "D:\Desktop\evolution\0 program\homework-checking\platform\backend"
```

安装依赖：

```powershell
pip install -r requirements.txt
```

复制环境变量模板：

```powershell
copy .env.example .env
```

初始化数据库：

```powershell
python -m app.db.init_db
```

启动服务：

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

接口文档：
- `http://127.0.0.1:8000/docs`

健康检查：
- `http://127.0.0.1:8000/health`

### 5.2 启动前端

进入目录：

```powershell
cd "D:\Desktop\evolution\0 program\homework-checking\platform\frontend"
```

安装依赖：

```powershell
npm install
```

启动开发环境：

```powershell
npm run dev
```

前端地址：
- `http://127.0.0.1:5173`

生产构建：

```powershell
npm run build
```

## 6. PostgreSQL 配置说明

建议创建：
- 数据库：`homework_platform`
- 用户：`homework_admin`

后端会通过 `.env` 中的 `DATABASE_URL` 连接数据库。

示例：

```env
DATABASE_URL=postgresql+psycopg://homework_admin:your_password@127.0.0.1:5432/homework_platform
```

## 7. 模型与在线批改配置

后端通过 `.env` 读取模型参数。

关键配置项：

```env
MODEL_PROVIDER=dashscope
MODEL_NAME=qwen3.5-plus
MODEL_API_KEY=your_api_key
MODEL_BASE_URL=https://dashscope.aliyuncs.com/apps/anthropic
```

说明：
- 学生提交作业后，后端立即触发在线批改
- 当前实现优先走真实模型调用
- 若模型调用失败，可回退到契约一致的兜底批改逻辑

## 8. 机房测试虚拟机部署建议

该项目后续若直接部署到学院机房测试环境虚拟机，建议按以下方式处理。

### 8.1 虚拟机内安装
- 安装 Node.js
- 安装 Python 3.11+
- 安装 PostgreSQL 17

### 8.2 部署目录建议

```text
/srv/homework-checking/
├─ frontend/
├─ backend/
└─ storage/
```

Windows 测试虚拟机也可用统一目录，例如：

```text
D:\services\homework-checking\
```

### 8.3 启动方式建议

前端：
- 构建后由静态 Web 服务承载，或直接 `vite preview` 用于测试

后端：
- 使用 `uvicorn` 启动测试环境
- 正式长期运行时建议使用：
  - Linux：`systemd`
  - Windows：任务计划或服务包装器

### 8.4 测试环境最小闭环
- 前端构建完成
- 后端成功连接 PostgreSQL
- `.env` 正确配置模型参数
- 可以完成：
  - 教师登录
  - 学生登录
  - 发布作业
  - 学生提交作业
  - 在线批改
  - 教师查看结果
  - 学生查询结果

## 9. 数据与文件说明

本仓库默认不提交：
- `.env`
- PostgreSQL 运行数据目录
- 安装包
- `node_modules`
- 构建产物

本仓库当前保留：
- 前后端源码
- 部分示例标准文件
- 部分示例提交文件
- 部分示例评语产物

如果后续要转为对外共享仓库，建议再进一步清理示例数据。

## 10. 常用命令

### 前端

```powershell
npm install
npm run dev
npm run build
```

### 后端

```powershell
pip install -r requirements.txt
python -m app.db.init_db
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 验证

```powershell
cd backend
python -m compileall app

cd ..\frontend
npm run build
```

## 11. 当前状态

当前版本已经完成：
- 前端主页面与交互
- 后端核心接口
- PostgreSQL 接入
- 学生上传后立即触发在线批改
- 教师端、学生端批改结果读取
- 成长路径数据展示

后续若部署到学院机房测试虚拟机，主要工作将集中在：
- 环境变量配置
- 服务常驻运行
- 域名与网络访问策略
- 文件目录与备份策略
