# Homework Checking Platform

本目录用于承接从静态原型向前后端分离系统的迁移。

## 当前结构

- `frontend/`
  - React + Vite + TypeScript 前端工程
  - 当前已接入教师端、学生端、认证页与本地模拟数据层
- `backend/`
  - 为 FastAPI + PostgreSQL 方案预留的后端骨架
  - 当前仅完成目录占位，下一步可按接口、模型、服务层继续推进
- `docs/`
  - 后续放置架构设计、接口清单、部署说明等文档

## 当前前端状态

- 已完成教师端首页、作业列表、发布/编辑作业、作业详情、学生成长路径
- 已完成学生端首页、作业批改查询、提交作业
- 已完成教师/学生登录、注册、改密
- 已通过本地 `npm run build`

## 下一步建议

1. 在 `backend/` 中落地 FastAPI 基础应用、数据库连接与认证接口。
2. 将 `frontend/src/lib/mock-db.ts` 逐步替换为真实 API 调用层。
3. 将 `homework-checking` skill 作为后端在线批改服务的任务执行层接入。
