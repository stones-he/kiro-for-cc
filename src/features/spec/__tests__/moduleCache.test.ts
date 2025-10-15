import * as vscode from 'vscode';
import { ModuleCache } from '../moduleCache';
import { ModuleType, WorkflowState, CachedModuleInfo } from '../../../types/modularDesign';

/**
 * 单元测试：ModuleCache 缓存管理类
 *
 * 测试范围：
 * - 缓存的存储和检索
 * - 缓存过期机制
 * - 缓存刷新
 * - 缓存清除和失效
 * - 统计信息
 */
describe('ModuleCache', () => {
    let cache: ModuleCache;
    let mockOutputChannel: vscode.OutputChannel;

    beforeEach(() => {
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

        // 创建缓存实例，使用较短的 TTL 便于测试
        cache = new ModuleCache(mockOutputChannel, 1000); // 1秒 TTL
    });

    afterEach(() => {
        cache.clear();
    });

    describe('get and set', () => {
        it('应该能够缓存和检索模块信息', async () => {
            const specName = 'test-spec';
            const info: CachedModuleInfo = {
                modules: [
                    {
                        type: ModuleType.Frontend,
                        fileName: 'design-frontend.md',
                        exists: true,
                        workflowState: WorkflowState.PendingReview,
                        lastModified: new Date()
                    }
                ],
                lastUpdated: new Date(),
                hasLegacyDesign: false
            };

            await cache.set(specName, info);
            const retrieved = await cache.get(specName);

            expect(retrieved).toBeTruthy();
            expect(retrieved!.modules).toHaveLength(1);
            expect(retrieved!.modules[0].type).toBe(ModuleType.Frontend);
            expect(retrieved!.hasLegacyDesign).toBe(false);
        });

        it('不存在的缓存应该返回 null', async () => {
            const retrieved = await cache.get('non-existent-spec');
            expect(retrieved).toBeNull();
        });

        it('应该自动更新缓存的 lastUpdated 时间', async () => {
            const specName = 'test-spec';
            const info: CachedModuleInfo = {
                modules: [],
                lastUpdated: new Date(Date.now() - 10000), // 10秒前
                hasLegacyDesign: false
            };

            const beforeSet = Date.now();
            await cache.set(specName, info);
            const afterSet = Date.now();

            const retrieved = await cache.get(specName);
            expect(retrieved).toBeTruthy();

            const updatedTime = retrieved!.lastUpdated.getTime();
            expect(updatedTime).toBeGreaterThanOrEqual(beforeSet);
            expect(updatedTime).toBeLessThanOrEqual(afterSet);
        });
    });

    describe('cache expiration', () => {
        it('过期的缓存应该返回 null', async () => {
            const specName = 'test-spec';
            const info: CachedModuleInfo = {
                modules: [],
                lastUpdated: new Date(Date.now() - 2000), // 2秒前（超过 1秒 TTL）
                hasLegacyDesign: false
            };

            // 直接设置缓存（绕过 set 方法的时间更新）
            (cache as any).cache.set(specName, info);

            const retrieved = await cache.get(specName);
            expect(retrieved).toBeNull();
        });

        it('未过期的缓存应该正常返回', async () => {
            const specName = 'test-spec';
            const info: CachedModuleInfo = {
                modules: [],
                lastUpdated: new Date(), // 刚刚创建
                hasLegacyDesign: false
            };

            await cache.set(specName, info);

            // 立即检索，应该成功
            const retrieved = await cache.get(specName);
            expect(retrieved).toBeTruthy();
        });
    });

    describe('clear', () => {
        it('应该能够清除指定 spec 的缓存', async () => {
            const spec1 = 'spec-1';
            const spec2 = 'spec-2';

            const info: CachedModuleInfo = {
                modules: [],
                lastUpdated: new Date(),
                hasLegacyDesign: false
            };

            await cache.set(spec1, info);
            await cache.set(spec2, info);

            cache.clear(spec1);

            const retrieved1 = await cache.get(spec1);
            const retrieved2 = await cache.get(spec2);

            expect(retrieved1).toBeNull();
            expect(retrieved2).toBeTruthy();
        });

        it('应该能够清除所有缓存', async () => {
            const spec1 = 'spec-1';
            const spec2 = 'spec-2';

            const info: CachedModuleInfo = {
                modules: [],
                lastUpdated: new Date(),
                hasLegacyDesign: false
            };

            await cache.set(spec1, info);
            await cache.set(spec2, info);

            cache.clear();

            const retrieved1 = await cache.get(spec1);
            const retrieved2 = await cache.get(spec2);

            expect(retrieved1).toBeNull();
            expect(retrieved2).toBeNull();
        });
    });

    describe('invalidate', () => {
        it('invalidate 应该与 clear 行为一致', async () => {
            const specName = 'test-spec';
            const info: CachedModuleInfo = {
                modules: [],
                lastUpdated: new Date(),
                hasLegacyDesign: false
            };

            await cache.set(specName, info);
            cache.invalidate(specName);

            const retrieved = await cache.get(specName);
            expect(retrieved).toBeNull();
        });
    });

    describe('getStats', () => {
        it('应该返回正确的缓存统计信息', async () => {
            const info: CachedModuleInfo = {
                modules: [],
                lastUpdated: new Date(),
                hasLegacyDesign: false
            };

            await cache.set('spec-1', info);
            await cache.set('spec-2', info);

            const stats = cache.getStats();

            expect(stats.size).toBe(2);
            expect(stats.specs).toContain('spec-1');
            expect(stats.specs).toContain('spec-2');
            expect(stats.ttl).toBe(1000); // 构造函数中设置的 TTL
        });

        it('空缓存应该返回空统计', () => {
            const stats = cache.getStats();

            expect(stats.size).toBe(0);
            expect(stats.specs).toHaveLength(0);
        });
    });

    describe('module information structure', () => {
        it('应该正确存储多个模块信息', async () => {
            const specName = 'test-spec';
            const info: CachedModuleInfo = {
                modules: [
                    {
                        type: ModuleType.Frontend,
                        fileName: 'design-frontend.md',
                        exists: true,
                        workflowState: WorkflowState.Approved,
                        lastModified: new Date(),
                        fileSize: 1024
                    },
                    {
                        type: ModuleType.ServerApi,
                        fileName: 'design-server-api.md',
                        exists: true,
                        workflowState: WorkflowState.PendingReview,
                        lastModified: new Date(),
                        fileSize: 2048
                    },
                    {
                        type: ModuleType.Testing,
                        fileName: 'design-testing.md',
                        exists: false,
                        workflowState: WorkflowState.NotGenerated
                    }
                ],
                lastUpdated: new Date(),
                hasLegacyDesign: false
            };

            await cache.set(specName, info);
            const retrieved = await cache.get(specName);

            expect(retrieved!.modules).toHaveLength(3);

            const frontend = retrieved!.modules.find(m => m.type === ModuleType.Frontend);
            expect(frontend).toBeTruthy();
            expect(frontend!.exists).toBe(true);
            expect(frontend!.workflowState).toBe(WorkflowState.Approved);
            expect(frontend!.fileSize).toBe(1024);

            const testing = retrieved!.modules.find(m => m.type === ModuleType.Testing);
            expect(testing).toBeTruthy();
            expect(testing!.exists).toBe(false);
            expect(testing!.workflowState).toBe(WorkflowState.NotGenerated);
        });

        it('应该正确记录 legacy design 标记', async () => {
            const specName = 'legacy-spec';
            const info: CachedModuleInfo = {
                modules: [],
                lastUpdated: new Date(),
                hasLegacyDesign: true
            };

            await cache.set(specName, info);
            const retrieved = await cache.get(specName);

            expect(retrieved!.hasLegacyDesign).toBe(true);
        });
    });

    describe('logging', () => {
        it('应该记录缓存操作日志', async () => {
            const specName = 'test-spec';
            const info: CachedModuleInfo = {
                modules: [],
                lastUpdated: new Date(),
                hasLegacyDesign: false
            };

            await cache.set(specName, info);
            await cache.get(specName);

            expect(mockOutputChannel.appendLine).toHaveBeenCalled();

            // 验证日志包含相关信息
            const calls = (mockOutputChannel.appendLine as jest.Mock).mock.calls;
            const logMessages = calls.map(call => call[0]);

            expect(logMessages.some((msg: string) => msg.includes('Cached'))).toBe(true);
            expect(logMessages.some((msg: string) => msg.includes('Cache hit'))).toBe(true);
        });

        it('应该记录缓存未命中日志', async () => {
            await cache.get('non-existent-spec');

            const calls = (mockOutputChannel.appendLine as jest.Mock).mock.calls;
            const logMessages = calls.map(call => call[0]);

            expect(logMessages.some((msg: string) => msg.includes('Cache miss'))).toBe(true);
        });

        it('应该记录缓存过期日志', async () => {
            const specName = 'test-spec';
            const info: CachedModuleInfo = {
                modules: [],
                lastUpdated: new Date(Date.now() - 2000),
                hasLegacyDesign: false
            };

            (cache as any).cache.set(specName, info);
            await cache.get(specName);

            const calls = (mockOutputChannel.appendLine as jest.Mock).mock.calls;
            const logMessages = calls.map(call => call[0]);

            expect(logMessages.some((msg: string) => msg.includes('expired'))).toBe(true);
        });
    });
});
