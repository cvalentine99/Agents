import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  sessions, 
  completionCriteria,
  loopMetrics,
  fileChanges,
  savedPrompts,
  assemblyLineRuns,
  diffHunks,
  checkpoints,
  userTemplateCategories,
  customAgentProfiles,
  type InsertSession,
  type InsertCompletionCriterion,
  type InsertLoopMetric,
  type InsertFileChange,
  type InsertSavedPrompt,
  type InsertAssemblyLineRun,
  type InsertDiffHunk,
  type InsertCheckpoint,
  type InsertUserTemplateCategory,
  type InsertCustomAgentProfile,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USER QUERIES ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== SESSION QUERIES ====================

export async function createSession(session: InsertSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(sessions).values(session);
  return result;
}

export async function getSessionBySessionId(sessionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(sessions).where(eq(sessions.sessionId, sessionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSessionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.createdAt));
}

export async function updateSession(sessionId: string, updates: Partial<InsertSession>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(sessions).set(updates).where(eq(sessions.sessionId, sessionId));
}

export async function deleteSession(sessionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(sessions).where(eq(sessions.sessionId, sessionId));
}

// ==================== COMPLETION CRITERIA QUERIES ====================

export async function addCompletionCriterion(criterion: InsertCompletionCriterion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(completionCriteria).values(criterion);
}

export async function getSessionCriteria(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(completionCriteria).where(eq(completionCriteria.sessionId, sessionId));
}

export async function updateCriterion(id: number, checked: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(completionCriteria).set({ 
    checked, 
    checkedAt: checked ? new Date() : null 
  }).where(eq(completionCriteria.id, id));
}

export async function deleteCriterion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(completionCriteria).where(eq(completionCriteria.id, id));
}

// ==================== LOOP METRICS QUERIES ====================

export async function addLoopMetric(metric: InsertLoopMetric) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(loopMetrics).values(metric);
}

export async function getSessionMetrics(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(loopMetrics).where(eq(loopMetrics.sessionId, sessionId)).orderBy(loopMetrics.iteration);
}

// ==================== FILE CHANGES QUERIES ====================

export async function addFileChange(change: InsertFileChange) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(fileChanges).values(change);
}

export async function getSessionFileChanges(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(fileChanges).where(eq(fileChanges.sessionId, sessionId)).orderBy(desc(fileChanges.timestamp));
}

// ==================== SAVED PROMPTS QUERIES ====================

export async function savePrompt(prompt: InsertSavedPrompt) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(savedPrompts).values(prompt);
}

export async function getUserPrompts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(savedPrompts).where(eq(savedPrompts.userId, userId)).orderBy(desc(savedPrompts.createdAt));
}

export async function deletePrompt(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(savedPrompts).where(and(eq(savedPrompts.id, id), eq(savedPrompts.userId, userId)));
}

// ==================== ASSEMBLY LINE QUERIES ====================

export async function createAssemblyLineRun(run: InsertAssemblyLineRun) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(assemblyLineRuns).values(run);
}

export async function getSessionAssemblyRuns(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(assemblyLineRuns).where(eq(assemblyLineRuns.sessionId, sessionId)).orderBy(desc(assemblyLineRuns.createdAt));
}

export async function updateAssemblyLineRun(id: number, updates: Partial<InsertAssemblyLineRun>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(assemblyLineRuns).set(updates).where(eq(assemblyLineRuns.id, id));
}

// ==================== DIFF HUNKS QUERIES ====================

export async function addDiffHunk(hunk: InsertDiffHunk) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(diffHunks).values(hunk);
}

export async function getSessionDiffHunks(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(diffHunks).where(eq(diffHunks.sessionId, sessionId)).orderBy(desc(diffHunks.createdAt));
}

export async function approveDiffHunk(id: number, approved: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(diffHunks).set({ 
    approved, 
    approvedAt: approved ? new Date() : null 
  }).where(eq(diffHunks.id, id));
}

// ==================== CHECKPOINTS QUERIES ====================

export async function createCheckpoint(checkpoint: InsertCheckpoint) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(checkpoints).values(checkpoint);
}

export async function getSessionCheckpoints(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(checkpoints).where(eq(checkpoints.sessionId, sessionId)).orderBy(desc(checkpoints.createdAt));
}

export async function getLatestCheckpoint(sessionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(checkpoints).where(eq(checkpoints.sessionId, sessionId)).orderBy(desc(checkpoints.createdAt)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}


// ==================== API KEYS QUERIES ====================

import { apiKeys, cliExecutions, type InsertApiKey, type InsertCliExecution } from "../drizzle/schema";

export async function saveApiKey(apiKey: InsertApiKey) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if key for this provider already exists
  const existing = await db.select().from(apiKeys)
    .where(and(eq(apiKeys.userId, apiKey.userId), eq(apiKeys.provider, apiKey.provider)))
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing key
    return db.update(apiKeys)
      .set({ 
        encryptedKey: apiKey.encryptedKey, 
        keyHint: apiKey.keyHint,
        isValid: true,
        lastValidated: new Date()
      })
      .where(eq(apiKeys.id, existing[0].id));
  }
  
  // Insert new key
  return db.insert(apiKeys).values(apiKey);
}

