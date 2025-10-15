/**
 * Design Module Commands - 设计模块命令处理器
 *
 * 这个模块包含所有与设计模块相关的命令处理函数，包括：
 * - 生成命令处理（生成所有模块、生成特定模块）
 * - 工作流命令处理（批准、拒绝、重新生成、删除）
 * - 迁移命令处理（迁移旧版设计）
 * - 分析命令处理（交叉引用分析）
 *
 * 主要职责：
 * 1. 处理用户命令请求
 * 2. 提供进度提示和用户反馈
 * 3. 调用 ModularDesignManager 执行实际操作
 * 4. 处理错误并显示友好的错误消息
 * 5. 刷新 TreeView 反映变化
 *
 * @example
 * ```typescript
 * // 在 extension.ts 中注册命令
 * context.subscriptions.push(
 *     vscode.commands.registerCommand(
 *         'kfc.spec.designModule.generateAll',
 *         handleGenerateAllModules
 *     )
 * );
 * ```
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { ModularDesignManager } from './modularDesignManager';
import { LegacyMigrator } from './legacyMigrator';
import { ModuleType, WorkflowState, ContentAnalysis } from '../../types/modularDesign';
import { ClaudeCodeProvider } from '../../providers/claudeCodeProvider';
import { ConfigManager } from '../../utils/configManager';

/**
 * 处理生成所有设计模块的命令
 *
 * 这个命令会：
 * 1. 获取当前 spec 名称
 * 2. 显示进度提示
 * 3. 调用 ModularDesignManager 生成所有适用的模块
 * 4. 显示生成结果
 * 5. 刷新 TreeView
 *
 * @param claudeProvider Claude Code 提供者
 * @param outputChannel VSCode 输出通道
 * @param refreshCallback TreeView 刷新回调函数
 * @returns 命令处理函数
 *
 * @example
 * ```typescript
 * const handler = handleGenerateAllModules(claudeProvider, outputChannel, () => {
 *     specExplorer.refresh();
 * });
 *
 * context.subscriptions.push(
 *     vscode.commands.registerCommand('kfc.spec.designModule.generateAll', handler)
 * );
 * ```
 */
export function handleGenerateAllModules(
    claudeProvider: ClaudeCodeProvider,
    outputChannel: vscode.OutputChannel,
    refreshCallback: () => void
) {
    return async (specName?: string) => {
        outputChannel.appendLine('');
        outputChannel.appendLine('[DesignModuleCommands] Generate all modules command triggered');

        try {
            // 如果没有提供 specName，提示用户输入
            if (!specName) {
                specName = await vscode.window.showInputBox({
                    prompt: '请输入 Spec 名称',
                    placeHolder: '例如: my-feature',
                    validateInput: (value) => {
                        if (!value || value.trim().length === 0) {
                            return '请输入有效的 Spec 名称';
                        }
                        return null;
                    }
                });

                if (!specName) {
                    outputChannel.appendLine('[DesignModuleCommands] User cancelled input');
                    return;
                }
            }

            outputChannel.appendLine(`[DesignModuleCommands] Generating modules for spec: ${specName}`);

            // 创建 ModularDesignManager 实例
            const manager = new ModularDesignManager(claudeProvider, outputChannel);

            // 使用进度提示执行生成
            const result = await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `正在生成设计模块（${specName}）`,
                    cancellable: false
                },
                async (progress) => {
                    progress.report({ message: '正在分析需求文档...' });

                    return await manager.generateDesignModules(specName!);
                }
            );

            // 刷新 TreeView
            refreshCallback();

            // 显示结果
            if (result.success) {
                const message = `设计模块生成完成！

成功: ${result.generatedModules.length} 个模块
跳过: ${result.skippedModules.length} 个模块（已存在）
失败: ${result.failedModules.length} 个模块`;

                if (result.failedModules.length > 0) {
                    vscode.window.showWarningMessage(
                        message,
                        '查看日志'
                    ).then(choice => {
                        if (choice === '查看日志') {
                            outputChannel.show();
                        }
                    });
                } else {
                    vscode.window.showInformationMessage(message);
                }
            } else {
                const errorMessage = `设计模块生成失败！

成功: ${result.generatedModules.length} 个模块
失败: ${result.failedModules.length} 个模块

失败的模块：
${result.failedModules.map(f => `- ${f.type}: ${f.error}`).join('\n')}`;

                vscode.window.showErrorMessage(
                    errorMessage,
                    '查看日志'
                ).then(choice => {
                    if (choice === '查看日志') {
                        outputChannel.show();
                    }
                });
            }

            outputChannel.appendLine('[DesignModuleCommands] Generate all modules completed');

        } catch (error) {
            outputChannel.appendLine(`[DesignModuleCommands] Error: ${error}`);
            vscode.window.showErrorMessage(
                `生成设计模块失败: ${(error as Error).message}`,
                '查看日志'
            ).then(choice => {
                if (choice === '查看日志') {
                    outputChannel.show();
                }
            });
        }
    };
}

