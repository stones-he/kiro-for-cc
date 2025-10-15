/**
 * 集成测试：ModularDesignManager
 *
 * 这些集成测试验证 ModularDesignManager 与其依赖组件的完整交互流程。
 *
 * 测试范围：
 * - 完整的模块生成流程
 * - 并行生成多个模块
 * - 部分失败场景的处理
 * - 缓存机制的集成
 * - 工作流状态转换
 * - 元数据持久化
 * - 旧版设计迁移
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { ModularDesignManager } from '../modularDesignManager';
import { ModuleType, WorkflowState, GenerationResult } from '../../../types/modularDesign';
import { ClaudeCodeProvider } from '../../../providers/claudeCodeProvider';

/**
 * 测试工作区辅助类
 *
 * 负责创建和清理测试所需的临时工作区
 */
class TestWorkspace {
    public workspaceRoot: string;
    public specBasePath: string;

    constructor() {
        this.workspaceRoot = '';
        this.specBasePath = '';
    }

    /**
     * 创建测试工作区
     */
    async create(): Promise<void> {
        // 创建临时目录
        this.workspaceRoot = fs.mkdtempSync(
            path.join(os.tmpdir(), 'kfc-test-')
        );

        // 创建 .claude/specs 目录结构
        this.specBasePath = path.join(this.workspaceRoot, '.claude', 'specs');
        fs.mkdirSync(this.specBasePath, { recursive: true });
    }

    /**
     * 创建测试 spec
     */
    async createSpec(specName: string, requirements: string): Promise<void> {
        const specDir = path.join(this.specBasePath, specName);
        fs.mkdirSync(specDir, { recursive: true });

        // 写入 requirements.md
        const reqPath = path.join(specDir, 'requirements.md');
        fs.writeFileSync(reqPath, requirements, 'utf-8');
    }

    /**
     * 创建旧版 spec（包含 design.md）
     */
    async createLegacySpec(specName: string, requirements: string, design: string): Promise<void> {
        await this.createSpec(specName, requirements);

        const specDir = path.join(this.specBasePath, specName);
        const designPath = path.join(specDir, 'design.md');
        fs.writeFileSync(designPath, design, 'utf-8');
    }

