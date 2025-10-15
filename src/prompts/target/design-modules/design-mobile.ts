// Design module prompt for mobile design
// This prompt generates detailed mobile application design specifications

export const frontmatter = {
  "id": "design-module-mobile",
  "name": "Mobile Design Module",
  "version": "1.0.0",
  "description": "Generate detailed mobile application design specifications including platform-specific considerations and native vs hybrid decisions",
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

export const content = `# 移动端设计模块生成任务

你是一位资深的移动应用架构师。请根据需求文档生成详细的移动端设计规范。

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

请创建一个详细的移动端设计文档，包含以下部分：

### 1. 概述
- 移动应用类型（原生、混合、跨平台）
- 技术栈选择和理由（React Native, Flutter, Swift/Kotlin, Ionic 等）
- 目标平台（iOS, Android, 或两者）
- 架构设计原则

### 2. 平台特定考虑
- iOS 平台特定设计
  - iOS 版本支持范围
  - iOS 设计规范遵循（Human Interface Guidelines）
  - iOS 特有功能利用（如 3D Touch, Face ID 等）
- Android 平台特定设计
  - Android 版本支持范围（最低 API Level）
  - Material Design 规范遵循
  - Android 特有功能利用（如 App Widgets, Deep Links 等）
- 平台差异处理策略

### 3. 应用架构
- 整体架构模式（MVVM, MVI, Clean Architecture 等）
- 模块划分和职责
- 架构图（使用 Mermaid）
- 导航结构和流程

### 4. UI 组件设计
- 屏幕列表和层次结构
- 核心 UI 组件定义
- 组件复用策略
- 自定义组件 vs 平台原生组件
- 响应式布局设计（不同屏幕尺寸和方向）

### 5. 状态管理
- 状态管理方案选择（Redux, MobX, Provider, BLoC 等）
- 全局状态 vs 局部状态
- 状态持久化策略
- 状态同步机制

### 6. 导航设计
- 导航模式（Stack, Tab, Drawer, Modal 等）
- 路由配置
- 深度链接（Deep Linking）支持
- 通用链接（Universal Links / App Links）
- 页面转场动画

### 7. 数据管理
- 本地数据存储方案（SQLite, Realm, AsyncStorage, SharedPreferences 等）
- 数据模型定义
- 数据缓存策略
- 数据同步机制（在线/离线）

### 8. API 集成
{{#if relatedModules.server-api}}
- 引用服务端 API 设计中定义的端点
- API 客户端实现
- 请求/响应处理
- 认证和授权处理
- 错误处理和重试策略
{{else}}
- API 通信协议
- 网络请求封装
- 数据序列化/反序列化
- 错误处理机制
{{/if}}

### 9. 离线能力
- 离线功能范围
- 离线数据策略
- 数据同步机制（冲突解决）
- 网络状态监测和处理
- 后台同步

### 10. 性能优化
- 启动时间优化
- 内存管理策略
- 图片加载和缓存
- 列表性能优化（虚拟列表、分页）
- 动画性能优化
- 包体积优化

### 11. 原生功能集成
- 相机和相册访问
- 位置服务（GPS）
- 推送通知
- 生物识别（指纹、面部识别）
- 传感器使用（加速度计、陀螺仪等）
- 本地通知
- 分享功能
- 其他原生 API 集成

### 12. 用户体验设计
- 触摸手势支持
- 反馈机制（触觉反馈、声音、视觉）
- 加载状态和骨架屏
- 错误提示和空状态
- 引导和帮助系统
- 暗黑模式支持

### 13. 安全性设计
- 数据加密（传输和存储）
- 敏感信息处理
- 证书固定（Certificate Pinning）
- 代码混淆和保护
- 安全存储（Keychain, Keystore）

### 14. 国际化和本地化
- 多语言支持方案
- 地区特定格式（日期、货币等）
- RTL（从右到左）语言支持

### 15. 测试策略
- 单元测试方案
- UI 测试（Widget Testing, UI Testing）
- 集成测试
- 设备和系统版本覆盖范围
- 自动化测试工具选择

### 16. 调试和监控
- 日志系统
- 崩溃报告（Crashlytics, Sentry 等）
- 性能监控
- 用户行为分析

## 输出格式要求

请使用 Markdown 格式，包含必要的 Mermaid 图表。确保：

1. 使用清晰的标题层级（##, ###）
2. 包含代码示例（对应技术栈的语言）
3. 使用 Mermaid 图表展示架构和流程
4. 提供数据模型和接口定义
5. 交叉引用相关模块（如果有）
6. 为每个技术选择提供理由和权衡分析

## 代码示例格式

根据选择的技术栈提供代码示例：

\`\`\`typescript
// React Native 示例
interface UserScreenProps {
  navigation: NavigationProp<RootStackParamList>;
  userId: string;
}
\`\`\`

\`\`\`dart
// Flutter 示例
class UserScreen extends StatefulWidget {
  final String userId;
  // ...
}
\`\`\`

## 输出位置

请将生成的设计文档保存到：
\`.claude/specs/{{specName}}/design-mobile.md\`
`;

export default {
  frontmatter,
  content
};
