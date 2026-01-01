import { invokeLLM } from "./_core/llm";

// Types for research execution
export interface ResearchQuery {
  topic: string;
  depth: 'quick' | 'standard' | 'deep';
  maxSources: number;
}

export interface ResearchSource {
  url: string;
  title: string;
  snippet: string;
  content?: string;
  relevanceScore: number;
  extractedAt: Date;
}

export interface ResearchFinding {
  title: string;
  content: string;
  sources: string[];
  confidence: 'high' | 'medium' | 'low';
  category: string;
}

export interface ResearchResult {
  topic: string;
  summary: string;
  findings: ResearchFinding[];
  sources: ResearchSource[];
  followUpQuestions: string[];
  executionTimeMs: number;
}

export interface ResearchProgress {
  stage: 'planning' | 'searching' | 'scraping' | 'analyzing' | 'synthesizing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  currentSource?: string;
}

// Progress callback type
type ProgressCallback = (progress: ResearchProgress) => void;

// Search using built-in search capability via LLM
async function generateSearchQueries(topic: string): Promise<string[]> {
  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `You are a research assistant. Generate 3-5 specific search queries to thoroughly research the given topic. Return ONLY a JSON array of strings, no other text.`
      },
      {
        role: 'user',
        content: `Generate search queries for: "${topic}"`
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'search_queries',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            queries: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['queries'],
          additionalProperties: false
        }
      }
    }
  });

  try {
    const rawContent = response.choices[0].message.content;
    const contentStr = typeof rawContent === 'string' ? rawContent : '{"queries":[]}';
    const parsed = JSON.parse(contentStr);
    return parsed.queries || [];
  } catch {
    return [topic]; // Fallback to just the topic
  }
}

// Simulate web search results (in production, would use a real search API)
async function performSearch(query: string): Promise<ResearchSource[]> {
  // Use LLM to generate realistic search results based on its knowledge
  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `You are simulating a web search engine. Given a search query, generate 3-5 realistic search results with URLs, titles, and snippets based on your knowledge. Return JSON only.`
      },
      {
        role: 'user',
        content: `Search query: "${query}"`
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'search_results',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  title: { type: 'string' },
                  snippet: { type: 'string' }
                },
                required: ['url', 'title', 'snippet'],
                additionalProperties: false
              }
            }
          },
          required: ['results'],
          additionalProperties: false
        }
      }
    }
  });

  try {
    const rawContent = response.choices[0].message.content;
    const contentStr = typeof rawContent === 'string' ? rawContent : '{"results":[]}';
    const parsed = JSON.parse(contentStr);
    return (parsed.results || []).map((r: any, idx: number) => ({
      url: r.url,
      title: r.title,
      snippet: r.snippet,
      relevanceScore: 1 - (idx * 0.1),
      extractedAt: new Date()
    }));
  } catch {
    return [];
  }
}

// Extract detailed content from a source (simulated)
async function extractContent(source: ResearchSource): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `You are extracting detailed content from a web page. Based on the URL and snippet, generate realistic detailed content that would be found on this page. Be informative and factual.`
      },
      {
        role: 'user',
        content: `URL: ${source.url}\nTitle: ${source.title}\nSnippet: ${source.snippet}\n\nGenerate detailed content (2-3 paragraphs):`
      }
    ]
  });

  const content = response.choices[0].message.content;
  return typeof content === 'string' ? content : source.snippet;
}

// Analyze and synthesize findings
async function synthesizeFindings(
  topic: string,
  sources: ResearchSource[]
): Promise<{ summary: string; findings: ResearchFinding[]; followUpQuestions: string[] }> {
  const sourcesText = sources
    .map((s, i) => `[Source ${i + 1}] ${s.title}\n${s.content || s.snippet}`)
    .join('\n\n');

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `You are a research analyst. Analyze the provided sources and synthesize findings about the topic. Return structured JSON with a summary, key findings, and follow-up questions.`
      },
      {
        role: 'user',
        content: `Topic: "${topic}"\n\nSources:\n${sourcesText}\n\nProvide analysis:`
      }
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'research_analysis',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            findings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  content: { type: 'string' },
                  sourceIndices: { type: 'array', items: { type: 'number' } },
                  confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                  category: { type: 'string' }
                },
                required: ['title', 'content', 'sourceIndices', 'confidence', 'category'],
                additionalProperties: false
              }
            },
            followUpQuestions: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['summary', 'findings', 'followUpQuestions'],
          additionalProperties: false
        }
      }
    }
  });

  try {
    const rawContent = response.choices[0].message.content;
    const contentStr = typeof rawContent === 'string' ? rawContent : '{}';
    const parsed = JSON.parse(contentStr);
    return {
      summary: parsed.summary || 'No summary available.',
      findings: (parsed.findings || []).map((f: any) => ({
        title: f.title,
        content: f.content,
        sources: (f.sourceIndices || []).map((i: number) => sources[i]?.url || ''),
        confidence: f.confidence || 'medium',
        category: f.category || 'General'
      })),
      followUpQuestions: parsed.followUpQuestions || []
    };
  } catch {
    return {
      summary: 'Analysis could not be completed.',
      findings: [],
      followUpQuestions: []
    };
  }
}

