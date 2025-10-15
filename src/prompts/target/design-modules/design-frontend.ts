// Design module prompt for frontend design
// This prompt generates detailed frontend/web design specifications

export const frontmatter = {
  "id": "design-module-frontend",
  "name": "Frontend Design Module",
  "version": "1.0.0",
  "description": "Generate detailed frontend/web design specifications including component architecture, state management, and UI/UX patterns",
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

export const content = `# 前端设计模块生成任务

你是一位资深的前端架构师。请根据需求文档生成详细的前端设计规范。

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

## 设计要求

请创建一个详细的前端设计文档，包含以下部分：

### 1. 概述
- 前端技术栈选择和理由
- 主要功能模块概述
- 架构设计原则

### 2. 组件架构
- 列出所有前端组件（页面组件、容器组件、展示组件）
- 组件层次结构（使用 Mermaid 图表展示）
- 组件职责和接口定义（Props 和 Events）
- 组件复用策略

### 3. 状态管理
- 全局状态设计
- 状态管理方案（Redux, MobX, Zustand, Context API 等）
- 状态结构定义（包含 TypeScript 类型）
- 状态流转图（使用 Mermaid 图表）
- 本地状态 vs 全局状态的划分策略

### 4. 路由设计
- 路由结构和层次
- 路由配置（路径、组件、参数）
- 路由守卫和权限控制
- 路由参数和查询参数设计
- 深度链接支持

### 5. UI/UX 模式
- 设计系统或组件库选择（如 Material-UI, Ant Design, 自定义等）
- 响应式设计方案（断点定义、移动端适配）
- 主题系统设计
- 交互模式和用户反馈
- 动画和过渡效果策略
- 无障碍访问（Accessibility）考虑

### 6. API 集成
{{#if relatedModules.server-api}}
- 引用服务端 API 设计中定义的端点
- API 调用封装（HTTP 客户端配置）
- 请求拦截器和响应拦截器
- 数据获取策略（实时查询、缓存、预加载）
- 错误处理和重试机制
{{else}}
- API 调用模式和约定
- 数据获取策略
- 请求/响应处理
- 错误处理和重试策略
- 加载状态管理
{{/if}}

### 7. 数据流设计
- 数据从 API 到 UI 的流动路径
- 数据转换和适配层
- 数据缓存策略
- 实时数据更新机制（WebSocket, SSE, 轮询等）

### 8. 性能优化
- 代码分割策略（路由级、组件级）
- 懒加载方案（组件、图片、数据）
- 缓存策略（浏览器缓存、Service Worker）
- Bundle 优化（Tree-shaking, 压缩）
- 渲染性能优化（虚拟列表、防抖节流）

### 9. 样式方案
- CSS 架构选择（CSS Modules, Styled Components, Tailwind CSS, SCSS 等）
- 样式组织结构
- 主题系统实现
- 样式规范和命名约定
- 全局样式和组件样式的管理

### 10. 表单处理
- 表单库选择（如 React Hook Form, Formik）
- 表单验证策略
- 表单状态管理
- 复杂表单处理（多步骤、动态字段）

### 11. 错误处理和边界
- 错误边界（Error Boundary）设计
- 全局错误处理机制
- 错误提示和用户反馈
- 错误日志收集

### 12. 国际化（如适用）
- 国际化方案（i18next, react-intl 等）
- 语言切换机制
- 文本资源组织

### 13. 测试策略
- 单元测试方案（组件测试）
- 集成测试策略
- E2E 测试工具选择
- 测试覆盖率目标

## 输出格式要求

请使用 Markdown 格式，包含必要的 Mermaid 图表。确保：

1. 使用清晰的标题层级（##, ###）
2. 包含代码示例（TypeScript/JavaScript）
3. 使用 Mermaid 图表展示架构和流程
4. 提供接口定义（TypeScript interfaces 和 types）
5. 交叉引用相关模块（如果有）
6. 为每个重要决策提供理由和权衡考虑

## 代码示例格式

对于关键组件和接口，提供 TypeScript 代码示例：

\`\`\`typescript
// 示例：组件 Props 接口
interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

// 示例：状态接口
interface AppState {
  user: UserState;
  theme: ThemeState;
  // ...
}
\`\`\`

## 输出位置

请将生成的设计文档保存到：
\`.claude/specs/{{specName}}/design-frontend.md\`
`;

export default {
  frontmatter,
  content
};
