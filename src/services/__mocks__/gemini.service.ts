export const geminiService = {
  chat: jest.fn().mockResolvedValue('Mocked BA response'),
  generateStructure: jest.fn().mockResolvedValue(JSON.stringify({
    name: 'test-project',
    type: 'directory',
    description: 'A test project',
    children: [
      { name: 'src', type: 'directory', description: 'source dir' },
      { name: 'index.ts', type: 'file', description: 'entry point' }
    ]
  })),
  instantiateFile: jest.fn().mockResolvedValue('// Mocked file content')
};
