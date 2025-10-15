import * as vscode from 'vscode';
import * as path from 'path';
import { DEFAULT_PATHS, CONFIG_FILE_NAME, DEFAULT_VIEW_VISIBILITY } from '../constants';
import { ModularDesignConfig, ModuleType } from '../types/modularDesign';

export interface KfcSettings {
    paths: {
        specs: string;
        steering: string;
        settings: string;
    };
    views: {
        specs: { visible: boolean };
        steering: { visible: boolean };
        mcp: { visible: boolean };
        hooks: { visible: boolean };
        settings: { visible: boolean };
    };
    features?: {
        modularDesign?: ModularDesignConfig;
    };
}

/**
 * 默认模块化设计配置
 *
 * 功能默认禁用以保持向后兼容性。
 */
const DEFAULT_MODULAR_DESIGN_CONFIG: ModularDesignConfig = {
    enabled: false,
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
    cacheTTL: 300000, // 5 分钟
    customModules: [],
    autoMigrateLegacy: false,
    showMigrationPrompt: true,
    validateCrossReferences: true,
    warnOnInconsistencies: true
};

export class ConfigManager {
    private static instance: ConfigManager;
    private settings: KfcSettings | null = null;
    private workspaceFolder: vscode.WorkspaceFolder | undefined;

    // Internal constants
    private static readonly TERMINAL_VENV_ACTIVATION_DELAY = 800; // ms

    private constructor() {
        this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    }

    static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    async loadSettings(): Promise<KfcSettings> {
        if (!this.workspaceFolder) {
            return this.getDefaultSettings();
        }

        const settingsPath = path.join(
            this.workspaceFolder.uri.fsPath,
            DEFAULT_PATHS.settings,
            CONFIG_FILE_NAME
        );

        try {
            const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(settingsPath));
            const userSettings = JSON.parse(Buffer.from(fileContent).toString());
            const defaultSettings = this.getDefaultSettings();

            // 深度合并配置，确保嵌套对象也被正确合并
            const mergedSettings: KfcSettings = {
                paths: { ...defaultSettings.paths, ...userSettings.paths },
                views: { ...defaultSettings.views, ...userSettings.views },
                features: {
                    modularDesign: {
                        ...defaultSettings.features?.modularDesign,
                        ...userSettings.features?.modularDesign
                    }
                }
            };

            this.settings = mergedSettings;
            return this.settings!;
        } catch (error) {
            // Return default settings if file doesn't exist
            this.settings = this.getDefaultSettings();
            return this.settings!;
        }
    }

    getSettings(): KfcSettings {
        if (!this.settings) {
            this.settings = this.getDefaultSettings();
        }
        return this.settings;
    }

    getPath(type: keyof typeof DEFAULT_PATHS): string {
        const settings = this.getSettings();
        const rawPath = settings.paths[type] || DEFAULT_PATHS[type];
        const normalized = this.normalizePath(rawPath);
        return normalized || this.normalizePath(DEFAULT_PATHS[type]);
    }

    /**
     * Normalizes a path for consistent matching:
     * - Removes leading ./ or .\
     * - Converts backslashes to forward slashes
     * - Collapses duplicate separators and trims trailing slashes
     */
    private normalizePath(inputPath: string): string {
        if (!inputPath) {
            return inputPath;
        }

        // Start by trimming whitespace and removing repeated leading ./ or .\
        let normalized = inputPath.trim().replace(/^(\.\/|\.\\)+/, '');

        // Normalize path separators to forward slashes for glob compatibility
        normalized = normalized.replace(/\\/g, '/');

        // Collapse any duplicate separators that may result from user input
        normalized = normalized.replace(/\/{2,}/g, '/');

        // Remove trailing slashes for consistent matching
        normalized = normalized.replace(/\/+$/, '');

        return normalized;
    }

    getAbsolutePath(type: keyof typeof DEFAULT_PATHS): string {
        if (!this.workspaceFolder) {
            throw new Error('No workspace folder found');
        }
        return path.join(this.workspaceFolder.uri.fsPath, this.getPath(type));
    }

    getTerminalDelay(): number {
        return ConfigManager.TERMINAL_VENV_ACTIVATION_DELAY;
    }

    /**
     * 获取模块化设计配置
     *
     * 返回模块化设计的配置，如果未配置则返回默认配置。
     * 会合并用户配置和默认配置，确保所有字段都有值。
     *
     * @returns 模块化设计配置
     */
    getModularDesignConfig(): ModularDesignConfig {
        const settings = this.getSettings();
        const userConfig = settings.features?.modularDesign;

        // 如果没有用户配置，返回默认配置
        if (!userConfig) {
            return { ...DEFAULT_MODULAR_DESIGN_CONFIG };
        }

        // 合并用户配置和默认配置，用户配置优先
        return {
            enabled: userConfig.enabled ?? DEFAULT_MODULAR_DESIGN_CONFIG.enabled,
            defaultModules: userConfig.defaultModules ?? DEFAULT_MODULAR_DESIGN_CONFIG.defaultModules,
            fileNamingPattern: userConfig.fileNamingPattern ?? DEFAULT_MODULAR_DESIGN_CONFIG.fileNamingPattern,
            autoDetectModules: userConfig.autoDetectModules ?? DEFAULT_MODULAR_DESIGN_CONFIG.autoDetectModules,
            parallelGeneration: userConfig.parallelGeneration ?? DEFAULT_MODULAR_DESIGN_CONFIG.parallelGeneration,
            cacheEnabled: userConfig.cacheEnabled ?? DEFAULT_MODULAR_DESIGN_CONFIG.cacheEnabled,
            cacheTTL: userConfig.cacheTTL ?? DEFAULT_MODULAR_DESIGN_CONFIG.cacheTTL,
            customModules: userConfig.customModules ?? DEFAULT_MODULAR_DESIGN_CONFIG.customModules,
            autoMigrateLegacy: userConfig.autoMigrateLegacy ?? DEFAULT_MODULAR_DESIGN_CONFIG.autoMigrateLegacy,
            showMigrationPrompt: userConfig.showMigrationPrompt ?? DEFAULT_MODULAR_DESIGN_CONFIG.showMigrationPrompt,
            validateCrossReferences: userConfig.validateCrossReferences ?? DEFAULT_MODULAR_DESIGN_CONFIG.validateCrossReferences,
            warnOnInconsistencies: userConfig.warnOnInconsistencies ?? DEFAULT_MODULAR_DESIGN_CONFIG.warnOnInconsistencies
        };
    }

    private getDefaultSettings(): KfcSettings {
        return {
            paths: { ...DEFAULT_PATHS },
            views: {
                specs: { visible: DEFAULT_VIEW_VISIBILITY.specs },
                steering: { visible: DEFAULT_VIEW_VISIBILITY.steering },
                mcp: { visible: DEFAULT_VIEW_VISIBILITY.mcp },
                hooks: { visible: DEFAULT_VIEW_VISIBILITY.hooks },
                settings: { visible: DEFAULT_VIEW_VISIBILITY.settings }
            },
            features: {
                modularDesign: { ...DEFAULT_MODULAR_DESIGN_CONFIG }
            }
        };
    }

    async saveSettings(settings: KfcSettings): Promise<void> {
        if (!this.workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const settingsDir = path.join(
            this.workspaceFolder.uri.fsPath,
            DEFAULT_PATHS.settings
        );
        const settingsPath = path.join(settingsDir, CONFIG_FILE_NAME);

        // Ensure directory exists
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(settingsDir));

        // Save settings
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(settingsPath),
            Buffer.from(JSON.stringify(settings, null, 2))
        );

        this.settings = settings;
    }
}
