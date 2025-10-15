// Auto-generated from src\prompts\spec\impl-task.md
// DO NOT EDIT MANUALLY

export const frontmatter = {
  "id": "impl-task",
  "name": "Implement Task",
  "version": "1.0.0",
  "description": "Implement a task after a spec workflow",
  "variables": {
    "taskFilePath": {
      "type": "string",
      "required": true,
      "description": "Path for task file"
    },
    "taskDescription": {
      "type": "string",
      "required": true,
      "description": "Description for task"
    }
  }
};

export const content = "<user_input>\r\nI just completed a spec workflow and now need to implement one of the specific tasks.\r\n\r\nTask File Path: {{taskFilePath}}\r\nTask Description: {{taskDescription}}\r\n\r\nPlease help me:\r\n\r\n1. First use the *spec-system-prompt-loader* sub agent to load the spec workflow system prompts and understand the complete context\r\n2. Review the requirements and design documents in the spec folder\r\n3. Implement this task based on existing codebase patterns and conventions\r\n4. Ensure code quality, including error handling, performance, and security\r\n5. Add comprehensive unit tests for the implemented code\r\n\r\nLet's start implementing this task!\r\n</user_input>\r\n";

export default {
  frontmatter,
  content
};
