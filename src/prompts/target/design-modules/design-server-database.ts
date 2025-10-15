// Design module prompt for database design
// This prompt generates detailed database schema and data model specifications

export const frontmatter = {
  "id": "design-module-server-database",
  "name": "Database Design Module",
  "version": "1.0.0",
  "description": "Generate detailed database design specifications including entity models, relationships, indexes, and migration strategies",
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

export const content = `# 数据库设计模块生成任务

你是一位资深的数据库架构师。请根据需求文档生成详细的数据库设计规范。

## 需求文档内容

\`\`\`
{{requirements}}
\`\`\`

{{#if relatedModules.server-api}}
## 相关模块参考

### 服务端 API 设计

\`\`\`
{{relatedModules.server-api}}
\`\`\`
{{/if}}

{{#if relatedModules.server-logic}}
### 服务端逻辑设计

\`\`\`
{{relatedModules.server-logic}}
\`\`\`
{{/if}}

## 设计要求

请创建一个详细的数据库设计文档，包含以下部分：

### 1. 概述
- 数据库类型选择（关系型 vs 非关系型）
- 数据库系统选择（PostgreSQL, MySQL, MongoDB, Redis 等）
- 选择理由和权衡分析
- 数据建模方法（关系模型、文档模型、键值模型等）
- 数据一致性要求

### 2. 数据库架构
- 数据库实例架构
- 主从复制方案
- 读写分离策略
- 分片策略（Sharding，如适用）
- 数据备份和恢复方案
- 架构图（使用 Mermaid）

### 3. 实体模型定义

为每个核心实体提供详细定义：

#### 实体模板格式

\`\`\`
### 实体名称：[EntityName]

**描述：** [实体的业务含义和用途]

**表名：** \\\`entity_name\\\`

**字段定义：**

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PRIMARY KEY | uuid_generate_v4() | 主键 |
| name | VARCHAR(255) | NOT NULL | - | 名称 |
| email | VARCHAR(255) | UNIQUE, NOT NULL | - | 邮箱地址 |
| status | ENUM | NOT NULL | 'active' | 状态（active, inactive, deleted） |
| created_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- PRIMARY KEY: \\\`id\\\`
- UNIQUE INDEX: \\\`idx_email\\\` ON (\\\`email\\\`)
- INDEX: \\\`idx_status\\\` ON (\\\`status\\\`)
- INDEX: \\\`idx_created_at\\\` ON (\\\`created_at\\\`)

**外键关系：**
- \\\`organization_id\\\` REFERENCES \\\`organizations(id)\\\` ON DELETE CASCADE

**业务规则：**
- email 必须符合邮箱格式
- status 只能是预定义的枚举值
- 软删除：设置 deleted_at 而不是物理删除

**查询模式：**
- 按邮箱查询用户（高频）
- 按状态过滤用户列表
- 按创建时间范围查询
\`\`\`

请定义所有核心实体，包括：
- 用户相关实体
- 业务核心实体
- 关联关系表
- 审计日志表
- 配置表

### 4. 实体关系图（ERD）

使用 Mermaid 创建实体关系图：

\`\`\`mermaid
erDiagram
    USERS ||--o{ POSTS : creates
    USERS ||--o{ COMMENTS : writes
    POSTS ||--o{ COMMENTS : has
    USERS {
        uuid id PK
        string email UK
        string name
        enum status
        timestamp created_at
    }
    POSTS {
        uuid id PK
        uuid user_id FK
        string title
        text content
        timestamp created_at
    }
    COMMENTS {
        uuid id PK
        uuid user_id FK
        uuid post_id FK
        text content
        timestamp created_at
    }
\`\`\`

### 5. 数据类型和约束

#### 通用数据类型规范

- **主键：** UUID（使用 uuid_generate_v4()）或 BIGSERIAL
- **时间戳：** TIMESTAMP WITH TIME ZONE（使用 UTC）
- **字符串：**
  - 短文本：VARCHAR(255)
  - 中等文本：VARCHAR(1000)
  - 长文本：TEXT
- **枚举：** ENUM 类型或 VARCHAR 配合 CHECK 约束
- **布尔：** BOOLEAN
- **数值：** INTEGER, BIGINT, DECIMAL, NUMERIC
- **JSON：** JSONB（PostgreSQL）或 JSON

#### 约束规范

- 所有表必须有主键
- 所有外键必须定义 ON DELETE 和 ON UPDATE 行为
- 必填字段使用 NOT NULL 约束
- 唯一性使用 UNIQUE 约束
- 枚举值使用 CHECK 约束或 ENUM 类型
- 默认值尽可能在数据库层面定义

### 6. 索引策略

#### 索引设计原则

- 为外键创建索引
- 为频繁查询的字段创建索引
- 为排序和分组字段创建索引
- 考虑组合索引（Composite Index）
- 避免过度索引

#### 索引类型

- **B-Tree 索引：** 默认索引类型，适用于等值和范围查询
- **Hash 索引：** 仅适用于等值查询
- **GIN 索引：** 适用于全文搜索和 JSONB
- **GiST 索引：** 适用于地理空间数据
- **部分索引：** 仅索引满足条件的行

示例：

\`\`\`sql
-- 单列索引
CREATE INDEX idx_users_email ON users(email);

-- 组合索引
CREATE INDEX idx_posts_user_status ON posts(user_id, status);

-- 部分索引
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- 唯一索引
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);

-- 全文搜索索引
CREATE INDEX idx_posts_content_fts ON posts USING GIN(to_tsvector('english', content));
\`\`\`

### 7. 数据完整性

#### 引用完整性

- 外键约束定义
- 级联操作策略（CASCADE, SET NULL, RESTRICT）
- 循环引用处理

#### 域完整性

- 数据类型约束
- CHECK 约束
- NOT NULL 约束
- DEFAULT 值

#### 实体完整性

- 主键约束
- 唯一性约束
- 业务唯一键

### 8. 数据迁移策略

#### 迁移工具选择

- Flyway
- Liquibase
- Knex.js migrations
- TypeORM migrations
- Prisma migrations

#### 迁移规范

\`\`\`
**迁移文件命名：** V[version]__[description].sql
示例：V001__create_users_table.sql

**迁移内容：**
- 向上迁移（UP）：应用变更
- 向下迁移（DOWN）：回滚变更（可选）

**版本控制：**
- 迁移文件必须纳入版本控制
- 已应用的迁移不可修改
- 新变更使用新迁移文件
\`\`\`

示例迁移：

\`\`\`sql
-- V001__create_users_table.sql
-- UP Migration
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_status CHECK (status IN ('active', 'inactive', 'deleted'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- V002__add_users_profile.sql
-- UP Migration
ALTER TABLE users ADD COLUMN profile JSONB;
CREATE INDEX idx_users_profile ON users USING GIN(profile);
\`\`\`

### 9. 查询优化

#### 常见查询模式

为每个主要业务场景提供优化的查询：

\`\`\`sql
-- 查询模式 1：获取用户及其最近的帖子
SELECT u.id, u.name, u.email,
       json_agg(
         json_build_object(
           'id', p.id,
           'title', p.title,
           'created_at', p.created_at
         ) ORDER BY p.created_at DESC
       ) FILTER (WHERE p.id IS NOT NULL) as recent_posts
FROM users u
LEFT JOIN LATERAL (
  SELECT id, title, created_at
  FROM posts
  WHERE user_id = u.id
  ORDER BY created_at DESC
  LIMIT 5
) p ON true
WHERE u.status = 'active'
GROUP BY u.id, u.name, u.email;

-- 查询模式 2：分页查询
SELECT *
FROM posts
WHERE status = 'published'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
\`\`\`

#### 查询性能考虑

- 避免 SELECT *
- 使用合适的 JOIN 类型
- 利用索引覆盖查询
- 避免子查询中的相关子查询
- 使用 EXPLAIN ANALYZE 分析查询计划

### 10. 分区策略（如适用）

对于大表，考虑分区：

- **范围分区（Range）：** 按日期、数值范围
- **列表分区（List）：** 按离散值
- **哈希分区（Hash）：** 按哈希值均匀分布

示例：

\`\`\`sql
-- 按月分区的日志表
CREATE TABLE audit_logs (
    id BIGSERIAL,
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 创建分区
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
\`\`\`

### 11. 数据归档和清理

- 历史数据归档策略
- 数据保留期限
- 定期清理任务
- 归档数据访问方式

### 12. 并发控制

- 事务隔离级别选择
- 乐观锁实现（版本号、时间戳）
- 悲观锁使用场景
- 死锁预防和处理

示例：乐观锁

\`\`\`sql
-- 使用版本号实现乐观锁
ALTER TABLE products ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- 更新时检查版本
UPDATE products
SET quantity = quantity - 1,
    version = version + 1
WHERE id = ? AND version = ?;

-- 如果影响行数为 0，说明数据已被其他事务修改
\`\`\`

### 13. 安全性设计

- 敏感数据加密（at rest, in transit）
- 密码存储策略（哈希、盐值）
- 数据访问权限控制
- SQL 注入防护
- 审计日志

### 14. 数据一致性

- ACID 属性保证
- 最终一致性场景
- 分布式事务处理（如适用）
- 数据完整性检查

### 15. 数据备份和恢复

- 备份频率和策略
- 全量备份 vs 增量备份
- 备份存储位置
- 恢复时间目标（RTO）
- 恢复点目标（RPO）
- 备份测试计划

### 16. 监控和维护

- 数据库性能指标
- 慢查询日志
- 连接池监控
- 表膨胀检查
- 定期 VACUUM（PostgreSQL）
- 统计信息更新

### 17. 扩展性设计

- 垂直扩展策略
- 水平扩展策略
- 读写分离
- 数据库分片
- 缓存层集成

### 18. 测试数据

- 测试数据生成策略
- Seed 数据定义
- 数据工厂（Factories）
- 测试环境数据管理

## 输出格式要求

请使用 Markdown 格式，包含必要的图表和代码示例。确保：

1. 使用清晰的标题层级（##, ###）
2. 使用表格展示字段定义
3. 使用 Mermaid ERD 图展示实体关系
4. 提供 SQL DDL 语句
5. 包含查询示例
6. 交叉引用相关模块（如果有）
7. 为每个设计决策提供理由

## 实体总览表格

在文档开头提供所有实体的总览：

| 实体名 | 表名 | 描述 | 主要关系 |
|--------|------|------|----------|
| User | users | 用户信息 | 1:N Posts, 1:N Comments |
| Post | posts | 文章 | N:1 User, 1:N Comments |
| Comment | comments | 评论 | N:1 User, N:1 Post |

## 输出位置

请将生成的设计文档保存到：
\`.claude/specs/{{specName}}/design-server-database.md\`
`;

export default {
  frontmatter,
  content
};
