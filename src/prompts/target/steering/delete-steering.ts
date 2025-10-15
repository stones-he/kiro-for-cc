// Auto-generated from src\prompts\steering\delete-steering.md
// DO NOT EDIT MANUALLY

export const frontmatter = {
  "id": "delete-steering",
  "name": "Delete Steering",
  "version": "1.0.0",
  "description": "Prompt for updating CLAUDE.md after deleting a steering document",
  "variables": {
    "documentName": {
      "type": "string",
      "required": true,
      "description": "Name of the deleted steering document"
    },
    "steeringPath": {
      "type": "string",
      "required": true,
      "description": "Path where steering documents are stored"
    }
  }
};

export const content = "\r\nThe steering document \"{{documentName}}\" has been deleted from {{steeringPath}}.\r\n\r\nIf a project CLAUDE.md exists and contains a \"## Steering Documents\" section, please update it to remove the reference to this deleted document.\r\n";

export default {
  frontmatter,
  content
};
