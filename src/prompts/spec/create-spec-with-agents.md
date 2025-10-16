---
id: create-spec-with-agents
name: Create Spec with Subagents
version: 1.0.0
description: Create a spec using specialized subagents for parallel processing
variables:
  description:
    type: string
    required: true
    description: User's feature description
  workspacePath:
    type: string
    required: true
    description: Workspace root path
  specBasePath:
    type: string
    required: true
    description: Base path for specs directory
  modularDesignEnabled:
    type: string
    required: true
    description: Whether modular design is enabled (true/false)
---
<user_input>
LAUNCH A SPEC DEVELOPMENT WORKFLOW

Feature Description: {{description}}

Workspace path: {{workspacePath}}
Spec base path: {{specBasePath}}
Modular Design Enabled: {{modularDesignEnabled}}

**Instructions:**

1. First, call the `spec-system-prompt-loader` agent to get the path to the spec workflow system prompt
2. Read the workflow file from the returned path to understand the complete workflow
3. Follow the workflow defined in that file, starting from "0.Initialize" step
4. The workflow will guide you through creating requirements, design, and tasks

**Important Notes:**
- You MUST choose a kebab-case feature name based on the description (e.g., "user-authentication")
- You MUST create the feature directory structure: {{specBasePath}}/{feature-name}/
- All files must be created inside the feature-specific directory, NOT directly in {{specBasePath}}/
- If modular design is enabled, create multiple design-*.md files instead of a single design.md

Start by calling the spec-system-prompt-loader agent.
</user_input>
