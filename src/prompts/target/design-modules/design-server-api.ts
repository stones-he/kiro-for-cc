// Design module prompt for server API design
// This prompt generates detailed server API design specifications

export const frontmatter = {
  "id": "design-module-server-api",
  "name": "Server API Design Module",
  "version": "1.0.0",
  "description": "Generate detailed server API design specifications including REST/GraphQL endpoints, request/response schemas, and authentication",
  "variables": {
    "specName": {
      "type": "string",
      "required": true,
      "description": "Name of the spec"
    },
    "requirements": {
      "type": "string",
      "required": true,
      "description": "Requirements document content"
    },
    "relatedModules": {
      "type": "object",
      "required": false,
      "description": "Content from related modules for cross-referencing"
    }
  }
};

export const content = `# 服务端 API 设计模块生成任务

你是一位资深的后端架构师。请根据需求文档生成详细的服务端 API 设计规范。

## 需求文档内容

\`\`\`
{{requirements}}
\`\`\`

{{#if relatedModules.frontend}}
## 相关模块参考

### 前端设计

\`\`\`
{{relatedModules.frontend}}
\`\`\`
{{/if}}

{{#if relatedModules.server-database}}
### 数据库设计

\`\`\`
{{relatedModules.server-database}}
\`\`\`
{{/if}}

## 设计要求

请创建一个详细的服务端 API 设计文档，包含以下部分：

### 1. API 概述
- API 架构风格选择（REST, GraphQL, gRPC, 混合等）
- 选择理由和权衡分析
- API 版本策略（URL 版本、Header 版本等）
- 基础 URL 结构
- API 文档工具选择（Swagger/OpenAPI, GraphQL Playground 等）

### 2. 认证和授权
- 认证方案（JWT, OAuth2, API Key, Session 等）
- Token 管理（生成、刷新、撤销）
- 授权策略（RBAC, ABAC, ACL 等）
- 权限级别定义
- 安全令牌存储和传输
- 认证流程图（使用 Mermaid）

### 3. API 端点定义

为每个 API 端点提供详细定义，包括：

#### 端点模板格式

\`\`\`
#### [HTTP 方法] /api/v1/[资源路径]

**描述：** 端点的功能说明

**路径参数：**
- \\\`param1\\\` (类型, 是否必需) - 参数说明

**查询参数：**
- \\\`query1\\\` (类型, 是否必需) - 参数说明

**请求头：**
- \\\`Authorization\\\` (string, 必需) - Bearer token
- \\\`Content-Type\\\` (string, 必需) - application/json

**请求体：**
\\\`\\\`\\\`json
{
  "field1": "value1",
  "field2": 123
}
\\\`\\\`\\\`

**响应示例（200 OK）：**
\\\`\\\`\\\`json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "example"
  },
  "meta": {
    "timestamp": "2025-10-14T10:00:00Z"
  }
}
\\\`\\\`\\\`

**响应示例（错误）：**
\\\`\\\`\\\`json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
\\\`\\\`\\\`

**状态码：**
- 200: 成功
- 400: 请求参数错误
- 401: 未认证
- 403: 无权限
- 404: 资源不存在
- 500: 服务器内部错误

**权限要求：**
- 需要认证：是
- 需要角色：[admin, user]

**速率限制：**
- 每分钟 100 次请求
\`\`\`

请为以下类型的端点提供完整定义：
- 用户管理相关端点
- 资源 CRUD 操作端点
- 搜索和过滤端点
- 批量操作端点
- 文件上传/下载端点（如适用）

### 4. 数据模型和 DTO

定义 API 使用的数据传输对象（DTO）：

{{#if relatedModules.server-database}}
- 引用数据库设计模块中定义的实体模型
- 定义实体到 DTO 的转换规则
- 定义请求 DTO 和响应 DTO
{{else}}
- 定义请求和响应的数据结构
- 数据验证规则
- 字段类型和约束
{{/if}}

使用 TypeScript 定义接口：

\`\`\`typescript
// 请求 DTO
interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  profile?: {
    firstName: string;
    lastName: string;
  };
}

// 响应 DTO
interface UserResponse {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  profile?: UserProfile;
}

// 通用响应包装器
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}
\`\`\`

### 5. 错误处理
- 统一错误响应格式
- 错误码定义和分类
- 错误消息国际化策略
- 错误日志记录
- 错误监控和告警

示例错误码：

| 错误码 | HTTP 状态 | 说明 | 解决方案 |
|-------|----------|------|---------|
| AUTH_001 | 401 | Token 已过期 | 刷新 token |
| AUTH_002 | 403 | 权限不足 | 联系管理员 |
| VAL_001 | 400 | 参数验证失败 | 检查请求参数 |

### 6. 数据验证
- 请求数据验证规则
- 验证库选择（Joi, class-validator, Zod 等）
- 验证失败响应格式
- 自定义验证器

### 7. 分页和过滤
- 分页策略（Offset-based, Cursor-based）
- 分页参数规范
- 排序参数规范
- 过滤参数规范
- 响应元数据格式

示例：

\`\`\`
GET /api/v1/users?page=1&limit=20&sort=-createdAt&filter[status]=active
\`\`\`

响应：
\`\`\`json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
\`\`\`

### 8. 速率限制和节流
- 速率限制策略
- 限制级别（全局、用户、IP、端点）
- 限制响应头
- 超限响应格式
- 配额管理

### 9. 缓存策略
- 缓存层设计
- HTTP 缓存头（ETag, Cache-Control）
- 服务器端缓存（Redis, Memcached）
- 缓存失效策略
- 缓存键设计

### 10. WebSocket/实时通信（如适用）
- WebSocket 端点定义
- 消息格式
- 连接认证
- 心跳机制
- 断线重连策略

### 11. 文件处理（如适用）
- 文件上传 API
- 文件下载 API
- 文件大小限制
- 支持的文件类型
- 文件存储策略
- 多部分上传（Multipart Upload）

### 12. API 安全
- HTTPS 强制
- CORS 配置
- CSRF 保护
- SQL 注入防护
- XSS 防护
- 敏感数据处理
- 安全头配置

### 13. API 版本管理
- 版本控制策略
- 版本废弃流程
- 向后兼容性保证
- 版本迁移指南

### 14. API 文档
- 文档生成方式（自动生成 vs 手动维护）
- 文档访问方式
- 示例代码提供
- Postman/Insomnia 集合

### 15. 监控和日志
- API 调用日志格式
- 性能指标收集
- 错误跟踪
- 审计日志

### 16. 测试策略
- API 测试方法
- 集成测试覆盖范围
- 测试数据管理
- Mock API 支持

## 输出格式要求

请使用 Markdown 格式，包含必要的图表和代码示例。确保：

1. 使用清晰的标题层级（##, ###）
2. 包含完整的端点定义（使用模板格式）
3. 提供请求/响应示例（JSON 格式）
4. 使用 TypeScript 定义数据接口
5. 包含表格总结端点列表
6. 交叉引用相关模块（如果有）
7. 使用 Mermaid 图表展示认证流程、API 架构等

## API 端点总览表格

在文档开头提供所有端点的总览表格：

| 端点 | 方法 | 描述 | 认证 | 权限 |
|------|------|------|------|------|
| /api/v1/users | GET | 获取用户列表 | 是 | admin |
| /api/v1/users/:id | GET | 获取用户详情 | 是 | user |
| /api/v1/users | POST | 创建用户 | 是 | admin |

## 输出位置

请将生成的设计文档保存到：
\`.claude/specs/{{specName}}/design-server-api.md\`
`;

export default {
  frontmatter,
  content
};
