/**
 * E2E 测试：交叉引用分析
 *
 * 测试完整的交叉引用分析工作流程，包括：
 * - 创建包含模块间引用的测试设计文件
 * - 前端模块引用 API 端点
 * - API 模块定义端点
 * - 数据库模块定义模型
 * - 触发交叉引用分析
 * - 验证引用正确识别
 * - 模拟不一致性场景（API 未定义但前端引用）
 * - 验证诊断信息正确生成
 *
 * 该测试覆盖了需求8（跨模块引用和一致性）的核心功能。
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { CrossReferenceAnalyzer } from '../../src/features/spec/crossReferenceAnalyzer';
import { ModuleType, Inconsistency, Reference, ReferenceMap } from '../../src/types/modularDesign';

/**
 * 测试工作区辅助类
 *
 * 负责创建和管理包含设计模块的测试环境
 */
class CrossReferenceTestWorkspace {
    public workspaceRoot: string;
    public specBasePath: string;
    public specName: string;

    constructor() {
        this.workspaceRoot = '';
        this.specBasePath = '';
        this.specName = 'cross-ref-test';
    }

    /**
     * 创建测试工作区
     */
    async create(): Promise<void> {
        // 创建临时目录
        this.workspaceRoot = fs.mkdtempSync(
            path.join(os.tmpdir(), 'kfc-crossref-test-')
        );

        // 创建 .claude/specs 目录结构
        this.specBasePath = path.join(this.workspaceRoot, '.claude', 'specs', this.specName);
        fs.mkdirSync(this.specBasePath, { recursive: true });
    }

