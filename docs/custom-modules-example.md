# 自定义模块示例

本文档演示如何使用自定义模块功能扩展 Kiro for Claude Code 的模块化设计结构。

## 什么是自定义模块？

自定义模块允许您定义超越默认 6 种标准模块（前端、移动端、API、逻辑、数据库、测试）的设计模块类型。例如：

- **DevOps 模块**：用于 CI/CD、部署、监控等基础设施设计
- **安全模块**：用于安全架构、认证、授权、加密等设计
- **性能优化模块**：用于性能分析、优化策略、缓存设计等
- **文档模块**：用于技术文档、API 文档、用户手册等

## 配置示例

在 `.claude/settings/kfc-settings.json` 中添加自定义模块配置：

```json
{
  "paths": {
    "specs": ".claude/specs",
    "steering": ".claude/steering",
    "settings": ".claude/settings"
  },
  "features": {
    "modularDesign": {
      "enabled": true,
      "defaultModules": ["frontend", "server-api", "server-logic", "server-database", "testing"],
      "customModules": [
        {
          "type": "devops",
          "name": "DevOps 设计",
          "fileName": "design-devops.md",
          "promptTemplate": "你是一位资深的 DevOps 工程师。请根据需求文档生成详细的 DevOps 设计规范。\n\n## 需求文档\n\n{{requirements}}\n\n## 设计要求\n\n请创建一个详细的 DevOps 设计文档，包含以下部分：\n\n### 1. CI/CD 流程\n- 持续集成流程\n- 持续部署策略\n- 自动化测试集成\n\n### 2. 基础设施即代码\n- IaC 工具选择（Terraform, CloudFormation 等）\n- 环境配置管理\n- 资源编排\n\n### 3. 容器化策略\n- Docker 容器设计\n- Kubernetes 集群架构\n- 服务编排和调度\n\n### 4. 监控和日志\n- 监控指标设计\n- 日志收集和分析\n- 告警策略\n\n### 5. 部署策略\n- 蓝绿部署\n- 金丝雀发布\n- 回滚策略\n\n## 输出位置\n\n请将生成的设计文档保存到：\n`.claude/specs/{{specName}}/design-devops.md`",
          "detectionRules": {
            "keywords": [
              "devops", "ci/cd", "docker", "kubernetes", "k8s", "deployment",
              "pipeline", "jenkins", "github actions", "gitlab ci",
              "terraform", "ansible", "helm", "monitoring",
              "部署", "容器", "编排", "自动化", "持续集成", "持续部署"
            ],
            "patterns": [
              "/(ci|cd)\\s*\\/\\s*(cd|ci)/i",
              "/continuous\\s+(integration|deployment)/i",
              "/容器化/i",
              "/微服务部署/i"
            ],
            "defaultApplicable": false
          },
          "icon": "gear"
        },
        {
          "type": "security",
          "name": "安全设计",
          "fileName": "design-security.md",
          "promptTemplate": "你是一位资深的安全架构师。请根据需求文档生成详细的安全设计规范。\n\n## 需求文档\n\n{{requirements}}\n\n## 设计要求\n\n请创建一个详细的安全设计文档，包含以下部分：\n\n### 1. 认证和授权\n- 认证机制设计\n- 授权策略\n- 会话管理\n\n### 2. 数据安全\n- 数据加密策略\n- 敏感数据处理\n- 数据备份和恢复\n\n### 3. 网络安全\n- 网络架构\n- 防火墙规则\n- DDoS 防护\n\n### 4. 应用安全\n- 输入验证\n- SQL 注入防护\n- XSS 防护\n- CSRF 防护\n\n### 5. 安全审计\n- 日志记录\n- 审计追踪\n- 合规性检查\n\n## 输出位置\n\n请将生成的设计文档保存到：\n`.claude/specs/{{specName}}/design-security.md`",
          "detectionRules": {
            "keywords": [
              "security", "authentication", "authorization", "encryption",
              "oauth", "jwt", "ssl", "tls", "https", "firewall",
              "vulnerability", "penetration test", "security audit",
              "安全", "认证", "授权", "加密", "防火墙", "漏洞", "审计"
            ],
            "patterns": [
              "/security\\s+(audit|test|scan)/i",
              "/penetration\\s+test/i",
              "/安全(\s+)?设计/i",
              "/数据加密/i"
            ],
            "defaultApplicable": false
          },
          "icon": "shield"
        },
        {
          "type": "performance",
          "name": "性能优化设计",
          "fileName": "design-performance.md",
          "detectionRules": {
            "keywords": [
              "performance", "optimization", "caching", "load balancing",
              "cdn", "compression", "lazy loading", "code splitting",
              "性能", "优化", "缓存", "负载均衡", "压缩"
            ],
            "patterns": [
              "/performance\\s+optimization/i",
              "/性能(\s+)?优化/i"
            ],
            "defaultApplicable": false
          },
          "icon": "zap"
        }
      ],
      "autoDetectModules": true,
      "parallelGeneration": true,
      "cacheEnabled": true,
      "cacheTTL": 300000,
      "showMigrationPrompt": true,
      "validateCrossReferences": true,
      "warnOnInconsistencies": true
    }
  }
}
```

