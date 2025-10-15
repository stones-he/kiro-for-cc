/**
 * 单元测试：CustomModuleValidator
 *
 * 测试自定义模块验证器的各项验证逻辑。
 */

import { CustomModuleValidator } from '../customModuleValidator';
import { CustomModuleDefinition } from '../../types/modularDesign';

describe('CustomModuleValidator', () => {
    describe('validate()', () => {
        it('应该通过有效的自定义模块定义验证', () => {
            const customModules: CustomModuleDefinition[] = [
                {
                    type: 'devops',
                    name: 'DevOps 设计',
                    fileName: 'design-devops.md',
                    promptTemplate: '这是一个自定义的 DevOps 设计提示模板，包含 {{specName}} 和 {{requirements}} 变量。',
                    detectionRules: {
                        keywords: ['docker', 'kubernetes', 'ci/cd', 'devops'],
                        patterns: [/deployment/i, /pipeline/i],
                        defaultApplicable: false
                    },
                    icon: 'gear'
                }
            ];

            const result = CustomModuleValidator.validate(customModules);

            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('应该检测出缺少必填字段的错误', () => {
            const customModules: CustomModuleDefinition[] = [
                {
                    type: '',
                    name: '',
                    fileName: ''
                } as CustomModuleDefinition
            ];

            const result = CustomModuleValidator.validate(customModules);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some(e => e.field === 'type')).toBe(true);
            expect(result.errors.some(e => e.field === 'name')).toBe(true);
            expect(result.errors.some(e => e.field === 'fileName')).toBe(true);
        });

        it('应该检测出模块类型重复的错误', () => {
            const customModules: CustomModuleDefinition[] = [
                {
                    type: 'devops',
                    name: 'DevOps 1',
                    fileName: 'design-devops-1.md'
                },
                {
                    type: 'devops',
                    name: 'DevOps 2',
                    fileName: 'design-devops-2.md'
                }
            ];

            const result = CustomModuleValidator.validate(customModules);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'type' && e.message.includes('重复'))).toBe(true);
        });

        it('应该警告与标准模块类型冲突', () => {
            const customModules: CustomModuleDefinition[] = [
                {
                    type: 'frontend',
                    name: '自定义前端',
                    fileName: 'design-custom-frontend.md'
                }
            ];

            const result = CustomModuleValidator.validate(customModules);

            expect(result.warnings.some(w =>
                w.field === 'type' && w.message.includes('冲突')
            )).toBe(true);
        });

        it('应该检测出无效的模块类型命名', () => {
            const customModules: CustomModuleDefinition[] = [
                {
                    type: 'Invalid_Type',
                    name: '无效类型',
                    fileName: 'design-invalid.md'
                }
            ];

            const result = CustomModuleValidator.validate(customModules);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e =>
                e.field === 'type' && e.message.includes('小写字母')
            )).toBe(true);
        });

        it('应该检测出文件名中的非法字符', () => {
            const customModules: CustomModuleDefinition[] = [
                {
                    type: 'security',
                    name: '安全设计',
                    fileName: 'design-security<>.md'
                }
            ];

            const result = CustomModuleValidator.validate(customModules);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e =>
                e.field === 'fileName' && e.message.includes('非法字符')
            )).toBe(true);
        });

        it('应该警告文件名不以 design- 开头', () => {
            const customModules: CustomModuleDefinition[] = [
                {
                    type: 'security',
                    name: '安全设计',
                    fileName: 'security.md'
                }
            ];

            const result = CustomModuleValidator.validate(customModules);

            expect(result.warnings.some(w =>
                w.field === 'fileName' && w.message.includes('design-')
            )).toBe(true);
        });

        it('应该警告缺少提示模板变量', () => {
            const customModules: CustomModuleDefinition[] = [
                {
                    type: 'security',
                    name: '安全设计',
                    fileName: 'design-security.md',
                    promptTemplate: '这是一个简单的提示模板'
                }
            ];

            const result = CustomModuleValidator.validate(customModules);

            expect(result.warnings.some(w =>
                w.field === 'promptTemplate' && w.message.includes('specName')
            )).toBe(true);
            expect(result.warnings.some(w =>
                w.field === 'promptTemplate' && w.message.includes('requirements')
            )).toBe(true);
        });

        it('应该检测出检测规则中的无效正则表达式', () => {
            const customModules: CustomModuleDefinition[] = [
                {
                    type: 'security',
                    name: '安全设计',
                    fileName: 'design-security.md',
                    detectionRules: {
                        keywords: ['security'],
                        patterns: ['not a regex' as any],
                        defaultApplicable: false
                    }
                }
            ];

            const result = CustomModuleValidator.validate(customModules);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e =>
                e.field.includes('patterns') && e.message.includes('正则表达式')
            )).toBe(true);
        });
    });

    describe('quickValidate()', () => {
        it('应该快速验证通过有效的模块', () => {
            const customModules: CustomModuleDefinition[] = [
                {
                    type: 'devops',
                    name: 'DevOps',
                    fileName: 'design-devops.md'
                }
            ];

            const result = CustomModuleValidator.quickValidate(customModules);

            expect(result).toBe(true);
        });

        it('应该快速验证失败缺少必填字段的模块', () => {
            const customModules: CustomModuleDefinition[] = [
                {
                    type: '',
                    name: 'DevOps',
                    fileName: 'design-devops.md'
                }
            ];

            const result = CustomModuleValidator.quickValidate(customModules);

            expect(result).toBe(false);
        });
    });

    describe('formatValidationResult()', () => {
        it('应该格式化验证成功的结果', () => {
            const result = {
                valid: true,
                errors: [],
                warnings: []
            };

            const formatted = CustomModuleValidator.formatValidationResult(result);

            expect(formatted).toContain('✓');
            expect(formatted).toContain('验证通过');
        });

        it('应该格式化包含错误和警告的结果', () => {
            const result = {
                valid: false,
                errors: [
                    {
                        moduleType: 'devops',
                        field: 'type',
                        message: '类型错误',
                        severity: 'error' as const
                    }
                ],
                warnings: [
                    {
                        moduleType: 'devops',
                        field: 'fileName',
                        message: '文件名警告',
                        severity: 'warning' as const
                    }
                ]
            };

            const formatted = CustomModuleValidator.formatValidationResult(result);

            expect(formatted).toContain('✗');
            expect(formatted).toContain('验证失败');
            expect(formatted).toContain('错误');
            expect(formatted).toContain('警告');
            expect(formatted).toContain('[devops]');
            expect(formatted).toContain('类型错误');
            expect(formatted).toContain('文件名警告');
        });
    });
});