/**
 * 处理生成特定模块的命令
 *
 * 这个命令会：
 * 1. 显示快速选择框让用户选择模块类型
 * 2. 显示进度提示
 * 3. 生成选中的模块
 * 4. 刷新 TreeView
 *
 * @param claudeProvider Claude Code 提供者
 * @param outputChannel VSCode 输出通道
 * @param refreshCallback TreeView 刷新回调函数
 * @returns 命令处理函数
 *
 * @example
 * ```typescript
 * const handler = handleGenerateSpecificModule(claudeProvider, outputChannel, () => {
 *     specExplorer.refresh();
 * });
 *
 * context.subscriptions.push(
 *     vscode.commands.registerCommand('kfc.spec.designModule.generateSpecific', handler)
 * );
 * ```
 */
export function handleGenerateSpecificModule(
    claudeProvider: ClaudeCodeProvider,
    outputChannel: vscode.OutputChannel,
    refreshCallback: () => void
) {
    return async (specName?: string, moduleType?: ModuleType) => {
        outputChannel.appendLine('');
        outputChannel.appendLine('[DesignModuleCommands] Generate specific module command triggered');

        try {
            // 如果没有提供 specName，提示用户输入
            if (!specName) {
                specName = await vscode.window.showInputBox({
                    prompt: '请输入 Spec 名称',
                    placeHolder: '例如: my-feature',
                    validateInput: (value) => {
                        if (!value || value.trim().length === 0) {
                            return '请输入有效的 Spec 名称';
                        }
                        return null;
                    }
                });

                if (!specName) {
                    outputChannel.appendLine('[DesignModuleCommands] User cancelled spec name input');
                    return;
                }
            }

            // 如果没有提供 moduleType，显示快速选择框
            if (!moduleType) {
                const moduleLabels: Record<ModuleType, string> = {
                    [ModuleType.Frontend]: '前端设计 (Frontend)',
                    [ModuleType.Mobile]: '移动端设计 (Mobile)',
                    [ModuleType.ServerApi]: '服务端 API (Server API)',
                    [ModuleType.ServerLogic]: '服务端逻辑 (Server Logic)',
                    [ModuleType.ServerDatabase]: '数据库设计 (Database)',
                    [ModuleType.Testing]: '测试设计 (Testing)'
                };

                const items = Object.entries(moduleLabels).map(([type, label]) => ({
                    label,
                    moduleType: type as ModuleType
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: '选择要生成的设计模块类型'
                });

                if (!selected) {
                    outputChannel.appendLine('[DesignModuleCommands] User cancelled module type selection');
                    return;
                }

                moduleType = selected.moduleType;
            }

            outputChannel.appendLine(`[DesignModuleCommands] Generating module ${moduleType} for spec: ${specName}`);

            // 创建 ModularDesignManager 实例
            const manager = new ModularDesignManager(claudeProvider, outputChannel);

            // 使用进度提示执行生成
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `正在生成 ${getModuleDisplayName(moduleType)} 模块`,
                    cancellable: false
                },
                async (progress) => {
                    progress.report({ message: '正在分析需求文档...' });
                    await manager.generateSpecificModule(specName!, moduleType!);
                }
            );

            // 刷新 TreeView
            refreshCallback();

            // 显示成功消息
            vscode.window.showInformationMessage(
                `${getModuleDisplayName(moduleType)} 模块生成成功！`
            );

            outputChannel.appendLine('[DesignModuleCommands] Generate specific module completed');

        } catch (error) {
            outputChannel.appendLine(`[DesignModuleCommands] Error: ${error}`);
            vscode.window.showErrorMessage(
                `生成模块失败: ${(error as Error).message}`,
                '查看日志'
            ).then(choice => {
                if (choice === '查看日志') {
                    outputChannel.show();
                }
            });
        }
    };
}

/**
 * 处理批准模块的命令
 *
 * 这个命令会：
 * 1. 更新模块状态为 'approved'
 * 2. 检查是否所有必需模块已批准
 * 3. 如果可以进入任务阶段，显示提示消息
 * 4. 刷新 TreeView
 *
 * @param claudeProvider Claude Code 提供者
 * @param outputChannel VSCode 输出通道
 * @param refreshCallback TreeView 刷新回调函数
 * @returns 命令处理函数
 */