    /**
     * 检查文件是否存在
     */
    async fileExists(filePath: string): Promise<boolean> {
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
    async readFile(filePath: string): Promise<string> {
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
}

describe('ModularDesignManager Integration Tests', () => {
    let manager: ModularDesignManager;
    let testWorkspace: TestWorkspace;
    let mockClaudeProvider: jest.Mocked<ClaudeCodeProvider>;
    let mockOutputChannel: vscode.OutputChannel;
    let originalWorkspaceFolders: readonly vscode.WorkspaceFolder[] | undefined;

    beforeEach(async () => {
        // 创建测试工作区
        testWorkspace = new TestWorkspace();
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
        mockClaudeProvider = {
            invokeClaudeHeadless: jest.fn().mockResolvedValue({
                exitCode: 0,
                output: '# Generated Design Module\n\nThis is a generated design module.'
            })
        } as any;

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

        // Mock ConfigManager
        const mockConfigManager = {
            getInstance: jest.fn().mockReturnValue({
                getPath: jest.fn((key: string) => {
                    if (key === 'specs') {
                        return '.claude/specs';
                    }
                    return '';
                })
            })
        };

        jest.mock('../../../utils/configManager', () => mockConfigManager);

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

    describe('完整生成流程', () => {
        it('应该成功生成所有适用的模块', async () => {
            // 准备：创建测试 spec
            const specName = 'test-feature';
            const requirements = `
# Requirements Document

## User Story
As a user, I want to build a web application with REST API.

## Frontend Requirements
- Build React components
- Implement state management
- Create responsive UI

## Backend Requirements
- Implement REST API endpoints
- Design database schema
- Add authentication

## Testing Requirements
- Unit tests for all components
- Integration tests for API
- E2E tests
            `;

            await testWorkspace.createSpec(specName, requirements);

            // 执行：生成所有设计模块
            const result: GenerationResult = await manager.generateDesignModules(specName);

            // 验证：生成结果
            expect(result.success).toBe(true);
            expect(result.generatedModules.length).toBeGreaterThan(0);
            expect(result.failedModules.length).toBe(0);

            // 验证：至少生成了以下模块（基于需求内容）
            expect(result.generatedModules).toContain(ModuleType.Frontend);
            expect(result.generatedModules).toContain(ModuleType.ServerApi);
            expect(result.generatedModules).toContain(ModuleType.Testing);

            // 验证：文件已创建
            for (const moduleType of result.generatedModules) {
                const filePath = testWorkspace.getModulePath(specName, moduleType);
                const exists = await testWorkspace.fileExists(filePath);
                expect(exists).toBe(true);

                // 验证：文件内容不为空
                const content = await testWorkspace.readFile(filePath);
                expect(content.length).toBeGreaterThan(0);
            }

            // 验证：元数据文件已创建
            const metadataPath = testWorkspace.getMetadataPath(specName);
            const metadataExists = await testWorkspace.fileExists(metadataPath);
            expect(metadataExists).toBe(true);

            // 验证：模块状态为待审核
            for (const moduleType of result.generatedModules) {
                const state = await manager.getModuleWorkflowState(specName, moduleType);
                expect(state).toBe(WorkflowState.PendingReview);
            }
        }, 30000); // 延长超时时间，因为生成可能需要较长时间

        it('应该跳过已存在的模块（除非强制重新生成）', async () => {
            const specName = 'existing-feature';
            const requirements = 'Build a web application with frontend and API';

            await testWorkspace.createSpec(specName, requirements);

            // 第一次生成
            const firstResult = await manager.generateDesignModules(specName);
            expect(firstResult.success).toBe(true);
            const firstGenCount = firstResult.generatedModules.length;

            // 第二次生成（不强制）
            const secondResult = await manager.generateDesignModules(specName);
            expect(secondResult.skippedModules.length).toBe(firstGenCount);
            expect(secondResult.generatedModules.length).toBe(0);

            // 第三次生成（强制重新生成）
            const thirdResult = await manager.generateDesignModules(specName, {
                forceRegenerate: true
            });
            expect(thirdResult.generatedModules.length).toBe(firstGenCount);
            expect(thirdResult.skippedModules.length).toBe(0);
        }, 30000);

        it('应该只生成用户指定的模块类型', async () => {
            const specName = 'specific-modules';
            const requirements = 'Build a full-stack application';

            await testWorkspace.createSpec(specName, requirements);

            // 只生成前端和测试模块
            const result = await manager.generateDesignModules(specName, {
                moduleTypes: [ModuleType.Frontend, ModuleType.Testing]
            });

            expect(result.success).toBe(true);
            expect(result.generatedModules).toEqual(
                expect.arrayContaining([ModuleType.Frontend, ModuleType.Testing])
            );
            expect(result.generatedModules.length).toBe(2);

            // 验证：只有指定的模块文件被创建
            const frontendExists = await testWorkspace.fileExists(
                testWorkspace.getModulePath(specName, ModuleType.Frontend)
            );
            const testingExists = await testWorkspace.fileExists(
                testWorkspace.getModulePath(specName, ModuleType.Testing)
            );
            const apiExists = await testWorkspace.fileExists(
                testWorkspace.getModulePath(specName, ModuleType.ServerApi)
            );

            expect(frontendExists).toBe(true);
            expect(testingExists).toBe(true);
            expect(apiExists).toBe(false);
        }, 30000);
    });

    describe('并行生成', () => {
        it('应该支持并行生成多个模块', async () => {
            const specName = 'parallel-test';
            const requirements = 'Build a complete web application';

            await testWorkspace.createSpec(specName, requirements);

            // 记录开始时间
            const startTime = Date.now();

            // 并行生成
            const result = await manager.generateDesignModules(specName, {
                parallel: true
            });

            const duration = Date.now() - startTime;

            expect(result.success).toBe(true);
            expect(result.generatedModules.length).toBeGreaterThan(1);

            // 验证：并行生成应该比串行快（如果生成了多个模块）
            // 注意：这只是一个粗略的性能检查
            if (result.generatedModules.length > 1) {
                console.log(`Parallel generation took ${duration}ms for ${result.generatedModules.length} modules`);
            }
        }, 30000);

        it('应该支持串行生成多个模块', async () => {
            const specName = 'serial-test';
            const requirements = 'Build a complete web application';

            await testWorkspace.createSpec(specName, requirements);

            // 串行生成
            const result = await manager.generateDesignModules(specName, {
                parallel: false
            });

            expect(result.success).toBe(true);
            expect(result.generatedModules.length).toBeGreaterThan(1);
        }, 30000);
    });

    describe('部分失败场景', () => {
        it('应该处理部分模块生成失败的情况', async () => {
            const specName = 'partial-failure';
            const requirements = 'Build a web application';

            await testWorkspace.createSpec(specName, requirements);

            // 模拟第二次生成调用失败
            let callCount = 0;
            mockClaudeProvider.invokeClaudeHeadless.mockImplementation(async () => {
                callCount++;
                if (callCount === 2) {
                    throw new Error('Simulated generation failure');
                }
                return {
                    exitCode: 0,
                    output: '# Generated Module\n\nContent'
                };
            });

            // 执行生成
            const result = await manager.generateDesignModules(specName);

            // 验证：部分成功
            expect(result.success).toBe(false); // 因为有失败
            expect(result.generatedModules.length).toBeGreaterThan(0);
            expect(result.failedModules.length).toBeGreaterThan(0);

            // 验证：成功的模块文件已创建
            for (const moduleType of result.generatedModules) {
                const exists = await testWorkspace.fileExists(
                    testWorkspace.getModulePath(specName, moduleType)
                );
                expect(exists).toBe(true);
            }

            // 验证：失败的模块有错误信息
            expect(result.failedModules[0].error).toBeTruthy();
        }, 30000);

        it('应该在生成失败后允许重试', async () => {
            const specName = 'retry-test';
            const requirements = 'Build a simple app';

            await testWorkspace.createSpec(specName, requirements);

            // 第一次：模拟失败
            mockClaudeProvider.invokeClaudeHeadless.mockRejectedValueOnce(
                new Error('First attempt failed')
            );

            // 第一次生成（失败）
            try {
                await manager.generateDesignModules(specName);
            } catch (error) {
                // 预期失败
            }

            // 第二次：成功
            mockClaudeProvider.invokeClaudeHeadless.mockResolvedValue({
                exitCode: 0,
                output: '# Module\n\nContent'
            });

            // 第二次生成（成功）
            const result = await manager.generateDesignModules(specName, {
                forceRegenerate: true
            });

            expect(result.success).toBe(true);
            expect(result.generatedModules.length).toBeGreaterThan(0);
        }, 30000);
    });

    describe('缓存机制', () => {
        it('应该缓存模块列表信息', async () => {
            const specName = 'cache-test';
            const requirements = 'Build an application';

            await testWorkspace.createSpec(specName, requirements);
            await manager.generateDesignModules(specName);

            // 第一次获取模块列表（未缓存）
            const firstCall = await manager.getModuleList(specName);
            expect(firstCall.length).toBeGreaterThan(0);

            // 第二次获取模块列表（应该从缓存获取）
            const secondCall = await manager.getModuleList(specName);
            expect(secondCall).toEqual(firstCall);

            // 验证：缓存统计
            const stats = manager.getCacheStats();
            expect(stats.size).toBeGreaterThan(0);
            expect(stats.specs).toContain(specName);
        }, 30000);

        it('应该在生成后自动刷新缓存', async () => {
            const specName = 'cache-refresh-test';
            const requirements = 'Build an application';

            await testWorkspace.createSpec(specName, requirements);

            // 生成模块
            await manager.generateDesignModules(specName);

            // 获取模块列表（应该包含生成的模块）
            const modules = await manager.getModuleList(specName);
            expect(modules.some(m => m.exists)).toBe(true);
        }, 30000);

        it('应该支持手动清除缓存', async () => {
            const specName = 'cache-clear-test';
            const requirements = 'Build an application';

            await testWorkspace.createSpec(specName, requirements);
            await manager.generateDesignModules(specName);

            // 获取模块列表以填充缓存
            await manager.getModuleList(specName);

            // 验证缓存存在
            let stats = manager.getCacheStats();
            expect(stats.size).toBeGreaterThan(0);

            // 清除缓存
            manager.clearCache(specName);

            // 验证缓存已清除
            stats = manager.getCacheStats();
            expect(stats.specs).not.toContain(specName);
        }, 30000);
    });

    describe('工作流状态转换', () => {
        it('应该正确管理模块工作流状态', async () => {
            const specName = 'workflow-test';
            const requirements = 'Build a simple application';

            await testWorkspace.createSpec(specName, requirements);

            // 生成模块
            const result = await manager.generateDesignModules(specName, {
                moduleTypes: [ModuleType.Frontend]
            });

            expect(result.success).toBe(true);

            // 验证：初始状态为待审核
            let state = await manager.getModuleWorkflowState(specName, ModuleType.Frontend);
            expect(state).toBe(WorkflowState.PendingReview);

            // 批准模块
            await manager.updateModuleWorkflowState(
                specName,
                ModuleType.Frontend,
                WorkflowState.Approved
            );

            // 验证：状态已更新
            state = await manager.getModuleWorkflowState(specName, ModuleType.Frontend);
            expect(state).toBe(WorkflowState.Approved);

            // 拒绝模块
            await manager.updateModuleWorkflowState(
                specName,
                ModuleType.Frontend,
                WorkflowState.Rejected
            );

            // 验证：状态已更新
            state = await manager.getModuleWorkflowState(specName, ModuleType.Frontend);
            expect(state).toBe(WorkflowState.Rejected);
        }, 30000);

        it('应该正确判断是否可以进入任务阶段', async () => {
            const specName = 'progress-test';
            const requirements = 'Build application with frontend and API';

            await testWorkspace.createSpec(specName, requirements);

            // 生成两个模块
            await manager.generateDesignModules(specName, {
                moduleTypes: [ModuleType.Frontend, ModuleType.ServerApi]
            });

            // 验证：未全部批准时不能进入任务阶段
            let canProgress = await manager.canProgressToTasks(specName);
            expect(canProgress).toBe(false);

            // 批准第一个模块
            await manager.updateModuleWorkflowState(
                specName,
                ModuleType.Frontend,
                WorkflowState.Approved
            );

            // 验证：仍然不能进入（还有模块未批准）
            canProgress = await manager.canProgressToTasks(specName);
            expect(canProgress).toBe(false);

            // 批准第二个模块
            await manager.updateModuleWorkflowState(
                specName,
                ModuleType.ServerApi,
                WorkflowState.Approved
            );

            // 验证：现在可以进入任务阶段
            canProgress = await manager.canProgressToTasks(specName);
            expect(canProgress).toBe(true);
        }, 30000);
    });

    describe('模块 CRUD 操作', () => {
        it('应该能够读取模块内容', async () => {
            const specName = 'read-test';
            const requirements = 'Build an application';

            await testWorkspace.createSpec(specName, requirements);
            await manager.generateDesignModules(specName, {
                moduleTypes: [ModuleType.Frontend]
            });

            // 读取模块内容
            const content = await manager.getModuleContent(specName, ModuleType.Frontend);

            expect(content).toBeTruthy();
            expect(content.length).toBeGreaterThan(0);
        }, 30000);

        it('应该能够更新模块内容', async () => {
            const specName = 'update-test';
            const requirements = 'Build an application';

            await testWorkspace.createSpec(specName, requirements);
            await manager.generateDesignModules(specName, {
                moduleTypes: [ModuleType.Frontend]
            });

            // 更新模块内容
            const newContent = '# Updated Frontend Design\n\nThis is updated content.';
            await manager.updateModule(specName, ModuleType.Frontend, newContent);

            // 验证：内容已更新
            const content = await manager.getModuleContent(specName, ModuleType.Frontend);
            expect(content).toBe(newContent);
        }, 30000);

        it('应该能够删除模块', async () => {
            const specName = 'delete-test';
            const requirements = 'Build an application';

            await testWorkspace.createSpec(specName, requirements);
            await manager.generateDesignModules(specName, {
                moduleTypes: [ModuleType.Frontend]
            });

            // 验证：文件存在
            const beforeDelete = await testWorkspace.fileExists(
                testWorkspace.getModulePath(specName, ModuleType.Frontend)
            );
            expect(beforeDelete).toBe(true);

            // 删除模块
            await manager.deleteModule(specName, ModuleType.Frontend);

            // 验证：文件已删除
            const afterDelete = await testWorkspace.fileExists(
                testWorkspace.getModulePath(specName, ModuleType.Frontend)
            );
            expect(afterDelete).toBe(false);

            // 验证：模块列表已更新
            const modules = await manager.getModuleList(specName);
            const frontendModule = modules.find(m => m.type === ModuleType.Frontend);
            expect(frontendModule?.exists).toBe(false);
        }, 30000);
    });

    describe('旧版设计迁移', () => {
        it('应该检测旧版设计文件', async () => {
            const specName = 'legacy-spec';
            const requirements = 'Build an application';
            const design = '# Old Design\n\nThis is the old design format.';

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 检测旧版设计
            const isLegacy = await manager.isLegacyDesign(specName);
            expect(isLegacy).toBe(true);
        });

        it('应该成功迁移旧版设计到模块化结构', async () => {
            const specName = 'migration-spec';
            const requirements = 'Build an application';
            const design = `
# Design Document

## Frontend Design
Frontend components and architecture

## API Design
REST API endpoints

## Database Design
Database schema and models

## Testing Strategy
Test plans and scenarios
            `;

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 执行迁移
            const result = await manager.migrateLegacyDesign(specName);

            // 验证：迁移成功
            expect(result.success).toBe(true);
            expect(result.migratedModules.length).toBeGreaterThan(0);

            // 验证：模块文件已创建
            for (const moduleType of result.migratedModules) {
                const exists = await testWorkspace.fileExists(
                    testWorkspace.getModulePath(specName, moduleType)
                );
                expect(exists).toBe(true);
            }

            // 验证：旧文件已备份
            const backupExists = await testWorkspace.fileExists(
                path.join(testWorkspace.specBasePath, specName, 'design.md.backup')
            );
            expect(backupExists).toBe(true);
        }, 30000);
    });

    describe('错误处理', () => {
        it('应该处理缺失的需求文档', async () => {
            const specName = 'no-requirements';

            // 创建 spec 目录但不创建 requirements.md
            const specDir = path.join(testWorkspace.specBasePath, specName);
            fs.mkdirSync(specDir, { recursive: true });

            // 尝试生成模块
            await expect(
                manager.generateDesignModules(specName)
            ).rejects.toThrow();
        });

        it('应该处理无效的 spec 名称', async () => {
            // 尝试对不存在的 spec 生成模块
            await expect(
                manager.generateDesignModules('non-existent-spec')
            ).rejects.toThrow();
        });

        it('应该处理文件读取错误', async () => {
            const specName = 'read-error';
            const requirements = 'Build an application';

            await testWorkspace.createSpec(specName, requirements);

            // 尝试读取不存在的模块
            await expect(
                manager.getModuleContent(specName, ModuleType.Frontend)
            ).rejects.toThrow();
        });
    });
});