## 字段说明

### 必填字段

- **`type`**: 模块类型标识符（唯一），只能包含小写字母、数字和连字符
  - 示例：`"devops"`, `"security"`, `"performance"`

- **`name`**: 模块显示名称，在 UI 中显示
  - 示例：`"DevOps 设计"`, `"安全设计"`

- **`fileName`**: 模块文件名
  - 建议格式：`"design-{type}.md"`
  - 示例：`"design-devops.md"`, `"design-security.md"`

### 可选字段

- **`promptTemplate`**: 自定义提示模板，用于 AI 生成
  - 支持变量替换：`{{specName}}`, `{{requirements}}`
  - 支持条件语法：`{{#if condition}}...{{/if}}`
  - 如果不提供，将使用简单的默认模板

- **`detectionRules`**: 检测规则，用于自动检测该模块是否适用
  - **`keywords`**: 关键词列表（不区分大小写）
  - **`patterns`**: 正则表达式模式列表
  - **`defaultApplicable`**: 默认是否适用（如果没有匹配到关键词或模式时）
  - 如果不提供，将使用模块类型和名称作为默认关键词

- **`icon`**: VSCode ThemeIcon 名称，用于 TreeView 图标
  - 常用图标：`"gear"`, `"shield"`, `"zap"`, `"database"`, `"server"`, `"cloud"` 等
  - 如果不提供，将使用默认图标

## 使用流程

1. **配置自定义模块**
   - 编辑 `.claude/settings/kfc-settings.json`
   - 在 `features.modularDesign.customModules` 中添加自定义模块定义

2. **启用模块化设计功能**
   - 设置 `features.modularDesign.enabled: true`

3. **创建新 Spec**
   - 在 Spec Explorer 中创建新的 spec
   - 生成 requirements.md

4. **生成设计模块**
   - 右键点击 spec，选择"生成所有设计模块"
   - 系统将自动检测适用的模块（包括标准模块和自定义模块）
   - 或者右键选择"生成特定模块"来单独生成某个自定义模块

5. **查看和审核**
   - 在 Spec Explorer 的 "Design Modules" 节点下查看所有生成的模块
   - 自定义模块将显示为配置的名称和图标
   - 点击模块可以查看和编辑内容

## 高级用法

### 覆盖标准模块

如果您的自定义模块的 `type` 与标准模块类型相同（如 `"frontend"`），您的自定义配置将覆盖标准模块的行为：

```json
{
  "type": "frontend",
  "name": "自定义前端设计",
  "fileName": "design-frontend-custom.md",
  "promptTemplate": "自定义的前端设计提示...",
  "icon": "browser"
}
```

系统会显示警告，但仍允许此配置。

### 动态检测规则

检测规则支持灵活的关键词和正则模式匹配：

```json
{
  "detectionRules": {
    "keywords": [
      "docker", "k8s", "kubernetes", "helm", "deployment",
      "容器", "编排", "部署"
    ],
    "patterns": [
      "/(ci|cd)\\s*\\/\\s*(cd|ci)/i",
      "/kubernetes\\s+cluster/i",
      "/容器化部署/i"
    ],
    "defaultApplicable": false
  }
}
```