export async function getUserApiKeys(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: apiKeys.id,
    provider: apiKeys.provider,
    keyHint: apiKeys.keyHint,
    isValid: apiKeys.isValid,
    lastValidated: apiKeys.lastValidated,
    createdAt: apiKeys.createdAt,
  }).from(apiKeys).where(eq(apiKeys.userId, userId));
}

export async function getApiKeyForProvider(userId: number, provider: "codex" | "claude" | "gemini" | "manus") {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function deleteApiKey(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
}

export async function updateApiKeyValidity(id: number, isValid: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(apiKeys).set({ isValid, lastValidated: new Date() }).where(eq(apiKeys.id, id));
}

// ==================== CLI EXECUTION QUERIES ====================

export async function createCliExecution(execution: InsertCliExecution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(cliExecutions).values(execution);
  return result;
}

export async function updateCliExecution(id: number, updates: Partial<InsertCliExecution>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(cliExecutions).set(updates).where(eq(cliExecutions.id, id));
}

export async function getSessionCliExecutions(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(cliExecutions).where(eq(cliExecutions.sessionId, sessionId)).orderBy(desc(cliExecutions.startedAt));
}

export async function getRunningExecutions() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(cliExecutions).where(eq(cliExecutions.status, "running"));
}


// ==================== SESSION TEMPLATES QUERIES ====================

import { sessionTemplates, type InsertSessionTemplate } from "../drizzle/schema";

export async function createSessionTemplate(template: InsertSessionTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(sessionTemplates).values(template);
  // Get the inserted ID from the result
  const [insertResult] = result as unknown as [{ insertId: number }];
  return { insertId: insertResult?.insertId || 0 };
}

export async function getUserSessionTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(sessionTemplates)
    .where(eq(sessionTemplates.userId, userId))
    .orderBy(desc(sessionTemplates.updatedAt));
}

export async function getSessionTemplateById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(sessionTemplates)
    .where(and(eq(sessionTemplates.id, id), eq(sessionTemplates.userId, userId)))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function updateSessionTemplate(id: number, userId: number, updates: Partial<InsertSessionTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(sessionTemplates)
    .set(updates)
    .where(and(eq(sessionTemplates.id, id), eq(sessionTemplates.userId, userId)));
}

export async function deleteSessionTemplate(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(sessionTemplates)
    .where(and(eq(sessionTemplates.id, id), eq(sessionTemplates.userId, userId)));
}

export async function incrementTemplateUsage(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get current usage count
  const template = await getSessionTemplateById(id, userId);
  if (!template) throw new Error("Template not found");
  
  return db.update(sessionTemplates)
    .set({ 
      usageCount: template.usageCount + 1,
      lastUsedAt: new Date()
    })
    .where(and(eq(sessionTemplates.id, id), eq(sessionTemplates.userId, userId)));
}

export async function searchSessionTemplates(userId: number, query: string) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all user templates and filter in memory (MySQL doesn't have good JSON search)
  const allTemplates = await getUserSessionTemplates(userId);
  const lowerQuery = query.toLowerCase();
  
  return allTemplates.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    (t.description && t.description.toLowerCase().includes(lowerQuery)) ||
    (t.tags && t.tags.toLowerCase().includes(lowerQuery))
  );
}


// ==================== RESEARCH QUERIES ====================

import { 
  researchSessions, 
  researchFindings, 
  researchSteps,
  researchFollowUps,
  customTemplates,
  templateFavorites,
  templateUsage,
  type InsertResearchSession,
  type InsertResearchFinding,
  type InsertResearchStep,
  type InsertResearchFollowUp,
  type InsertCustomTemplate,
  type InsertTemplateFavorite,
  type InsertTemplateUsage,
} from "../drizzle/schema";

export async function createResearchSession(session: InsertResearchSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(researchSessions).values(session);
  return result;
}

export async function getResearchSession(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(researchSessions).where(eq(researchSessions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserResearchSessions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(researchSessions).where(eq(researchSessions.userId, userId)).orderBy(desc(researchSessions.createdAt));
}

export async function updateResearchSession(id: number, updates: Partial<InsertResearchSession>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(researchSessions).set(updates).where(eq(researchSessions.id, id));
}

export async function deleteResearchSession(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete related findings and steps first
  await db.delete(researchFindings).where(eq(researchFindings.researchSessionId, id));
  await db.delete(researchSteps).where(eq(researchSteps.researchSessionId, id));
  return db.delete(researchSessions).where(eq(researchSessions.id, id));
}

// Research Findings
export async function addResearchFinding(finding: InsertResearchFinding) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(researchFindings).values(finding);
}

export async function getResearchFindings(researchSessionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(researchFindings).where(eq(researchFindings.researchSessionId, researchSessionId)).orderBy(researchFindings.stepNumber);
}

// Research Steps
export async function addResearchStep(step: InsertResearchStep) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(researchSteps).values(step);
}

