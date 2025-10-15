import * as vscode from 'vscode';
import * as path from 'path';
import { SpecManager } from '../features/spec/specManager';
import { ConfigManager } from '../utils/configManager';
import { ModularDesignManager } from '../features/spec/modularDesignManager';
import { ClaudeCodeProvider } from './claudeCodeProvider';
import { ModuleType, ModuleInfo, WorkflowState } from '../types/modularDesign';

export class SpecExplorerProvider implements vscode.TreeDataProvider<SpecItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SpecItem | undefined | null | void> = new vscode.EventEmitter<SpecItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SpecItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private specManager!: SpecManager;
    private claudeProvider!: ClaudeCodeProvider;
    private outputChannel: vscode.OutputChannel;
    private isLoading: boolean = false;
    private configManager: ConfigManager;

    constructor(private context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        // We'll set the spec manager later from extension.ts
        this.outputChannel = outputChannel;
        this.configManager = ConfigManager.getInstance();
    }

    setSpecManager(specManager: SpecManager) {
        this.specManager = specManager;
    }

    setClaudeProvider(claudeProvider: ClaudeCodeProvider) {
        this.claudeProvider = claudeProvider;
    }
    
    refresh(): void {
        this.isLoading = true;
        this._onDidChangeTreeData.fire(); // Show loading state immediately
        
        // Simulate async loading
        setTimeout(() => {
            this.isLoading = false;
            this._onDidChangeTreeData.fire(); // Show actual content
        }, 100);
    }
    
    getTreeItem(element: SpecItem): vscode.TreeItem {
        return element;
    }
    
    async getChildren(element?: SpecItem): Promise<SpecItem[]> {

        if (!vscode.workspace.workspaceFolders || !this.specManager) {
            return [];
        }

        if (!element) {
            // Root level - show loading state or specs
            const items: SpecItem[] = [];

            if (this.isLoading) {
                // Show loading state
                items.push(new SpecItem(
                    'Loading specs...',
                    vscode.TreeItemCollapsibleState.None,
                    'spec-loading',
                    this.context
                ));
                return items;
            }

            // Show all specs
            const specs = await this.specManager.getSpecList();
            const specItems = specs.map(specName => new SpecItem(
                specName,
                vscode.TreeItemCollapsibleState.Expanded,
                'spec',
                this.context,
                specName
            ));

            return specItems;
        } else if (element.contextValue === 'spec') {
            // Check if modular design is enabled
            const settings = await this.configManager.loadSettings();
            const modularDesignConfig = this.configManager.getModularDesignConfig();

            if (modularDesignConfig.enabled) {
                return this.getModularDesignChildren(element);
            } else {
                return this.getLegacyDesignChildren(element);
            }
        } else if (element.contextValue === 'spec-design-modules') {
            // Expand Design Modules node
            return this.getDesignModuleChildren(element);
        }

        return [];
    }

    /**
     * Get children for legacy (single design.md) structure
     */
    private async getLegacyDesignChildren(specItem: SpecItem): Promise<SpecItem[]> {
        const specsPath = await this.specManager.getSpecBasePath();
        const specPath = `${specsPath}/${specItem.specName}`;

        return [
            new SpecItem(
                'requirements',
                vscode.TreeItemCollapsibleState.None,
                'spec-document-requirements',
                this.context,
                specItem.specName!,
                'requirements',
                {
                    command: 'kfc.spec.navigate.requirements',
                    title: 'Open Requirements',
                    arguments: [specItem.specName]
                },
                `${specPath}/requirements.md`
            ),
            new SpecItem(
                'design',
                vscode.TreeItemCollapsibleState.None,
                'spec-document-design',
                this.context,
                specItem.specName!,
                'design',
                {
                    command: 'kfc.spec.navigate.design',
                    title: 'Open Design',
                    arguments: [specItem.specName]
                },
                `${specPath}/design.md`
            ),
            new SpecItem(
                'tasks',
                vscode.TreeItemCollapsibleState.None,
                'spec-document-tasks',
                this.context,
                specItem.specName!,
                'tasks',
                {
                    command: 'kfc.spec.navigate.tasks',
                    title: 'Open Tasks',
                    arguments: [specItem.specName]
                },
                `${specPath}/tasks.md`
            )
        ];
    }

    /**
     * Get children for modular design structure
     */
    private async getModularDesignChildren(specItem: SpecItem): Promise<SpecItem[]> {
        const specsPath = await this.specManager.getSpecBasePath();
        const specPath = `${specsPath}/${specItem.specName}`;
        const children: SpecItem[] = [];

        // Requirements document
        children.push(new SpecItem(
            'requirements',
            vscode.TreeItemCollapsibleState.None,
            'spec-document-requirements',
            this.context,
            specItem.specName!,
            'requirements',
            {
                command: 'kfc.spec.navigate.requirements',
                title: 'Open Requirements',
                arguments: [specItem.specName]
            },
            `${specPath}/requirements.md`
        ));

        // Design Modules node (expandable)
        const designModulesItem = new SpecItem(
            'Design Modules',
            vscode.TreeItemCollapsibleState.Expanded,
            'spec-design-modules',
            this.context,
            specItem.specName
        );
        designModulesItem.iconPath = new vscode.ThemeIcon('layers');
        designModulesItem.tooltip = 'Modular design documents';
        children.push(designModulesItem);

        // Tasks document
        children.push(new SpecItem(
            'tasks',
            vscode.TreeItemCollapsibleState.None,
            'spec-document-tasks',
            this.context,
            specItem.specName!,
            'tasks',
            {
                command: 'kfc.spec.navigate.tasks',
                title: 'Open Tasks',
                arguments: [specItem.specName]
            },
            `${specPath}/tasks.md`
        ));

        return children;
    }

    /**
     * Get children for Design Modules node (individual modules)
     */
    private async getDesignModuleChildren(parentItem: SpecItem): Promise<SpecItem[]> {
        if (!this.claudeProvider) {
            this.outputChannel.appendLine('[SpecExplorerProvider] Claude provider not set, cannot load modules');
            return [];
        }

        try {
            const modularDesignManager = new ModularDesignManager(
                this.claudeProvider,
                this.outputChannel
            );

            const moduleList = await modularDesignManager.getModuleList(parentItem.specName!);

            return moduleList.map(moduleInfo => {
                const label = this.getModuleLabel(moduleInfo.type);
                const icon = this.getModuleIcon(moduleInfo);

                const item = new SpecItem(
                    label,
                    vscode.TreeItemCollapsibleState.None,
                    `spec-design-module-${moduleInfo.type}`,
                    this.context,
                    parentItem.specName,
                    `design-${moduleInfo.type}`,
                    {
                        command: 'kfc.spec.navigate.designModule',
                        title: `Open ${label}`,
                        arguments: [parentItem.specName, moduleInfo.type]
                    }
                );

                item.iconPath = icon;
                item.tooltip = this.getModuleTooltip(moduleInfo);

                return item;
            });
        } catch (error) {
            this.outputChannel.appendLine(`[SpecExplorerProvider] Error loading modules: ${error}`);
            return [];
        }
    }

    /**
     * Get localized label for module type
     */
    private getModuleLabel(moduleType: ModuleType): string {
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
     * Get icon for module based on its state
     */
    private getModuleIcon(moduleInfo: ModuleInfo): vscode.ThemeIcon {
        if (!moduleInfo.exists) {
            return new vscode.ThemeIcon('file-add',
                new vscode.ThemeColor('editorWarning.foreground'));
        }

        switch (moduleInfo.workflowState) {
            case WorkflowState.PendingReview:
                return new vscode.ThemeIcon('eye',
                    new vscode.ThemeColor('editorInfo.foreground'));
            case WorkflowState.Approved:
                return new vscode.ThemeIcon('check',
                    new vscode.ThemeColor('testing.iconPassed'));
            case WorkflowState.Rejected:
                return new vscode.ThemeIcon('close',
                    new vscode.ThemeColor('editorError.foreground'));
            default:
                return new vscode.ThemeIcon('file');
        }
    }

    /**
     * Get tooltip text for module
     */
    private getModuleTooltip(moduleInfo: ModuleInfo): string {
        if (!moduleInfo.exists) {
            return '模块尚未生成';
        }

        let tooltip = `状态: ${this.getWorkflowStateLabel(moduleInfo.workflowState)}`;
        if (moduleInfo.lastModified) {
            tooltip += `\n最后修改: ${moduleInfo.lastModified.toLocaleString()}`;
        }

        return tooltip;
    }

    /**
     * Get localized label for workflow state
     */
    private getWorkflowStateLabel(state: WorkflowState): string {
        const labels: Record<WorkflowState, string> = {
            [WorkflowState.NotGenerated]: '未生成',
            [WorkflowState.PendingReview]: '待审核',
            [WorkflowState.Approved]: '已批准',
            [WorkflowState.Rejected]: '已拒绝'
        };
        return labels[state];
    }
}

class SpecItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        private readonly context: vscode.ExtensionContext,
        public readonly specName?: string,
        public readonly documentType?: string,
        public readonly command?: vscode.Command,
        private readonly filePath?: string
    ) {
        super(label, collapsibleState);
        
        if (contextValue === 'spec-loading') {
            this.iconPath = new vscode.ThemeIcon('sync~spin');
            this.tooltip = 'Loading specs...';
        } else if (contextValue === 'spec') {
            this.iconPath = new vscode.ThemeIcon('package');
            this.tooltip = `Spec: ${label}`;
        } else if (contextValue === 'spec-document') {
            // Different icons for different document types
            if (documentType === 'requirements') {
                this.iconPath = new vscode.ThemeIcon('chip');
                this.tooltip = `Requirements: ${specName}/${label}`;
            } else if (documentType === 'design') {
                this.iconPath = new vscode.ThemeIcon('layers');
                this.tooltip = `Design: ${specName}/${label}`;
            } else if (documentType === 'tasks') {
                this.iconPath = new vscode.ThemeIcon('tasklist');
                this.tooltip = `Tasks: ${specName}/${label}`;
            } else {
                this.iconPath = new vscode.ThemeIcon('file');
                this.tooltip = `${documentType}: ${specName}/${label}`;
            }
            
            // Set description to file path
            if (filePath) {
                this.description = filePath;
            }
            
            // Add context menu items
            if (documentType === 'requirements' || documentType === 'design' || documentType === 'tasks') {
                this.contextValue = `spec-document-${documentType}`;
            }
        }
    }
}