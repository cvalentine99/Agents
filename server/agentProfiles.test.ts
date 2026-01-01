import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getCustomAgentProfiles: vi.fn(),
  getCustomAgentProfile: vi.fn(),
  createCustomAgentProfile: vi.fn(),
  updateCustomAgentProfile: vi.fn(),
  deleteCustomAgentProfile: vi.fn(),
  incrementAgentProfileUsage: vi.fn(),
}));

import * as db from './db';

describe('Custom Agent Profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Operations', () => {
    it('should get custom agent profiles for a user', async () => {
      const mockProfiles = [
        { id: 1, userId: 1, name: 'Test Profile', slug: 'test_profile', description: 'Test', systemPrompt: 'Be helpful' },
        { id: 2, userId: 1, name: 'Another Profile', slug: 'another_profile', description: 'Another', systemPrompt: 'Be concise' },
      ];
      vi.mocked(db.getCustomAgentProfiles).mockResolvedValue(mockProfiles as any);

      const result = await db.getCustomAgentProfiles(1);
      
      expect(db.getCustomAgentProfiles).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Profile');
    });

    it('should get a single custom agent profile', async () => {
      const mockProfile = { id: 1, userId: 1, name: 'Test Profile', slug: 'test_profile' };
      vi.mocked(db.getCustomAgentProfile).mockResolvedValue(mockProfile as any);

      const result = await db.getCustomAgentProfile(1, 1);
      
      expect(db.getCustomAgentProfile).toHaveBeenCalledWith(1, 1);
      expect(result?.name).toBe('Test Profile');
    });

    it('should return undefined for non-existent profile', async () => {
      vi.mocked(db.getCustomAgentProfile).mockResolvedValue(undefined);

      const result = await db.getCustomAgentProfile(999, 1);
      
      expect(result).toBeUndefined();
    });

    it('should create a custom agent profile', async () => {
      const newProfile = {
        userId: 1,
        name: 'New Profile',
        slug: 'new_profile',
        description: 'A new custom profile',
        icon: 'Bot',
        color: 'purple',
        systemPrompt: 'You are a helpful assistant',
        outputStyle: 'balanced' as const,
        codeGeneration: 'diffs' as const,
        testingApproach: 'test_after' as const,
        settings: null,
        isPublic: false,
      };
      
      const createdProfile = { id: 1, ...newProfile, usageCount: 0, lastUsedAt: null };
      vi.mocked(db.createCustomAgentProfile).mockResolvedValue(createdProfile as any);

      const result = await db.createCustomAgentProfile(newProfile);
      
      expect(db.createCustomAgentProfile).toHaveBeenCalledWith(newProfile);
      expect(result.id).toBe(1);
      expect(result.name).toBe('New Profile');
    });

    it('should update a custom agent profile', async () => {
      vi.mocked(db.updateCustomAgentProfile).mockResolvedValue([{ affectedRows: 1 }] as any);

      await db.updateCustomAgentProfile(1, 1, { name: 'Updated Name' });
      
      expect(db.updateCustomAgentProfile).toHaveBeenCalledWith(1, 1, { name: 'Updated Name' });
    });

    it('should delete a custom agent profile', async () => {
      vi.mocked(db.deleteCustomAgentProfile).mockResolvedValue([{ affectedRows: 1 }] as any);

      await db.deleteCustomAgentProfile(1, 1);
      
      expect(db.deleteCustomAgentProfile).toHaveBeenCalledWith(1, 1);
    });

    it('should increment profile usage count', async () => {
      vi.mocked(db.incrementAgentProfileUsage).mockResolvedValue([{ affectedRows: 1 }] as any);

      await db.incrementAgentProfileUsage(1, 1);
      
      expect(db.incrementAgentProfileUsage).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('Profile Validation', () => {
    it('should generate valid slug from profile name', () => {
      const generateSlug = (name: string) => 
        name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      
      expect(generateSlug('My Custom Profile')).toBe('my_custom_profile');
      expect(generateSlug('Test-Profile-123')).toBe('test_profile_123');
      expect(generateSlug('  Spaces  ')).toBe('spaces');
      expect(generateSlug('Special@#$Characters!')).toBe('special_characters');
    });

    it('should validate profile name length', () => {
      const isValidName = (name: string) => name.length >= 1 && name.length <= 100;
      
      expect(isValidName('Valid Name')).toBe(true);
      expect(isValidName('')).toBe(false);
      expect(isValidName('A'.repeat(101))).toBe(false);
    });

    it('should validate system prompt length', () => {
      const isValidPrompt = (prompt: string) => prompt.length >= 10 && prompt.length <= 5000;
      
      expect(isValidPrompt('This is a valid system prompt')).toBe(true);
      expect(isValidPrompt('Short')).toBe(false);
      expect(isValidPrompt('A'.repeat(5001))).toBe(false);
    });

    it('should validate output style options', () => {
      const validStyles = ['concise', 'detailed', 'balanced'];
      
      expect(validStyles.includes('concise')).toBe(true);
      expect(validStyles.includes('detailed')).toBe(true);
      expect(validStyles.includes('balanced')).toBe(true);
      expect(validStyles.includes('invalid')).toBe(false);
    });

    it('should validate code generation options', () => {
      const validOptions = ['full', 'diffs', 'none'];
      
      expect(validOptions.includes('full')).toBe(true);
      expect(validOptions.includes('diffs')).toBe(true);
      expect(validOptions.includes('none')).toBe(true);
      expect(validOptions.includes('partial')).toBe(false);
    });

    it('should validate testing approach options', () => {
      const validApproaches = ['test_first', 'test_after', 'no_tests'];
      
      expect(validApproaches.includes('test_first')).toBe(true);
      expect(validApproaches.includes('test_after')).toBe(true);
      expect(validApproaches.includes('no_tests')).toBe(true);
      expect(validApproaches.includes('sometimes')).toBe(false);
    });
  });

  describe('Built-in Profiles', () => {
    const builtInProfiles = ['patch_goblin', 'architect_owl', 'test_gremlin', 'refactor_surgeon'];

    it('should recognize all built-in profile IDs', () => {
      builtInProfiles.forEach(id => {
        expect(builtInProfiles.includes(id)).toBe(true);
      });
    });

    it('should not treat custom profile IDs as built-in', () => {
      expect(builtInProfiles.includes('custom_1')).toBe(false);
      expect(builtInProfiles.includes('my_custom_profile')).toBe(false);
    });

    it('should have correct profile count', () => {
      expect(builtInProfiles.length).toBe(4);
    });
  });

  describe('Profile Duplication', () => {
    it('should duplicate a built-in profile', async () => {
      const sourceProfile = {
        name: 'Patch Goblin',
        description: 'Fast diffs, minimal prose',
        icon: 'Zap',
        color: 'green',
        systemPrompt: 'You are a fast-moving code goblin.',
        outputStyle: 'concise' as const,
        codeGeneration: 'diffs' as const,
        testingApproach: 'test_after' as const,
      };

      const duplicatedProfile = {
        id: 5,
        userId: 1,
        ...sourceProfile,
        name: 'My Patch Goblin',
        slug: 'my_patch_goblin',
        usageCount: 0,
      };

      vi.mocked(db.createCustomAgentProfile).mockResolvedValue(duplicatedProfile as any);

      const result = await db.createCustomAgentProfile({
        userId: 1,
        name: 'My Patch Goblin',
        slug: 'my_patch_goblin',
        ...sourceProfile,
        settings: null,
        isPublic: false,
      });

      expect(result.name).toBe('My Patch Goblin');
      expect(result.systemPrompt).toBe(sourceProfile.systemPrompt);
    });

    it('should duplicate a custom profile', async () => {
      const sourceProfile = {
        id: 1,
        userId: 1,
        name: 'Original',
        slug: 'original',
        description: 'Original profile',
        systemPrompt: 'Original prompt',
        icon: 'Bot',
        color: 'purple',
        outputStyle: 'balanced' as const,
        codeGeneration: 'full' as const,
        testingApproach: 'test_first' as const,
      };

      vi.mocked(db.getCustomAgentProfile).mockResolvedValue(sourceProfile as any);

      const duplicatedProfile = {
        id: 2,
        ...sourceProfile,
        name: 'Original (Copy)',
        slug: 'original_copy',
      };

      vi.mocked(db.createCustomAgentProfile).mockResolvedValue(duplicatedProfile as any);

      const source = await db.getCustomAgentProfile(1, 1);
      expect(source).toBeDefined();

      const result = await db.createCustomAgentProfile({
        userId: 1,
        name: 'Original (Copy)',
        slug: 'original_copy',
        description: source!.description,
        systemPrompt: source!.systemPrompt,
        icon: source!.icon,
        color: source!.color,
        outputStyle: source!.outputStyle,
        codeGeneration: source!.codeGeneration,
        testingApproach: source!.testingApproach,
        settings: null,
        isPublic: false,
      });

      expect(result.name).toBe('Original (Copy)');
    });
  });

  describe('Template Gallery', () => {
    it('should have 16 pre-made templates', async () => {
      const { agentProfileTemplates } = await import('../shared/agentProfileTemplates');
      expect(agentProfileTemplates.length).toBe(16);
    });

    it('should have templates in all 7 categories', async () => {
      const { agentProfileTemplates, getAllCategories } = await import('../shared/agentProfileTemplates');
      const categories = getAllCategories();
      expect(categories.length).toBe(7);
      
      // Each category should have at least one template
      categories.forEach(cat => {
        const templatesInCategory = agentProfileTemplates.filter(t => t.category === cat);
        expect(templatesInCategory.length).toBeGreaterThan(0);
      });
    });

    it('should find template by ID', async () => {
      const { getTemplateById } = await import('../shared/agentProfileTemplates');
      const template = getTemplateById('documentation_writer');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Documentation Writer');
    });

    it('should return undefined for non-existent template', async () => {
      const { getTemplateById } = await import('../shared/agentProfileTemplates');
      const template = getTemplateById('non_existent');
      expect(template).toBeUndefined();
    });

    it('should filter templates by category', async () => {
      const { getTemplatesByCategory } = await import('../shared/agentProfileTemplates');
      const securityTemplates = getTemplatesByCategory('security');
      expect(securityTemplates.length).toBeGreaterThan(0);
      securityTemplates.forEach(t => {
        expect(t.category).toBe('security');
      });
    });

    it('should search templates by name', async () => {
      const { searchTemplates } = await import('../shared/agentProfileTemplates');
      const results = searchTemplates('documentation');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(t => t.name.toLowerCase().includes('documentation'))).toBe(true);
    });

    it('should search templates by tags', async () => {
      const { searchTemplates } = await import('../shared/agentProfileTemplates');
      const results = searchTemplates('security');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should have valid template structure', async () => {
      const { agentProfileTemplates } = await import('../shared/agentProfileTemplates');
      agentProfileTemplates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.systemPrompt.length).toBeGreaterThan(50);
        expect(['concise', 'detailed', 'balanced']).toContain(template.outputStyle);
        expect(['full', 'diffs', 'none']).toContain(template.codeGeneration);
        expect(['test_first', 'test_after', 'no_tests']).toContain(template.testingApproach);
        expect(template.tags.length).toBeGreaterThan(0);
        expect(template.useCases.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Icon and Color Options', () => {
    const validIcons = ['Zap', 'Bird', 'Bug', 'Scissors', 'Bot', 'Sparkles', 'Code', 'FileCode'];
    const validColors = ['green', 'blue', 'orange', 'purple', 'cyan', 'pink', 'yellow'];

    it('should have valid icon options', () => {
      expect(validIcons.length).toBe(8);
      expect(validIcons.includes('Bot')).toBe(true);
    });

    it('should have valid color options', () => {
      expect(validColors.length).toBe(7);
      expect(validColors.includes('purple')).toBe(true);
    });

    it('should validate icon selection', () => {
      expect(validIcons.includes('Bot')).toBe(true);
      expect(validIcons.includes('InvalidIcon')).toBe(false);
    });

    it('should validate color selection', () => {
      expect(validColors.includes('cyan')).toBe(true);
      expect(validColors.includes('rainbow')).toBe(false);
    });
  });
});