export async function getResearchSteps(researchSessionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(researchSteps).where(eq(researchSteps.researchSessionId, researchSessionId)).orderBy(researchSteps.stepNumber);
}

export async function updateResearchStep(id: number, updates: Partial<InsertResearchStep>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(researchSteps).set(updates).where(eq(researchSteps.id, id));
}

// Get research by share token (for public access)
export async function getResearchByShareToken(shareToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(researchSessions).where(eq(researchSessions.shareToken, shareToken)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Research Follow-ups
export async function addResearchFollowUp(followUp: InsertResearchFollowUp) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(researchFollowUps).values(followUp);
}

export async function getResearchFollowUps(researchSessionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(researchFollowUps).where(eq(researchFollowUps.researchSessionId, researchSessionId)).orderBy(researchFollowUps.createdAt);
}

export async function updateResearchFollowUp(id: number, updates: Partial<InsertResearchFollowUp>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(researchFollowUps).set(updates).where(eq(researchFollowUps.id, id));
}

export async function getResearchFollowUp(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(researchFollowUps).where(eq(researchFollowUps.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}


// ============================================
// Custom Templates
// ============================================

export async function createCustomTemplate(template: InsertCustomTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(customTemplates).values(template);
}

export async function getCustomTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(customTemplates).where(eq(customTemplates.userId, userId)).orderBy(desc(customTemplates.createdAt));
}

export async function getCustomTemplate(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(customTemplates)
    .where(and(eq(customTemplates.id, id), eq(customTemplates.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateCustomTemplate(id: number, userId: number, updates: Partial<InsertCustomTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(customTemplates)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(customTemplates.id, id), eq(customTemplates.userId, userId)));
}

export async function deleteCustomTemplate(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(customTemplates).where(and(eq(customTemplates.id, id), eq(customTemplates.userId, userId)));
}

export async function incrementCustomTemplateUsage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(customTemplates)
    .set({ usageCount: sql`${customTemplates.usageCount} + 1` })
    .where(eq(customTemplates.id, id));
}

// ============================================
// Template Favorites
// ============================================

export async function addTemplateFavorite(favorite: InsertTemplateFavorite) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(templateFavorites).values(favorite);
}

export async function removeTemplateFavorite(userId: number, templateId: string, templateType: "builtin" | "custom") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(templateFavorites).where(
    and(
      eq(templateFavorites.userId, userId),
      eq(templateFavorites.templateId, templateId),
      eq(templateFavorites.templateType, templateType)
    )
  );
}

export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(templateFavorites).where(eq(templateFavorites.userId, userId));
}

export async function isTemplateFavorited(userId: number, templateId: string, templateType: "builtin" | "custom") {
  const db = await getDb();
  if (!db) return false;
  
  const result = await db.select().from(templateFavorites).where(
    and(
      eq(templateFavorites.userId, userId),
      eq(templateFavorites.templateId, templateId),
      eq(templateFavorites.templateType, templateType)
    )
  ).limit(1);
  return result.length > 0;
}

// ============================================
// Template Usage Analytics
// ============================================

export async function trackTemplateUsage(usage: InsertTemplateUsage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.insert(templateUsage).values(usage);
}

export async function getTemplateUsageStats() {
  const db = await getDb();
  if (!db) return [];
  
  // Get usage counts for all templates in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return db.select({
    templateId: templateUsage.templateId,
    templateType: templateUsage.templateType,
    usageCount: sql<number>`COUNT(*)`.as('usageCount'),
  })
    .from(templateUsage)
    .where(sql`${templateUsage.usedAt} >= ${thirtyDaysAgo}`)
    .groupBy(templateUsage.templateId, templateUsage.templateType)
    .orderBy(desc(sql`COUNT(*)`));
}

export async function getUserTemplateUsageStats(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    templateId: templateUsage.templateId,
    templateType: templateUsage.templateType,
    usageCount: sql<number>`COUNT(*)`.as('usageCount'),
    lastUsed: sql<Date>`MAX(${templateUsage.usedAt})`.as('lastUsed'),
  })
    .from(templateUsage)
    .where(eq(templateUsage.userId, userId))
    .groupBy(templateUsage.templateId, templateUsage.templateType)
    .orderBy(desc(sql`COUNT(*)`));
}


// ============================================
// User Template Categories
// ============================================

