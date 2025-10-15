# Kiro for Claude Code 文档索引

欢迎查阅 Kiro for Claude Code 扩展的文档。本文档库提供了扩展所有功能的详细说明和使用指南。

## 核心文档

### 📘 主要文档

- **[主 README](../README.md)** - 扩展概述、安装和快速开始
- **[中文 README](../README.zh-CN.md)** - 中文版主文档
- **[变更日志](../CHANGELOG.md)** - 版本历史和更新记录
- **[开发指南](../CLAUDE.md)** - 为贡献者提供的开发说明

## 模块化设计结构文档

### 核心概念

**[模块化设计结构](./modular-design.md)** - v0.3.0+ 新功能
- 功能概述和核心理念
- 默认模块类型说明
- 功能特性详解
- 工作区结构
- 最佳实践和故障排除

### 使用指南

**[使用指南](./usage-guide.md)** - 详细的操作说明
- 快速开始教程
- 完整的使用流程(5个步骤)
- UI 界面说明
- 命令参考
- 使用场景示例
- 高级技巧

### 配置指南

**[配置指南](./configuration-guide.md)** - 完整的配置选项说明
- 配置文件位置
- 所有配置选项详解(12个选项)
- VSCode 设置界面
- 配置示例(5种场景)
- 配置验证和最佳实践

### 迁移指南

**[迁移指南](./migration-guide.md)** - 从传统设计迁移到模块化
- 为什么要迁移
- 迁移前准备
- 3种迁移方法(自动、手动、混合)
- 迁移后验证
- 常见场景(4种)
- 故障排除(6个常见问题)

### 高级功能

**[自定义模块示例](./custom-modules-example.md)** - 扩展标准模块
- 自定义模块概念
- 配置示例(DevOps、Security、Performance)
- 字段说明
- 使用流程
- 高级用法和最佳实践

## 文档结构

```
docs/
├── README.md                    # 本文件 - 文档索引
├── modular-design.md            # 模块化设计概述
├── usage-guide.md               # 详细使用指南
├── configuration-guide.md       # 配置选项说明
├── migration-guide.md           # 迁移指南
└── custom-modules-example.md    # 自定义模块示例
```

## 文档版本

| 文档 | 版本 | 最后更新 |
|-----|------|---------|
| modular-design.md | 1.0 | 2025-10-14 |
| usage-guide.md | 1.0 | 2025-10-14 |
| configuration-guide.md | 1.0 | 2025-10-14 |
| migration-guide.md | 1.0 | 2025-10-14 |
| custom-modules-example.md | 1.0 | 2025-10-14 |

## 快速导航

### 我想...

#### 了解模块化设计
→ 阅读 [模块化设计结构](./modular-design.md)

#### 开始使用模块化设计
→ 按照 [使用指南](./usage-guide.md) 的快速开始部分

#### 配置模块化设计
→ 查看 [配置指南](./configuration-guide.md) 的基础配置部分

#### 迁移现有设计
→ 跟随 [迁移指南](./migration-guide.md) 的步骤

#### 创建自定义模块
→ 参考 [自定义模块示例](./custom-modules-example.md)

#### 解决问题
→ 查看各文档的"故障排除"或"常见问题"部分

## 学习路径

### 初学者路径

1. **第一步**: 阅读 [模块化设计结构](./modular-design.md) 了解基本概念
2. **第二步**: 按照 [使用指南](./usage-guide.md) 创建第一个模块化 spec
3. **第三步**: 通过 [配置指南](./configuration-guide.md) 调整设置

### 进阶用户路径

1. **探索高级功能**: [使用指南](./usage-guide.md) 的高级技巧部分
2. **优化配置**: [配置指南](./configuration-guide.md) 的配置示例
3. **定制扩展**: [自定义模块示例](./custom-modules-example.md)

### 团队管理员路径

1. **理解架构**: [模块化设计结构](./modular-design.md) 的架构部分
2. **制定配置标准**: [配置指南](./configuration-guide.md) 的最佳实践
3. **规划迁移**: [迁移指南](./migration-guide.md) 的团队迁移策略

## 相关资源

### 规范文档

模块化设计功能的规范文档位于:
```
.claude/specs/modular-design-structure/
├── requirements.md  # 功能需求
├── design.md       # 技术设计
└── tasks.md        # 实施任务
```

### 示例项目

在实际 spec 中查看模块化设计的实际应用:
- 位置: `.claude/specs/`
- 启用模块化设计后创建的任何 spec

### 在线资源

- **GitHub 仓库**: [notdp/kiro-for-cc](https://github.com/notdp/kiro-for-cc)
- **问题跟踪**: [GitHub Issues](https://github.com/notdp/kiro-for-cc/issues)
- **VSCode 市场**: [Kiro for Claude Code](https://marketplace.visualstudio.com/items?itemName=heisebaiyun.kiro-for-cc)

## 贡献文档

如果您想改进文档:

1. Fork GitHub 仓库
2. 编辑 `docs/` 目录下的文件
3. 提交 Pull Request
4. 在 PR 描述中说明更改内容

文档使用 Markdown 格式编写,遵循以下规范:
- 使用中文(主要用户群体为中文用户)
- 包含实际代码示例
- 提供清晰的步骤说明
- 使用表格、列表等格式增强可读性

## 反馈

如果您对文档有任何建议或发现错误:

- 在 GitHub 提交 [Issue](https://github.com/notdp/kiro-for-cc/issues)
- 标记为 `documentation` 标签
- 详细描述问题或改进建议

## 许可证

本文档与 Kiro for Claude Code 扩展一样,使用 MIT 许可证。

---

**最后更新**: 2025-10-14
**维护者**: Kiro for Claude Code 团队