export function handleApproveModule(
    claudeProvider: ClaudeCodeProvider,
    outputChannel: vscode.OutputChannel,
    refreshCallback: () => void
) {
    return async (specName: string, moduleType: ModuleType) => {
        outputChannel.appendLine('');
        outputChannel.appendLine(`[DesignModuleCommands] Approve module: ${moduleType} for spec: ${specName}`);

        try {
            const manager = new ModularDesignManager(claudeProvider, outputChannel);

            // 更新模块状态为 approved
            await manager.updateModuleWorkflowState(
                specName,
                moduleType,
                WorkflowState.Approved
            );

            // 刷新 TreeView
            refreshCallback();

            // 检查是否可以进入任务阶段
            const canProgress = await manager.canProgressToTasks(specName);

            if (canProgress) {
                vscode.window.showInformationMessage(
                    `${getModuleDisplayName(moduleType)} 模块已批准！\n\n所有必需的设计模块已批准，现在可以生成任务文档了。`,
                    '生成任务'
                ).then(choice => {
                    if (choice === '生成任务') {
                        // 触发生成任务命令
                        vscode.commands.executeCommand('kfc.spec.navigate.tasks', specName);
                    }
                });
            } else {
                vscode.window.showInformationMessage(
                    `${getModuleDisplayName(moduleType)} 模块已批准！`
                );
            }

            outputChannel.appendLine('[DesignModuleCommands] Approve module completed');

        } catch (error) {
            outputChannel.appendLine(`[DesignModuleCommands] Error: ${error}`);
            vscode.window.showErrorMessage(
                `批准模块失败: ${(error as Error).message}`
            );
        }
    };
}

/**
 * 处理拒绝模块的命令
 *
 * 这个命令会：
 * 1. 更新模块状态为 'rejected'
 * 2. 提示用户可以重新生成
 * 3. 刷新 TreeView
 *
 * @param claudeProvider Claude Code 提供者
 * @param outputChannel VSCode 输出通道
 * @param refreshCallback TreeView 刷新回调函数
 * @returns 命令处理函数
 */
export function handleRejectModule(
    claudeProvider: ClaudeCodeProvider,
    outputChannel: vscode.OutputChannel,
    refreshCallback: () => void
) {
    return async (specName: string, moduleType: ModuleType) => {
        outputChannel.appendLine('');
        outputChannel.appendLine(`[DesignModuleCommands] Reject module: ${moduleType} for spec: ${specName}`);

        try {
            const manager = new ModularDesignManager(claudeProvider, outputChannel);

            // 更新模块状态为 rejected
            await manager.updateModuleWorkflowState(
                specName,
                moduleType,
                WorkflowState.Rejected
            );

            // 刷新 TreeView
            refreshCallback();

            // 提示用户可以重新生成
            vscode.window.showWarningMessage(
                `${getModuleDisplayName(moduleType)} 模块已拒绝。`,
                '重新生成'
            ).then(choice => {
                if (choice === '重新生成') {
                    // 触发重新生成命令
                    vscode.commands.executeCommand(
                        'kfc.spec.designModule.regenerate',
                        specName,
                        moduleType
                    );
                }
            });

            outputChannel.appendLine('[DesignModuleCommands] Reject module completed');

        } catch (error) {
            outputChannel.appendLine(`[DesignModuleCommands] Error: ${error}`);
            vscode.window.showErrorMessage(
                `拒绝模块失败: ${(error as Error).message}`
            );
        }
    };
}

/**
 * 处理重新生成模块的命令
 *
 * 这个命令会：
 * 1. 确认是否覆盖现有内容
 * 2. 调用 generateSpecificModule 重新生成
 * 3. 刷新 TreeView
 *
 * @param claudeProvider Claude Code 提供者
 * @param outputChannel VSCode 输出通道
 * @param refreshCallback TreeView 刷新回调函数
 * @returns 命令处理函数
 */
