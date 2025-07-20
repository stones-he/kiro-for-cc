// Default paths relative to workspace root
export const DEFAULT_PATHS = {
    specs: '.claude/specs',
    steering: '.claude/steering',
    settings: '.claude/settings'
} as const;

// File names
export const CONFIG_FILE_NAME = 'kfc-settings.json';

// VSCode configuration namespace for this extension
export const VSC_CONFIG_NAMESPACE = 'kfc';

// Default view visibility
export const DEFAULT_VIEW_VISIBILITY = {
    specs: true,
    steering: true,
    mcp: true,
    hooks: true,
    settings: false
} as const;