    /**
     * 创建前端设计模块（包含 API 引用）
     */
    async createFrontendModule(content: string): Promise<void> {
        const filePath = path.join(this.specBasePath, 'design-frontend.md');
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    /**
     * 创建 API 设计模块
     */
    async createApiModule(content: string): Promise<void> {
        const filePath = path.join(this.specBasePath, 'design-server-api.md');
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    /**
     * 创建数据库设计模块
     */
    async createDatabaseModule(content: string): Promise<void> {
        const filePath = path.join(this.specBasePath, 'design-server-database.md');
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    /**
     * 创建服务端逻辑模块
     */
    async createLogicModule(content: string): Promise<void> {
        const filePath = path.join(this.specBasePath, 'design-server-logic.md');
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    /**
     * 创建移动端设计模块
     */
    async createMobileModule(content: string): Promise<void> {
        const filePath = path.join(this.specBasePath, 'design-mobile.md');
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    /**
     * 创建测试设计模块
     */
    async createTestingModule(content: string): Promise<void> {
        const filePath = path.join(this.specBasePath, 'design-testing.md');
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    /**
     * 读取模块内容
     */
    async readModule(moduleType: ModuleType): Promise<string> {
        const filePath = path.join(this.specBasePath, `design-${moduleType}.md`);
        return fs.readFileSync(filePath, 'utf-8');
    }

    /**
     * 清理测试工作区
     */
    async cleanup(): Promise<void> {
        if (this.workspaceRoot && fs.existsSync(this.workspaceRoot)) {
            fs.rmSync(this.workspaceRoot, { recursive: true, force: true });
        }
    }
}

describe('CrossReferenceAnalyzer E2E Tests', () => {
    let analyzer: CrossReferenceAnalyzer;
    let testWorkspace: CrossReferenceTestWorkspace;
    let mockOutputChannel: vscode.OutputChannel;

    beforeEach(async () => {
        // 创建测试工作区
        testWorkspace = new CrossReferenceTestWorkspace();
        await testWorkspace.create();

        // 创建 mock 输出通道
        mockOutputChannel = {
            appendLine: jest.fn(),
            append: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            name: 'Test Output',
            replace: jest.fn()
        } as any;

        // 创建分析器实例
        analyzer = new CrossReferenceAnalyzer(mockOutputChannel);
    });

    afterEach(async () => {
        // 清理测试工作区
        await testWorkspace.cleanup();
    });

    describe('完整的引用分析流程', () => {
        it('应该正确识别前端到 API 的引用', async () => {
            // 准备：创建前端模块（包含 API 调用）
            const frontendContent = `
# 前端设计

## 组件架构

### UserListComponent
用户列表组件，从 API 获取用户数据。

**API 调用：**
\`\`\`typescript
// 获取用户列表
fetch('/api/users')
    .then(response => response.json())
    .then(users => setUsers(users));

// 获取单个用户
axios.get('/api/users/123')
    .then(response => setUser(response.data));

// 创建新用户
axios.post('/api/users', newUserData)
    .then(response => console.log('User created'));
\`\`\`

### ProductComponent
产品组件

**API 调用：**
\`\`\`typescript
GET '/api/products'
POST '/api/products'
DELETE '/api/products/:id'
\`\`\`
            `;

            // 创建 API 模块（定义端点）
            const apiContent = `
# 服务端 API 设计

## 端点定义

### GET /api/users
获取用户列表

**响应示例：**
\`\`\`json
{
    "users": []
}
\`\`\`

### GET /api/users/:id
获取单个用户详情

### POST /api/users
创建新用户

### GET /api/products
获取产品列表

### POST /api/products
创建新产品

### DELETE /api/products/:id
删除产品
            `;

            await testWorkspace.createFrontendModule(frontendContent);
            await testWorkspace.createApiModule(apiContent);

            // 执行：读取模块并分析引用
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.Frontend, await testWorkspace.readModule(ModuleType.Frontend));
            modules.set(ModuleType.ServerApi, await testWorkspace.readModule(ModuleType.ServerApi));

            const referenceMap: ReferenceMap = analyzer.analyzeReferences(modules);

            // 验证：前端到 API 的引用已识别
            expect(referenceMap[ModuleType.Frontend]).toBeDefined();
            expect(referenceMap[ModuleType.Frontend][ModuleType.ServerApi]).toBeDefined();

            const apiReferences = referenceMap[ModuleType.Frontend][ModuleType.ServerApi];
            expect(apiReferences.length).toBeGreaterThan(0);

            // 验证：引用内容正确
            const apiPaths = apiReferences.map(ref => ref.referenceText);
            expect(apiPaths).toContain('/api/users');
            expect(apiPaths).toContain('/api/users/123');
            expect(apiPaths).toContain('/api/products');

            // 验证：引用类型正确
            apiReferences.forEach(ref => {
                expect(ref.referenceType).toBe('api-call');
                expect(ref.targetModule).toBe(ModuleType.ServerApi);
            });
        });

        it('应该正确识别 API 到数据库的模型引用', async () => {
            // 准备：创建 API 模块（引用数据模型）
            const apiContent = `
# 服务端 API 设计

## 数据模型

### 用户端点
使用以下数据模型：
- Model: User
- Model: UserProfile
- Schema: UserSchema

### 产品端点
使用以下数据模型：
- Model: Product
- Entity: Category
            `;

            // 创建数据库模块（定义模型）
            const databaseContent = `
# 数据库设计

## 数据模型

### User Model
用户模型

\`\`\`typescript
class User {
    id: string;
    name: string;
    email: string;
}
\`\`\`

### UserProfile Model
用户配置文件模型

### Product Model
产品模型

### Category Entity
分类实体
            `;

            await testWorkspace.createApiModule(apiContent);
            await testWorkspace.createDatabaseModule(databaseContent);

            // 执行：分析引用
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.ServerApi, await testWorkspace.readModule(ModuleType.ServerApi));
            modules.set(ModuleType.ServerDatabase, await testWorkspace.readModule(ModuleType.ServerDatabase));

            const referenceMap = analyzer.analyzeReferences(modules);

            // 验证：API 到数据库的引用已识别
            expect(referenceMap[ModuleType.ServerApi]).toBeDefined();
            expect(referenceMap[ModuleType.ServerApi][ModuleType.ServerDatabase]).toBeDefined();

            const modelReferences = referenceMap[ModuleType.ServerApi][ModuleType.ServerDatabase];
            expect(modelReferences.length).toBeGreaterThan(0);

            // 验证：模型名称正确识别
            const modelNames = modelReferences.map(ref => ref.referenceText);
            expect(modelNames).toContain('User');
            expect(modelNames).toContain('UserProfile');
            expect(modelNames).toContain('Product');
            expect(modelNames).toContain('Category');

            // 验证：引用类型正确
            modelReferences.forEach(ref => {
                expect(ref.referenceType).toBe('data-model');
                expect(ref.targetModule).toBe(ModuleType.ServerDatabase);
            });
        });

        it('应该正确识别 API 到逻辑层的服务引用', async () => {
            // 准备：创建 API 模块（引用服务）
            const apiContent = `
# 服务端 API 设计

## 业务逻辑

### 用户管理端点
调用以下服务：
- Service: UserService
- BusinessLogic: AuthenticationLogic
- Service: EmailService

### 产品管理端点
调用以下服务：
- Service: ProductService
- BusinessLogic: InventoryManagement
            `;

            // 创建逻辑模块（定义服务）
            const logicContent = `
# 服务端逻辑设计

## 服务层

### UserService
用户管理服务

\`\`\`typescript
class UserService {
    createUser() {}
    getUser() {}
}
\`\`\`

### AuthenticationLogic
认证业务逻辑

### EmailService
邮件服务

### ProductService
产品服务

### InventoryManagement
库存管理业务逻辑
            `;

            await testWorkspace.createApiModule(apiContent);
            await testWorkspace.createLogicModule(logicContent);

            // 执行：分析引用
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.ServerApi, await testWorkspace.readModule(ModuleType.ServerApi));
            modules.set(ModuleType.ServerLogic, await testWorkspace.readModule(ModuleType.ServerLogic));

            const referenceMap = analyzer.analyzeReferences(modules);

            // 验证：API 到逻辑层的引用已识别
            expect(referenceMap[ModuleType.ServerApi]).toBeDefined();
            expect(referenceMap[ModuleType.ServerApi][ModuleType.ServerLogic]).toBeDefined();

            const serviceReferences = referenceMap[ModuleType.ServerApi][ModuleType.ServerLogic];
            expect(serviceReferences.length).toBeGreaterThan(0);

            // 验证：服务名称正确识别
            const serviceNames = serviceReferences.map(ref => ref.referenceText);
            expect(serviceNames).toContain('UserService');
            expect(serviceNames).toContain('AuthenticationLogic');
            expect(serviceNames).toContain('EmailService');
            expect(serviceNames).toContain('ProductService');
            expect(serviceNames).toContain('InventoryManagement');

            // 验证：引用类型正确
            serviceReferences.forEach(ref => {
                expect(ref.referenceType).toBe('service');
                expect(ref.targetModule).toBe(ModuleType.ServerLogic);
            });
        });

        it('应该正确识别移动端到 API 的引用', async () => {
            // 准备：创建移动端模块
            const mobileContent = `
# 移动端设计

## API 集成

### 用户功能
\`\`\`swift
// iOS 代码
let url = URL(string: "/api/users")!
URLSession.shared.dataTask(with: url)
\`\`\`

\`\`\`kotlin
// Android 代码
retrofit.get("/api/users")
\`\`\`

### 产品功能
使用以下 API 端点：
- GET '/api/mobile/products'
- POST '/api/mobile/cart'
            `;

            // 创建 API 模块
            const apiContent = `
# 服务端 API 设计

## 移动端 API

### GET /api/users
获取用户

### GET /api/mobile/products
获取移动端产品列表

### POST /api/mobile/cart
添加到购物车
            `;

            await testWorkspace.createMobileModule(mobileContent);
            await testWorkspace.createApiModule(apiContent);

            // 执行：分析引用
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.Mobile, await testWorkspace.readModule(ModuleType.Mobile));
            modules.set(ModuleType.ServerApi, await testWorkspace.readModule(ModuleType.ServerApi));

            const referenceMap = analyzer.analyzeReferences(modules);

            // 验证：移动端到 API 的引用已识别
            expect(referenceMap[ModuleType.Mobile]).toBeDefined();
            expect(referenceMap[ModuleType.Mobile][ModuleType.ServerApi]).toBeDefined();

            const apiReferences = referenceMap[ModuleType.Mobile][ModuleType.ServerApi];
            expect(apiReferences.length).toBeGreaterThan(0);

            // 验证：API 路径正确识别
            const apiPaths = apiReferences.map(ref => ref.referenceText);
            expect(apiPaths).toContain('/api/users');
            expect(apiPaths).toContain('/api/mobile/products');
            expect(apiPaths).toContain('/api/mobile/cart');
        });
    });

    describe('不一致性检测', () => {
        it('应该检测到前端引用了未定义的 API 端点', async () => {
            // 准备：前端引用了 API，但 API 模块中没有定义
            const frontendContent = `
# 前端设计

## API 调用

\`\`\`typescript
// 调用不存在的 API
fetch('/api/undefined-endpoint')
axios.get('/api/missing-endpoint')
GET '/api/another-missing'
\`\`\`
            `;

            const apiContent = `
# 服务端 API 设计

## 已定义的端点

### GET /api/users
获取用户列表

### POST /api/products
创建产品

// 注意：没有定义 /api/undefined-endpoint、/api/missing-endpoint 或 /api/another-missing
            `;

            await testWorkspace.createFrontendModule(frontendContent);
            await testWorkspace.createApiModule(apiContent);

            // 执行：检测不一致性
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.Frontend, await testWorkspace.readModule(ModuleType.Frontend));
            modules.set(ModuleType.ServerApi, await testWorkspace.readModule(ModuleType.ServerApi));

            const inconsistencies: Inconsistency[] = analyzer.detectInconsistencies(modules);

            // 验证：检测到不一致性
            expect(inconsistencies.length).toBeGreaterThan(0);

            // 验证：错误涉及前端和 API 模块
            const apiInconsistencies = inconsistencies.filter(
                inc => inc.module1 === ModuleType.Frontend && inc.module2 === ModuleType.ServerApi
            );
            expect(apiInconsistencies.length).toBeGreaterThan(0);

            // 验证：错误严重级别为 error
            apiInconsistencies.forEach(inc => {
                expect(inc.severity).toBe('error');
                expect(inc.description).toContain('未定义的 API 端点');
                expect(inc.suggestion).toBeTruthy();
            });

            // 验证：具体的未定义端点被报告
            const descriptions = apiInconsistencies.map(inc => inc.description);
            expect(descriptions.some(d => d.includes('/api/undefined-endpoint'))).toBe(true);
            expect(descriptions.some(d => d.includes('/api/missing-endpoint'))).toBe(true);
            expect(descriptions.some(d => d.includes('/api/another-missing'))).toBe(true);
        });

        it('应该检测到 API 引用了未定义的数据模型', async () => {
            // 准备：API 引用了模型，但数据库模块中没有定义
            const apiContent = `
# 服务端 API 设计

## 数据模型使用

### 用户端点
使用以下模型：
- Model: User
- Model: UndefinedModel
- Schema: MissingSchema
            `;

            const databaseContent = `
# 数据库设计

## 已定义的模型

### User Model
用户模型定义

\`\`\`typescript
class User {
    id: string;
}
\`\`\`

// 注意：没有定义 UndefinedModel 或 MissingSchema
            `;

            await testWorkspace.createApiModule(apiContent);
            await testWorkspace.createDatabaseModule(databaseContent);

            // 执行：检测不一致性
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.ServerApi, await testWorkspace.readModule(ModuleType.ServerApi));
            modules.set(ModuleType.ServerDatabase, await testWorkspace.readModule(ModuleType.ServerDatabase));

            const inconsistencies = analyzer.detectInconsistencies(modules);

            // 验证：检测到数据模型不一致
            const modelInconsistencies = inconsistencies.filter(
                inc => inc.module1 === ModuleType.ServerApi && inc.module2 === ModuleType.ServerDatabase
            );
            expect(modelInconsistencies.length).toBeGreaterThan(0);

            // 验证：错误严重级别为 warning（数据模型不一致相对不那么严重）
            modelInconsistencies.forEach(inc => {
                expect(inc.severity).toBe('warning');
                expect(inc.description).toContain('未定义的数据模型');
            });

            // 验证：报告了未定义的模型
            const descriptions = modelInconsistencies.map(inc => inc.description);
            expect(descriptions.some(d => d.includes('UndefinedModel'))).toBe(true);
            expect(descriptions.some(d => d.includes('MissingSchema'))).toBe(true);

            // 验证：User 模型已定义，不应该报错
            expect(descriptions.some(d => d.includes('User'))).toBe(false);
        });

        it('应该检测到移动端引用了未定义的 API 端点', async () => {
            // 准备：移动端引用了 API，但未定义
            const mobileContent = `
# 移动端设计

## API 调用

\`\`\`swift
// 调用未定义的端点
fetch("/api/mobile/undefined")
\`\`\`
            `;

            const apiContent = `
# 服务端 API 设计

## 移动端 API

### GET /api/mobile/products
获取产品列表

// 注意：没有定义 /api/mobile/undefined
            `;

            await testWorkspace.createMobileModule(mobileContent);
            await testWorkspace.createApiModule(apiContent);

            // 执行：检测不一致性
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.Mobile, await testWorkspace.readModule(ModuleType.Mobile));
            modules.set(ModuleType.ServerApi, await testWorkspace.readModule(ModuleType.ServerApi));

            const inconsistencies = analyzer.detectInconsistencies(modules);

            // 验证：检测到移动端 API 不一致
            const mobileInconsistencies = inconsistencies.filter(
                inc => inc.module1 === ModuleType.Mobile && inc.module2 === ModuleType.ServerApi
            );
            expect(mobileInconsistencies.length).toBeGreaterThan(0);

            // 验证：错误涉及未定义的端点
            const descriptions = mobileInconsistencies.map(inc => inc.description);
            expect(descriptions.some(d => d.includes('/api/mobile/undefined'))).toBe(true);
        });

        it('应该检测到 API 引用了未定义的服务', async () => {
            // 准备：API 引用了服务，但逻辑模块中没有定义
            const apiContent = `
# 服务端 API 设计

## 业务逻辑

使用以下服务：
- Service: DefinedService
- Service: UndefinedService
- BusinessLogic: MissingLogic
            `;

            const logicContent = `
# 服务端逻辑设计

## 服务定义

### DefinedService
已定义的服务

\`\`\`typescript
class DefinedService {}
\`\`\`

// 注意：没有定义 UndefinedService 或 MissingLogic
            `;

            await testWorkspace.createApiModule(apiContent);
            await testWorkspace.createLogicModule(logicContent);

            // 执行：检测不一致性
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.ServerApi, await testWorkspace.readModule(ModuleType.ServerApi));
            modules.set(ModuleType.ServerLogic, await testWorkspace.readModule(ModuleType.ServerLogic));

            const inconsistencies = analyzer.detectInconsistencies(modules);

            // 验证：检测到服务引用不一致
            const serviceInconsistencies = inconsistencies.filter(
                inc => inc.module1 === ModuleType.ServerApi && inc.module2 === ModuleType.ServerLogic
            );
            expect(serviceInconsistencies.length).toBeGreaterThan(0);

            // 验证：报告了未定义的服务
            const descriptions = serviceInconsistencies.map(inc => inc.description);
            expect(descriptions.some(d => d.includes('UndefinedService'))).toBe(true);
            expect(descriptions.some(d => d.includes('MissingLogic'))).toBe(true);

            // 验证：DefinedService 已定义，不应该报错
            expect(descriptions.some(d => d.includes('DefinedService'))).toBe(false);
        });

        it('应该在所有模块一致时不报告错误', async () => {
            // 准备：创建一致的模块设计
            const frontendContent = `
# 前端设计

\`\`\`typescript
fetch('/api/users')
\`\`\`
            `;

            const apiContent = `
# 服务端 API 设计

### GET /api/users
获取用户列表

使用模型：
- Model: User

使用服务：
- Service: UserService
            `;

            const databaseContent = `
# 数据库设计

### User Model
用户模型
            `;

            const logicContent = `
# 服务端逻辑设计

### UserService
用户服务
            `;

            await testWorkspace.createFrontendModule(frontendContent);
            await testWorkspace.createApiModule(apiContent);
            await testWorkspace.createDatabaseModule(databaseContent);
            await testWorkspace.createLogicModule(logicContent);

            // 执行：检测不一致性
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.Frontend, await testWorkspace.readModule(ModuleType.Frontend));
            modules.set(ModuleType.ServerApi, await testWorkspace.readModule(ModuleType.ServerApi));
            modules.set(ModuleType.ServerDatabase, await testWorkspace.readModule(ModuleType.ServerDatabase));
            modules.set(ModuleType.ServerLogic, await testWorkspace.readModule(ModuleType.ServerLogic));

            const inconsistencies = analyzer.detectInconsistencies(modules);

            // 验证：没有不一致性
            expect(inconsistencies.length).toBe(0);
        });
    });

    describe('交叉链接生成', () => {
        it('应该为前端模块生成到 API 和测试的交叉链接', async () => {
            // 准备：创建相关模块
            const frontendContent = '# 前端设计';
            const apiContent = '# API 设计';
            const testingContent = '# 测试设计';

            await testWorkspace.createFrontendModule(frontendContent);
            await testWorkspace.createApiModule(apiContent);
            await testWorkspace.createTestingModule(testingContent);

            // 执行：生成交叉链接
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.Frontend, await testWorkspace.readModule(ModuleType.Frontend));
            modules.set(ModuleType.ServerApi, await testWorkspace.readModule(ModuleType.ServerApi));
            modules.set(ModuleType.Testing, await testWorkspace.readModule(ModuleType.Testing));

            const crossLinks = analyzer.generateCrossLinks(ModuleType.Frontend, modules);

            // 验证：生成了到 API 和测试的链接
            expect(crossLinks.length).toBeGreaterThanOrEqual(2);

            const targetModules = crossLinks.map(link => link.targetModule);
            expect(targetModules).toContain(ModuleType.ServerApi);
            expect(targetModules).toContain(ModuleType.Testing);

            // 验证：链接包含链接文本和原因
            crossLinks.forEach(link => {
                expect(link.linkText).toBeTruthy();
                expect(link.reason).toBeTruthy();
            });
        });

        it('应该为 API 模块生成到逻辑、数据库和测试的交叉链接', async () => {
            // 准备：创建相关模块
            await testWorkspace.createApiModule('# API 设计');
            await testWorkspace.createLogicModule('# 逻辑设计');
            await testWorkspace.createDatabaseModule('# 数据库设计');
            await testWorkspace.createTestingModule('# 测试设计');

            // 执行：生成交叉链接
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.ServerApi, await testWorkspace.readModule(ModuleType.ServerApi));
            modules.set(ModuleType.ServerLogic, await testWorkspace.readModule(ModuleType.ServerLogic));
            modules.set(ModuleType.ServerDatabase, await testWorkspace.readModule(ModuleType.ServerDatabase));
            modules.set(ModuleType.Testing, await testWorkspace.readModule(ModuleType.Testing));

            const crossLinks = analyzer.generateCrossLinks(ModuleType.ServerApi, modules);

            // 验证：生成了到逻辑、数据库和测试的链接
            expect(crossLinks.length).toBeGreaterThanOrEqual(3);

            const targetModules = crossLinks.map(link => link.targetModule);
            expect(targetModules).toContain(ModuleType.ServerLogic);
            expect(targetModules).toContain(ModuleType.ServerDatabase);
            expect(targetModules).toContain(ModuleType.Testing);
        });

        it('应该为测试模块生成到所有其他模块的交叉链接', async () => {
            // 准备：创建所有模块
            await testWorkspace.createFrontendModule('# 前端');
            await testWorkspace.createMobileModule('# 移动端');
            await testWorkspace.createApiModule('# API');
            await testWorkspace.createLogicModule('# 逻辑');
            await testWorkspace.createDatabaseModule('# 数据库');
            await testWorkspace.createTestingModule('# 测试');

            // 执行：生成交叉链接
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.Frontend, await testWorkspace.readModule(ModuleType.Frontend));
            modules.set(ModuleType.Mobile, await testWorkspace.readModule(ModuleType.Mobile));
            modules.set(ModuleType.ServerApi, await testWorkspace.readModule(ModuleType.ServerApi));
            modules.set(ModuleType.ServerLogic, await testWorkspace.readModule(ModuleType.ServerLogic));
            modules.set(ModuleType.ServerDatabase, await testWorkspace.readModule(ModuleType.ServerDatabase));
            modules.set(ModuleType.Testing, await testWorkspace.readModule(ModuleType.Testing));

            const crossLinks = analyzer.generateCrossLinks(ModuleType.Testing, modules);

            // 验证：生成了到所有其他模块的链接
            expect(crossLinks.length).toBe(5); // 除了测试模块自己

            const targetModules = crossLinks.map(link => link.targetModule);
            expect(targetModules).toContain(ModuleType.Frontend);
            expect(targetModules).toContain(ModuleType.Mobile);
            expect(targetModules).toContain(ModuleType.ServerApi);
            expect(targetModules).toContain(ModuleType.ServerLogic);
            expect(targetModules).toContain(ModuleType.ServerDatabase);
            expect(targetModules).not.toContain(ModuleType.Testing);
        });
    });

    describe('复杂场景', () => {
        it('应该处理包含多种引用类型的复杂设计', async () => {
            // 准备：创建包含多种引用的复杂设计
            const frontendContent = `
# 前端设计

## 组件

### UserComponent
使用组件：
<UserListComponent />
<UserDetailComponent />

调用 API：
\`\`\`typescript
fetch('/api/users')
axios.get('/api/users/:id')
POST '/api/users'
\`\`\`
            `;

            const apiContent = `
# API 设计

### GET /api/users
Model: User
Service: UserService

### GET /api/users/:id
Model: User
Service: UserService

### POST /api/users
Model: User
Schema: UserSchema
Service: UserService
BusinessLogic: ValidationLogic
            `;

            const databaseContent = `
# 数据库设计

### User Model
用户模型

### UserSchema
用户数据库模式
            `;

            const logicContent = `
# 逻辑设计

### UserService
用户服务

### ValidationLogic
验证业务逻辑
            `;

            await testWorkspace.createFrontendModule(frontendContent);
            await testWorkspace.createApiModule(apiContent);
            await testWorkspace.createDatabaseModule(databaseContent);
            await testWorkspace.createLogicModule(logicContent);

            // 执行：分析所有引用
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.Frontend, await testWorkspace.readModule(ModuleType.Frontend));
            modules.set(ModuleType.ServerApi, await testWorkspace.readModule(ModuleType.ServerApi));
            modules.set(ModuleType.ServerDatabase, await testWorkspace.readModule(ModuleType.ServerDatabase));
            modules.set(ModuleType.ServerLogic, await testWorkspace.readModule(ModuleType.ServerLogic));

            const referenceMap = analyzer.analyzeReferences(modules);

            // 验证：识别了前端到 API 的引用
            expect(referenceMap[ModuleType.Frontend][ModuleType.ServerApi].length).toBeGreaterThan(0);

            // 验证：识别了前端到前端的组件引用
            expect(referenceMap[ModuleType.Frontend][ModuleType.Frontend]).toBeDefined();

            // 验证：识别了 API 到数据库的引用
            expect(referenceMap[ModuleType.ServerApi][ModuleType.ServerDatabase].length).toBeGreaterThan(0);

            // 验证：识别了 API 到逻辑层的引用
            expect(referenceMap[ModuleType.ServerApi][ModuleType.ServerLogic].length).toBeGreaterThan(0);

            // 验证：检测不一致性（应该没有错误，因为所有引用都已定义）
            const inconsistencies = analyzer.detectInconsistencies(modules);
            expect(inconsistencies.length).toBe(0);
        });

        it('应该处理部分定义的场景（混合一致和不一致）', async () => {
            // 准备：创建部分一致的设计
            const frontendContent = `
# 前端设计

\`\`\`typescript
fetch('/api/users')          // 已定义
fetch('/api/products')       // 已定义
fetch('/api/missing')        // 未定义
\`\`\`
            `;

            const apiContent = `
# API 设计

### GET /api/users
用户端点

### GET /api/products
产品端点

// 注意：缺少 /api/missing
            `;

            await testWorkspace.createFrontendModule(frontendContent);
            await testWorkspace.createApiModule(apiContent);

            // 执行：检测不一致性
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.Frontend, await testWorkspace.readModule(ModuleType.Frontend));
            modules.set(ModuleType.ServerApi, await testWorkspace.readModule(ModuleType.ServerApi));

            const inconsistencies = analyzer.detectInconsistencies(modules);

            // 验证：只报告未定义的端点
            expect(inconsistencies.length).toBe(1);
            expect(inconsistencies[0].description).toContain('/api/missing');
            expect(inconsistencies[0].description).not.toContain('/api/users');
            expect(inconsistencies[0].description).not.toContain('/api/products');
        });
    });

    describe('边界情况', () => {
        it('应该处理空模块内容', async () => {
            // 准备：创建空模块
            await testWorkspace.createFrontendModule('');
            await testWorkspace.createApiModule('');

            // 执行：分析引用
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.Frontend, '');
            modules.set(ModuleType.ServerApi, '');

            const referenceMap = analyzer.analyzeReferences(modules);

            // 验证：不会崩溃，返回空引用
            expect(referenceMap).toBeDefined();
            expect(referenceMap[ModuleType.Frontend]).toBeDefined();
        });

        it('应该处理只有一个模块的情况', async () => {
            // 准备：只创建一个模块
            await testWorkspace.createFrontendModule('# 前端设计');

            // 执行：分析引用
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.Frontend, await testWorkspace.readModule(ModuleType.Frontend));

            const referenceMap = analyzer.analyzeReferences(modules);
            const inconsistencies = analyzer.detectInconsistencies(modules);

            // 验证：正常工作
            expect(referenceMap).toBeDefined();
            expect(inconsistencies).toBeDefined();
        });

        it('应该处理特殊字符和转义', async () => {
            // 准备：包含特殊字符的 API 路径
            const frontendContent = `
# 前端设计

\`\`\`typescript
fetch('/api/users?filter=active&sort=name')
fetch('/api/products/search?q=test+123')
fetch('/api/items/:id/comments')
\`\`\`
            `;

            const apiContent = `
# API 设计

### GET /api/users
支持查询参数

### GET /api/products/search
搜索端点

### GET /api/items/:id/comments
评论端点
            `;

            await testWorkspace.createFrontendModule(frontendContent);
            await testWorkspace.createApiModule(apiContent);

            // 执行：检测不一致性
            const modules = new Map<ModuleType, string>();
            modules.set(ModuleType.Frontend, await testWorkspace.readModule(ModuleType.Frontend));
            modules.set(ModuleType.ServerApi, await testWorkspace.readModule(ModuleType.ServerApi));

            const inconsistencies = analyzer.detectInconsistencies(modules);

            // 验证：正确识别端点（忽略查询参数）
            expect(inconsistencies.length).toBe(0);
        });
    });
});