export function handleRegenerateModule(
    claudeProvider: ClaudeCodeProvider,
    outputChannel: vscode.OutputChannel,
    refreshCallback: () => void
) {
    return async (specName: string, moduleType: ModuleType) => {
        outputChannel.appendLine('');
        outputChannel.appendLine(`[DesignModuleCommands] Regenerate module: ${moduleType} for spec: ${specName}`);

        try {
            // 确认是否覆盖现有内容
            const choice = await vscode.window.showWarningMessage(
                `确定要重新生成 ${getModuleDisplayName(moduleType)} 模块吗？这将覆盖现有内容。`,
                { modal: true },
                '重新生成',
                '取消'
            );

            if (choice !== '重新生成') {
                outputChannel.appendLine('[DesignModuleCommands] User cancelled regeneration');
                return;
            }

            const manager = new ModularDesignManager(claudeProvider, outputChannel);

            // 使用进度提示执行重新生成
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `正在重新生成 ${getModuleDisplayName(moduleType)} 模块`,
                    cancellable: false
                },
                async (progress) => {
                    progress.report({ message: '正在生成内容...' });
                    await manager.generateSpecificModule(specName, moduleType);
                }
            );

            // 刷新 TreeView
            refreshCallback();

            // 显示成功消息
            vscode.window.showInformationMessage(
                `${getModuleDisplayName(moduleType)} 模块已重新生成！`
            );

            outputChannel.appendLine('[DesignModuleCommands] Regenerate module completed');

        } catch (error) {
            outputChannel.appendLine(`[DesignModuleCommands] Error: ${error}`);
            vscode.window.showErrorMessage(
                `重新生成模块失败: ${(error as Error).message}`
            );
        }
    };
}

/**
 * 处理删除模块的命令
 *
 * 这个命令会：
 * 1. 显示确认对话框
 * 2. 删除模块文件和元数据
 * 3. 刷新 TreeView
 *
 * @param claudeProvider Claude Code 提供者
 * @param outputChannel VSCode 输出通道
 * @param refreshCallback TreeView 刷新回调函数
 * @returns 命令处理函数
 */
export function handleDeleteModule(
    claudeProvider: ClaudeCodeProvider,
    outputChannel: vscode.OutputChannel,
    refreshCallback: () => void
) {
    return async (specName: string, moduleType: ModuleType) => {
        outputChannel.appendLine('');
        outputChannel.appendLine(`[DesignModuleCommands] Delete module: ${moduleType} for spec: ${specName}`);

        try {
            // 显示确认对话框
            const choice = await vscode.window.showWarningMessage(
                `确定要删除 ${getModuleDisplayName(moduleType)} 模块吗？此操作无法撤销。`,
                { modal: true },
                '删除',
                '取消'
            );

            if (choice !== '删除') {
                outputChannel.appendLine('[DesignModuleCommands] User cancelled deletion');
                return;
            }

            const manager = new ModularDesignManager(claudeProvider, outputChannel);

            // 删除模块
            await manager.deleteModule(specName, moduleType);

            // 刷新 TreeView
            refreshCallback();

            // 显示成功消息
            vscode.window.showInformationMessage(
                `${getModuleDisplayName(moduleType)} 模块已删除。`
            );

            outputChannel.appendLine('[DesignModuleCommands] Delete module completed');

        } catch (error) {
            outputChannel.appendLine(`[DesignModuleCommands] Error: ${error}`);
            vscode.window.showErrorMessage(
                `删除模块失败: ${(error as Error).message}`
            );
        }
    };
}

/**
 * 处理迁移旧版设计的命令
 *
 * 这个命令会：
 * 1. 检测是否存在旧版 design.md 文件
 * 2. 调用 LegacyMigrator.showMigrationWizard() 显示向导
 * 3. 如果用户确认，分析旧文档内容
 * 4. 显示映射预览对话框，让用户确认章节到模块的映射
 * 5. 执行迁移：创建模块文件，复制对应章节内容
 * 6. 重命名旧文件为 design.md.backup
 * 7. 创建 .module-metadata.json 文件
 * 8. 刷新 TreeView 并显示成功通知
 *
 * @param claudeProvider Claude Code 提供者
 * @param outputChannel VSCode 输出通道
 * @param refreshCallback TreeView 刷新回调函数
 * @returns 命令处理函数
 *
 * @example
 * ```typescript
 * const handler = handleMigrateLegacyDesign(claudeProvider, outputChannel, () => {
 *     specExplorer.refresh();
 * });
 *
 * context.subscriptions.push(
 *     vscode.commands.registerCommand('kfc.spec.designModule.migrate', handler)
 * );
 * ```
 */
