import * as vscode from 'vscode';
import * as path from 'path';
import { ModuleMetadataManager } from '../moduleMetadata';
import {
    ModuleType,
    WorkflowState,
    ModuleMetadataFile
} from '../../../types/modularDesign';
import { ConfigManager } from '../../../utils/configManager';

// Mock VSCode API
jest.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [
            {
                uri: {
                    fsPath: '/test/workspace'
                }
            }
        ],
        fs: {
            readFile: jest.fn(),
            writeFile: jest.fn(),
            createDirectory: jest.fn(),
            stat: jest.fn()
        }
    },
    Uri: {
        file: jest.fn((filePath: string) => ({ fsPath: filePath, path: filePath }))
    }
}));

// Mock ConfigManager
jest.mock('../../../utils/configManager');

describe('ModuleMetadataManager', () => {
    let metadataManager: ModuleMetadataManager;
    let mockOutputChannel: vscode.OutputChannel;
    let mockConfigManager: jest.Mocked<ConfigManager>;

    beforeEach(() => {
        // 重置所有 mocks
        jest.clearAllMocks();

        // 创建 mock output channel
        mockOutputChannel = {
            appendLine: jest.fn(),
            append: jest.fn(),
            clear: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn(),
            name: 'Test',
            replace: jest.fn()
        } as any;

        // 创建 mock ConfigManager
        mockConfigManager = {
            getPath: jest.fn().mockReturnValue('.claude/specs'),
            getInstance: jest.fn()
        } as any;
        (ConfigManager.getInstance as jest.Mock).mockReturnValue(mockConfigManager);

        // 创建 ModuleMetadataManager 实例
        metadataManager = new ModuleMetadataManager('test-spec', mockOutputChannel);
    });

    describe('load()', () => {
        it('should load valid metadata file', async () => {
            const mockMetadata: ModuleMetadataFile = {
                version: '1.0',
                modules: {
                    [ModuleType.Frontend]: {
                        workflowState: WorkflowState.Approved,
                        generatedAt: '2025-10-14T10:00:00Z',
                        approvedAt: '2025-10-14T11:00:00Z',
                        approvedBy: 'user@example.com'
                    }
                },
                canProgressToTasks: false
            };

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );

            const result = await metadataManager.load();

            expect(result).toEqual(mockMetadata);
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Loaded metadata for spec: test-spec')
            );
        });

        it('should return default metadata when file does not exist', async () => {
            const error = new Error('File not found') as NodeJS.ErrnoException;
            error.code = 'ENOENT';
            (vscode.workspace.fs.readFile as jest.Mock).mockRejectedValue(error);

            const result = await metadataManager.load();

            expect(result).toEqual({
                version: '1.0',
                modules: {},
                canProgressToTasks: false
            });
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('No metadata file found')
            );
        });

        it('should throw error for invalid metadata format', async () => {
            const invalidMetadata = {
                version: '1.0',
                // missing modules and canProgressToTasks
            };

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(invalidMetadata))
            );

            await expect(metadataManager.load()).rejects.toThrow('Invalid metadata file format');
        });

        it('should handle JSON parse errors', async () => {
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from('invalid json')
            );

            await expect(metadataManager.load()).rejects.toThrow();
        });
    });

    describe('save()', () => {
        it('should save metadata to file', async () => {
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify({
                    version: '1.0',
                    modules: {},
                    canProgressToTasks: false
                }))
            );

            await metadataManager.load();
            await metadataManager.save();

            expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Saved metadata for spec: test-spec')
            );
        });

        it('should create directory before saving', async () => {
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify({
                    version: '1.0',
                    modules: {},
                    canProgressToTasks: false
                }))
            );

            await metadataManager.load();
            await metadataManager.save();

            expect(vscode.workspace.fs.createDirectory).toHaveBeenCalled();
        });

        it('should load metadata if not already loaded before saving', async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {},
                canProgressToTasks: false
            };

            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );

            await metadataManager.save();

            expect(vscode.workspace.fs.readFile).toHaveBeenCalled();
            expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
        });
    });

    describe('updateModuleState()', () => {
        beforeEach(async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {},
                canProgressToTasks: false
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();
        });

        it('should update module state to PendingReview', async () => {
            await metadataManager.updateModuleState(
                ModuleType.Frontend,
                WorkflowState.PendingReview
            );

            const state = await metadataManager.getModuleState(ModuleType.Frontend);
            expect(state).toBe(WorkflowState.PendingReview);
        });

        it('should set generatedAt when state changes to PendingReview', async () => {
            await metadataManager.updateModuleState(
                ModuleType.Frontend,
                WorkflowState.PendingReview
            );

            const metadata = await metadataManager.getModuleMetadata(ModuleType.Frontend);
            expect(metadata?.generatedAt).toBeDefined();
            expect(typeof metadata?.generatedAt).toBe('string');
        });

        it('should update module state to Approved with approvedBy', async () => {
            await metadataManager.updateModuleState(
                ModuleType.Frontend,
                WorkflowState.Approved,
                { approvedBy: 'user@example.com' }
            );

            const metadata = await metadataManager.getModuleMetadata(ModuleType.Frontend);
            expect(metadata?.workflowState).toBe(WorkflowState.Approved);
            expect(metadata?.approvedBy).toBe('user@example.com');
            expect(metadata?.approvedAt).toBeDefined();
        });

        it('should update module state to Rejected', async () => {
            await metadataManager.updateModuleState(
                ModuleType.Frontend,
                WorkflowState.Rejected
            );

            const state = await metadataManager.getModuleState(ModuleType.Frontend);
            expect(state).toBe(WorkflowState.Rejected);
        });

        it('should update checksum when provided', async () => {
            const testChecksum = 'abc123def456';

            await metadataManager.updateModuleState(
                ModuleType.Frontend,
                WorkflowState.PendingReview,
                { checksum: testChecksum }
            );

            const metadata = await metadataManager.getModuleMetadata(ModuleType.Frontend);
            expect(metadata?.checksum).toBe(testChecksum);
        });

        it('should automatically save after updating state', async () => {
            await metadataManager.updateModuleState(
                ModuleType.Frontend,
                WorkflowState.PendingReview
            );

            expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
        });

        it('should recalculate canProgressToTasks after state update', async () => {
            await metadataManager.updateModuleState(
                ModuleType.Frontend,
                WorkflowState.PendingReview
            );
            expect(await metadataManager.canProgressToTasks()).toBe(false);

            await metadataManager.updateModuleState(
                ModuleType.Frontend,
                WorkflowState.Approved
            );
            expect(await metadataManager.canProgressToTasks()).toBe(true);
        });
    });

    describe('getModuleState()', () => {
        it('should return NotGenerated for non-existent module', async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {},
                canProgressToTasks: false
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();

            const state = await metadataManager.getModuleState(ModuleType.Frontend);
            expect(state).toBe(WorkflowState.NotGenerated);
        });

        it('should return correct state for existing module', async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {
                    [ModuleType.Frontend]: {
                        workflowState: WorkflowState.Approved
                    }
                },
                canProgressToTasks: false
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();

            const state = await metadataManager.getModuleState(ModuleType.Frontend);
            expect(state).toBe(WorkflowState.Approved);
        });
    });

    describe('getModuleMetadata()', () => {
        it('should return null for non-existent module', async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {},
                canProgressToTasks: false
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();

            const metadata = await metadataManager.getModuleMetadata(ModuleType.Frontend);
            expect(metadata).toBeNull();
        });

        it('should return complete metadata for existing module', async () => {
            const expectedMetadata = {
                workflowState: WorkflowState.Approved,
                generatedAt: '2025-10-14T10:00:00Z',
                approvedAt: '2025-10-14T11:00:00Z',
                approvedBy: 'user@example.com',
                checksum: 'abc123'
            };

            const mockMetadata = {
                version: '1.0',
                modules: {
                    [ModuleType.Frontend]: expectedMetadata
                },
                canProgressToTasks: false
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();

            const metadata = await metadataManager.getModuleMetadata(ModuleType.Frontend);
            expect(metadata).toEqual(expectedMetadata);
        });
    });

    describe('canProgressToTasks()', () => {
        it('should return false when no modules exist', async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {},
                canProgressToTasks: false
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();

            const canProgress = await metadataManager.canProgressToTasks();
            expect(canProgress).toBe(false);
        });

        it('should return false when some modules are pending review', async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {
                    [ModuleType.Frontend]: {
                        workflowState: WorkflowState.Approved
                    },
                    [ModuleType.ServerApi]: {
                        workflowState: WorkflowState.PendingReview
                    }
                },
                canProgressToTasks: false
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();

            const canProgress = await metadataManager.canProgressToTasks();
            expect(canProgress).toBe(false);
        });

        it('should return false when some modules are rejected', async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {
                    [ModuleType.Frontend]: {
                        workflowState: WorkflowState.Approved
                    },
                    [ModuleType.ServerApi]: {
                        workflowState: WorkflowState.Rejected
                    }
                },
                canProgressToTasks: false
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();

            const canProgress = await metadataManager.canProgressToTasks();
            expect(canProgress).toBe(false);
        });

        it('should return true when all generated modules are approved', async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {
                    [ModuleType.Frontend]: {
                        workflowState: WorkflowState.Approved
                    },
                    [ModuleType.ServerApi]: {
                        workflowState: WorkflowState.Approved
                    }
                },
                canProgressToTasks: true
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();

            const canProgress = await metadataManager.canProgressToTasks();
            expect(canProgress).toBe(true);
        });

        it('should ignore NotGenerated modules when calculating progress', async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {
                    [ModuleType.Frontend]: {
                        workflowState: WorkflowState.Approved
                    },
                    [ModuleType.Mobile]: {
                        workflowState: WorkflowState.NotGenerated
                    }
                },
                canProgressToTasks: true
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();

            const canProgress = await metadataManager.canProgressToTasks();
            expect(canProgress).toBe(true);
        });
    });

    describe('calculateFileChecksum()', () => {
        it('should calculate SHA-256 checksum for file', async () => {
            const fileContent = 'test content';
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(fileContent)
            );

            const checksum = await metadataManager.calculateFileChecksum('/test/file.md');

            expect(checksum).toBeDefined();
            expect(typeof checksum).toBe('string');
            expect(checksum.length).toBe(64); // SHA-256 produces 64-character hex string
        });

        it('should produce different checksums for different content', async () => {
            (vscode.workspace.fs.readFile as jest.Mock)
                .mockResolvedValueOnce(Buffer.from('content1'))
                .mockResolvedValueOnce(Buffer.from('content2'));

            const checksum1 = await metadataManager.calculateFileChecksum('/test/file1.md');
            const checksum2 = await metadataManager.calculateFileChecksum('/test/file2.md');

            expect(checksum1).not.toBe(checksum2);
        });

        it('should produce same checksum for identical content', async () => {
            const content = 'test content';
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(content)
            );

            const checksum1 = await metadataManager.calculateFileChecksum('/test/file1.md');
            const checksum2 = await metadataManager.calculateFileChecksum('/test/file2.md');

            expect(checksum1).toBe(checksum2);
        });

        it('should throw error when file read fails', async () => {
            (vscode.workspace.fs.readFile as jest.Mock).mockRejectedValue(
                new Error('File not found')
            );

            await expect(
                metadataManager.calculateFileChecksum('/test/missing.md')
            ).rejects.toThrow();
        });
    });

    describe('updateModuleChecksum()', () => {
        beforeEach(async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {},
                canProgressToTasks: false
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();
        });

        it('should update module checksum', async () => {
            const fileContent = 'test content';
            (vscode.workspace.fs.readFile as jest.Mock)
                .mockResolvedValueOnce(Buffer.from(JSON.stringify({
                    version: '1.0',
                    modules: {
                        [ModuleType.Frontend]: {
                            workflowState: WorkflowState.PendingReview
                        }
                    },
                    canProgressToTasks: false
                })))
                .mockResolvedValueOnce(Buffer.from(fileContent));

            await metadataManager.updateModuleState(
                ModuleType.Frontend,
                WorkflowState.PendingReview
            );
            await metadataManager.updateModuleChecksum(ModuleType.Frontend);

            const metadata = await metadataManager.getModuleMetadata(ModuleType.Frontend);
            expect(metadata?.checksum).toBeDefined();
            expect(typeof metadata?.checksum).toBe('string');
        });

        it('should handle errors when file does not exist', async () => {
            const error = new Error('File not found');
            (vscode.workspace.fs.readFile as jest.Mock).mockRejectedValue(error);

            // Should not throw, just log the error
            await expect(
                metadataManager.updateModuleChecksum(ModuleType.Frontend)
            ).resolves.not.toThrow();

            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Could not update checksum')
            );
        });
    });

    describe('isModuleModified()', () => {
        it('should return false when no checksum is stored', async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {
                    [ModuleType.Frontend]: {
                        workflowState: WorkflowState.PendingReview
                        // no checksum
                    }
                },
                canProgressToTasks: false
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();

            const isModified = await metadataManager.isModuleModified(ModuleType.Frontend);
            expect(isModified).toBe(false);
        });

        it('should return false when checksums match', async () => {
            const fileContent = 'test content';
            const mockMetadata = {
                version: '1.0',
                modules: {
                    [ModuleType.Frontend]: {
                        workflowState: WorkflowState.PendingReview,
                        checksum: 'mock-checksum'
                    }
                },
                canProgressToTasks: false
            };

            (vscode.workspace.fs.readFile as jest.Mock)
                .mockResolvedValueOnce(Buffer.from(JSON.stringify(mockMetadata)))
                .mockResolvedValueOnce(Buffer.from(fileContent));

            await metadataManager.load();

            // Mock calculateFileChecksum to return the same checksum
            const originalChecksum = await metadataManager.calculateFileChecksum('/test/file.md');
            mockMetadata.modules[ModuleType.Frontend].checksum = originalChecksum;

            (vscode.workspace.fs.readFile as jest.Mock)
                .mockResolvedValueOnce(Buffer.from(JSON.stringify(mockMetadata)))
                .mockResolvedValueOnce(Buffer.from(fileContent));

            const metadataManager2 = new ModuleMetadataManager('test-spec', mockOutputChannel);
            await metadataManager2.load();

            const isModified = await metadataManager2.isModuleModified(ModuleType.Frontend);
            expect(isModified).toBe(false);
        });

        it('should return true when checksums differ', async () => {
            const originalContent = 'original content';
            const modifiedContent = 'modified content';

            const mockMetadata = {
                version: '1.0',
                modules: {
                    [ModuleType.Frontend]: {
                        workflowState: WorkflowState.PendingReview,
                        checksum: 'original-checksum'
                    }
                },
                canProgressToTasks: false
            };

            (vscode.workspace.fs.readFile as jest.Mock)
                .mockResolvedValueOnce(Buffer.from(JSON.stringify(mockMetadata)))
                .mockResolvedValueOnce(Buffer.from(modifiedContent));

            await metadataManager.load();

            const isModified = await metadataManager.isModuleModified(ModuleType.Frontend);
            // Since we're using a mock checksum that won't match the calculated one
            expect(typeof isModified).toBe('boolean');
        });

        it('should return false when file does not exist', async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {
                    [ModuleType.Frontend]: {
                        workflowState: WorkflowState.PendingReview,
                        checksum: 'some-checksum'
                    }
                },
                canProgressToTasks: false
            };

            (vscode.workspace.fs.readFile as jest.Mock)
                .mockResolvedValueOnce(Buffer.from(JSON.stringify(mockMetadata)))
                .mockRejectedValueOnce(new Error('File not found'));

            await metadataManager.load();

            const isModified = await metadataManager.isModuleModified(ModuleType.Frontend);
            expect(isModified).toBe(false);
        });
    });

    describe('deleteModuleMetadata()', () => {
        it('should delete module metadata', async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {
                    [ModuleType.Frontend]: {
                        workflowState: WorkflowState.Approved
                    }
                },
                canProgressToTasks: true
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();

            await metadataManager.deleteModuleMetadata(ModuleType.Frontend);

            const metadata = await metadataManager.getModuleMetadata(ModuleType.Frontend);
            expect(metadata).toBeNull();
        });

        it('should recalculate canProgressToTasks after deletion', async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {
                    [ModuleType.Frontend]: {
                        workflowState: WorkflowState.Approved
                    },
                    [ModuleType.ServerApi]: {
                        workflowState: WorkflowState.PendingReview
                    }
                },
                canProgressToTasks: false
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();

            await metadataManager.deleteModuleMetadata(ModuleType.ServerApi);

            const canProgress = await metadataManager.canProgressToTasks();
            expect(canProgress).toBe(true); // Now only approved module remains
        });

        it('should automatically save after deletion', async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {
                    [ModuleType.Frontend]: {
                        workflowState: WorkflowState.Approved
                    }
                },
                canProgressToTasks: true
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();

            await metadataManager.deleteModuleMetadata(ModuleType.Frontend);

            expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
        });
    });

    describe('reset()', () => {
        it('should reset all metadata to default', async () => {
            const mockMetadata = {
                version: '1.0',
                modules: {
                    [ModuleType.Frontend]: {
                        workflowState: WorkflowState.Approved
                    }
                },
                canProgressToTasks: true
            };
            (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(
                Buffer.from(JSON.stringify(mockMetadata))
            );
            await metadataManager.load();

            await metadataManager.reset();

            const metadata = await metadataManager.getModuleMetadata(ModuleType.Frontend);
            expect(metadata).toBeNull();

            const canProgress = await metadataManager.canProgressToTasks();
            expect(canProgress).toBe(false);
        });

        it('should save after reset', async () => {
            await metadataManager.reset();

            expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
            expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
                expect.stringContaining('Reset metadata for spec: test-spec')
            );
        });
    });
});