// Main research execution function
export async function executeResearch(
  query: ResearchQuery,
  onProgress?: ProgressCallback
): Promise<ResearchResult> {
  const startTime = Date.now();
  const allSources: ResearchSource[] = [];

  try {
    // Stage 1: Planning
    onProgress?.({
      stage: 'planning',
      progress: 5,
      message: 'Generating search strategy...'
    });

    const searchQueries = await generateSearchQueries(query.topic);
    
    onProgress?.({
      stage: 'planning',
      progress: 10,
      message: `Generated ${searchQueries.length} search queries`
    });

    // Stage 2: Searching
    onProgress?.({
      stage: 'searching',
      progress: 15,
      message: 'Executing searches...'
    });

    const maxQueries = query.depth === 'quick' ? 2 : query.depth === 'standard' ? 3 : 5;
    const queriesToRun = searchQueries.slice(0, maxQueries);

    for (let i = 0; i < queriesToRun.length; i++) {
      const q = queriesToRun[i];
      onProgress?.({
        stage: 'searching',
        progress: 15 + Math.floor((i / queriesToRun.length) * 20),
        message: `Searching: "${q.substring(0, 50)}..."`
      });

      const results = await performSearch(q);
      allSources.push(...results);
    }

    // Deduplicate sources by URL
    const uniqueSources = allSources.filter((source, index, self) =>
      index === self.findIndex(s => s.url === source.url)
    ).slice(0, query.maxSources);

    // Stage 3: Scraping/Extracting content
    onProgress?.({
      stage: 'scraping',
      progress: 40,
      message: `Extracting content from ${uniqueSources.length} sources...`
    });

    for (let i = 0; i < uniqueSources.length; i++) {
      const source = uniqueSources[i];
      onProgress?.({
        stage: 'scraping',
        progress: 40 + Math.floor((i / uniqueSources.length) * 30),
        message: `Extracting: ${source.title.substring(0, 40)}...`,
        currentSource: source.url
      });

      source.content = await extractContent(source);
    }

    // Stage 4: Analyzing
    onProgress?.({
      stage: 'analyzing',
      progress: 75,
      message: 'Analyzing extracted content...'
    });

    // Stage 5: Synthesizing
    onProgress?.({
      stage: 'synthesizing',
      progress: 85,
      message: 'Synthesizing findings...'
    });

    const { summary, findings, followUpQuestions } = await synthesizeFindings(
      query.topic,
      uniqueSources
    );

    // Complete
    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Research complete!'
    });

    return {
      topic: query.topic,
      summary,
      findings,
      sources: uniqueSources,
      followUpQuestions,
      executionTimeMs: Date.now() - startTime
    };

  } catch (error: any) {
    onProgress?.({
      stage: 'error',
      progress: 0,
      message: `Error: ${error.message}`
    });

    throw error;
  }
}

// Execute a follow-up question
export async function executeFollowUp(
  originalTopic: string,
  question: string,
  existingSources: ResearchSource[]
): Promise<{ answer: string; newSources: ResearchSource[] }> {
  // First, try to answer from existing sources
  const sourcesText = existingSources
    .map((s, i) => `[Source ${i + 1}] ${s.title}\n${s.content || s.snippet}`)
    .join('\n\n');

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: `You are a research assistant. Answer the follow-up question based on the existing research sources. If the sources don't contain enough information, indicate what additional research would be needed.`
      },
      {
        role: 'user',
        content: `Original Topic: "${originalTopic}"\n\nExisting Sources:\n${sourcesText}\n\nFollow-up Question: "${question}"\n\nProvide a detailed answer:`
      }
    ]
  });

  const rawAnswer = response.choices[0].message.content;
  const answer = typeof rawAnswer === 'string' ? rawAnswer : 'Unable to answer the question.';

  // Check if we need additional sources
  const needsMore = answer.toLowerCase().includes('additional research') || 
                    answer.toLowerCase().includes('more information needed');

  let newSources: ResearchSource[] = [];
  if (needsMore) {
    newSources = await performSearch(question);
    for (const source of newSources.slice(0, 3)) {
      source.content = await extractContent(source);
    }
  }

  return { answer, newSources };
}