export function handleMigrateLegacyDesign(
    claudeProvider: ClaudeCodeProvider,
    outputChannel: vscode.OutputChannel,
    refreshCallback: () => void
) {
    return async (specName?: string) => {
        outputChannel.appendLine('');
        outputChannel.appendLine('='.repeat(80));
        outputChannel.appendLine('[Migration] Starting legacy design migration');
        outputChannel.appendLine('='.repeat(80));

        try {
            // 如果没有提供 specName，提示用户输入
            if (!specName) {
                specName = await vscode.window.showInputBox({
                    prompt: '请输入要迁移的 Spec 名称',
                    placeHolder: '例如: my-feature',
                    validateInput: (value) => {
                        if (!value || value.trim().length === 0) {
                            return '请输入有效的 Spec 名称';
                        }
                        return null;
                    }
                });

                if (!specName) {
                    outputChannel.appendLine('[Migration] User cancelled spec name input');
                    return;
                }
            }

            outputChannel.appendLine(`[Migration] Spec: ${specName}`);

            // 创建管理器实例
            const manager = new ModularDesignManager(claudeProvider, outputChannel);
            const migrator = new LegacyMigrator(outputChannel);

            // 步骤 1: 检测是否存在旧版 design.md 文件
            outputChannel.appendLine('[Migration] Step 1: Checking for legacy design.md');
            const hasLegacy = await manager.isLegacyDesign(specName);

            if (!hasLegacy) {
                outputChannel.appendLine('[Migration] No legacy design.md found');
                vscode.window.showInformationMessage(
                    `Spec "${specName}" 没有旧版 design.md 文件，无需迁移。`
                );
                return;
            }

            outputChannel.appendLine('[Migration] Legacy design.md detected');

            // 步骤 2: 显示迁移向导，询问用户是否迁移
            outputChannel.appendLine('[Migration] Step 2: Showing migration wizard');
            const shouldMigrate = await migrator.showMigrationWizard(specName);

            if (!shouldMigrate) {
                outputChannel.appendLine('[Migration] User declined migration');
                return;
            }

            // 步骤 3: 读取并分析旧文档内容
            outputChannel.appendLine('[Migration] Step 3: Reading and analyzing legacy content');
            const legacyContent = await readLegacyDesignContent(specName, outputChannel);
            const analysis = migrator.analyzeLegacyContent(legacyContent);

            outputChannel.appendLine(
                `[Migration] Found ${analysis.sections.size} sections mapped to ${analysis.suggestedModuleMapping.size} modules`
            );

            // 步骤 4: 显示映射预览对话框
            outputChannel.appendLine('[Migration] Step 4: Showing mapping preview');
            const userConfirmed = await showMappingPreview(analysis, specName, outputChannel);

            if (!userConfirmed) {
                outputChannel.appendLine('[Migration] User cancelled after preview');
                return;
            }

            // 步骤 5-8: 执行迁移
            outputChannel.appendLine('[Migration] Step 5-8: Executing migration');

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `迁移 "${specName}" 到模块化设计`,
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: '正在创建模块文件...' });

                // 调用 manager 执行迁移
                const result = await manager.migrateLegacyDesign(specName!);

                if (!result.success) {
                    throw new Error(`迁移失败: ${result.errors?.join(', ')}`);
                }

                progress.report({ increment: 100, message: '迁移完成' });

                outputChannel.appendLine(
                    `[Migration] Successfully migrated ${result.migratedModules.length} modules`
                );
                outputChannel.appendLine('[Migration] Migrated modules:');
                result.migratedModules.forEach(moduleType => {
                    outputChannel.appendLine(`  - ${moduleType}`);
                });
            });

            // 刷新 TreeView
            refreshCallback();

            // 显示成功通知
            const openFolder = '打开 Spec 目录';
            const choice = await vscode.window.showInformationMessage(
                `成功将 "${specName}" 迁移到模块化设计!\n\n` +
                `已创建 ${analysis.suggestedModuleMapping.size} 个模块文件，` +
                `旧版 design.md 已备份为 design.md.backup。`,
                openFolder
            );

            if (choice === openFolder) {
                await openSpecDirectory(specName);
            }

            outputChannel.appendLine('='.repeat(80));
            outputChannel.appendLine('[Migration] Migration completed successfully');
            outputChannel.appendLine('='.repeat(80));

        } catch (error) {
            outputChannel.appendLine(`[Migration] Error: ${error}`);

            vscode.window.showErrorMessage(
                `迁移失败: ${(error as Error).message}`,
                '查看日志'
            ).then(choice => {
                if (choice === '查看日志') {
                    outputChannel.show();
                }
            });
        }
    };
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 读取旧版 design.md 文件内容
 *
 * @param specName Spec 名称
 * @param outputChannel 输出通道
 * @returns 文件内容
 * @private
 */
