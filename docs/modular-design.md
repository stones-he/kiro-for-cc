# 模块化设计结构

> Kiro for Claude Code v0.3.0+ 引入的新功能

## 概述

模块化设计结构是 Kiro for Claude Code 扩展的一项强大功能,将传统的单一 `design.md` 文件拆分为多个专门的设计模块。这种方法提高了设计文档的可维护性、清晰度,并支持不同技术领域的并行开发。

### 核心理念

在传统的 spec 工作流中,所有的设计内容都写在一个 `design.md` 文件中。随着项目复杂度增加,这个文件会变得冗长且难以维护。模块化设计结构通过以下方式解决这个问题:

- **分离关注点**: 将前端、后端、数据库等不同技术领域的设计分离到独立文件
- **并行审核**: 不同团队成员可以同时审核各自领域的设计模块
- **精准生成**: Claude 可以为每个模块生成更专注、更详细的设计内容
- **灵活扩展**: 支持自定义模块类型以适应特定需求

### 默认模块类型

Kiro for Claude Code 提供以下 6 种标准设计模块:

| 模块类型 | 文件名 | 用途 |
|---------|--------|------|
| Frontend | `design-frontend.md` | 前端/Web 设计规范 |
| Mobile | `design-mobile.md` | 移动应用设计规范 |
| Server API | `design-server-api.md` | 服务端 API 设计规范 |
| Server Logic | `design-server-logic.md` | 服务端业务逻辑设计 |
| Server Database | `design-server-database.md` | 数据库模型和架构设计 |
| Testing | `design-testing.md` | 测试策略和用例设计 |

## 功能特性

### 智能模块检测

系统会自动分析 `requirements.md` 的内容,智能检测哪些设计模块适用于当前项目:

- **前端项目**: 只生成 Frontend 和 Testing 模块
- **后端项目**: 生成 Server API、Server Logic、Server Database 和 Testing 模块
- **全栈项目**: 生成所有适用的模块
- **移动应用**: 包含 Mobile 模块

### 并行生成

为了提高效率,系统支持并行生成多个设计模块:

- 默认最大并发数为 4 个模块
- 可通过配置调整并发数
- 即使某个模块生成失败,其他模块仍会继续生成

### 独立工作流

每个设计模块都有独立的工作流状态:

1. **未生成** (Not Generated): 模块尚未创建
2. **待审核** (Pending Review): 模块已生成,等待审核
3. **已批准** (Approved): 模块审核通过
4. **已拒绝** (Rejected): 模块需要修改

只有当所有必需的模块都被批准后,才能进入任务生成阶段。

### 跨模块引用

设计模块之间可以相互引用:

- 前端模块可以引用 API 模块中定义的端点
- API 模块可以引用数据库模块中定义的数据模型
- 测试模块覆盖所有其他模块定义的组件

系统提供交叉引用分析功能,自动检测模块之间的不一致性。

### 向后兼容

模块化设计功能完全向后兼容:

- 现有的 `design.md` 文件继续正常工作
- 可选择性地将旧设计迁移到模块化结构
- 新 spec 可以选择使用传统方式或模块化方式

## 使用指南

### 启用模块化设计

1. 打开 `.claude/settings/kfc-settings.json`
2. 添加或修改以下配置:

```json
{
  "features": {
    "modularDesign": {
      "enabled": true
    }
  }
}
```

或者在 VSCode 设置中:
- 打开设置 (Cmd+,)
- 搜索 "Kiro: Features Modular Design Enabled"
- 勾选复选框

### 创建新 Spec

1. 在 Spec Explorer 中点击 "+" 按钮
2. 输入 spec 名称和功能描述
3. Claude 会生成 `requirements.md`

### 生成设计模块

#### 方法 1: 生成所有模块

1. 在 Spec Explorer 中右键点击 spec
2. 选择 "生成所有设计模块"
3. 系统会自动检测适用的模块并并行生成

#### 方法 2: 生成特定模块

1. 展开 spec,找到 "Design Modules" 节点
2. 右键点击想要生成的模块
3. 选择 "生成模块"

### 审核工作流

1. **查看模块内容**
   - 点击模块名称打开文件
   - 审查设计内容的完整性和准确性

2. **批准模块**
   - 右键点击模块
   - 选择 "批准模块"
   - 模块图标会变为绿色对勾

3. **拒绝并重新生成**
   - 右键点击模块
   - 选择 "拒绝模块"
   - 提供修改建议
   - 选择 "重新生成模块"

4. **进入任务阶段**
   - 当所有必需模块都被批准后
   - 系统会显示"可以生成任务"提示
   - 点击生成 `tasks.md`

### 迁移现有设计

如果您有使用传统 `design.md` 的现有 spec:

1. 在 Spec Explorer 中右键点击 spec
2. 选择 "迁移到模块化设计"
3. 系统会分析 `design.md` 内容
4. 显示章节到模块的映射预览
5. 确认后自动创建模块文件
6. 原始 `design.md` 会重命名为 `design.md.backup`

## 配置选项

