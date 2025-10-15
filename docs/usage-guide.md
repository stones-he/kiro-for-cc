# 模块化设计使用指南

本指南提供详细的使用说明,帮助您充分利用 Kiro for Claude Code 的模块化设计功能。

## 目录

- [快速开始](#快速开始)
- [详细使用流程](#详细使用流程)
- [UI 界面说明](#ui-界面说明)
- [命令参考](#命令参考)
- [使用场景](#使用场景)
- [高级技巧](#高级技巧)

## 快速开始

### 第一次使用

1. **启用功能**
   ```json
   // .claude/settings/kfc-settings.json
   {
     "features": {
       "modularDesign": {
         "enabled": true
       }
     }
   }
   ```

2. **创建新 Spec**
   - 点击 Spec Explorer 中的 "+" 按钮
   - 输入: `user-authentication-system`
   - 描述: "Implement a user authentication system with JWT tokens"

3. **生成设计模块**
   - 右键点击 spec
   - 选择 "生成所有设计模块"
   - 等待生成完成(通常 1-3 分钟)

4. **审核和批准**
   - 展开 "Design Modules" 节点
   - 逐个查看和批准模块
   - 所有模块批准后生成任务

## 详细使用流程

### 步骤 1: 创建 Spec 和需求

#### 1.1 创建 Spec

在 Spec Explorer 中:
```
SPEC
  └─ [+] 按钮 → 输入 spec 名称
```

推荐的命名格式:
- 使用小写字母和连字符: `user-auth-system`
- 简洁明了: `payment-gateway`
- 描述性强: `real-time-chat-feature`

#### 1.2 编写或生成需求

Claude 会自动生成 `requirements.md`。确保包含:

- **明确的技术栈**: React, Node.js, PostgreSQL
- **功能描述**: 用户登录、注册、密码重置
- **非功能需求**: 性能、安全性、可扩展性
- **技术关键词**: API, database, frontend, mobile

示例需求文档结构:
```markdown
# Requirements: User Authentication System

## Overview
构建一个安全的用户认证系统...

## Functional Requirements
### User Registration
- 用户可以通过邮箱注册...

## Technical Stack
- Frontend: React + TypeScript
- Backend: Node.js + Express
- Database: PostgreSQL
- Authentication: JWT

## Non-Functional Requirements
- Security: 密码加密存储
- Performance: API 响应时间 < 200ms
```

### 步骤 2: 生成设计模块

#### 2.1 自动检测模式(推荐)

系统会分析 requirements.md 并自动检测适用的模块。

**触发自动检测**:
1. 右键点击 spec
2. 选择 "生成所有设计模块"
3. 系统显示检测结果:
   ```
   检测到以下适用模块:
   ✓ Frontend (React)
   ✓ Server API (Express)
   ✓ Server Logic (业务逻辑)
   ✓ Server Database (PostgreSQL)
   ✓ Testing (单元测试)
   ✗ Mobile (未检测到移动端需求)
   ```

**检测逻辑**:

| 关键词示例 | 检测到的模块 |
|-----------|------------|
| React, Vue, Angular, 前端, UI | Frontend |
| iOS, Android, mobile app, 移动端 | Mobile |
| API, endpoint, REST, GraphQL | Server API |
| business logic, service, 业务逻辑 | Server Logic |
| database, SQL, MongoDB, 数据库 | Server Database |
| 任何项目 | Testing (总是适用) |

#### 2.2 手动选择模式

如果自动检测不准确:

1. 展开 spec 的 "Design Modules" 节点
2. 找到未生成的模块(灰色图标)
3. 右键点击 → "生成模块"

#### 2.3 生成过程

**进度显示**:
```
正在生成设计模块... (3/5)
✓ Frontend 设计已生成
✓ Server API 设计已生成
⏳ Server Logic 设计生成中...
⏳ Server Database 设计生成中...
⏳ Testing 设计生成中...
```

**并行生成**:
- 默认最多 4 个模块同时生成
- 可在配置中调整: `parallelGeneration: true/false`
- 即使某个失败,其他继续

**生成时间**:
- 单个模块: 20-60 秒
- 5 个模块(并行): 1-3 分钟
- 取决于网络速度和 Claude Code 响应时间

### 步骤 3: 查看和编辑模块

#### 3.1 打开模块文件

**方法 1: 点击节点**
```
SPEC
  └─ user-auth-system
      └─ Design Modules
          ├─ 前端设计 ← 点击打开
          ├─ 服务端 API
          ├─ 服务端逻辑
          ├─ 数据库设计
          └─ 测试设计
```

**方法 2: 文件浏览器**
```
.claude/specs/user-auth-system/
  ├─ design-frontend.md
  ├─ design-server-api.md
  ├─ design-server-logic.md
  ├─ design-server-database.md
  └─ design-testing.md
```

#### 3.2 模块内容结构

每个模块都包含特定领域的设计内容。

**Frontend 模块示例**:
```markdown
# 前端设计

## 组件架构
- LoginForm
- RegisterForm
- Dashboard

## 状态管理
使用 Redux Toolkit 管理用户状态

## 路由设计
- /login
- /register
- /dashboard

## API 集成
调用 POST /api/auth/login (见 design-server-api.md)
```

**Server API 模块示例**:
```markdown
# 服务端 API 设计

## 认证端点

### POST /api/auth/register
注册新用户

**请求体**:
{
  "email": "user@example.com",
  "password": "securepass123"
}

**响应**: 201 Created
{
  "success": true,
  "userId": "123"
}
```

#### 3.3 编辑模块

可以直接在 VSCode 中编辑模块文件:

1. 添加遗漏的设计细节
2. 调整技术方案
3. 补充代码示例
4. 添加架构图(Mermaid)

**自动保存**: VSCode 会自动保存更改

**版本控制**: 建议使用 Git 跟踪设计变更

### 步骤 4: 审核工作流

#### 4.1 模块状态

每个模块有 4 种状态:

| 状态 | 图标 | 说明 |
|-----|------|------|
| 未生成 | 📄+ | 模块尚未创建 |
| 待审核 | 👁️ | 模块已生成,等待审核 |
| 已批准 | ✅ | 模块审核通过 |
| 已拒绝 | ❌ | 模块需要修改 |

#### 4.2 批准模块

**前提条件**: 您已仔细审核模块内容

**操作步骤**:
1. 右键点击模块
2. 选择 "批准模块"
3. 图标变为绿色对勾 ✅

**批准检查清单**:
- [ ] 设计内容完整且详细
- [ ] 技术方案可行
- [ ] 与需求文档一致
- [ ] 与其他模块协调
- [ ] 包含必要的架构图和示例

#### 4.3 拒绝并重新生成

**场景**: 发现设计问题或需要调整

**操作步骤**:
1. 右键点击模块
2. 选择 "拒绝模块"
3. (可选) 在文件中添加注释说明问题
4. 右键 → "重新生成模块"

**重新生成选项**:
- "覆盖现有内容" - 完全重新生成
- "保留并追加" - 在现有基础上补充(需手动编辑)

**最佳实践**:
- 在文件顶部添加 `<!-- FEEDBACK: 需要更详细的API错误处理设计 -->` 注释
- 重新生成时 Claude 可能会考虑这些反馈

#### 4.4 部分批准流程

**场景**: 不同团队成员负责不同模块

**示例工作流**:
```
Day 1:
  - Backend Lead 审核并批准: Server API, Server Logic, Server Database
  - Frontend Lead 审核并批准: Frontend
  - 状态: 4/5 模块已批准

Day 2:
  - QA Lead 审核并批准: Testing
  - 状态: 5/5 模块已批准 → 可以生成任务
```

### 步骤 5: 进入任务阶段

#### 5.1 检查准备情况

系统会自动检查是否所有必需模块已批准:

**检查标准**:
- 所有生成的模块都必须被批准
- 未生成的模块不影响进度

**通知提示**:
```
✓ 所有设计模块已批准!
  现在可以生成任务列表了。

[生成任务] [稍后]
```

#### 5.2 生成任务

**方法 1: 通过通知**
- 点击通知中的 "生成任务" 按钮

**方法 2: 右键菜单**
1. 右键点击 spec
2. 选择 "生成任务"

**生成内容**:
- 系统会读取所有批准的设计模块
- 生成详细的实施任务列表
- 保存到 `tasks.md`

**任务列表示例**:
```markdown
# Tasks: User Authentication System

- [ ] 1. 设置数据库模型
  - [ ] 1.1 创建 User 表
  - [ ] 1.2 添加密码哈希字段

- [ ] 2. 实现认证 API
  - [ ] 2.1 POST /api/auth/register
  - [ ] 2.2 POST /api/auth/login

- [ ] 3. 开发前端组件
  - [ ] 3.1 LoginForm 组件
  - [ ] 3.2 RegisterForm 组件
```

## UI 界面说明

### Spec Explorer 树形视图

#### 传统结构(模块化设计禁用)
```
SPEC
└─ user-auth-system
    ├─ 📄 requirements
    ├─ 📄 design
    └─ 📋 tasks
```

#### 模块化结构(启用后)
```
SPEC
└─ user-auth-system
    ├─ 📄 requirements
    ├─ 📂 Design Modules
    │   ├─ 🌐 前端设计 [✅ 已批准]
    │   ├─ 📱 移动端设计 [📄+ 未生成]
    │   ├─ 🔌 服务端 API [👁️ 待审核]
    │   ├─ ⚙️ 服务端逻辑 [👁️ 待审核]
    │   ├─ 🗄️ 数据库设计 [✅ 已批准]
    │   └─ 🧪 测试设计 [❌ 已拒绝]
    └─ 📋 tasks
```

### 模块图标含义

| 图标 | 模块类型 | 说明 |
|-----|---------|------|
| 🌐 | Frontend | 前端设计 |
| 📱 | Mobile | 移动端设计 |
| 🔌 | Server API | 服务端 API |
| ⚙️ | Server Logic | 服务端逻辑 |
| 🗄️ | Server Database | 数据库设计 |
| 🧪 | Testing | 测试设计 |

### 状态颜色

| 颜色 | 状态 |
|-----|------|
| 橙色 | 未生成 |
| 蓝色 | 待审核 |
| 绿色 | 已批准 |
| 红色 | 已拒绝 |

### 右键菜单

#### Spec 级别菜单
```
右键点击 spec
├─ 生成所有设计模块
├─ 迁移到模块化设计 (如果存在 design.md)
├─ 分析跨模块引用
└─ 生成任务 (如果所有模块已批准)
```

#### 模块级别菜单
```
右键点击模块
├─ 生成模块 (如果未生成)
├─ 批准模块 (如果待审核)
├─ 拒绝模块 (如果待审核或已批准)
├─ 重新生成模块
├─ 删除模块
└─ 分析引用
```

## 命令参考

### VSCode 命令面板

按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux) 打开命令面板:

```
Kiro: Generate All Design Modules
Kiro: Generate Specific Design Module
Kiro: Approve Design Module
Kiro: Reject Design Module
Kiro: Regenerate Design Module
Kiro: Delete Design Module
Kiro: Migrate Legacy Design
Kiro: Analyze Cross References
```

### 快捷操作

| 操作 | 快捷方式 |
|-----|---------|
| 打开模块 | 单击模块节点 |
| 显示菜单 | 右键点击 |
| 刷新视图 | 点击 Spec Explorer 的刷新按钮 |
| 展开/折叠 | 双击节点 |

## 使用场景

### 场景 1: 全栈 Web 应用

**项目**: 电商平台

**适用模块**:
- ✅ Frontend (React)
- ✅ Server API (Node.js + Express)
- ✅ Server Logic (业务逻辑)
- ✅ Server Database (PostgreSQL)
- ✅ Testing

**工作流**:
1. 生成所有 5 个模块
2. 后端团队审核 API、Logic、Database
3. 前端团队审核 Frontend
4. QA 团队审核 Testing
5. 全部批准后生成任务

### 场景 2: 纯前端项目

**项目**: 数据可视化仪表板(使用公共 API)

**适用模块**:
- ✅ Frontend
- ✅ Testing
- ❌ Server API (使用第三方)
- ❌ Server Logic
- ❌ Server Database

**工作流**:
1. 系统自动检测只需 Frontend 和 Testing
2. 手动调整如果需要
3. 审核 2 个模块
4. 快速进入任务阶段

### 场景 3: 微服务架构

**项目**: 订单处理服务

**适用模块**:
- ❌ Frontend (独立服务)
- ✅ Server API
- ✅ Server Logic
- ✅ Server Database
- ✅ Testing

**特殊处理**:
- 可能需要自定义 "Message Queue" 模块
- 参考 [自定义模块示例](./custom-modules-example.md)

### 场景 4: 移动应用

**项目**: 社交媒体 App

**适用模块**:
- ✅ Mobile (React Native)
- ✅ Server API
- ✅ Server Logic
- ✅ Server Database
- ✅ Testing

**注意事项**:
- Mobile 模块包含 iOS 和 Android 特定设计
- 需要在 requirements 中明确说明 "mobile app" 或 "iOS/Android"

## 高级技巧

### 技巧 1: 分阶段生成

**场景**: 大型项目,先设计后端再设计前端

**步骤**:
1. 第一轮只生成 Server 相关模块
2. 审核并批准后端设计
3. 第二轮生成 Frontend 模块(会引用已批准的 API 设计)
4. 审核前端设计
5. 最后生成 Testing 模块

**优势**:
- API 设计先确定,前端设计更准确
- 减少不一致性
- 团队可以分阶段工作

### 技巧 2: 使用交叉引用分析

**触发分析**:
1. 右键点击 spec
2. 选择 "分析跨模块引用"

**分析结果**:
```
检测到以下引用关系:
✓ Frontend → Server API: 3 个 API 调用
✓ Server API → Server Database: 5 个数据模型
✓ Testing → All Modules: 12 个测试目标

不一致性警告:
⚠️ Frontend 调用 /api/users/:id,但 Server API 未定义
⚠️ Server API 返回 User 模型,但 Database 中字段不匹配
```

**修复流程**:
1. 点击警告跳转到问题位置
2. 修改设计文档
3. 重新分析验证

### 技巧 3: 快速迭代设计

**场景**: 需求变化,设计需要更新

**步骤**:
1. 更新 `requirements.md`
2. 拒绝受影响的模块
3. 重新生成这些模块
4. 重新审核
5. 保持其他模块不变

**示例**:
```
需求变更: 添加第三方支付集成

受影响模块:
- Server API (需要添加支付端点)
- Server Logic (需要支付处理逻辑)
- Frontend (需要支付 UI)

不受影响:
- Server Database (用户和订单模型不变)
- Testing (只需添加新测试)
```

### 技巧 4: 模板化提示

如果发现生成的设计不够详细,可以:

1. 在 requirements 中添加更详细的技术说明
2. 使用自定义模块覆盖默认提示
3. 参考 [配置指南](./configuration-guide.md)

### 技巧 5: 结合版本控制

**Git 工作流**:

```bash
# 创建设计分支
git checkout -b design/user-auth

# 生成设计模块
(通过 UI 生成)

# 提交设计
git add .claude/specs/user-auth-system/
git commit -m "feat: add user authentication design modules"

# 团队审核
git push origin design/user-auth
# 创建 PR,团队在 GitHub 上审核设计

# 批准后合并
git checkout main
git merge design/user-auth
```

**优势**:
- 设计变更可追溯
- 支持团队协作审核
- 可以回滚到之前的设计版本

## 常见问题

### Q1: 生成速度慢怎么办?

A:
- 检查网络连接
- 减少并发数: `parallelGeneration: false`
- 分批生成模块,而不是一次全部生成

### Q2: 如何知道哪些模块是必需的?

A:
- 系统会自动检测
- 查看 VSCode 输出面板的日志
- 如果不确定,生成所有默认模块,删除不需要的

### Q3: 可以修改已批准的模块吗?

A:
- 可以直接编辑文件
- 如果需要重新生成,先拒绝模块
- 手动修改不会改变审核状态

### Q4: 如何共享设计给团队?

A:
- 提交到 Git 仓库
- 使用代码审查工具(GitHub PR)
- 导出为 PDF 或其他格式(未来功能)

### Q5: 生成的设计质量不满意?

A:
- 改进 requirements 的描述质量
- 使用更具体的技术术语
- 考虑使用自定义提示模板
- 手动编辑生成的内容

## 下一步

- 了解[配置选项](./configuration-guide.md)
- 学习[迁移现有设计](./migration-guide.md)
- 探索[自定义模块](./custom-modules-example.md)
- 查看[主文档](./modular-design.md)