async function readLegacyDesignContent(
    specName: string,
    outputChannel: vscode.OutputChannel
): Promise<string> {
    const configManager = ConfigManager.getInstance();
    const specBasePath = configManager.getPath('specs');
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
        throw new Error('No workspace folder found');
    }

    const legacyPath = path.join(
        workspaceFolder.uri.fsPath,
        specBasePath,
        specName,
        'design.md'
    );

    try {
        const content = await vscode.workspace.fs.readFile(vscode.Uri.file(legacyPath));
        return Buffer.from(content).toString('utf-8');
    } catch (error) {
        outputChannel.appendLine(`[Migration] Failed to read design.md: ${error}`);
        throw new Error(`无法读取 design.md 文件: ${error}`);
    }
}

/**
 * 显示章节到模块的映射预览
 *
 * 在执行迁移前，向用户展示分析结果，确认章节将如何映射到各个模块。
 *
 * @param analysis 内容分析结果
 * @param specName Spec 名称
 * @param outputChannel 输出通道
 * @returns 用户是否确认继续（true=继续，false=取消）
 * @private
 */
async function showMappingPreview(
    analysis: ContentAnalysis,
    specName: string,
    outputChannel: vscode.OutputChannel
): Promise<boolean> {
    // 构建预览信息
    const previewLines: string[] = [
        `将为 "${specName}" 创建以下模块文件：`,
        ''
    ];

    for (const [moduleType, sectionTitles] of analysis.suggestedModuleMapping) {
        const moduleDisplayName = getModuleDisplayName(moduleType);
        previewLines.push(`\n【${moduleDisplayName}】(design-${moduleType}.md)`);
        previewLines.push(`将包含 ${sectionTitles.length} 个章节：`);

        sectionTitles.forEach(title => {
            const section = analysis.sections.get(title);
            const confidence = section ? section.confidence : 0;
            const confidenceLabel = getConfidenceLabel(confidence);
            previewLines.push(`  • ${title} ${confidenceLabel}`);
        });
    }

    previewLines.push('');
    previewLines.push('注意：');
    previewLines.push('- 置信度表示系统对映射准确性的判断');
    previewLines.push('- 迁移后可以手动调整模块内容');
    previewLines.push('- 旧版 design.md 将备份为 design.md.backup');

    const previewText = previewLines.join('\n');

    // 记录到输出通道
    outputChannel.appendLine('[Migration] Mapping preview:');
    outputChannel.appendLine(previewText);

    // 显示确认对话框
    const result = await vscode.window.showInformationMessage(
        `映射预览：\n${previewText.substring(0, 300)}...\n\n完整信息请查看输出通道。\n\n确认要执行迁移吗？`,
        { modal: true },
        '查看完整映射',
        '确认迁移',
        '取消'
    );

    if (result === '查看完整映射') {
        // 创建一个临时文档显示完整映射
        const doc = await vscode.workspace.openTextDocument({
            content: previewText,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc, { preview: true });

        // 再次询问用户
        const confirm = await vscode.window.showInformationMessage(
            '确认要执行迁移吗？',
            { modal: true },
            '确认迁移',
            '取消'
        );

        return confirm === '确认迁移';
    }

    return result === '确认迁移';
}

/**
 * 获取置信度标签
 *
 * @param confidence 置信度（0-1）
 * @returns 置信度标签字符串
 * @private
 */
function getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.9) {
        return '[高置信度]';
    } else if (confidence >= 0.7) {
        return '[中置信度]';
    } else if (confidence >= 0.5) {
        return '[低置信度]';
    } else {
        return '[推测]';
    }
}

/**
 * 打开 Spec 目录
 *
 * @param specName Spec 名称
 * @private
 */
async function openSpecDirectory(specName: string): Promise<void> {
    const configManager = ConfigManager.getInstance();
    const specBasePath = configManager.getPath('specs');
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
        return;
    }

    const specPath = path.join(
        workspaceFolder.uri.fsPath,
        specBasePath,
        specName
    );

    const uri = vscode.Uri.file(specPath);
    await vscode.commands.executeCommand('revealFileInOS', uri);
}

/**
 * 获取模块的显示名称
 *
 * @param moduleType 模块类型
 * @returns 中文显示名称
 * @private
 */
function getModuleDisplayName(moduleType: ModuleType): string {
    const labels: Record<ModuleType, string> = {
        [ModuleType.Frontend]: '前端设计',
        [ModuleType.Mobile]: '移动端设计',
        [ModuleType.ServerApi]: '服务端 API',
        [ModuleType.ServerLogic]: '服务端逻辑',
        [ModuleType.ServerDatabase]: '数据库设计',
        [ModuleType.Testing]: '测试设计'
    };
    return labels[moduleType];
}

