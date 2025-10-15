# 模块化设计配置指南

本指南详细说明 Kiro for Claude Code 模块化设计功能的所有配置选项。

## 目录

- [配置文件位置](#配置文件位置)
- [基础配置](#基础配置)
- [配置选项详解](#配置选项详解)
- [VSCode 设置界面](#vscode-设置界面)
- [配置示例](#配置示例)
- [配置验证](#配置验证)

## 配置文件位置

模块化设计配置存储在工作区的设置文件中:

```
.claude/settings/kfc-settings.json
```

如果文件不存在,扩展会自动创建默认配置。

## 基础配置

### 最小配置

启用模块化设计功能的最小配置:

```json
{
  "features": {
    "modularDesign": {
      "enabled": true
    }
  }
}
```

### 完整默认配置

系统使用的完整默认配置:

```json
{
  "paths": {
    "specs": ".claude/specs",
    "steering": ".claude/steering",
    "settings": ".claude/settings"
  },
  "views": {
    "specs": { "visible": true },
    "steering": { "visible": true },
    "mcp": { "visible": true },
    "hooks": { "visible": true },
    "settings": { "visible": false }
  },
  "features": {
    "modularDesign": {
      "enabled": false,
      "defaultModules": [
        "frontend",
        "server-api",
        "server-logic",
        "server-database",
        "testing"
      ],
      "fileNamingPattern": "design-{moduleType}.md",
      "autoDetectModules": true,
      "parallelGeneration": true,
      "cacheEnabled": true,
      "cacheTTL": 300000,
      "customModules": [],
      "autoMigrateLegacy": false,
      "showMigrationPrompt": true,
      "validateCrossReferences": true,
      "warnOnInconsistencies": true
    }
  }
}
```

## 配置选项详解

### enabled

**类型**: `boolean`
**默认值**: `false`
**必填**: 否

是否启用模块化设计功能。

```json
{
  "features": {
    "modularDesign": {
      "enabled": true
    }
  }
}
```

**效果**:
- `true`: 新创建的 spec 使用模块化设计结构
- `false`: 使用传统的单一 `design.md` 文件

**注意**:
- 更改此设置不影响现有 spec
- 现有 spec 的结构由创建时的设置决定

---

### defaultModules

**类型**: `string[]`
**默认值**: `["frontend", "server-api", "server-logic", "server-database", "testing"]`
**必填**: 否

默认启用的模块类型列表。

```json
{
  "features": {
    "modularDesign": {
      "defaultModules": ["frontend", "server-api", "testing"]
    }
  }
}
```

**可用值**:
- `"frontend"` - 前端设计
- `"mobile"` - 移动端设计
- `"server-api"` - 服务端 API
- `"server-logic"` - 服务端逻辑
- `"server-database"` - 数据库设计
- `"testing"` - 测试设计
- 自定义模块类型(如果已配置)

**使用场景**:
- **纯前端项目**: `["frontend", "testing"]`
- **纯后端项目**: `["server-api", "server-logic", "server-database", "testing"]`
- **全栈项目**: 使用默认值
- **移动应用**: `["mobile", "server-api", "server-logic", "server-database", "testing"]`

**行为**:
- 如果 `autoDetectModules` 为 `true`,此列表作为后备选项
- 如果 `autoDetectModules` 为 `false`,严格使用此列表

---

### fileNamingPattern

**类型**: `string`
**默认值**: `"design-{moduleType}.md"`
**必填**: 否

模块文件的命名模式。

```json
{
  "features": {
    "modularDesign": {
      "fileNamingPattern": "design-{moduleType}.md"
    }
  }
}
```

**变量**:
- `{moduleType}`: 模块类型标识符(如 `frontend`, `server-api`)

**示例**:
- `"design-{moduleType}.md"` → `design-frontend.md`
- `"{moduleType}-design.md"` → `frontend-design.md`
- `"{moduleType}.design.md"` → `frontend.design.md`

**限制**:
- 必须包含 `{moduleType}` 变量
- 必须以 `.md` 结尾
- 不能包含路径分隔符(`/` 或 `\`)

---

### autoDetectModules

**类型**: `boolean`
**默认值**: `true`
**必填**: 否

是否根据需求文档自动检测适用的模块。

```json
{
  "features": {
    "modularDesign": {
      "autoDetectModules": true
    }
  }
}
```

**行为**:

**`true` (推荐)**:
- 系统分析 `requirements.md` 内容
- 检测关键词和模式
- 自动选择适用的模块
- 用户可以手动添加或删除

**`false`**:
- 严格使用 `defaultModules` 列表
- 不进行智能检测
- 适合有固定模块需求的团队

**检测规则**:

系统使用以下规则检测模块适用性:

| 模块 | 关键词示例 | 默认适用 |
|-----|-----------|---------|
| Frontend | react, vue, angular, ui, 前端 | 是 |
| Mobile | ios, android, mobile app, 移动端 | 否 |
| Server API | api, endpoint, rest, graphql | 是 |
| Server Logic | business logic, service, 业务逻辑 | 是 |
| Server Database | database, sql, mongodb, 数据库 | 是 |
| Testing | 任何项目 | 是 |

**示例**:

需求中包含 "Build a React web app with REST API":
- 检测到: Frontend, Server API, Server Logic, Server Database, Testing
- 未检测到: Mobile

---

### parallelGeneration

**类型**: `boolean`
**默认值**: `true`
**必填**: 否

是否并行生成多个设计模块。

```json
{
  "features": {
    "modularDesign": {
      "parallelGeneration": true
    }
  }
}
```

**效果**:

**`true` (推荐)**:
- 同时生成最多 4 个模块
- 总体生成时间更短
- 如果某个模块失败,其他继续

**`false`**:
- 按顺序逐个生成模块
- 总体生成时间更长
- 更容易调试问题
- 适合网络不稳定的环境

**性能对比**:

| 模块数量 | 并行模式 | 串行模式 |
|---------|---------|---------|
| 1 个 | 30秒 | 30秒 |
| 3 个 | 45秒 | 90秒 |
| 5 个 | 60秒 | 150秒 |

*实际时间取决于网络速度和 Claude Code 响应时间*

---

### cacheEnabled

**类型**: `boolean`
**默认值**: `true`
**必填**: 否

是否启用模块信息缓存。

```json
{
  "features": {
    "modularDesign": {
      "cacheEnabled": true
    }
  }
}
```

**效果**:

**`true` (推荐)**:
- 缓存模块列表和状态
- 减少文件系统操作
- 提高 TreeView 刷新速度

**`false`**:
- 每次都从文件系统读取
- 适合调试或多人同时编辑的场景

**缓存内容**:
- 模块文件是否存在
- 模块工作流状态
- 模块最后修改时间
- 是否存在旧版 `design.md`

---

### cacheTTL

**类型**: `number`
**默认值**: `300000` (5分钟)
**必填**: 否

缓存过期时间,单位为毫秒。

```json
{
  "features": {
    "modularDesign": {
      "cacheTTL": 300000
    }
  }
}
```

**常用值**:
- `60000` - 1分钟 (频繁更新)
- `300000` - 5分钟 (默认,平衡)
- `600000` - 10分钟 (长时间缓存)
- `0` - 禁用缓存过期(不推荐)

**注意**:
- 仅在 `cacheEnabled` 为 `true` 时有效
- 文件系统监听器会在文件变化时自动刷新缓存

---

### customModules

**类型**: `CustomModuleDefinition[]`
**默认值**: `[]`
**必填**: 否

自定义模块定义列表。

```json
{
  "features": {
    "modularDesign": {
      "customModules": [
        {
          "type": "devops",
          "name": "DevOps 设计",
          "fileName": "design-devops.md",
          "promptTemplate": "...",
          "detectionRules": {
            "keywords": ["docker", "kubernetes", "ci/cd"],
            "patterns": [],
            "defaultApplicable": false
          },
          "icon": "gear"
        }
      ]
    }
  }
}
```

**字段说明**:

#### type (必填)
- 模块类型唯一标识符
- 只能包含小写字母、数字和连字符
- 示例: `"devops"`, `"security"`, `"performance"`

#### name (必填)
- 模块显示名称
- 在 UI 中显示
- 示例: `"DevOps 设计"`, `"安全设计"`

#### fileName (必填)
- 模块文件名
- 建议格式: `"design-{type}.md"`
- 示例: `"design-devops.md"`

#### promptTemplate (可选)
- 自定义 AI 生成提示
- 支持变量: `{{specName}}`, `{{requirements}}`
- 如果不提供,使用默认模板

#### detectionRules (可选)
- 自动检测规则
- 包含 `keywords`, `patterns`, `defaultApplicable`
- 如果不提供,使用模块类型和名称作为关键词

#### icon (可选)
- VSCode ThemeIcon 名称
- 示例: `"gear"`, `"shield"`, `"zap"`
- 参考: [VSCode Icons](https://code.visualstudio.com/api/references/icons-in-labels)

**详细示例请参考**: [自定义模块示例](./custom-modules-example.md)

---

### autoMigrateLegacy

**类型**: `boolean`
**默认值**: `false`
**必填**: 否

是否自动迁移旧版 `design.md` 到模块化结构。

```json
{
  "features": {
    "modularDesign": {
      "autoMigrateLegacy": false
    }
  }
}
```

**行为**:

**`false` (推荐)**:
- 检测到旧版设计时显示提示
- 用户手动决定是否迁移
- 更安全,避免意外修改

**`true`**:
- 自动执行迁移
- 不显示确认对话框
- 适合批量处理多个 spec

**注意**:
- 无论此设置如何,原始文件会备份为 `.backup`
- 可以通过创建 `.no-migrate` 文件跳过特定 spec

---

### showMigrationPrompt

**类型**: `boolean`
**默认值**: `true`
**必填**: 否

是否显示旧版设计迁移提示。

```json
{
  "features": {
    "modularDesign": {
      "showMigrationPrompt": true
    }
  }
}
```

**效果**:

**`true`**:
- 打开包含旧版 `design.md` 的 spec 时显示提示
- 提供 "迁移"、"稍后"、"不再提示" 选项

**`false`**:
- 不显示提示
- 旧版设计继续使用
- 可手动触发迁移命令

---

### validateCrossReferences

**类型**: `boolean`
**默认值**: `true`
**必填**: 否

是否验证模块间的交叉引用。

```json
{
  "features": {
    "modularDesign": {
      "validateCrossReferences": true
    }
  }
}
```

**验证内容**:
- Frontend 中的 API 调用是否在 Server API 中定义
- Server API 中的数据模型是否在 Database 中定义
- Testing 是否覆盖其他模块的组件

**效果**:

**`true` (推荐)**:
- 自动检测不一致性
- 在问题面板显示警告
- 帮助保持设计一致性

**`false`**:
- 不进行验证
- 适合原型阶段或快速迭代

---

### warnOnInconsistencies

**类型**: `boolean`
**默认值**: `true`
**必填**: 否

是否显示模块间不一致性警告。

```json
{
  "features": {
    "modularDesign": {
      "warnOnInconsistencies": true
    }
  }
}
```

**效果**:

**`true`**:
- 在 VSCode 问题面板显示警告
- 显示通知提示用户
- 提供快速修复建议

**`false`**:
- 静默检测,不显示警告
- 仅在日志中记录

**注意**:
- 仅在 `validateCrossReferences` 为 `true` 时有效
- 不会阻止工作流继续

## VSCode 设置界面

除了编辑 JSON 文件,还可以通过 VSCode 设置界面配置:

### 访问设置

1. 打开设置: `Cmd+,` (Mac) 或 `Ctrl+,` (Windows/Linux)
2. 搜索: `kiro` 或 `kfc`
3. 展开 "Kiro for Claude Code" 部分

### 可用设置

**Extension > Features > Modular Design**

| 设置项 | 对应配置键 |
|-------|-----------|
| Enabled | `kfc.features.modularDesign.enabled` |
| Default Modules | `kfc.features.modularDesign.defaultModules` |
| Auto Detect Modules | `kfc.features.modularDesign.autoDetectModules` |
| Parallel Generation | `kfc.features.modularDesign.parallelGeneration` |
| Cache Enabled | `kfc.features.modularDesign.cacheEnabled` |
| Show Migration Prompt | `kfc.features.modularDesign.showMigrationPrompt` |

**注意**: 一些高级选项(如 `customModules`, `fileNamingPattern`)必须在 JSON 文件中配置。

## 配置示例

### 示例 1: 前端专用项目

```json
{
  "features": {
    "modularDesign": {
      "enabled": true,
      "defaultModules": ["frontend", "testing"],
      "autoDetectModules": false
    }
  }
}
```

**适用场景**:
- 纯前端项目
- 使用第三方 API
- 不需要后端设计

---

### 示例 2: 微服务后端项目

```json
{
  "features": {
    "modularDesign": {
      "enabled": true,
      "defaultModules": [
        "server-api",
        "server-logic",
        "server-database",
        "testing"
      ],
      "autoDetectModules": true,
      "parallelGeneration": true
    }
  }
}
```

**适用场景**:
- 后端微服务
- 独立的 API 服务
- 不包含前端

---

### 示例 3: 全栈应用 + DevOps

```json
{
  "features": {
    "modularDesign": {
      "enabled": true,
      "defaultModules": [
        "frontend",
        "server-api",
        "server-logic",
        "server-database",
        "testing"
      ],
      "autoDetectModules": true,
      "parallelGeneration": true,
      "customModules": [
        {
          "type": "devops",
          "name": "DevOps 设计",
          "fileName": "design-devops.md",
          "detectionRules": {
            "keywords": ["docker", "kubernetes", "deployment", "ci/cd"],
            "patterns": [],
            "defaultApplicable": false
          },
          "icon": "gear"
        }
      ]
    }
  }
}
```

**适用场景**:
- 全栈应用
- 需要 DevOps 设计
- 容器化部署

---

### 示例 4: 快速原型模式

```json
{
  "features": {
    "modularDesign": {
      "enabled": true,
      "autoDetectModules": true,
      "parallelGeneration": true,
      "validateCrossReferences": false,
      "warnOnInconsistencies": false
    }
  }
}
```

**适用场景**:
- 快速原型开发
- 频繁修改设计
- 暂时不关心一致性

---

### 示例 5: 团队协作模式

```json
{
  "features": {
    "modularDesign": {
      "enabled": true,
      "autoDetectModules": true,
      "parallelGeneration": false,
      "cacheEnabled": false,
      "validateCrossReferences": true,
      "warnOnInconsistencies": true
    }
  }
}
```

**适用场景**:
- 多人同时编辑
- 需要实时看到变化
- 严格的设计审查

## 配置验证

### 自动验证

扩展会在启动时和配置更改时自动验证配置:

**验证项**:
- 必填字段是否存在
- 值类型是否正确
- 值是否在允许范围内
- 自定义模块定义是否有效

**错误处理**:
- **严重错误**: 显示错误通知,使用默认配置
- **警告**: 显示警告通知,继续使用配置

### 手动验证

在 VSCode 输出面板中查看 "Kiro for Claude Code" 日志:

```
[ConfigManager] Loading settings from .claude/settings/kfc-settings.json
[ConfigManager] Validating modular design configuration
[ConfigManager] ✓ Configuration valid
[ConfigManager] Loaded 1 custom module: devops
```

### 常见配置错误

#### 错误 1: 无效的模块类型

```json
{
  "defaultModules": ["frontend", "invalid-module"]
}
```

**错误信息**: `Unknown module type: invalid-module`

**解决**: 使用有效的模块类型或先定义自定义模块

---

#### 错误 2: 文件命名模式缺少变量

```json
{
  "fileNamingPattern": "design.md"
}
```

**错误信息**: `File naming pattern must contain {moduleType}`

**解决**: 添加 `{moduleType}` 变量

---

#### 错误 3: 自定义模块缺少必填字段

```json
{
  "customModules": [
    {
      "name": "DevOps"
    }
  ]
}
```

**错误信息**: `Custom module missing required field: type`

**解决**: 添加所有必填字段(`type`, `name`, `fileName`)

---

#### 错误 4: 无效的 TTL 值

```json
{
  "cacheTTL": -1000
}
```

**错误信息**: `cacheTTL must be a positive number`

**解决**: 使用正数值

## 配置最佳实践

### 1. 版本控制配置文件

✅ **推荐**: 将 `kfc-settings.json` 提交到 Git

```bash
git add .claude/settings/kfc-settings.json
git commit -m "chore: add kiro modular design config"
```

**优势**:
- 团队成员使用统一配置
- 配置变更可追溯
- 新成员快速上手

❌ **不推荐**: 每个开发者使用不同配置

---

### 2. 环境特定配置

对于不同环境使用不同配置:

**开发环境**:
```json
{
  "features": {
    "modularDesign": {
      "parallelGeneration": true,
      "validateCrossReferences": true
    }
  }
}
```

**生产环境** (如 CI/CD):
```json
{
  "features": {
    "modularDesign": {
      "parallelGeneration": false,
      "validateCrossReferences": true,
      "warnOnInconsistencies": false
    }
  }
}
```

---

### 3. 渐进式启用

**第一阶段**: 默认禁用,选择性测试
```json
{ "enabled": false }
```

**第二阶段**: 启用但使用保守配置
```json
{
  "enabled": true,
  "parallelGeneration": false,
  "autoDetectModules": false
}
```

**第三阶段**: 启用所有优化
```json
{
  "enabled": true,
  "parallelGeneration": true,
  "autoDetectModules": true
}
```

---

### 4. 文档化自定义模块

如果定义自定义模块,创建团队文档:

```markdown
# 团队自定义模块

## DevOps 模块
- 用途: CI/CD 和部署设计
- 何时使用: 所有需要容器化部署的项目
- 负责人: DevOps Team

## Security 模块
- 用途: 安全架构设计
- 何时使用: 处理敏感数据的项目
- 负责人: Security Team
```

---

### 5. 定期审查配置

每个季度审查配置是否符合团队当前需求:

- [ ] 默认模块列表是否适合大部分项目?
- [ ] 自定义模块是否仍然需要?
- [ ] 性能设置是否需要调整?
- [ ] 团队成员是否理解所有配置选项?

## 相关文档

- [模块化设计概述](./modular-design.md)
- [使用指南](./usage-guide.md)
- [自定义模块示例](./custom-modules-example.md)
- [迁移指南](./migration-guide.md)
