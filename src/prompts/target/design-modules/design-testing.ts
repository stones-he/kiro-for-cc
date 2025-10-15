// Design module prompt for testing strategy design
// This prompt generates detailed testing specifications and strategies

export const frontmatter = {
  "id": "design-module-testing",
  "name": "Testing Design Module",
  "version": "1.0.0",
  "description": "Generate detailed testing strategy specifications including unit tests, integration tests, and E2E test scenarios",
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

export const content = `# 测试设计模块生成任务

你是一位资深的测试架构师。请根据需求文档和相关设计模块生成详细的测试策略和测试用例规范。

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

{{#if relatedModules.server-api}}
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

请创建一个详细的测试设计文档，包含以下部分：

### 1. 测试策略概述
- 测试目标和范围
- 测试层次划分（单元测试、集成测试、E2E 测试）
- 测试覆盖率目标
- 测试自动化程度
- 测试环境策略
- 持续集成/持续部署（CI/CD）集成

### 2. 测试金字塔

描述项目的测试金字塔结构：

\`\`\`mermaid
graph TD
    E2E[E2E Tests<br/>10% - 少量关键路径]
    Integration[Integration Tests<br/>30% - API和模块集成]
    Unit[Unit Tests<br/>60% - 核心逻辑和函数]

    E2E --> Integration
    Integration --> Unit

    style E2E fill:#ff6b6b
    style Integration fill:#ffd93d
    style Unit fill:#6bcf7f
\`\`\`

### 3. 测试工具和框架

#### 前端测试工具
{{#if relatedModules.frontend}}
- **单元测试：** Jest, Vitest, Mocha
- **组件测试：** React Testing Library, Vue Test Utils, Enzyme
- **E2E 测试：** Cypress, Playwright, Puppeteer
- **视觉回归测试：** Percy, Chromatic, BackstopJS
- **性能测试：** Lighthouse CI
{{else}}
- 根据技术栈选择合适的测试框架
{{/if}}

#### 后端测试工具
{{#if relatedModules.server-api}}
- **单元测试：** Jest, Mocha, pytest, JUnit
- **API 测试：** Supertest, REST Assured, Postman
- **集成测试：** Testcontainers
- **负载测试：** Artillery, k6, JMeter
{{else}}
- 根据技术栈选择合适的测试框架
{{/if}}

### 4. 单元测试策略

#### 测试范围

- 业务逻辑函数
- 工具函数和辅助方法
- 数据转换和验证
- 状态管理逻辑
- 服务层方法

#### 测试规范

\`\`\`typescript
describe('Component/Service Name', () => {
  // 设置和清理
  beforeEach(() => {
    // 测试前准备
  });

  afterEach(() => {
    // 测试后清理
  });

  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange - 准备测试数据
      const input = { /* test data */ };

      // Act - 执行被测试的代码
      const result = methodName(input);

      // Assert - 验证结果
      expect(result).toBe(expectedValue);
    });

    it('should throw error when [invalid condition]', () => {
      expect(() => methodName(invalidInput))
        .toThrow(ExpectedError);
    });
  });
});
\`\`\`

#### 单元测试覆盖目标

| 类型 | 覆盖率目标 | 说明 |
|------|-----------|------|
| 语句覆盖率 | ≥ 80% | 每条语句至少执行一次 |
| 分支覆盖率 | ≥ 75% | 每个条件分支至少执行一次 |
| 函数覆盖率 | ≥ 90% | 每个函数至少调用一次 |
| 行覆盖率 | ≥ 80% | 每行代码至少执行一次 |

#### 测试用例清单

{{#if relatedModules.frontend}}
**前端组件测试：**

\`\`\`
- [ ] 组件渲染测试
  - [ ] 组件正常渲染
  - [ ] Props 正确传递
  - [ ] 条件渲染逻辑
  - [ ] 列表渲染

- [ ] 用户交互测试
  - [ ] 按钮点击事件
  - [ ] 表单输入和提交
  - [ ] 键盘事件
  - [ ] 触摸事件（移动端）

- [ ] 状态管理测试
  - [ ] 初始状态正确
  - [ ] 状态更新逻辑
  - [ ] 副作用处理

- [ ] 钩子函数测试
  - [ ] useEffect 执行
  - [ ] 自定义 hooks 逻辑
\`\`\`
{{/if}}

{{#if relatedModules.server-logic}}
**后端服务测试：**

\`\`\`
- [ ] 业务逻辑测试
  - [ ] 正常业务流程
  - [ ] 边界条件处理
  - [ ] 异常情况处理
  - [ ] 数据验证逻辑

- [ ] 数据访问层测试
  - [ ] CRUD 操作
  - [ ] 查询逻辑
  - [ ] 事务处理
  - [ ] 错误处理

- [ ] 工具函数测试
  - [ ] 数据转换
  - [ ] 验证器
  - [ ] 格式化函数
\`\`\`
{{/if}}

### 5. 集成测试策略

#### 测试范围

{{#if relatedModules.server-api}}
- API 端点集成测试
- 数据库集成测试
- 外部服务集成测试
- 认证和授权流程测试
{{/if}}

{{#if relatedModules.frontend}}
- 前后端集成测试
- 第三方库集成测试
- 路由导航测试
{{/if}}

#### API 集成测试示例

{{#if relatedModules.server-api}}
\`\`\`typescript
describe('User API Integration Tests', () => {
  let app: Application;
  let testDb: TestDatabase;

  beforeAll(async () => {
    // 启动测试服务器和数据库
    testDb = await TestDatabase.create();
    app = await createTestApp(testDb);
  });

  afterAll(async () => {
    // 清理资源
    await testDb.teardown();
  });

  beforeEach(async () => {
    // 清理数据
    await testDb.clear();
  });

  describe('POST /api/v1/users', () => {
    it('should create user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .send(userData)
        .expect(201);

      expect(response.body.data).toMatchObject({
        email: userData.email,
        name: userData.name
      });
      expect(response.body.data.password).toBeUndefined();
    });

    it('should return 400 when email is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({ email: 'invalid-email', password: '123' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
\`\`\`
{{/if}}

#### 数据库集成测试

- 使用测试数据库（或内存数据库）
- 测试事务和回滚
- 测试数据完整性约束
- 测试复杂查询

#### 外部服务 Mock

\`\`\`typescript
// Mock 外部服务
jest.mock('../services/paymentGateway', () => ({
  PaymentGateway: {
    charge: jest.fn().mockResolvedValue({
      success: true,
      transactionId: 'mock-tx-id'
    })
  }
}));

describe('Payment Integration', () => {
  it('should process payment successfully', async () => {
    const result = await paymentService.processOrder(order);
    expect(result.success).toBe(true);
    expect(PaymentGateway.charge).toHaveBeenCalledWith(
      expect.objectContaining({ amount: order.total })
    );
  });
});
\`\`\`

### 6. E2E 测试策略

#### 测试范围

识别关键用户路径和业务流程：

\`\`\`
**关键用户路径：**
1. 用户注册流程
2. 用户登录流程
3. 核心业务功能流程（根据需求定义）
4. 支付流程（如适用）
5. 数据导出流程（如适用）
\`\`\`

#### E2E 测试场景

为每个关键路径定义详细测试场景：

\`\`\`
**场景 1：用户注册和登录**

**前置条件：**
- 测试环境已部署
- 测试数据库已清理

**测试步骤：**
1. 访问注册页面
2. 填写注册表单（email, password, name）
3. 提交表单
4. 验证注册成功提示
5. 验证收到确认邮件（如适用）
6. 使用注册的凭据登录
7. 验证登录成功并跳转到主页

**预期结果：**
- 注册成功，数据库中创建新用户
- 登录成功，获得有效 token
- 用户信息正确显示

**测试数据：**
- Email: e2e-test-{{timestamp}}@example.com
- Password: TestPassword123!
- Name: E2E Test User
\`\`\`

#### Cypress E2E 测试示例

{{#if relatedModules.frontend}}
\`\`\`typescript
describe('User Registration E2E', () => {
  beforeEach(() => {
    cy.visit('/register');
  });

  it('should register and login successfully', () => {
    const testUser = {
      email: \`test-\${Date.now()}@example.com\`,
      password: 'TestPassword123!',
      name: 'Test User'
    };

    // 填写注册表单
    cy.get('[data-testid="email-input"]').type(testUser.email);
    cy.get('[data-testid="password-input"]').type(testUser.password);
    cy.get('[data-testid="name-input"]').type(testUser.name);
    cy.get('[data-testid="register-button"]').click();

    // 验证注册成功
    cy.contains('Registration successful').should('be.visible');
    cy.url().should('include', '/dashboard');

    // 验证用户信息显示
    cy.contains(testUser.name).should('be.visible');

    // 登出
    cy.get('[data-testid="logout-button"]').click();

    // 使用新账号登录
    cy.get('[data-testid="email-input"]').type(testUser.email);
    cy.get('[data-testid="password-input"]').type(testUser.password);
    cy.get('[data-testid="login-button"]').click();

    // 验证登录成功
    cy.url().should('include', '/dashboard');
  });

  it('should show validation errors for invalid input', () => {
    cy.get('[data-testid="register-button"]').click();

    cy.contains('Email is required').should('be.visible');
    cy.contains('Password is required').should('be.visible');
  });
});
\`\`\`
{{/if}}

### 7. 性能测试

#### 性能测试目标

| 指标 | 目标值 | 测量工具 |
|------|--------|----------|
| API 响应时间（P95） | < 200ms | k6, Artillery |
| 页面加载时间 | < 3s | Lighthouse |
| 首次内容绘制（FCP） | < 1.5s | Lighthouse |
| 最大内容绘制（LCP） | < 2.5s | Lighthouse |
| 累积布局偏移（CLS） | < 0.1 | Lighthouse |
| 并发用户数 | 1000+ | k6 |

#### 负载测试脚本示例

\`\`\`javascript
// k6 负载测试
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // 2分钟内逐步增加到100用户
    { duration: '5m', target: 100 }, // 保持100用户5分钟
    { duration: '2m', target: 200 }, // 增加到200用户
    { duration: '5m', target: 200 }, // 保持200用户5分钟
    { duration: '2m', target: 0 },   // 逐步减少到0
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95%的请求应在200ms内完成
    http_req_failed: ['rate<0.01'],   // 错误率应低于1%
  },
};

export default function () {
  const response = http.get('https://api.example.com/users');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
\`\`\`

### 8. 安全测试

#### 安全测试检查清单

\`\`\`
- [ ] 认证和授权测试
  - [ ] 未授权访问被拒绝
  - [ ] Token 过期处理
  - [ ] 权限级别验证

- [ ] 输入验证测试
  - [ ] SQL 注入防护
  - [ ] XSS 攻击防护
  - [ ] CSRF 保护

- [ ] 敏感数据保护
  - [ ] 密码正确加密
  - [ ] 敏感信息不在日志中
  - [ ] API 不返回敏感字段

- [ ] 速率限制测试
  - [ ] API 速率限制生效
  - [ ] 暴力破解防护
\`\`\`

### 9. 可访问性测试（A11y）

{{#if relatedModules.frontend}}
#### 可访问性测试工具

- axe-core
- jest-axe
- Pa11y
- WAVE

#### 测试检查项

\`\`\`
- [ ] 键盘导航
- [ ] 屏幕阅读器兼容
- [ ] ARIA 标签正确使用
- [ ] 颜色对比度符合 WCAG 2.1 AA 标准
- [ ] 表单标签正确关联
- [ ] 错误消息可访问
\`\`\`

示例：

\`\`\`typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = render(<UserProfile />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
\`\`\`
{{/if}}

### 10. 测试数据管理

#### 测试数据策略

- **Fixtures：** 预定义的测试数据文件
- **Factories：** 动态生成测试数据
- **Seeders：** 初始化测试数据库
- **数据隔离：** 每个测试使用独立数据

#### 测试数据工厂示例

\`\`\`typescript
// User Factory
class UserFactory {
  static create(overrides = {}) {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      status: 'active',
      createdAt: new Date(),
      ...overrides
    };
  }

  static createMany(count: number, overrides = {}) {
    return Array.from({ length: count }, () =>
      this.create(overrides)
    );
  }
}

// 使用
const testUser = UserFactory.create({
  email: 'specific@example.com'
});
\`\`\`

### 11. 测试环境配置

#### 环境层次

- **本地开发环境：** 开发者本地运行测试
- **CI 环境：** 自动化测试执行
- **测试环境：** 集成测试和 E2E 测试
- **预发布环境：** 生产前验证

#### 环境变量管理

\`\`\`bash
# .env.test
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
API_BASE_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379/1
\`\`\`

### 12. CI/CD 集成

#### GitHub Actions 示例

\`\`\`yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
\`\`\`

### 13. 测试报告和监控

#### 测试报告内容

- 测试执行总结
- 覆盖率报告
- 失败测试详情
- 性能测试结果
- 趋势分析

#### 覆盖率报告

使用工具生成覆盖率报告：
- Istanbul/nyc
- Jest --coverage
- SonarQube

### 14. 测试维护策略

#### 测试代码质量

- 测试代码需要代码审查
- 避免测试代码重复
- 使用描述性的测试名称
- 保持测试简洁和专注
- 定期重构测试代码

#### 测试稳定性

- 消除不稳定的测试（Flaky Tests）
- 避免测试间依赖
- 使用合适的等待策略
- 隔离外部依赖

### 15. 测试清单总结

#### 功能测试清单

基于需求文档，为每个需求创建测试用例：

\`\`\`
需求 1: [需求描述]
- [ ] 测试用例 1.1: [正常场景]
- [ ] 测试用例 1.2: [边界条件]
- [ ] 测试用例 1.3: [异常情况]

需求 2: [需求描述]
- [ ] 测试用例 2.1: [正常场景]
- [ ] 测试用例 2.2: [边界条件]
\`\`\`

#### 测试执行计划

| 测试类型 | 执行频率 | 触发时机 | 预计时长 |
|---------|---------|---------|---------|
| 单元测试 | 每次提交 | Git push | 2-5 分钟 |
| 集成测试 | 每次提交 | Git push | 5-10 分钟 |
| E2E 测试 | 每次 PR | PR 创建/更新 | 10-20 分钟 |
| 性能测试 | 每日/每周 | 定时任务 | 30-60 分钟 |
| 安全测试 | 每周 | 定时任务 | 1-2 小时 |

## 输出格式要求

请使用 Markdown 格式，包含必要的图表和代码示例。确保：

1. 使用清晰的标题层级（##, ###）
2. 包含具体的测试代码示例
3. 使用表格总结测试覆盖范围
4. 提供测试用例清单
5. 使用 Mermaid 图表展示测试策略
6. 交叉引用相关模块和需求
7. 为每个测试场景提供明确的验收标准

## 输出位置

请将生成的设计文档保存到：
\`.claude/specs/{{specName}}/design-testing.md\`
`;

export default {
  frontmatter,
  content
};