/**
 * 处理交叉引用分析的命令
 *
 * 这个命令会：
 * 1. 读取所有已生成的设计模块
 * 2. 调用 CrossReferenceAnalyzer.analyzeReferences() 分析引用
 * 3. 调用 detectInconsistencies() 检测不一致性
 * 4. 生成 VSCode 诊断信息并显示在问题面板
 * 5. 为每个不一致性提供导航到源位置的功能
 *
 * @param claudeProvider Claude Code 提供者
 * @param outputChannel VSCode 输出通道
 * @param refreshCallback TreeView 刷新回调函数
 * @returns 命令处理函数
 *
 * @example
 * ```typescript
 * const handler = handleAnalyzeReferences(claudeProvider, outputChannel, () => {
 *     specExplorer.refresh();
 * });
 *
 * context.subscriptions.push(
 *     vscode.commands.registerCommand('kfc.spec.designModule.analyzeReferences', handler)
 * );
 * ```
 */
export function handleAnalyzeReferences(
    claudeProvider: ClaudeCodeProvider,
    outputChannel: vscode.OutputChannel,
    refreshCallback: () => void
) {
    return async (specName?: string) => {
        outputChannel.appendLine('');
        outputChannel.appendLine('='.repeat(80));
        outputChannel.appendLine('[CrossRef] Starting cross-reference analysis');
        outputChannel.appendLine('='.repeat(80));

        try {
            // 如果没有提供 specName，提示用户输入
            if (!specName) {
                specName = await vscode.window.showInputBox({
                    prompt: '请输入 Spec 名称',
                    placeHolder: '例如: my-feature',
                    validateInput: (value) => {
                        if (!value || value.trim().length === 0) {
                            return '请输入有效的 Spec 名称';
                        }
                        return null;
                    }
                });

                if (!specName) {
                    outputChannel.appendLine('[CrossRef] User cancelled spec name input');
                    return;
                }
            }

            outputChannel.appendLine(`[CrossRef] Spec: ${specName}`);

            // 创建管理器和分析器实例
            const manager = new ModularDesignManager(claudeProvider, outputChannel);
            const CrossReferenceAnalyzer = (await import('./crossReferenceAnalyzer')).CrossReferenceAnalyzer;
            const analyzer = new CrossReferenceAnalyzer(outputChannel);

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `分析 "${specName}" 的模块引用...`,
                cancellable: false
            }, async (progress) => {
                // Step 1: 读取所有已生成的设计模块
                progress.report({ increment: 20, message: '读取设计模块...' });
                outputChannel.appendLine('[CrossRef] Step 1: Reading design modules');

                const moduleList = await manager.getModuleList(specName!);
                const existingModules = moduleList.filter(m => m.exists);

                outputChannel.appendLine(`[CrossRef] Found ${existingModules.length} existing modules`);

                if (existingModules.length === 0) {
                    vscode.window.showWarningMessage(
                        `Spec "${specName}" 没有已生成的设计模块，无法进行交叉引用分析。`
                    );
                    return;
                }

                // Step 2: 读取所有模块内容
                progress.report({ increment: 20, message: '加载模块内容...' });
                outputChannel.appendLine('[CrossRef] Step 2: Loading module contents');

                const modules = new Map<ModuleType, string>();
                for (const moduleInfo of existingModules) {
                    try {
                        const content = await manager.getModuleContent(specName!, moduleInfo.type);
                        modules.set(moduleInfo.type, content);
                        outputChannel.appendLine(`[CrossRef] Loaded: ${moduleInfo.type}`);
                    } catch (error) {
                        outputChannel.appendLine(`[CrossRef] Failed to load ${moduleInfo.type}: ${error}`);
                    }
                }

                // Step 3: 分析引用关系
                progress.report({ increment: 20, message: '分析引用关系...' });
                outputChannel.appendLine('[CrossRef] Step 3: Analyzing references');

                const referenceMap = analyzer.analyzeReferences(modules);

                let totalReferences = 0;
                for (const sourceModule in referenceMap) {
                    for (const targetModule in referenceMap[sourceModule]) {
                        totalReferences += referenceMap[sourceModule][targetModule].length;
                    }
                }

                outputChannel.appendLine(`[CrossRef] Found ${totalReferences} total references`);

                // Step 4: 检测不一致性
                progress.report({ increment: 20, message: '检测不一致性...' });
                outputChannel.appendLine('[CrossRef] Step 4: Detecting inconsistencies');

                const inconsistencies = analyzer.detectInconsistencies(modules);
                outputChannel.appendLine(`[CrossRef] Found ${inconsistencies.length} inconsistencies`);

                // Step 5: 生成诊断信息
                progress.report({ increment: 20, message: '生成诊断信息...' });
                outputChannel.appendLine('[CrossRef] Step 5: Generating diagnostics');

                const diagnosticCollection = vscode.languages.createDiagnosticCollection('kiro-modular-design');
                const diagnosticsMap = new Map<string, vscode.Diagnostic[]>();

                for (const inconsistency of inconsistencies) {
                    const sourceModuleFile = getModuleFilePath(specName!, inconsistency.module1);

                    const diagnostic = new vscode.Diagnostic(
                        new vscode.Range(0, 0, 0, 0),
                        inconsistency.description,
                        inconsistency.severity === 'error'
                            ? vscode.DiagnosticSeverity.Error
                            : vscode.DiagnosticSeverity.Warning
                    );

                    diagnostic.source = 'Kiro: 模块化设计交叉引用分析';

                    const targetModuleFile = getModuleFilePath(specName!, inconsistency.module2);
                    diagnostic.relatedInformation = [
                        new vscode.DiagnosticRelatedInformation(
                            new vscode.Location(
                                vscode.Uri.file(targetModuleFile),
                                new vscode.Range(0, 0, 0, 0)
                            ),
                            `相关模块: ${getModuleDisplayName(inconsistency.module2)}`
                        )
                    ];

                    if (inconsistency.suggestion) {
                        diagnostic.message += `\n\n建议: ${inconsistency.suggestion}`;
                    }

                    if (!diagnosticsMap.has(sourceModuleFile)) {
                        diagnosticsMap.set(sourceModuleFile, []);
                    }
                    diagnosticsMap.get(sourceModuleFile)!.push(diagnostic);

                    outputChannel.appendLine(`[CrossRef] Diagnostic: ${inconsistency.description}`);
                }

                // Step 6: 应用诊断到文件
                for (const [filePath, diagnostics] of diagnosticsMap.entries()) {
                    diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics);
                }

                // Step 7: 显示结果摘要
                outputChannel.appendLine('');
                outputChannel.appendLine('[CrossRef] Analysis Summary:');
                outputChannel.appendLine(`  - Total References: ${totalReferences}`);
                outputChannel.appendLine(`  - Total Inconsistencies: ${inconsistencies.length}`);
                outputChannel.appendLine(
                    `  - Errors: ${inconsistencies.filter(i => i.severity === 'error').length}`
                );
                outputChannel.appendLine(
                    `  - Warnings: ${inconsistencies.filter(i => i.severity === 'warning').length}`
                );
                outputChannel.appendLine('='.repeat(80));

                // 显示结果给用户
                if (inconsistencies.length === 0) {
                    vscode.window.showInformationMessage(
                        `✅ 交叉引用分析完成！未发现不一致性。\n共找到 ${totalReferences} 个模块间引用。`
                    );
                } else {
                    const errorCount = inconsistencies.filter(i => i.severity === 'error').length;
                    const warningCount = inconsistencies.filter(i => i.severity === 'warning').length;

                    const message = `⚠️ 交叉引用分析完成！\n` +
                        `发现 ${inconsistencies.length} 个不一致性：\n` +
                        `  - 错误: ${errorCount}\n` +
                        `  - 警告: ${warningCount}\n\n` +
                        `详情请查看"问题"面板。`;

                    const choice = await vscode.window.showWarningMessage(
                        message,
                        '查看问题面板',
                        '查看日志'
                    );

                    if (choice === '查看问题面板') {
                        vscode.commands.executeCommand('workbench.action.problems.focus');
                    } else if (choice === '查看日志') {
                        outputChannel.show();
                    }
                }
            });

        } catch (error) {
            outputChannel.appendLine(`[CrossRef] Error: ${error}`);

            vscode.window.showErrorMessage(
                `交叉引用分析失败: ${(error as Error).message}`,
                '查看日志'
            ).then(choice => {
                if (choice === '查看日志') {
                    outputChannel.show();
                }
            });
        }
    };
}

/**
 * 获取模块文件路径（用于交叉引用分析）
 *
 * @param specName Spec 名称
 * @param moduleType 模块类型
 * @returns 模块文件的完整路径
 * @private
 */
function getModuleFilePath(specName: string, moduleType: ModuleType): string {
    const configManager = ConfigManager.getInstance();
    const specBasePath = configManager.getPath('specs');
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
        throw new Error('No workspace folder found');
    }

    const fileName = `design-${moduleType}.md`;
    return path.join(
        workspaceFolder.uri.fsPath,
        specBasePath,
        specName,
        fileName
    );
}
