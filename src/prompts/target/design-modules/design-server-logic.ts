// Design module prompt for server business logic design
// This prompt generates detailed server business logic and service layer specifications

export const frontmatter = {
  "id": "design-module-server-logic",
  "name": "Server Logic Design Module",
  "version": "1.0.0",
  "description": "Generate detailed server business logic and service layer design specifications",
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

export const content = `# 服务端逻辑设计模块生成任务

你是一位资深的后端架构师。请根据需求文档生成详细的服务端业务逻辑和服务层设计规范。

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

{{#if relatedModules.server-database}}
### 数据库设计

\`\`\`
{{relatedModules.server-database}}
\`\`\`
{{/if}}

## 设计要求

请创建一个详细的服务端业务逻辑设计文档，包含以下部分：

### 1. 概述
- 服务层架构概览
- 业务逻辑组织原则
- 技术栈选择（编程语言、框架）
- 架构模式（分层架构、六边形架构、CQRS 等）

### 2. 服务层架构
- 服务分层设计
  - 控制器层（Controller）
  - 服务层（Service）
  - 数据访问层（Repository）
  - 领域层（Domain，如适用）
- 层次职责划分
- 层间交互规则
- 架构图（使用 Mermaid）

### 3. 业务服务定义

为每个核心业务领域定义服务类：

#### 服务模板格式

\`\`\`typescript
/**
 * [服务名称]Service
 *
 * 职责：[服务的主要职责描述]
 */
interface [ServiceName]Service {
  /**
   * [方法描述]
   * @param param1 - 参数说明
   * @returns 返回值说明
   * @throws {ErrorType} 错误情况说明
   */
  methodName(param1: Type1, param2: Type2): Promise<ReturnType>;

  // 其他方法...
}
\`\`\`

请为以下领域定义服务：
- 用户管理服务
- 认证和授权服务
- 核心业务功能服务
- 通知服务（如适用）
- 其他相关服务

### 4. 业务规则和逻辑

详细描述核心业务规则：

#### 规则模板

\`\`\`
**业务规则 [编号]：[规则名称]**

**描述：** [规则的详细说明]

**前置条件：**
- 条件 1
- 条件 2

**处理逻辑：**
1. 步骤 1
2. 步骤 2
3. ...

**验证规则：**
- 验证项 1
- 验证项 2

**异常处理：**
- 异常情况 1 → 处理方式 1
- 异常情况 2 → 处理方式 2

**示例代码：**
\\\`\\\`\\\`typescript
// 伪代码展示逻辑流程
async function businessRule() {
  // 验证
  if (!validate()) {
    throw new ValidationError();
  }

  // 执行业务逻辑
  const result = await process();

  // 返回结果
  return result;
}
\\\`\\\`\\\`
\`\`\`

### 5. 数据处理流程

{{#if relatedModules.server-api}}
描述从 API 请求到数据库操作的完整数据流：

- API 端点接收请求（参考 API 设计模块）
- 控制器层验证和路由
- 服务层业务逻辑处理
{{#if relatedModules.server-database}}
- 数据访问层操作（参考数据库设计模块）
{{else}}
- 数据访问层操作
{{/if}}
- 响应构建和返回

使用 Mermaid 序列图展示完整流程。
{{else}}
描述核心业务流程和数据处理逻辑。
{{/if}}

### 6. 领域模型（如采用 DDD）

如果采用领域驱动设计：

- 限界上下文（Bounded Context）定义
- 聚合根（Aggregate Root）识别
- 实体（Entity）和值对象（Value Object）设计
- 领域事件（Domain Event）定义
- 领域服务（Domain Service）

\`\`\`typescript
// 示例：聚合根
class User extends AggregateRoot {
  private id: UserId;
  private email: Email; // 值对象
  private profile: UserProfile; // 实体

  // 业务方法
  changeEmail(newEmail: Email): void {
    this.validateEmailChange(newEmail);
    this.email = newEmail;
    this.addDomainEvent(new EmailChangedEvent(this.id, newEmail));
  }

  private validateEmailChange(newEmail: Email): void {
    // 验证逻辑
  }
}
\`\`\`

### 7. 事务管理
- 事务边界定义
- 事务隔离级别选择
- 分布式事务处理策略（如适用）
- 事务回滚机制
- 乐观锁 vs 悲观锁

### 8. 数据验证
- 输入数据验证策略
- 业务规则验证
- 跨字段验证
- 自定义验证器
- 验证错误处理

\`\`\`typescript
class UserValidator {
  validate(user: CreateUserDTO): ValidationResult {
    const errors: ValidationError[] = [];

    if (!this.isValidEmail(user.email)) {
      errors.push(new ValidationError('email', 'Invalid email format'));
    }

    if (!this.isStrongPassword(user.password)) {
      errors.push(new ValidationError('password', 'Password too weak'));
    }

    return errors.length > 0
      ? ValidationResult.failure(errors)
      : ValidationResult.success();
  }
}
\`\`\`

### 9. 业务逻辑复用
- 共享业务逻辑抽取
- 业务组件化策略
- 工具类和辅助函数
- 业务模板和基类

### 10. 并发处理
- 并发请求处理策略
- 资源竞争解决方案
- 分布式锁（如需要）
- 幂等性设计
- 重试机制

### 11. 异步处理
- 异步任务识别
- 消息队列集成（如 RabbitMQ, Kafka, Redis）
- 后台作业处理
- 任务调度（Cron jobs）
- 异步结果通知

示例：

\`\`\`typescript
class EmailService {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // 将邮件发送任务加入队列，异步处理
    await this.messageQueue.publish('email.send', {
      to,
      subject,
      body,
      timestamp: new Date()
    });
  }
}
\`\`\`

### 12. 缓存策略
- 缓存层设计
- 缓存键策略
- 缓存过期策略
- 缓存更新策略（Write-through, Write-behind, Write-around）
- 缓存失效处理
- 分布式缓存（Redis, Memcached）

### 13. 第三方服务集成
- 外部 API 调用封装
- 服务降级策略
- 熔断器模式（Circuit Breaker）
- 重试策略
- 超时处理
- API 客户端配置

\`\`\`typescript
class PaymentGatewayService {
  private circuitBreaker: CircuitBreaker;

  async processPayment(payment: Payment): Promise<PaymentResult> {
    return this.circuitBreaker.execute(async () => {
      const result = await this.paymentAPI.charge(payment);
      return this.mapToPaymentResult(result);
    });
  }
}
\`\`\`

### 14. 事件驱动架构（如适用）
- 事件定义
- 事件发布机制
- 事件订阅和处理
- 事件溯源（Event Sourcing）
- CQRS 实现

### 15. 业务监控和日志
- 业务指标定义
- 关键业务流程日志
- 性能监控点
- 审计日志
- 错误追踪

### 16. 安全考虑
- 输入过滤和清理
- 业务逻辑层面的权限检查
- 敏感数据处理
- 防止业务逻辑漏洞（如越权访问）
- 速率限制

### 17. 测试策略
- 单元测试覆盖范围
- 业务逻辑测试用例
- Mock 和 Stub 策略
- 集成测试设计
- 测试数据管理

\`\`\`typescript
describe('UserService', () => {
  let userService: UserService;
  let userRepository: MockUserRepository;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    userService = new UserService(userRepository);
  });

  it('should create user successfully', async () => {
    const userData = { email: 'test@example.com', password: 'password123' };
    const user = await userService.createUser(userData);

    expect(user.email).toBe(userData.email);
    expect(userRepository.save).toHaveBeenCalledWith(expect.any(User));
  });

  it('should throw error when email already exists', async () => {
    userRepository.findByEmail.mockResolvedValue(existingUser);

    await expect(userService.createUser(userData))
      .rejects.toThrow(UserAlreadyExistsError);
  });
});
\`\`\`

### 18. 性能优化
- 数据库查询优化
- N+1 查询问题解决
- 批量操作优化
- 懒加载策略
- 数据预加载

### 19. 错误处理和恢复
- 自定义异常层次结构
- 错误分类和处理
- 错误日志记录
- 错误恢复机制
- 用户友好错误消息

\`\`\`typescript
// 自定义异常
class BusinessError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number
  ) {
    super(message);
  }
}

class UserNotFoundError extends BusinessError {
  constructor(userId: string) {
    super(\`User not found: \${userId}\`, 'USER_NOT_FOUND', 404);
  }
}
\`\`\`

## 输出格式要求

请使用 Markdown 格式，包含必要的图表和代码示例。确保：

1. 使用清晰的标题层级（##, ###）
2. 包含 TypeScript/JavaScript 代码示例
3. 使用 Mermaid 图表展示流程和架构
4. 提供完整的接口和类定义
5. 为每个服务提供清晰的职责说明
6. 交叉引用相关模块（如果有）
7. 包含实际业务场景的示例

## 架构图示例

\`\`\`mermaid
graph TB
    Controller[Controller Layer] --> Service[Service Layer]
    Service --> Repository[Repository Layer]
    Service --> DomainService[Domain Services]
    Service --> ExternalService[External Services]
    Repository --> Database[(Database)]
    ExternalService --> ThirdPartyAPI[Third Party APIs]
\`\`\`

## 输出位置

请将生成的设计文档保存到：
\`.claude/specs/{{specName}}/design-server-logic.md\`
`;

export default {
  frontmatter,
  content
};