- **`keywords`**: 在需求文档中搜索这些关键词（不区分大小写）
- **`patterns`**: 使用正则表达式进行更精确的匹配
- **`defaultApplicable`**: 如果没有匹配到任何关键词或模式，是否默认适用该模块

### 提示模板变量

在 `promptTemplate` 中可以使用以下变量：

- **`{{specName}}`**: 当前 spec 的名称
- **`{{requirements}}`**: requirements.md 的内容
- **`{{relatedModules.{type}}}`**: 其他已生成模块的内容

条件语法示例：

```markdown
{{#if relatedModules.server-api}}
### API 集成

参考服务端 API 设计：
{{relatedModules.server-api}}
{{/if}}
```

## 验证和调试

### 配置验证

Kiro for Claude Code 会自动验证自定义模块配置。如果配置有问题，会显示详细的错误或警告信息：

- **错误**：必须修复才能使用（如缺少必填字段、无效字符等）
- **警告**：建议修改但不影响使用（如文件名不符合规范、缺少提示变量等）

### 查看日志

在 VSCode 输出面板中查看 "Kiro for Claude Code" 日志，可以看到：

- 自定义模块加载情况
- 检测规则匹配结果
- 模块生成过程

## 最佳实践

1. **使用描述性的模块类型名称**
   - 好：`"devops"`, `"security"`, `"performance"`
   - 差：`"m1"`, `"custom"`, `"other"`

2. **提供详细的提示模板**
   - 包含具体的章节结构
   - 说明每个部分应该包含的内容
   - 使用变量占位符

3. **合理设置检测规则**
   - 包含中英文关键词
   - 使用正则表达式匹配特定模式
   - 将 `defaultApplicable` 设置为 `false`（仅在明确需要时生成）

4. **选择合适的图标**
   - 使用语义化的图标名称
   - 参考 [VSCode Icon Reference](https://code.visualstudio.com/api/references/icons-in-labels)

5. **测试自定义模块**
   - 创建测试 spec
   - 验证模块是否正确检测和生成
   - 检查生成的内容质量

## 示例项目

假设您正在开发一个需要 DevOps 和安全设计的微服务项目：

1. 创建 spec：`microservice-platform`

2. 编写 requirements.md：
   ```markdown
   # Requirements: Microservice Platform

   ## 概述
   构建一个基于 Kubernetes 的微服务平台，包含 CI/CD 流程和安全审计功能。

   ## 功能需求
   - 自动化部署流程
   - 容器编排管理
   - 安全认证和授权
   - 审计日志记录
   - 性能监控
   ```

3. 生成设计模块：
   - 系统会自动检测到需要：
     - `design-frontend.md`（标准模块）
     - `design-server-api.md`（标准模块）
     - `design-server-logic.md`（标准模块）
     - `design-server-database.md`（标准模块）
     - `design-devops.md`（自定义模块）
     - `design-security.md`（自定义模块）
     - `design-testing.md`（标准模块）

4. 审核和批准各个模块

5. 生成任务列表

## 常见问题

### Q: 自定义模块会影响现有 spec 吗？

A: 不会。现有 spec 会继续使用它们原有的设计结构。自定义模块只对新创建的 spec 或重新生成的模块生效。

### Q: 可以定义多少个自定义模块？

A: 理论上没有限制，但建议不超过 10 个，以保持配置的可管理性。

### Q: 自定义模块可以引用其他模块吗？

A: 可以。在提示模板中使用 `{{relatedModules.{type}}}` 变量引用其他已生成模块的内容。

### Q: 如何调试自定义模块？

A: 查看 VSCode 输出面板中的 "Kiro for Claude Code" 日志，可以看到详细的加载、检测和生成过程。

### Q: 自定义模块支持哪些文件格式？

A: 目前只支持 Markdown (`.md`) 格式。

## 相关文档

- [模块化设计结构 - 需求文档](../.claude/specs/modular-design-structure/requirements.md)
- [模块化设计结构 - 设计文档](../.claude/specs/modular-design-structure/design.md)
- [配置管理文档](./configuration.md)
