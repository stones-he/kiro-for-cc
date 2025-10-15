/**
 * ModuleDetector 单元测试
 *
 * 测试模块检测功能，验证关键词匹配、正则模式匹配和默认规则逻辑。
 */

import * as vscode from 'vscode';
import { ModuleDetector } from '../moduleDetector';
import { ModuleType } from '../../../types/modularDesign';

// Mock OutputChannel
const createMockOutputChannel = (): vscode.OutputChannel => ({
    name: 'Test Output',
    append: jest.fn(),
    appendLine: jest.fn(),
    clear: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    replace: jest.fn()
});

describe('ModuleDetector', () => {
    let detector: ModuleDetector;
    let mockOutputChannel: vscode.OutputChannel;

    beforeEach(() => {
        mockOutputChannel = createMockOutputChannel();
        detector = new ModuleDetector(mockOutputChannel);
    });

    describe('detectApplicableModules', () => {
        describe('Frontend Module Detection', () => {
            it('应该检测到包含 "React" 关键词的前端模块', async () => {
                const requirements = 'Build a web application with React components';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Frontend);
            });

            it('应该检测到包含 "Vue" 关键词的前端模块', async () => {
                const requirements = 'Create a Vue.js dashboard for data visualization';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Frontend);
            });

            it('应该检测到包含中文 "前端" 关键词的前端模块', async () => {
                const requirements = '开发一个前端应用，使用 TypeScript 和 React';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Frontend);
            });

            it('应该检测到包含 "user interface" 模式的前端模块', async () => {
                const requirements = 'Design a user interface for the admin panel';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Frontend);
            });

            it('应该默认包含前端模块（即使没有明确提及）', async () => {
                const requirements = 'Build a simple application';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Frontend);
            });
        });

        describe('Mobile Module Detection', () => {
            it('应该检测到包含 "mobile app" 关键词的移动端模块', async () => {
                const requirements = 'Create a mobile app for iOS and Android';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Mobile);
            });

            it('应该检测到包含 "React Native" 关键词的移动端模块', async () => {
                const requirements = 'Build a cross-platform app using React Native';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Mobile);
            });

            it('应该检测到包含中文 "移动端" 关键词的移动端模块', async () => {
                const requirements = '开发一个移动端应用，支持安卓和苹果系统';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Mobile);
            });

            it('应该检测到包含 "ios app" 模式的移动端模块', async () => {
                const requirements = 'Develop an ios app for iPhone and iPad';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Mobile);
            });

            it('不应该默认包含移动端模块（如果没有明确提及）', async () => {
                const requirements = 'Build a simple web application';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).not.toContain(ModuleType.Mobile);
            });
        });

        describe('Server API Module Detection', () => {
            it('应该检测到包含 "REST API" 关键词的 API 模块', async () => {
                const requirements = 'Implement REST API endpoints for user management';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.ServerApi);
            });

            it('应该检测到包含 "GraphQL" 关键词的 API 模块', async () => {
                const requirements = 'Build a GraphQL API with Apollo Server';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.ServerApi);
            });

            it('应该检测到包含中文 "接口" 关键词的 API 模块', async () => {
                const requirements = '开发后端接口，提供用户认证和授权功能';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.ServerApi);
            });

            it('应该检测到包含 "api endpoint" 模式的 API 模块', async () => {
                const requirements = 'Define api endpoint for product catalog';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.ServerApi);
            });

            it('应该默认包含 API 模块', async () => {
                const requirements = 'Build a simple application';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.ServerApi);
            });
        });

        describe('Server Logic Module Detection', () => {
            it('应该检测到包含 "business logic" 关键词的逻辑模块', async () => {
                const requirements = 'Implement business logic for order processing';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.ServerLogic);
            });

            it('应该检测到包含中文 "业务逻辑" 关键词的逻辑模块', async () => {
                const requirements = '实现订单处理的业务逻辑和工作流';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.ServerLogic);
            });

            it('应该检测到包含 "service layer" 模式的逻辑模块', async () => {
                const requirements = 'Design the service layer architecture';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.ServerLogic);
            });

            it('应该默认包含逻辑模块', async () => {
                const requirements = 'Build a simple application';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.ServerLogic);
            });
        });

        describe('Database Module Detection', () => {
            it('应该检测到包含 "PostgreSQL" 关键词的数据库模块', async () => {
                const requirements = 'Use PostgreSQL as the primary database';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.ServerDatabase);
            });

            it('应该检测到包含 "MongoDB" 关键词的数据库模块', async () => {
                const requirements = 'Store user data in MongoDB collections';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.ServerDatabase);
            });

            it('应该检测到包含中文 "数据库" 关键词的数据库模块', async () => {
                const requirements = '设计数据库模式，包括用户表和订单表';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.ServerDatabase);
            });

            it('应该检测到包含 "data model" 模式的数据库模块', async () => {
                const requirements = 'Define data model for the application';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.ServerDatabase);
            });

            it('应该默认包含数据库模块', async () => {
                const requirements = 'Build a simple application';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.ServerDatabase);
            });
        });

        describe('Testing Module Detection', () => {
            it('应该检测到包含 "unit test" 关键词的测试模块', async () => {
                const requirements = 'Write unit tests for all components';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Testing);
            });

            it('应该检测到包含 "Jest" 关键词的测试模块', async () => {
                const requirements = 'Use Jest for testing the application';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Testing);
            });

            it('应该检测到包含中文 "测试" 关键词的测试模块', async () => {
                const requirements = '编写单元测试和集成测试';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Testing);
            });

            it('应该总是包含测试模块（默认适用）', async () => {
                const requirements = 'Build any application';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Testing);
            });
        });

        describe('Multiple Modules Detection', () => {
            it('应该检测到前端和后端相关的所有模块', async () => {
                const requirements = `
                    Build a full-stack web application with React frontend,
                    REST API backend, PostgreSQL database, and comprehensive testing.
                `;
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Frontend);
                expect(modules).toContain(ModuleType.ServerApi);
                expect(modules).toContain(ModuleType.ServerLogic);
                expect(modules).toContain(ModuleType.ServerDatabase);
                expect(modules).toContain(ModuleType.Testing);
            });

            it('应该检测到移动端和后端相关的所有模块', async () => {
                const requirements = `
                    Create a mobile app for iOS and Android with React Native,
                    connecting to a GraphQL API and MongoDB database.
                `;
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Mobile);
                expect(modules).toContain(ModuleType.ServerApi);
                expect(modules).toContain(ModuleType.ServerDatabase);
                expect(modules).toContain(ModuleType.Testing);
            });

            it('应该为前端项目检测到前端和测试模块', async () => {
                const requirements = 'Build a simple React dashboard';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Frontend);
                expect(modules).toContain(ModuleType.Testing);
                // 默认还会包含后端模块
                expect(modules).toContain(ModuleType.ServerApi);
                expect(modules).toContain(ModuleType.ServerLogic);
                expect(modules).toContain(ModuleType.ServerDatabase);
            });
        });

        describe('Edge Cases', () => {
            it('应该处理空的需求文档', async () => {
                const requirements = '';
                const modules = await detector.detectApplicableModules(requirements);

                // 应该包含所有默认适用的模块
                expect(modules).toContain(ModuleType.Frontend);
                expect(modules).toContain(ModuleType.ServerApi);
                expect(modules).toContain(ModuleType.ServerLogic);
                expect(modules).toContain(ModuleType.ServerDatabase);
                expect(modules).toContain(ModuleType.Testing);
                expect(modules).not.toContain(ModuleType.Mobile);
            });

            it('应该处理非常短的需求文档', async () => {
                const requirements = 'Build app';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules.length).toBeGreaterThan(0);
                expect(modules).toContain(ModuleType.Testing);
            });

            it('应该忽略大小写差异', async () => {
                const requirements = 'REACT FRONTEND WITH GRAPHQL API';
                const modules = await detector.detectApplicableModules(requirements);

                expect(modules).toContain(ModuleType.Frontend);
                expect(modules).toContain(ModuleType.ServerApi);
            });
        });
    });

    describe('isModuleApplicable', () => {
        it('应该正确判断前端模块是否适用', async () => {
            const requirements = 'Build a React application';
            const result = await detector.isModuleApplicable(requirements, ModuleType.Frontend);

            expect(result).toBe(true);
        });

        it('应该正确判断移动端模块是否适用', async () => {
            const requirements = 'Build a web application';
            const result = await detector.isModuleApplicable(requirements, ModuleType.Mobile);

            expect(result).toBe(false);
        });

        it('应该正确判断测试模块总是适用', async () => {
            const requirements = 'Any requirements';
            const result = await detector.isModuleApplicable(requirements, ModuleType.Testing);

            expect(result).toBe(true);
        });
    });

    describe('Custom Detection Rules', () => {
        it('应该能够添加自定义检测规则', () => {
            const customRule = {
                keywords: ['docker', 'kubernetes'],
                patterns: [/ci\/cd/i],
                defaultApplicable: false
            };

            detector.addDetectionRule('devops' as ModuleType, customRule);

            const rule = detector.getDetectionRule('devops' as ModuleType);
            expect(rule).toEqual(customRule);
        });

        it('应该使用自定义规则进行检测', async () => {
            const customRule = {
                keywords: ['docker', 'kubernetes'],
                patterns: [/ci\/cd/i],
                defaultApplicable: false
            };

            detector.addDetectionRule('devops' as ModuleType, customRule);

            const requirements = 'Setup Docker and Kubernetes for deployment';
            const modules = await detector.detectApplicableModules(requirements);

            expect(modules).toContain('devops' as ModuleType);
        });

        it('应该能够覆盖现有检测规则', () => {
            const newRule = {
                keywords: ['test-keyword'],
                patterns: [/test-pattern/i],
                defaultApplicable: false
            };

            detector.addDetectionRule(ModuleType.Frontend, newRule);

            const rule = detector.getDetectionRule(ModuleType.Frontend);
            expect(rule).toEqual(newRule);
        });

        it('应该能够重置检测规则为默认值', () => {
            const customRule = {
                keywords: ['custom'],
                patterns: [],
                defaultApplicable: false
            };

            detector.addDetectionRule(ModuleType.Frontend, customRule);
            detector.resetDetectionRules();

            const rule = detector.getDetectionRule(ModuleType.Frontend);
            expect(rule?.keywords).not.toContain('custom');
            expect(rule?.keywords).toContain('frontend');
        });
    });

    describe('Detection Stats', () => {
        it('应该返回正确的检测统计信息', () => {
            const stats = detector.getDetectionStats();

            expect(stats.totalRules).toBe(6); // 6种标准模块类型
            expect(stats.rulesByModule.size).toBe(6);
        });

        it('应该包含每个模块的关键词和模式数量', () => {
            const stats = detector.getDetectionStats();

            const frontendStats = stats.rulesByModule.get(ModuleType.Frontend);
            expect(frontendStats).toBeDefined();
            expect(frontendStats!.keywords).toBeGreaterThan(0);
            expect(frontendStats!.patterns).toBeGreaterThan(0);
        });
    });

    describe('Detection Rule Management', () => {
        it('应该能够获取所有检测规则', () => {
            const allRules = detector.getAllDetectionRules();

            expect(allRules.size).toBe(6);
            expect(allRules.has(ModuleType.Frontend)).toBe(true);
            expect(allRules.has(ModuleType.Mobile)).toBe(true);
            expect(allRules.has(ModuleType.ServerApi)).toBe(true);
            expect(allRules.has(ModuleType.ServerLogic)).toBe(true);
            expect(allRules.has(ModuleType.ServerDatabase)).toBe(true);
            expect(allRules.has(ModuleType.Testing)).toBe(true);
        });

        it('应该能够获取特定模块的检测规则', () => {
            const rule = detector.getDetectionRule(ModuleType.Frontend);

            expect(rule).toBeDefined();
            expect(rule!.keywords).toContain('react');
            expect(rule!.keywords).toContain('前端');
            expect(rule!.defaultApplicable).toBe(true);
        });
    });

    describe('Logging', () => {
        it('应该记录检测开始和结束日志', async () => {
            const requirements = 'Test requirements';
            await detector.detectApplicableModules(requirements);

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[ModuleDetector] Starting module detection')
            );
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('[ModuleDetector] Detection complete')
            );
        });

        it('应该记录每个模块的检测结果', async () => {
            const requirements = 'Build a React app';
            await detector.detectApplicableModules(requirements);

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Module "frontend" is applicable')
            );
        });

        it('应该记录添加自定义规则的日志', () => {
            const customRule = {
                keywords: ['test'],
                patterns: [],
                defaultApplicable: false
            };

            detector.addDetectionRule('custom' as ModuleType, customRule);

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Added custom detection rule for module "custom"')
            );
        });
    });
});
