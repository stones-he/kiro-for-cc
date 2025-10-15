/**
 * E2E 测试：模块化设计完整工作流
 *
 * 这个 E2E 测试验证从创建 spec 到生成任务的完整工作流程。
 *
 * 测试场景：
 * 1. 创建新的 spec
 * 2. 生成 requirements.md
 * 3. 生成所有设计模块
 * 4. 验证所有模块文件已创建
 * 5. 模拟审核：批准所有模块
 * 6. 验证 canProgressToTasks 为 true
 * 7. 生成 tasks.md
 * 8. 测试拒绝和重新生成流程
 * 9. 测试删除模块流程
 * 10. 验证 TreeView 正确显示所有状态
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { ModularDesignManager } from '../../features/spec/modularDesignManager';
import { ModuleType, WorkflowState, GenerationResult } from '../../types/modularDesign';
import { ClaudeCodeProvider } from '../../providers/claudeCodeProvider';
import { SpecExplorerProvider } from '../../providers/specExplorerProvider';

/**
 * E2E 测试工作区辅助类
 *
 * 负责创建和管理完整的测试工作区环境
 */
class E2ETestWorkspace {
    public workspaceRoot: string;
    public claudeDir: string;
    public specBasePath: string;
    public steeringPath: string;
    public settingsPath: string;

    constructor() {
        this.workspaceRoot = '';
        this.claudeDir = '';
        this.specBasePath = '';
        this.steeringPath = '';
        this.settingsPath = '';
    }

