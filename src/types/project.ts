export interface ProjectSession {
  id: string;
  description: string;
  history: ChatMessage[];
  status: 'active' | 'generating' | 'completed';
  artifacts?: DirectoryStructure;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface DirectoryStructure {
  name: string;
  type: 'directory' | 'file';
  children?: DirectoryStructure[];
  description?: string; // Content for GEMINI.md or the file itself
}