export async function createUserCategory(category: InsertUserTemplateCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(userTemplateCategories).values(category);
  return result;
}

export async function getUserCategories(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(userTemplateCategories)
    .where(eq(userTemplateCategories.userId, userId))
    .orderBy(userTemplateCategories.sortOrder);
}

export async function getUserCategory(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(userTemplateCategories)
    .where(and(eq(userTemplateCategories.id, id), eq(userTemplateCategories.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserCategory(id: number, userId: number, updates: Partial<InsertUserTemplateCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(userTemplateCategories)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(userTemplateCategories.id, id), eq(userTemplateCategories.userId, userId)));
}

export async function deleteUserCategory(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // First, update any templates using this category to have no category
  await db.update(customTemplates)
    .set({ categoryId: null })
    .where(and(eq(customTemplates.categoryId, id), eq(customTemplates.userId, userId)));
  
  // Then delete the category
  return db.delete(userTemplateCategories)
    .where(and(eq(userTemplateCategories.id, id), eq(userTemplateCategories.userId, userId)));
}

// ============================================
// Template Import/Export
// ============================================

export interface ExportedTemplate {
  name: string;
  description: string | null;
  topic: string;
  category: string;
  categoryName?: string;
  depth: "quick" | "standard" | "deep";
  tags: string[] | null;
}

export async function exportUserTemplates(userId: number): Promise<ExportedTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  
  const templates = await db.select({
    name: customTemplates.name,
    description: customTemplates.description,
    topic: customTemplates.topic,
    category: customTemplates.category,
    categoryId: customTemplates.categoryId,
    depth: customTemplates.depth,
    tags: customTemplates.tags,
  }).from(customTemplates)
    .where(eq(customTemplates.userId, userId))
    .orderBy(customTemplates.name);
  
  // Get category names
  const categories = await getUserCategories(userId);
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));
  
  return templates.map(t => ({
    name: t.name,
    description: t.description,
    topic: t.topic,
    category: t.category,
    categoryName: t.categoryId ? categoryMap.get(t.categoryId) : undefined,
    depth: t.depth,
    tags: t.tags,
  }));
}

export async function importUserTemplates(
  userId: number, 
  templates: ExportedTemplate[],
  categoryMap: Map<string, number> // Map category names to IDs
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  
  for (const template of templates) {
    try {
      // Check if template with same name already exists
      const existing = await db.select().from(customTemplates)
        .where(and(eq(customTemplates.userId, userId), eq(customTemplates.name, template.name)))
        .limit(1);
      
      if (existing.length > 0) {
        skipped++;
        continue;
      }
      
      // Get category ID if category name is provided
      let categoryId: number | null = null;
      if (template.categoryName && categoryMap.has(template.categoryName)) {
        categoryId = categoryMap.get(template.categoryName) || null;
      }
      
      await db.insert(customTemplates).values({
        userId,
        name: template.name,
        description: template.description,
        topic: template.topic,
        category: template.category || "custom",
        categoryId,
        depth: template.depth || "standard",
        tags: template.tags,
      });
      
      imported++;
    } catch (error) {
      errors.push(`Failed to import "${template.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return { imported, skipped, errors };
}


// ============================================
// Custom Agent Profiles
// ============================================

export async function getCustomAgentProfiles(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(customAgentProfiles)
    .where(eq(customAgentProfiles.userId, userId))
    .orderBy(desc(customAgentProfiles.usageCount));
}

export async function getCustomAgentProfile(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(customAgentProfiles)
    .where(and(eq(customAgentProfiles.id, id), eq(customAgentProfiles.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCustomAgentProfile(profile: Omit<InsertCustomAgentProfile, 'id' | 'usageCount' | 'lastUsedAt' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(customAgentProfiles).values({
    ...profile,
    usageCount: 0,
  });
  
  // Get the inserted profile
  const insertId = result[0].insertId;
  const inserted = await db.select().from(customAgentProfiles)
    .where(eq(customAgentProfiles.id, insertId))
    .limit(1);
  
  return inserted[0];
}

export async function updateCustomAgentProfile(id: number, userId: number, updates: Partial<InsertCustomAgentProfile>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(customAgentProfiles)
    .set(updates)
    .where(and(eq(customAgentProfiles.id, id), eq(customAgentProfiles.userId, userId)));
}

export async function deleteCustomAgentProfile(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.delete(customAgentProfiles)
    .where(and(eq(customAgentProfiles.id, id), eq(customAgentProfiles.userId, userId)));
}

export async function incrementAgentProfileUsage(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.update(customAgentProfiles)
    .set({
      usageCount: sql`${customAgentProfiles.usageCount} + 1`,
      lastUsedAt: new Date(),
    })
    .where(and(eq(customAgentProfiles.id, id), eq(customAgentProfiles.userId, userId)));
}