### 基础配置

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
      "parallelGeneration": true
    }
  }
}
```

### 高级配置

```json
{
  "features": {
    "modularDesign": {
      "enabled": true,
      "defaultModules": ["frontend", "server-api", "server-logic", "server-database", "testing"],
      "fileNamingPattern": "design-{moduleType}.md",
      "autoDetectModules": true,
      "parallelGeneration": true,
      "cacheEnabled": true,
      "cacheTTL": 300000,
      "showMigrationPrompt": true,
      "validateCrossReferences": true,
      "warnOnInconsistencies": true,
      "customModules": []
    }
  }
}
```

### 配置项说明

| 配置项 | 类型 | 默认值 | 说明 |
|-------|------|--------|------|
| `enabled` | boolean | `false` | 是否启用模块化设计功能 |
| `defaultModules` | string[] | 见上 | 默认生成的模块类型列表 |
| `fileNamingPattern` | string | `"design-{moduleType}.md"` | 模块文件命名模式 |
| `autoDetectModules` | boolean | `true` | 根据需求自动检测适用模块 |
| `parallelGeneration` | boolean | `true` | 并行生成多个模块 |
| `cacheEnabled` | boolean | `true` | 启用模块信息缓存 |
| `cacheTTL` | number | `300000` | 缓存过期时间(毫秒) |
| `showMigrationPrompt` | boolean | `true` | 显示旧设计迁移提示 |
| `validateCrossReferences` | boolean | `true` | 验证模块间交叉引用 |
| `warnOnInconsistencies` | boolean | `true` | 显示不一致性警告 |
| `customModules` | array | `[]` | 自定义模块定义列表 |

## 工作区结构

启用模块化设计后,spec 目录结构如下:

```
.claude/specs/{spec-name}/
├── requirements.md              # 需求文档
├── design-frontend.md           # 前端设计模块
├── design-mobile.md             # 移动端设计模块(如适用)
├── design-server-api.md         # 服务端 API 设计模块
├── design-server-logic.md       # 服务端逻辑设计模块
├── design-server-database.md    # 数据库设计模块
├── design-testing.md            # 测试设计模块
├── tasks.md                     # 任务文档
└── .module-metadata.json        # 模块元数据(工作流状态)
```

### 元数据文件

`.module-metadata.json` 存储模块的工作流状态:

```json
{
  "version": "1.0",
  "modules": {
    "frontend": {
      "workflowState": "approved",
      "generatedAt": "2025-10-14T10:30:00Z",
      "approvedAt": "2025-10-14T11:00:00Z",
      "approvedBy": "user"
    },
    "server-api": {
      "workflowState": "pending-review",
      "generatedAt": "2025-10-14T10:35:00Z"
    },
    "testing": {
      "workflowState": "not-generated"
    }
  },
  "canProgressToTasks": false
}
```

## 最佳实践

### 1. 合理规划模块

- 在生成需求时考虑项目的技术栈
- 明确说明需要哪些技术领域的设计
- 不要过度拆分,保持适当的模块数量

### 2. 顺序审核

建议按以下顺序审核模块:

1. Server Database (数据模型是基础)
2. Server API (依赖数据模型)
3. Server Logic (依赖 API 定义)
4. Frontend / Mobile (依赖 API)
5. Testing (依赖所有其他模块)

### 3. 利用交叉引用

- 在审核时使用交叉引用分析功能
- 确保 API 定义与前端调用一致
- 确保数据模型与 API 响应一致

### 4. 定期重新生成

- 当需求发生重大变化时,考虑重新生成受影响的模块
- 使用版本控制跟踪设计变更

### 5. 团队协作

- 分配不同的模块给不同的团队成员审核
- 使用模块状态跟踪审核进度
- 在所有模块批准后统一进入实施阶段

## 故障排除

### 模块生成失败

**问题**: 某个模块生成时出错

**解决方案**:
1. 查看 VSCode 输出面板中的错误信息
2. 检查 Claude Code 是否正常运行
3. 尝试单独重新生成失败的模块
4. 检查网络连接

### 检测不到预期模块

**问题**: 某个模块类型没有被自动检测到

**解决方案**:
1. 检查 requirements.md 中是否包含相关关键词
2. 在配置中将该模块添加到 `defaultModules`
3. 使用"生成特定模块"手动生成

### 迁移出现问题

**问题**: 旧设计迁移到模块化结构时出错

**解决方案**:
1. 备份原始 `design.md` 文件
2. 检查文件中的 Markdown 格式是否正确
3. 手动调整章节标题以便系统识别
4. 如果自动迁移失败,考虑手动创建模块并复制内容

### 跨引用警告过多

**问题**: 交叉引用分析显示大量警告

**解决方案**:
1. 这通常表示模块之间确实存在不一致
2. 逐个审查警告并修复设计
3. 如果某些警告是误报,可在配置中关闭 `warnOnInconsistencies`

## 相关文档

- [使用指南](./usage-guide.md) - 详细的使用说明
- [配置指南](./configuration-guide.md) - 完整的配置选项说明
- [迁移指南](./migration-guide.md) - 从传统设计迁移的详细步骤
- [自定义模块示例](./custom-modules-example.md) - 如何创建自定义模块

## 反馈与支持

如果您在使用模块化设计功能时遇到问题或有改进建议:

- 在 [GitHub Issues](https://github.com/notdp/kiro-for-cc/issues) 提交问题
- 查看 [变更日志](../CHANGELOG.md) 了解最新更新
- 参考 [README](../README.zh-CN.md) 了解扩展的其他功能
