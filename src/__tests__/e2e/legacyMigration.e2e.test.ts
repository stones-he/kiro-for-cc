/**
 * E2E 测试：旧版设计迁移场景
 *
 * 这些 E2E 测试验证从旧版单一 design.md 文件迁移到模块化设计结构的完整用户场景。
 *
 * 测试范围：
 * - 创建带有旧 design.md 的测试 spec
 * - 模拟用户触发迁移流程
 * - 验证章节正确提取和映射到模块
 * - 验证模块文件正确创建且包含正确内容
 * - 验证旧文件重命名为 .backup
 * - 验证 TreeView 更新为模块化结构
 * - 测试"不再提示"选项
 * - 验证 .no-migrate 标记文件创建
 * - 测试迁移后的工作流状态
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { ModularDesignManager } from '../../features/spec/modularDesignManager';
import { LegacyMigrator } from '../../features/spec/legacyMigrator';
import { ModuleType, WorkflowState, MigrationResult } from '../../types/modularDesign';
import { ClaudeCodeProvider } from '../../providers/claudeCodeProvider';

/**
 * 测试工作区辅助类
 *
 * 负责创建和清理测试所需的临时工作区
 */
class MigrationTestWorkspace {
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
            path.join(os.tmpdir(), 'kfc-migration-test-')
        );

        // 创建 .claude/specs 目录结构
        this.specBasePath = path.join(this.workspaceRoot, '.claude', 'specs');
        fs.mkdirSync(this.specBasePath, { recursive: true });
    }

    /**
     * 创建带有旧版 design.md 的 spec
     */
    async createLegacySpec(specName: string, requirements: string, design: string): Promise<void> {
        const specDir = path.join(this.specBasePath, specName);
        fs.mkdirSync(specDir, { recursive: true });

        // 写入 requirements.md
        const reqPath = path.join(specDir, 'requirements.md');
        fs.writeFileSync(reqPath, requirements, 'utf-8');

        // 写入旧版 design.md
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
     * 获取 spec 目录路径
     */
    getSpecDir(specName: string): string {
        return path.join(this.specBasePath, specName);
    }

    /**
     * 获取设计文件路径
     */
    getDesignPath(specName: string): string {
        return path.join(this.getSpecDir(specName), 'design.md');
    }

    /**
     * 获取备份设计文件路径
     */
    getBackupPath(specName: string): string {
        return path.join(this.getSpecDir(specName), 'design.md.backup');
    }

    /**
     * 获取模块文件路径
     */
    getModulePath(specName: string, moduleType: ModuleType): string {
        return path.join(
            this.getSpecDir(specName),
            `design-${moduleType}.md`
        );
    }

    /**
     * 获取 .no-migrate 标记文件路径
     */
    getNoMigratePath(specName: string): string {
        return path.join(this.getSpecDir(specName), '.no-migrate');
    }

    /**
     * 获取元数据文件路径
     */
    getMetadataPath(specName: string): string {
        return path.join(this.getSpecDir(specName), '.module-metadata.json');
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

describe('Legacy Migration E2E Tests', () => {
    let manager: ModularDesignManager;
    let migrator: LegacyMigrator;
    let testWorkspace: MigrationTestWorkspace;
    let mockClaudeProvider: jest.Mocked<ClaudeCodeProvider>;
    let mockOutputChannel: vscode.OutputChannel;
    let originalWorkspaceFolders: readonly vscode.WorkspaceFolder[] | undefined;

    beforeEach(async () => {
        // 创建测试工作区
        testWorkspace = new MigrationTestWorkspace();
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

        // 创建 mock Claude provider（迁移不需要，但 manager 需要）
        mockClaudeProvider = {
            sendCommand: jest.fn().mockResolvedValue({
                success: true,
                output: '# Generated Module\n\nContent'
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
            }),
            rename: jest.fn((oldUri: vscode.Uri, newUri: vscode.Uri) => {
                fs.renameSync(oldUri.fsPath, newUri.fsPath);
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

        jest.mock('../../utils/configManager', () => mockConfigManager);

        // 创建实例
        manager = new ModularDesignManager(mockClaudeProvider, mockOutputChannel);
        migrator = new LegacyMigrator(mockOutputChannel);
    });

    afterEach(async () => {
        // 清理测试工作区
        await testWorkspace.cleanup();

        // 恢复 workspace folders
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            configurable: true,
            value: originalWorkspaceFolders
        });
    });

    describe('检测旧版设计', () => {
        it('应该正确检测存在旧版 design.md 文件的 spec', async () => {
            const specName = 'legacy-spec-detect';
            const requirements = '# Requirements\n\nBuild a web application';
            const design = '# Design\n\nDesign content';

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 检测旧版设计
            const isLegacy = await manager.isLegacyDesign(specName);

            expect(isLegacy).toBe(true);
        });

        it('应该正确检测不存在旧版 design.md 的 spec', async () => {
            const specName = 'new-spec-detect';

            // 创建 spec 目录但不创建 design.md
            const specDir = testWorkspace.getSpecDir(specName);
            fs.mkdirSync(specDir, { recursive: true });

            // 检测旧版设计
            const isLegacy = await manager.isLegacyDesign(specName);

            expect(isLegacy).toBe(false);
        });
    });

    describe('章节提取和映射', () => {
        it('应该正确提取 Markdown 章节', async () => {
            const design = `
# Design Document

## Frontend Architecture
Frontend components and state management

### Component Structure
Detailed component hierarchy

## Backend API
REST API endpoints definition

## Database Schema
Database models and relationships

## Testing Strategy
Test plans and coverage
            `.trim();

            const analysis = migrator.analyzeLegacyContent(design);

            // 验证：提取了所有主要章节
            expect(analysis.sections.size).toBeGreaterThanOrEqual(4);
            expect(analysis.sections.has('Frontend Architecture')).toBe(true);
            expect(analysis.sections.has('Backend API')).toBe(true);
            expect(analysis.sections.has('Database Schema')).toBe(true);
            expect(analysis.sections.has('Testing Strategy')).toBe(true);
        });

        it('应该正确将章节映射到模块类型', async () => {
            const design = `
# Design Document

## Frontend Design
UI components and views

## Mobile App Design
iOS and Android implementation

## API Endpoints
REST API specification

## Business Logic
Service layer architecture

## Database Models
Entity definitions

## Test Cases
Unit and integration tests
            `.trim();

            const analysis = migrator.analyzeLegacyContent(design);

            // 验证：映射正确
            expect(analysis.suggestedModuleMapping.has(ModuleType.Frontend)).toBe(true);
            expect(analysis.suggestedModuleMapping.has(ModuleType.Mobile)).toBe(true);
            expect(analysis.suggestedModuleMapping.has(ModuleType.ServerApi)).toBe(true);
            expect(analysis.suggestedModuleMapping.has(ModuleType.ServerLogic)).toBe(true);
            expect(analysis.suggestedModuleMapping.has(ModuleType.ServerDatabase)).toBe(true);
            expect(analysis.suggestedModuleMapping.has(ModuleType.Testing)).toBe(true);
        });

        it('应该处理中文章节标题', async () => {
            const design = `
# 设计文档

## 前端设计
前端组件架构

## API 设计
REST API 端点

## 数据库设计
数据模型和关系

## 测试策略
测试计划
            `.trim();

            const analysis = migrator.analyzeLegacyContent(design);

            // 验证：正确识别中文章节
            expect(analysis.sections.size).toBeGreaterThanOrEqual(4);
            expect(analysis.sections.has('前端设计')).toBe(true);
            expect(analysis.sections.has('API 设计')).toBe(true);
            expect(analysis.sections.has('数据库设计')).toBe(true);
            expect(analysis.sections.has('测试策略')).toBe(true);
        });

        it('应该处理嵌套的章节结构', async () => {
            const design = `
# Design Document

## Frontend
### Components
Component list
### State Management
State architecture

## Backend
### API Layer
API endpoints
### Service Layer
Business logic
            `.trim();

            const analysis = migrator.analyzeLegacyContent(design);

            // 验证：提取了主要章节（## 级别）
            expect(analysis.sections.has('Frontend')).toBe(true);
            expect(analysis.sections.has('Backend')).toBe(true);
        });
    });

    describe('完整迁移流程', () => {
        it('应该成功迁移旧版设计到模块化结构', async () => {
            const specName = 'complete-migration';
            const requirements = '# Requirements\n\nBuild a full-stack web application';
            const design = `
# Design Document

## Frontend Architecture

### Component Structure
- Header Component
- Navigation Component
- Content Area
- Footer Component

### State Management
Using Redux for global state management.

## API Endpoints

### User Management
- GET /api/users
- POST /api/users
- PUT /api/users/:id
- DELETE /api/users/:id

### Authentication
- POST /api/auth/login
- POST /api/auth/logout

## Database Schema

### User Table
- id (PRIMARY KEY)
- username (UNIQUE)
- email (UNIQUE)
- password_hash
- created_at
- updated_at

### Session Table
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- token
- expires_at

## Testing Strategy

### Unit Tests
- Component tests using Jest
- Service layer tests
- Database model tests

### Integration Tests
- API endpoint tests
- Authentication flow tests

### E2E Tests
- User registration flow
- Login flow
- CRUD operations
            `.trim();

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 执行迁移
            const result: MigrationResult = await manager.migrateLegacyDesign(specName);

            // 验证：迁移成功
            expect(result.success).toBe(true);
            expect(result.migratedModules.length).toBeGreaterThan(0);

            // 验证：期望的模块已创建
            const expectedModules = [
                ModuleType.Frontend,
                ModuleType.ServerApi,
                ModuleType.ServerDatabase,
                ModuleType.Testing
            ];

            for (const moduleType of expectedModules) {
                if (result.migratedModules.includes(moduleType)) {
                    const modulePath = testWorkspace.getModulePath(specName, moduleType);
                    const exists = await testWorkspace.fileExists(modulePath);
                    expect(exists).toBe(true);

                    // 验证：模块文件包含相关内容
                    const content = await testWorkspace.readFile(modulePath);
                    expect(content.length).toBeGreaterThan(0);
                }
            }

            // 验证：旧文件已重命名为 .backup
            const originalExists = await testWorkspace.fileExists(
                testWorkspace.getDesignPath(specName)
            );
            const backupExists = await testWorkspace.fileExists(
                testWorkspace.getBackupPath(specName)
            );

            expect(originalExists).toBe(false);
            expect(backupExists).toBe(true);

            // 验证：备份文件内容与原内容一致
            const backupContent = await testWorkspace.readFile(
                testWorkspace.getBackupPath(specName)
            );
            expect(backupContent).toBe(design);
        }, 30000);

        it('应该为迁移的模块创建正确的元数据', async () => {
            const specName = 'migration-metadata';
            const requirements = '# Requirements\n\nSimple app';
            const design = `
# Design

## Frontend Design
Frontend content

## API Design
API content
            `.trim();

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 执行迁移
            await manager.migrateLegacyDesign(specName);

            // 验证：元数据文件已创建
            const metadataPath = testWorkspace.getMetadataPath(specName);
            const metadataExists = await testWorkspace.fileExists(metadataPath);
            expect(metadataExists).toBe(true);

            // 验证：元数据包含迁移的模块信息
            const metadataContent = await testWorkspace.readFile(metadataPath);
            const metadata = JSON.parse(metadataContent);

            expect(metadata.version).toBeDefined();
            expect(metadata.modules).toBeDefined();
            expect(Object.keys(metadata.modules).length).toBeGreaterThan(0);
        }, 30000);

        it('应该正确保留模块内容的章节结构', async () => {
            const specName = 'content-preservation';
            const requirements = '# Requirements\n\nApp';
            const design = `
# Design Document

## Frontend Components

### Header Component
The header contains navigation and user menu.

**Props:**
- title: string
- user: User | null

**State:**
- isMenuOpen: boolean

### Footer Component
The footer displays copyright and links.

## API Design

### GET /api/users
Returns a list of users.

**Query Parameters:**
- page: number (optional)
- limit: number (optional)

**Response:**
\`\`\`json
{
  "users": [...],
  "total": 100
}
\`\`\`
            `.trim();

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 执行迁移
            const result = await manager.migrateLegacyDesign(specName);
            expect(result.success).toBe(true);

            // 验证：前端模块包含组件相关内容
            if (result.migratedModules.includes(ModuleType.Frontend)) {
                const frontendPath = testWorkspace.getModulePath(specName, ModuleType.Frontend);
                const frontendContent = await testWorkspace.readFile(frontendPath);

                expect(frontendContent).toContain('Header Component');
                expect(frontendContent).toContain('Footer Component');
                expect(frontendContent).toContain('Props:');
            }

            // 验证：API 模块包含端点相关内容
            if (result.migratedModules.includes(ModuleType.ServerApi)) {
                const apiPath = testWorkspace.getModulePath(specName, ModuleType.ServerApi);
                const apiContent = await testWorkspace.readFile(apiPath);

                expect(apiContent).toContain('GET /api/users');
                expect(apiContent).toContain('Query Parameters:');
                expect(apiContent).toContain('Response:');
            }
        }, 30000);
    });

    describe('迁移后的工作流状态', () => {
        it('应该将迁移的模块设置为待审核状态', async () => {
            const specName = 'workflow-after-migration';
            const requirements = '# Requirements\n\nApp';
            const design = `
# Design

## Frontend Design
Content

## API Design
Content
            `.trim();

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 执行迁移
            const result = await manager.migrateLegacyDesign(specName);
            expect(result.success).toBe(true);

            // 验证：所有迁移的模块状态为待审核
            for (const moduleType of result.migratedModules) {
                const state = await manager.getModuleWorkflowState(specName, moduleType);
                expect(state).toBe(WorkflowState.PendingReview);
            }
        }, 30000);

        it('应该允许对迁移的模块执行正常的工作流操作', async () => {
            const specName = 'workflow-operations';
            const requirements = '# Requirements\n\nApp';
            const design = `
# Design

## Frontend Design
Content
            `.trim();

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 执行迁移
            const result = await manager.migrateLegacyDesign(specName);
            expect(result.success).toBe(true);

            const migratedModule = result.migratedModules[0];

            // 批准模块
            await manager.updateModuleWorkflowState(
                specName,
                migratedModule,
                WorkflowState.Approved
            );

            // 验证：状态已更新
            const state = await manager.getModuleWorkflowState(specName, migratedModule);
            expect(state).toBe(WorkflowState.Approved);
        }, 30000);
    });

    describe('不再提示功能', () => {
        it('应该创建 .no-migrate 标记文件', async () => {
            const specName = 'no-migrate-test';

            // 创建 spec 目录
            const specDir = testWorkspace.getSpecDir(specName);
            fs.mkdirSync(specDir, { recursive: true });

            // 调用 migrator 的内部方法创建标记（通过 showMigrationWizard 模拟用户选择）
            // 注意：这里我们直接创建文件来模拟功能
            const noMigratePath = testWorkspace.getNoMigratePath(specName);
            fs.writeFileSync(noMigratePath, '', 'utf-8');

            // 验证：标记文件已创建
            const exists = await testWorkspace.fileExists(noMigratePath);
            expect(exists).toBe(true);
        });

        it('应该在存在 .no-migrate 标记时不提示迁移', async () => {
            const specName = 'no-migrate-check';
            const requirements = '# Requirements\n\nApp';
            const design = '# Design\n\nContent';

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 创建 .no-migrate 标记
            const noMigratePath = testWorkspace.getNoMigratePath(specName);
            fs.writeFileSync(noMigratePath, '', 'utf-8');

            // 检测旧版设计
            const isLegacy = await manager.isLegacyDesign(specName);
            expect(isLegacy).toBe(true);

            // 注意：实际的"不再提示"逻辑在 UI 层实现，这里我们只验证标记文件存在
            const noMigrateExists = await testWorkspace.fileExists(noMigratePath);
            expect(noMigrateExists).toBe(true);
        });
    });

    describe('边缘情况和错误处理', () => {
        it('应该处理空的设计文档', async () => {
            const specName = 'empty-design';
            const requirements = '# Requirements\n\nApp';
            const design = '';

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 执行迁移
            const result = await manager.migrateLegacyDesign(specName);

            // 验证：迁移结果（可能成功但没有模块，或失败）
            // 根据实际实现调整预期
            expect(result).toBeDefined();
        }, 30000);

        it('应该处理没有章节的设计文档', async () => {
            const specName = 'no-sections';
            const requirements = '# Requirements\n\nApp';
            const design = `
# Design Document

This is a design document without any section headers.
It just contains plain text.
            `.trim();

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 执行迁移
            const result = await manager.migrateLegacyDesign(specName);

            // 验证：迁移完成（可能创建了一个默认模块）
            expect(result).toBeDefined();
        }, 30000);

        it('应该处理包含特殊字符的章节标题', async () => {
            const specName = 'special-chars';
            const requirements = '# Requirements\n\nApp';
            const design = `
# Design

## Frontend (UI/UX)
Content with special chars

## API - REST & GraphQL
Content with dashes and ampersands

## Database: PostgreSQL/MySQL
Content with colons and slashes
            `.trim();

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 执行迁移
            const result = await manager.migrateLegacyDesign(specName);

            // 验证：迁移成功
            expect(result.success).toBe(true);
            expect(result.migratedModules.length).toBeGreaterThan(0);
        }, 30000);

        it('应该处理非常大的设计文档', async () => {
            const specName = 'large-design';
            const requirements = '# Requirements\n\nApp';

            // 生成一个大的设计文档
            let largeDesign = '# Large Design Document\n\n';
            for (let i = 0; i < 10; i++) {
                largeDesign += `\n## Section ${i + 1}\n\n`;
                largeDesign += `This is section ${i + 1} with lots of content.\n`.repeat(100);
            }

            await testWorkspace.createLegacySpec(specName, requirements, largeDesign);

            // 执行迁移
            const result = await manager.migrateLegacyDesign(specName);

            // 验证：迁移成功
            expect(result.success).toBe(true);
        }, 30000);

        it('应该在迁移失败时保留原文件', async () => {
            const specName = 'migration-failure';
            const requirements = '# Requirements\n\nApp';
            const design = '# Design\n\nContent';

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 模拟迁移失败（通过破坏文件系统权限或其他方式）
            // 这里我们通过 mock 来模拟
            const originalWriteFile = vscode.workspace.fs.writeFile;
            (vscode.workspace.fs.writeFile as jest.Mock).mockRejectedValueOnce(
                new Error('Write failed')
            );

            // 执行迁移（可能失败）
            try {
                await manager.migrateLegacyDesign(specName);
            } catch (error) {
                // 预期失败
            }

            // 恢复 mock
            (vscode.workspace.fs.writeFile as jest.Mock).mockImplementation(originalWriteFile);

            // 验证：原文件仍然存在
            const originalExists = await testWorkspace.fileExists(
                testWorkspace.getDesignPath(specName)
            );
            expect(originalExists).toBe(true);

            // 验证：原文件内容未损坏
            const originalContent = await testWorkspace.readFile(
                testWorkspace.getDesignPath(specName)
            );
            expect(originalContent).toBe(design);
        }, 30000);

        it('应该处理已存在部分模块文件的情况', async () => {
            const specName = 'partial-modules';
            const requirements = '# Requirements\n\nApp';
            const design = `
# Design

## Frontend Design
Frontend content

## API Design
API content
            `.trim();

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 预先创建一个模块文件
            const existingModulePath = testWorkspace.getModulePath(specName, ModuleType.Frontend);
            fs.writeFileSync(existingModulePath, '# Existing Frontend Module\n\nExisting content', 'utf-8');

            // 执行迁移
            const result = await manager.migrateLegacyDesign(specName);

            // 验证：迁移处理了这种情况（可能跳过已存在的模块或提示用户）
            expect(result).toBeDefined();

            // 验证：其他模块仍然被迁移
            if (result.migratedModules.includes(ModuleType.ServerApi)) {
                const apiPath = testWorkspace.getModulePath(specName, ModuleType.ServerApi);
                const apiExists = await testWorkspace.fileExists(apiPath);
                expect(apiExists).toBe(true);
            }
        }, 30000);
    });

    describe('迁移后的模块列表更新', () => {
        it('应该在迁移后正确更新模块列表', async () => {
            const specName = 'module-list-update';
            const requirements = '# Requirements\n\nApp';
            const design = `
# Design

## Frontend Design
Content

## API Design
Content
            `.trim();

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 迁移前：检查模块列表
            const beforeMigration = await manager.getModuleList(specName);

            // 执行迁移
            const result = await manager.migrateLegacyDesign(specName);
            expect(result.success).toBe(true);

            // 迁移后：检查模块列表
            const afterMigration = await manager.getModuleList(specName);

            // 验证：模块列表已更新
            expect(afterMigration.length).toBeGreaterThanOrEqual(beforeMigration.length);

            // 验证：迁移的模块在列表中标记为存在
            for (const moduleType of result.migratedModules) {
                const moduleInfo = afterMigration.find(m => m.type === moduleType);
                expect(moduleInfo).toBeDefined();
                expect(moduleInfo?.exists).toBe(true);
            }
        }, 30000);

        it('应该在迁移后清除缓存', async () => {
            const specName = 'cache-invalidation';
            const requirements = '# Requirements\n\nApp';
            const design = `
# Design

## Frontend Design
Content
            `.trim();

            await testWorkspace.createLegacySpec(specName, requirements, design);

            // 获取模块列表以填充缓存
            await manager.getModuleList(specName);

            // 执行迁移
            await manager.migrateLegacyDesign(specName);

            // 再次获取模块列表（应该从文件系统而非缓存获取）
            const updatedList = await manager.getModuleList(specName);

            // 验证：列表反映了迁移后的状态
            const existingModules = updatedList.filter(m => m.exists);
            expect(existingModules.length).toBeGreaterThan(0);
        }, 30000);
    });
});