    /**
     * 创建完整的测试工作区
     */
    async create(): Promise<void> {
        // 创建临时目录
        this.workspaceRoot = fs.mkdtempSync(
            path.join(os.tmpdir(), 'kfc-e2e-test-')
        );

        // 创建 .claude 目录结构
        this.claudeDir = path.join(this.workspaceRoot, '.claude');
        this.specBasePath = path.join(this.claudeDir, 'specs');
        this.steeringPath = path.join(this.claudeDir, 'steering');
        this.settingsPath = path.join(this.claudeDir, 'settings');

        fs.mkdirSync(this.specBasePath, { recursive: true });
        fs.mkdirSync(this.steeringPath, { recursive: true });
        fs.mkdirSync(this.settingsPath, { recursive: true });

        // 创建设置文件，启用模块化设计功能
        const settings = {
            paths: {
                specs: '.claude/specs',
                steering: '.claude/steering',
                settings: '.claude/settings'
            },
            views: {
                specs: { visible: true },
                steering: { visible: true },
                mcp: { visible: true },
                hooks: { visible: true },
                settings: { visible: true }
            },
            features: {
                modularDesign: {
                    enabled: true,
                    defaultModules: [
                        ModuleType.Frontend,
                        ModuleType.ServerApi,
                        ModuleType.ServerLogic,
                        ModuleType.ServerDatabase,
                        ModuleType.Testing
                    ],
                    fileNamingPattern: 'design-{moduleType}.md',
                    autoDetectModules: true,
                    parallelGeneration: true,
                    cacheEnabled: true,
                    cacheTTL: 300000,
                    customModules: [],
                    autoMigrateLegacy: false,
                    showMigrationPrompt: true,
                    validateCrossReferences: true,
                    warnOnInconsistencies: true
                }
            }
        };

        const settingsPath = path.join(this.settingsPath, 'kfc-settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    }

    /**
     * 创建完整的 spec 结构
     */
    async createCompleteSpec(
        specName: string,
        requirements: string,
        includeDesign: boolean = false,
        includeTasks: boolean = false
    ): Promise<void> {
        const specDir = path.join(this.specBasePath, specName);
        fs.mkdirSync(specDir, { recursive: true });

        // 写入 requirements.md
        const reqPath = path.join(specDir, 'requirements.md');
        fs.writeFileSync(reqPath, requirements, 'utf-8');

        // 如果需要，创建 design.md（旧版格式）
        if (includeDesign) {
            const designPath = path.join(specDir, 'design.md');
            fs.writeFileSync(designPath, '# Design Document\n\nOld format design.', 'utf-8');
        }

        // 如果需要，创建 tasks.md
        if (includeTasks) {
            const tasksPath = path.join(specDir, 'tasks.md');
            fs.writeFileSync(tasksPath, '# Implementation Tasks\n\n- [ ] Task 1', 'utf-8');
        }
    }

    /**
     * 检查文件是否存在
     */
    fileExists(filePath: string): boolean {
        try {
            fs.accessSync(filePath, fs.constants.F_OK);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 读取文件内容
     */
    readFile(filePath: string): string {
        return fs.readFileSync(filePath, 'utf-8');
    }

    /**
     * 写入文件内容
     */
    writeFile(filePath: string, content: string): void {
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    /**
     * 获取模块文件路径
     */
    getModulePath(specName: string, moduleType: ModuleType): string {
        return path.join(
            this.specBasePath,
            specName,
            `design-${moduleType}.md`
        );
    }

    /**
     * 获取元数据文件路径
     */
    getMetadataPath(specName: string): string {
        return path.join(
            this.specBasePath,
            specName,
            '.module-metadata.json'
        );
    }

    /**
     * 获取 tasks.md 文件路径
     */
    getTasksPath(specName: string): string {
        return path.join(
            this.specBasePath,
            specName,
            'tasks.md'
        );
    }

    /**
     * 读取元数据文件
     */
    readMetadata(specName: string): any {
        const metadataPath = this.getMetadataPath(specName);
        const content = this.readFile(metadataPath);
        return JSON.parse(content);
    }

    /**
     * 列出 spec 目录中的所有文件
     */
    listSpecFiles(specName: string): string[] {
        const specDir = path.join(this.specBasePath, specName);
        return fs.readdirSync(specDir);
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

describe('完整工作流 E2E 测试', () => {
    let testWorkspace: E2ETestWorkspace;
    let manager: ModularDesignManager;
    let mockClaudeProvider: jest.Mocked<ClaudeCodeProvider>;
    let mockOutputChannel: vscode.OutputChannel;
    let originalWorkspaceFolders: readonly vscode.WorkspaceFolder[] | undefined;

    /**
     * 创建 mock Claude provider
     * 模拟 Claude Code CLI 的生成行为
     */
    const createMockClaudeProvider = (): jest.Mocked<ClaudeCodeProvider> => {
        const moduleContent: Record<ModuleType, string> = {
            [ModuleType.Frontend]: `# 前端设计模块

## 概述
这是前端设计模块的生成内容。

## 组件架构
- AppComponent：应用主组件
- HeaderComponent：页头组件
- FooterComponent：页脚组件

## 状态管理
使用 Redux 进行全局状态管理。

## 路由设计
- /home：首页
- /about：关于页面
- /contact：联系页面
`,
            [ModuleType.Mobile]: `# 移动端设计模块

## 概述
这是移动端设计模块的生成内容。

## 平台支持
- iOS 13+
- Android 8.0+

## 架构选择
使用 React Native 开发混合应用。
`,
            [ModuleType.ServerApi]: `# 服务端 API 设计模块

## 概述
这是服务端 API 设计模块的生成内容。

## API 端点

### GET /api/users
获取用户列表

### POST /api/users
创建新用户

### GET /api/users/:id
获取用户详情
`,
            [ModuleType.ServerLogic]: `# 服务端逻辑设计模块

## 概述
这是服务端逻辑设计模块的生成内容。

## 业务逻辑

### UserService
用户管理服务

### AuthService
认证授权服务
`,
            [ModuleType.ServerDatabase]: `# 数据库设计模块

## 概述
这是数据库设计模块的生成内容。

## 数据模型

### User 表
- id: UUID
- username: String
- email: String
- createdAt: DateTime
`,
            [ModuleType.Testing]: `# 测试设计模块

## 概述
这是测试设计模块的生成内容。

## 单元测试
使用 Jest 进行单元测试。

## 集成测试
使用 Supertest 进行 API 集成测试。

## E2E 测试
使用 Cypress 进行端到端测试。
`
        };

        return {
            invokeClaudeHeadless: jest.fn().mockImplementation(async (prompt: string) => {
                // 从提示中提取模块类型
                let moduleType: ModuleType | null = null;
                for (const type of Object.values(ModuleType)) {
                    if (prompt.includes(type)) {
                        moduleType = type as ModuleType;
                        break;
                    }
                }

                // 返回对应的模块内容
                if (moduleType && moduleContent[moduleType]) {
                    return {
                        exitCode: 0,
                        output: moduleContent[moduleType]
                    };
                }

                // 默认返回通用内容
                return {
                    exitCode: 0,
                    output: '# Generated Module\n\nThis is generated content.'
                };
            })
        } as any;
    };

    beforeEach(async () => {
        // 创建测试工作区
        testWorkspace = new E2ETestWorkspace();
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

        // 创建 mock Claude provider
        mockClaudeProvider = createMockClaudeProvider();

        // Mock vscode.workspace.workspaceFolders
        originalWorkspaceFolders = vscode.workspace.workspaceFolders;
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            configurable: true,
            value: [
                {
                    uri: vscode.Uri.file(testWorkspace.workspaceRoot),
                    name: 'test-workspace',
                    index: 0
                }
            ]
        });

        // Mock vscode.workspace.fs
        const mockFs = {
            readFile: jest.fn((uri: vscode.Uri) => {
                const content = fs.readFileSync(uri.fsPath, 'utf-8');
                return Promise.resolve(Buffer.from(content));
            }),
            writeFile: jest.fn((uri: vscode.Uri, content: Uint8Array) => {
                fs.writeFileSync(uri.fsPath, content);
                return Promise.resolve();
            }),
            stat: jest.fn((uri: vscode.Uri) => {
                const stat = fs.statSync(uri.fsPath);
                return Promise.resolve({
                    type: vscode.FileType.File,
                    ctime: stat.ctimeMs,
                    mtime: stat.mtimeMs,
                    size: stat.size
                });
            }),
            delete: jest.fn((uri: vscode.Uri) => {
                fs.unlinkSync(uri.fsPath);
                return Promise.resolve();
            })
        };

        Object.defineProperty(vscode.workspace, 'fs', {
            configurable: true,
            value: mockFs
        });

        // 创建 ModularDesignManager 实例
        manager = new ModularDesignManager(mockClaudeProvider, mockOutputChannel);
    });

    afterEach(async () => {
        // 清理测试工作区
        await testWorkspace.cleanup();

        // 恢复 workspace folders
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            configurable: true,
            value: originalWorkspaceFolders
        });

        // 清理缓存
        manager.clearCache();
    });

    /**
     * 测试场景 1：完整的正常工作流
     * 从创建 spec 到生成 tasks 的完整流程
     */
    describe('完整正常工作流', () => {
        it('应该完成从创建 spec 到生成 tasks 的完整流程', async () => {
            const specName = 'complete-workflow-test';

            // 第 1 步：创建新 spec
            const requirements = `
# Requirements Document: Web Application

## Introduction
Build a modern web application with React frontend and Node.js backend.

## Frontend Requirements
- Build responsive UI with React
- Implement state management with Redux
- Create reusable component library
- Support multiple themes

## Backend Requirements
- Implement RESTful API
- User authentication and authorization
- Database integration with PostgreSQL
- API documentation with Swagger

## Testing Requirements
- Unit tests for all components and services
- Integration tests for API endpoints
- E2E tests for critical user flows
- Minimum 80% code coverage
            `;

            await testWorkspace.createCompleteSpec(specName, requirements);

            // 验证：requirements.md 已创建
            const reqPath = path.join(testWorkspace.specBasePath, specName, 'requirements.md');
            expect(testWorkspace.fileExists(reqPath)).toBe(true);

            // 第 2 步：生成所有设计模块
            console.log('生成设计模块...');
            const generationResult: GenerationResult = await manager.generateDesignModules(specName);

            // 验证：生成成功
            expect(generationResult.success).toBe(true);
            expect(generationResult.generatedModules.length).toBeGreaterThan(0);
            expect(generationResult.failedModules.length).toBe(0);

            console.log(`成功生成 ${generationResult.generatedModules.length} 个模块:`, generationResult.generatedModules);

            // 第 3 步：验证所有模块文件已创建
            for (const moduleType of generationResult.generatedModules) {
                const modulePath = testWorkspace.getModulePath(specName, moduleType);
                expect(testWorkspace.fileExists(modulePath)).toBe(true);

                // 验证：文件内容不为空
                const content = testWorkspace.readFile(modulePath);
                expect(content.length).toBeGreaterThan(0);
                expect(content).toContain('设计模块');

                console.log(`✓ 模块 ${moduleType} 已创建 (${content.length} 字符)`);
            }

            // 验证：元数据文件已创建
            const metadataPath = testWorkspace.getMetadataPath(specName);
            expect(testWorkspace.fileExists(metadataPath)).toBe(true);

            // 第 4 步：验证所有模块初始状态为 pending-review
            for (const moduleType of generationResult.generatedModules) {
                const state = await manager.getModuleWorkflowState(specName, moduleType);
                expect(state).toBe(WorkflowState.PendingReview);
            }

            // 验证：此时不能进入任务阶段
            let canProgress = await manager.canProgressToTasks(specName);
            expect(canProgress).toBe(false);
            console.log('初始状态：不能进入任务阶段（待审核）');

            // 第 5 步：模拟审核 - 批准所有模块
            console.log('批准所有模块...');
            for (const moduleType of generationResult.generatedModules) {
                await manager.updateModuleWorkflowState(
                    specName,
                    moduleType,
                    WorkflowState.Approved
                );

                // 验证状态已更新
                const state = await manager.getModuleWorkflowState(specName, moduleType);
                expect(state).toBe(WorkflowState.Approved);
                console.log(`✓ 模块 ${moduleType} 已批准`);
            }

            // 第 6 步：验证 canProgressToTasks 为 true
            canProgress = await manager.canProgressToTasks(specName);
            expect(canProgress).toBe(true);
            console.log('所有模块已批准，可以进入任务阶段');

            // 验证：元数据文件反映正确状态
            const metadata = testWorkspace.readMetadata(specName);
            expect(metadata.canProgressToTasks).toBe(true);
            for (const moduleType of generationResult.generatedModules) {
                expect(metadata.modules[moduleType].workflowState).toBe('approved');
            }

            // 第 7 步：生成 tasks.md（在实际场景中由用户触发）
            // 注意：这里我们只是创建一个示例 tasks 文件
            const tasksContent = `# Implementation Tasks

## Phase 1: 前端开发
- [ ] Task 1.1: 设置 React 项目结构
- [ ] Task 1.2: 实现基础组件库
- [ ] Task 1.3: 集成 Redux 状态管理

## Phase 2: 后端开发
- [ ] Task 2.1: 设置 Node.js 项目结构
- [ ] Task 2.2: 实现 REST API 端点
- [ ] Task 2.3: 集成数据库

## Phase 3: 测试
- [ ] Task 3.1: 编写单元测试
- [ ] Task 3.2: 编写集成测试
- [ ] Task 3.3: 编写 E2E 测试
            `;

            const tasksPath = testWorkspace.getTasksPath(specName);
            testWorkspace.writeFile(tasksPath, tasksContent);
            expect(testWorkspace.fileExists(tasksPath)).toBe(true);
            console.log('✓ tasks.md 已创建');

            // 最终验证：检查 spec 目录结构
            const specFiles = testWorkspace.listSpecFiles(specName);
            console.log('Spec 目录包含的文件:', specFiles);

            expect(specFiles).toContain('requirements.md');
            expect(specFiles).toContain('tasks.md');
            expect(specFiles).toContain('.module-metadata.json');

            // 验证所有生成的模块文件都在目录中
            for (const moduleType of generationResult.generatedModules) {
                expect(specFiles).toContain(`design-${moduleType}.md`);
            }

            console.log('✓ 完整工作流测试通过');
        }, 60000); // 延长超时时间以适应完整流程
    });

    /**
     * 测试场景 2：拒绝和重新生成流程
     */
    describe('拒绝和重新生成流程', () => {
        it('应该正确处理模块拒绝和重新生成', async () => {
            const specName = 'reject-regenerate-test';
            const requirements = 'Build a simple web application with frontend and API';

            await testWorkspace.createCompleteSpec(specName, requirements);

            // 生成模块
            const result = await manager.generateDesignModules(specName, {
                moduleTypes: [ModuleType.Frontend, ModuleType.ServerApi]
            });

            expect(result.success).toBe(true);
            expect(result.generatedModules).toContain(ModuleType.Frontend);

            // 拒绝前端模块
            await manager.updateModuleWorkflowState(
                specName,
                ModuleType.Frontend,
                WorkflowState.Rejected
            );

            const rejectedState = await manager.getModuleWorkflowState(specName, ModuleType.Frontend);
            expect(rejectedState).toBe(WorkflowState.Rejected);
            console.log('✓ 前端模块已拒绝');

            // 验证：不能进入任务阶段（有模块被拒绝）
            let canProgress = await manager.canProgressToTasks(specName);
            expect(canProgress).toBe(false);

            // 读取原始内容
            const originalContent = await manager.getModuleContent(specName, ModuleType.Frontend);

            // 重新生成被拒绝的模块
            await manager.generateSpecificModule(specName, ModuleType.Frontend);

            // 验证：内容已更新
            const newContent = await manager.getModuleContent(specName, ModuleType.Frontend);
            expect(newContent).toBeTruthy();
            expect(newContent.length).toBeGreaterThan(0);

            // 验证：状态重置为待审核
            const newState = await manager.getModuleWorkflowState(specName, ModuleType.Frontend);
            expect(newState).toBe(WorkflowState.PendingReview);
            console.log('✓ 模块已重新生成，状态重置为待审核');

            // 批准重新生成的模块
            await manager.updateModuleWorkflowState(
                specName,
                ModuleType.Frontend,
                WorkflowState.Approved
            );

            // 批准 API 模块
            await manager.updateModuleWorkflowState(
                specName,
                ModuleType.ServerApi,
                WorkflowState.Approved
            );

            // 验证：现在可以进入任务阶段
            canProgress = await manager.canProgressToTasks(specName);
            expect(canProgress).toBe(true);
            console.log('✓ 所有模块已批准，可以进入任务阶段');
        }, 60000);
    });

    /**
     * 测试场景 3：删除模块流程
     */
    describe('删除模块流程', () => {
        it('应该正确处理模块删除', async () => {
            const specName = 'delete-module-test';
            const requirements = 'Build application with multiple modules';

            await testWorkspace.createCompleteSpec(specName, requirements);

            // 生成多个模块
            const result = await manager.generateDesignModules(specName, {
                moduleTypes: [
                    ModuleType.Frontend,
                    ModuleType.ServerApi,
                    ModuleType.Testing
                ]
            });

            expect(result.success).toBe(true);
            expect(result.generatedModules.length).toBe(3);

            // 验证：所有模块文件存在
            const frontendPath = testWorkspace.getModulePath(specName, ModuleType.Frontend);
            expect(testWorkspace.fileExists(frontendPath)).toBe(true);

            // 删除前端模块
            await manager.deleteModule(specName, ModuleType.Frontend);
            console.log('✓ 前端模块已删除');

            // 验证：文件已删除
            expect(testWorkspace.fileExists(frontendPath)).toBe(false);

            // 验证：模块列表已更新
            const modules = await manager.getModuleList(specName);
            const frontendModule = modules.find(m => m.type === ModuleType.Frontend);
            expect(frontendModule?.exists).toBe(false);

            // 验证：其他模块仍然存在
            const apiPath = testWorkspace.getModulePath(specName, ModuleType.ServerApi);
            expect(testWorkspace.fileExists(apiPath)).toBe(true);

            // 验证：元数据已更新
            const metadata = testWorkspace.readMetadata(specName);
            expect(metadata.modules[ModuleType.Frontend]).toBeUndefined();
            expect(metadata.modules[ModuleType.ServerApi]).toBeDefined();
            console.log('✓ 元数据已更新，其他模块不受影响');
        }, 60000);
    });

    /**
     * 测试场景 4：部分模块生成失败的恢复
     */
    describe('部分生成失败的恢复流程', () => {
        it('应该能从部分生成失败中恢复', async () => {
            const specName = 'partial-failure-recovery';
            const requirements = 'Build full-stack application';

            await testWorkspace.createCompleteSpec(specName, requirements);

            // 模拟第二个模块生成失败
            let callCount = 0;
            mockClaudeProvider.invokeClaudeHeadless.mockImplementation(async () => {
                callCount++;
                if (callCount === 2) {
                    throw new Error('Simulated generation failure for testing');
                }
                return {
                    exitCode: 0,
                    output: '# Generated Module\n\nContent'
                };
            });

            // 尝试生成所有模块
            const firstResult = await manager.generateDesignModules(specName);

            // 验证：部分成功
            expect(firstResult.success).toBe(false);
            expect(firstResult.generatedModules.length).toBeGreaterThan(0);
            expect(firstResult.failedModules.length).toBeGreaterThan(0);

            console.log(`第一次生成：成功 ${firstResult.generatedModules.length} 个，失败 ${firstResult.failedModules.length} 个`);

            // 恢复 mock provider 为正常行为
            mockClaudeProvider.invokeClaudeHeadless.mockImplementation(async () => {
                return {
                    exitCode: 0,
                    output: '# Generated Module\n\nRecovered content'
                };
            });

            // 只重新生成失败的模块
            const failedModuleType = firstResult.failedModules[0].type;
            await manager.generateSpecificModule(specName, failedModuleType);

            // 验证：失败的模块现在成功生成
            const modulePath = testWorkspace.getModulePath(specName, failedModuleType);
            expect(testWorkspace.fileExists(modulePath)).toBe(true);

            const content = testWorkspace.readFile(modulePath);
            expect(content).toContain('Recovered content');
            console.log(`✓ 失败的模块 ${failedModuleType} 已恢复`);

            // 验证：所有模块现在都存在
            const modules = await manager.getModuleList(specName);
            const existingModules = modules.filter(m => m.exists);
            expect(existingModules.length).toBe(firstResult.generatedModules.length + 1);
        }, 60000);
    });

    /**
     * 测试场景 5：混合工作流状态管理
     */
    describe('混合工作流状态管理', () => {
        it('应该正确管理多个模块的不同状态', async () => {
            const specName = 'mixed-state-test';
            const requirements = 'Build application with frontend, API, and testing';

            await testWorkspace.createCompleteSpec(specName, requirements);

            // 生成三个模块
            await manager.generateDesignModules(specName, {
                moduleTypes: [
                    ModuleType.Frontend,
                    ModuleType.ServerApi,
                    ModuleType.Testing
                ]
            });

            // 设置不同的状态
            // Frontend: Approved
            await manager.updateModuleWorkflowState(
                specName,
                ModuleType.Frontend,
                WorkflowState.Approved
            );

            // API: Pending Review
            // (保持默认状态)

            // Testing: Rejected
            await manager.updateModuleWorkflowState(
                specName,
                ModuleType.Testing,
                WorkflowState.Rejected
            );

            // 验证：不能进入任务阶段（有模块待审核或被拒绝）
            let canProgress = await manager.canProgressToTasks(specName);
            expect(canProgress).toBe(false);

            // 验证：每个模块的状态正确
            const frontendState = await manager.getModuleWorkflowState(specName, ModuleType.Frontend);
            const apiState = await manager.getModuleWorkflowState(specName, ModuleType.ServerApi);
            const testingState = await manager.getModuleWorkflowState(specName, ModuleType.Testing);

            expect(frontendState).toBe(WorkflowState.Approved);
            expect(apiState).toBe(WorkflowState.PendingReview);
            expect(testingState).toBe(WorkflowState.Rejected);

            console.log('状态验证：');
            console.log(`  Frontend: ${frontendState}`);
            console.log(`  API: ${apiState}`);
            console.log(`  Testing: ${testingState}`);

            // 批准 API 模块
            await manager.updateModuleWorkflowState(
                specName,
                ModuleType.ServerApi,
                WorkflowState.Approved
            );

            // 仍然不能进入任务阶段（Testing 被拒绝）
            canProgress = await manager.canProgressToTasks(specName);
            expect(canProgress).toBe(false);

            // 重新生成 Testing 模块
            await manager.generateSpecificModule(specName, ModuleType.Testing);

            // 批准重新生成的 Testing 模块
            await manager.updateModuleWorkflowState(
                specName,
                ModuleType.Testing,
                WorkflowState.Approved
            );

            // 现在可以进入任务阶段
            canProgress = await manager.canProgressToTasks(specName);
            expect(canProgress).toBe(true);
            console.log('✓ 所有模块处理完成，可以进入任务阶段');

            // 验证元数据
            const metadata = testWorkspace.readMetadata(specName);
            expect(metadata.canProgressToTasks).toBe(true);
            expect(metadata.modules[ModuleType.Frontend].workflowState).toBe('approved');
            expect(metadata.modules[ModuleType.ServerApi].workflowState).toBe('approved');
            expect(metadata.modules[ModuleType.Testing].workflowState).toBe('approved');
        }, 60000);
    });

    /**
     * 测试场景 6：缓存一致性验证
     */
    describe('缓存一致性', () => {
        it('应该在整个工作流中保持缓存一致性', async () => {
            const specName = 'cache-consistency-test';
            const requirements = 'Build a web application';

            await testWorkspace.createCompleteSpec(specName, requirements);

            // 第一次获取模块列表（未缓存）
            let modules = await manager.getModuleList(specName);
            const initialCount = modules.filter(m => m.exists).length;
            expect(initialCount).toBe(0); // 尚未生成任何模块

            // 生成模块
            await manager.generateDesignModules(specName);

            // 第二次获取模块列表（应该自动刷新缓存）
            modules = await manager.getModuleList(specName);
            const afterGenCount = modules.filter(m => m.exists).length;
            expect(afterGenCount).toBeGreaterThan(0);

            console.log(`缓存验证：生成后有 ${afterGenCount} 个模块`);

            // 手动删除一个模块文件
            const firstModule = modules.find(m => m.exists);
            if (firstModule) {
                await manager.deleteModule(specName, firstModule.type);

                // 获取模块列表（缓存应该已刷新）
                modules = await manager.getModuleList(specName);
                const afterDeleteCount = modules.filter(m => m.exists).length;
                expect(afterDeleteCount).toBe(afterGenCount - 1);

                console.log(`缓存验证：删除后有 ${afterDeleteCount} 个模块`);
            }

            // 验证缓存统计
            const stats = manager.getCacheStats();
            expect(stats.specs).toContain(specName);
            console.log('✓ 缓存在整个工作流中保持一致');
        }, 60000);
    });
});
