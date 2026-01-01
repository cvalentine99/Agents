import { useState, useMemo } from 'react';
import { 
  Search, 
  Copy, 
  Check, 
  Pencil, 
  BookOpen, 
  Briefcase, 
  GraduationCap, 
  Lightbulb, 
  Code2,
  Sparkles,
  Zap,
  ThermometerSun,
  ThermometerSnowflake,
  Layers,
  FileText,
  ChevronDown,
  ChevronRight,
  Star,
  Globe,
  Palette,
  Workflow
} from 'lucide-react';

// 50 Single-Line Prompts organized by category
const SINGLE_LINE_PROMPTS = {
  writing: {
    name: 'Writing & Editing',
    subtitle: 'The Un-Robot Filter',
    icon: Pencil,
    color: 'from-pink-500 to-rose-500',
    prompts: [
      { id: 'w1', text: 'Rewrite this to sound like I\'m an expert, but not an arrogant one: [paste text]' },
      { id: 'w2', text: 'Give me 10 headline variations for this topic, ranging from clickbait to academic: [topic]' },
      { id: 'w3', text: 'Turn these messy notes into a structured outline using Roman numerals: [paste notes]' },
      { id: 'w4', text: 'Critique this draft for logical fallacies and gaps in reasoning only: [paste text]' },
      { id: 'w5', text: 'Explain [complex topic] using only the 1,000 most common words in English.' },
      { id: 'w6', text: 'Find the steelman argument against my position here: [paste text]' },
      { id: 'w7', text: 'Rewrite this in half the word count without losing the 3 key data points: [paste text]' },
      { id: 'w8', text: 'Make this email sound firm but diplomatic: [paste draft]' },
      { id: 'w9', text: 'Turn this technical explanation into a fable with a moral: [topic]' },
      { id: 'w10', text: 'Extract the \'BLUF\' (Bottom Line Up Front) and the 3 action items from this text: [paste text]' },
    ]
  },
  productivity: {
    name: 'Work & Productivity',
    subtitle: 'The 10x Multiplier',
    icon: Briefcase,
    color: 'from-blue-500 to-cyan-500',
    prompts: [
      { id: 'p1', text: 'Break this project into a checklist of 15-minute tasks: [project description]' },
      { id: 'p2', text: 'What are the 3 things I should do first, in order, to prevent a bottleneck later: [project]' },
      { id: 'p3', text: 'Draft a meeting agenda that ensures we leave with a decision on [topic].' },
      { id: 'p4', text: 'Translate this corporate jargon into plain, blunt English: [paste email]' },
      { id: 'p5', text: 'Draft 3 options for a reply: one \'Yes\', one \'No\', and one \'Maybe/Negotiate\': [request]' },
      { id: 'p6', text: 'What questions should I ask in this meeting to look strategic but not obstructionist: [topic]' },
      { id: 'p7', text: 'Simulate a negotiation with me where you are a skeptical client; I am selling [product].' },
      { id: 'p8', text: 'Identify the underlying emotion driving this email: [paste text]' },
      { id: 'p9', text: 'Create a "Pre-Mortem" for [project]: list 5 reasons why this failed 6 months from now.' },
      { id: 'p10', text: 'Summarize this long chain of emails into a bulleted timeline of who promised what.' },
    ]
  },
  learning: {
    name: 'Learning & Research',
    subtitle: 'Speed-Running Knowledge',
    icon: GraduationCap,
    color: 'from-green-500 to-emerald-500',
    prompts: [
      { id: 'l1', text: 'Explain the mental model behind [concept] rather than the definition.' },
      { id: 'l2', text: 'What are the 3 \'Noble Lies\' (simplifications) taught to beginners about [topic]?' },
      { id: 'l3', text: 'Create a learning syllabus for [skill] that gets me to \'competent\' in 20 hours.' },
      { id: 'l4', text: 'Apply the Pareto Principle to [topic]: what is the 20% I need to learn to understand 80%?' },
      { id: 'l5', text: 'Compare [Concept A] and [Concept B] in a table highlighting differences in cost, speed, and risk.' },
      { id: 'l6', text: 'What prerequisite knowledge am I likely missing if I find [topic] confusing?' },
      { id: 'l7', text: 'Teach me [concept] by using an analogy involving [hobby/interest you like].' },
      { id: 'l8', text: 'List the 5 industry-standard terms for [description of thing] so I can Google them effectively.' },
      { id: 'l9', text: 'What would a detractor say is the biggest flaw in [theory/idea]?' },
      { id: 'l10', text: 'Quiz me on [topic] one question at a time, and do not give me the answer until I guess.' },
    ]
  },
  creative: {
    name: 'Creative & Brainstorming',
    subtitle: 'Unstucking the Brain',
    icon: Lightbulb,
    color: 'from-yellow-500 to-orange-500',
    prompts: [
      { id: 'c1', text: 'Give me 10 \'Bad Ideas\' for [problem] that are impossible or illegal.' },
      { id: 'c2', text: 'Invert the problem: How would I guarantee [project] fails miserably?' },
      { id: 'c3', text: 'What would [Famous Person/Company] do to solve [problem]?' },
      { id: 'c4', text: 'Combine the mechanics of [Thing A] with the aesthetic of [Thing B] to create a new [Thing C].' },
      { id: 'c5', text: 'Rewrite this boring paragraph in the style of a hard-boiled noir detective.' },
      { id: 'c6', text: 'List 5 assumptions I am making about [problem] that might be false.' },
      { id: 'c7', text: 'Give me a metaphor for [concept] that doesn\'t involve [standard cliche].' },
      { id: 'c8', text: 'SCAMPER method: How can I Substitute, Combine, Adapt, Modify, Put to another use, Eliminate, or Reverse [product]?' },
      { id: 'c9', text: 'Generate a title for this that creates a "Curiosity Gap".' },
      { id: 'c10', text: 'Turn this serious topic into a humorous 3-panel comic strip script.' },
    ]
  },
  technical: {
    name: 'Technical & Data',
    subtitle: 'Gemini Superpowers',
    icon: Code2,
    color: 'from-purple-500 to-violet-500',
    prompts: [
      { id: 't1', text: 'Act as a Senior Developer: Review this code for security vulnerabilities only.' },
      { id: 't2', text: 'Explain this SQL query in plain English to a project manager.' },
      { id: 't3', text: 'Generate a JSON schema for [data description] that includes validation.' },
      { id: 't4', text: 'I am getting error [paste error]. Tell me the root cause and the fix, not just what the error means.' },
      { id: 't5', text: 'Refactor this function to be O(n) instead of O(n^2) if possible.' },
      { id: 't6', text: 'Write a Python script to [task] using only standard libraries (no pip install).' },
      { id: 't7', text: 'Generate dummy data for [app] in CSV format: 50 rows, realistic names and edge-case addresses.' },
      { id: 't8', text: 'Explain the trade-offs between using [Tech A] vs [Tech B] for [Specific Scale].' },
      { id: 't9', text: 'Comment this code explain why this logic handles the edge case.' },
      { id: 't10', text: 'Convert this curl command into a Python requests function.' },
    ]
  }
};

// Pro Tips for supercharging prompts
const PRO_TIPS = [
  {
    id: 'tip1',
    name: 'Think It Through Override',
    subtitle: 'Chain of Thought',
    icon: Zap,
    description: 'Add "...and explain your step-by-step reasoning before giving the final answer." for complex tasks.',
    example: 'Solve this problem and explain your step-by-step reasoning before giving the final answer.',
  },
  {
    id: 'tip2',
    name: 'Format is the Ultimate Constraint',
    subtitle: 'Output Control',
    icon: FileText,
    description: 'Append formats like "...in a Markdown table", "...as a CSV code block", "...as a bulleted list sorted by priority", "...in a single, tweetable sentence".',
    example: 'List the top 10 features...as a Markdown table with columns: Feature, Priority, Effort.',
  },
  {
    id: 'tip3',
    name: 'The Meta-Prompt Technique',
    subtitle: 'Prompt Engineering',
    icon: Sparkles,
    description: 'Ask AI to write the prompt: "I need to get [result] from an AI every day. Write the best possible one-line prompt for me to use."',
    example: 'I need to get a daily summary of tech news. Write the best possible one-line prompt for me to use.',
  },
  {
    id: 'tip4',
    name: 'Context Stacking',
    subtitle: 'Gemini Specific',
    icon: Layers,
    description: 'Paste large context (e.g., 3 months of notes) before the one-line prompt. Gemini\'s large context window excels here.',
    example: '[Paste 50 pages of meeting notes] Now summarize the key decisions made.',
  },
  {
    id: 'tip5',
    name: 'The Temperature Control',
    subtitle: 'Precision vs Creativity',
    icon: ThermometerSun,
    description: 'Use language for temperature: Low Temp (Precise): Strict, Exact, Verbatim, No fluff. High Temp (Creative): Unusual, Abstract, Metaphorical, Wild.',
    example: 'Give me an unusual, abstract metaphor for database indexing.',
  },
];

// Awesome Gemini AI prompts
const GEMINI_PROMPTS = {
  webdev: {
    name: 'Web Development',
    icon: Globe,
    prompts: [
      { id: 'g1', name: 'Futuristic AI Agency Landing Page', text: 'Build a high-performance, interactive landing page for an AI Software Development Agency using Next.js 14, Tailwind CSS, Framer Motion, and React Three Fiber for shaders.' },
      { id: 'g2', name: 'Enterprise Landing Page Generator', text: 'Generate an enterprise-grade professional [DESCRIBE YOUR BUSINESS] landing page. Add interactive elements, animations, and make it fully responsive. Surprise me, be creative, do this step by step.' },
      { id: 'g3', name: 'OS Simulator', text: 'Build a fully functional web application fully simulating an OS. Make a blend of Windows 11 and Linux. The UI must completely copy the windows 11 vibe and has apps like in linux.' },
      { id: 'g4', name: 'Dither + Shaders Landing Page', text: 'Create a full landing page with Dither + Shaders using WebGL + ThreeJs. Focus mainly on the design part, not the development.' },
    ]
  },
  uiux: {
    name: 'UI/UX Design',
    icon: Palette,
    prompts: [
      { id: 'g5', name: 'Futuristic Crypto Dashboard', text: 'Reproduce a futuristic dark-mode crypto dashboard featuring high-contrast obsidian backgrounds, gradient-border glassmorphism UI elements, thin Inter typography, and neon-accented financial data visualizations.' },
      { id: 'g6', name: 'Maximalist Design', text: 'Design a maximalist website for a fictional start up. I want beautifully animated hero text with shaders that interact with mouse hover. lots of dithering, wavy, groovy, gradients.' },
      { id: 'g7', name: 'Jarvis HUD Interface', text: 'Build a jarvis HUD interface for tony stark.' },
    ]
  },
  n8n: {
    name: 'n8n Workflows',
    icon: Workflow,
    prompts: [
      { id: 'g8', name: 'Workflow Generator', text: 'Create an n8n workflow that [describe automation]. Include error handling, retries, and logging.' },
      { id: 'g9', name: 'API Integration', text: 'Build an n8n workflow that integrates [API A] with [API B], transforming data and handling rate limits.' },
    ]
  }
};

interface PromptLibraryProps {
  onSelectPrompt?: (prompt: string) => void;
}

export function PromptLibrary({ onSelectPrompt }: PromptLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedTip, setExpandedTip] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showGemini, setShowGemini] = useState(false);

  const filteredPrompts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const results: { category: string; categoryData: typeof SINGLE_LINE_PROMPTS.writing; prompts: typeof SINGLE_LINE_PROMPTS.writing.prompts }[] = [];

    Object.entries(SINGLE_LINE_PROMPTS).forEach(([key, category]) => {
      const filtered = category.prompts.filter(p => 
        p.text.toLowerCase().includes(query)
      );
      if (filtered.length > 0 && (!selectedCategory || selectedCategory === key)) {
        results.push({ category: key, categoryData: category, prompts: filtered });
      }
    });

    return results;
  }, [searchQuery, selectedCategory]);

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUse = (text: string) => {
    onSelectPrompt?.(text);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-orbitron font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          50 Single-Line Prompts
        </h2>
        <p className="text-purple-300/60 text-sm">
          Stop writing essays to your AI. Copy, paste, done.
        </p>
        <p className="text-cyan-400 text-xs mt-1 font-mono">
          THE ONE-SENTENCE REVOLUTION: CONSTRAINT &gt; CONTEXT
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search prompts..."
          className="w-full pl-10 pr-4 py-3 bg-[#1a1625]/80 border border-purple-500/30 rounded-lg text-purple-100 placeholder:text-purple-400/40 focus:outline-none focus:border-purple-500/60"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !selectedCategory 
              ? 'bg-purple-600 text-white' 
              : 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
          }`}
        >
          All
        </button>
        {Object.entries(SINGLE_LINE_PROMPTS).map(([key, category]) => {
          const Icon = category.icon;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                selectedCategory === key 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Prompts by Category */}
      <div className="space-y-6">
        {filteredPrompts.map(({ category, categoryData, prompts }) => {
          const Icon = categoryData.icon;
          return (
            <div key={category} className="bg-[#1a1625]/60 border border-purple-500/20 rounded-lg overflow-hidden">
              <div className={`p-4 bg-gradient-to-r ${categoryData.color} bg-opacity-10`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${categoryData.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-orbitron font-semibold text-white">{categoryData.name}</h3>
                    <p className="text-white/60 text-sm">{categoryData.subtitle}</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-purple-500/10">
                {prompts.map((prompt) => (
                  <div key={prompt.id} className="p-4 hover:bg-purple-500/5 transition-colors group">
                    <p className="text-purple-100 text-sm mb-3 font-mono leading-relaxed">
                      {prompt.text}
                    </p>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(prompt.id, prompt.text)}
                        className="px-3 py-1 text-xs bg-purple-500/20 text-purple-300 rounded hover:bg-purple-500/30 transition-colors flex items-center gap-1"
                      >
                        {copiedId === prompt.id ? (
                          <>
                            <Check className="w-3 h-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </button>
                      {onSelectPrompt && (
                        <button
                          onClick={() => handleUse(prompt.text)}
                          className="px-3 py-1 text-xs bg-cyan-500/20 text-cyan-300 rounded hover:bg-cyan-500/30 transition-colors flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" /> Use
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pro Tips Section */}
      <div className="mt-8">
        <h3 className="text-xl font-orbitron font-bold text-purple-300 mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" />
          Pro Tips: How to Supercharge These
        </h3>
        <div className="space-y-3">
          {PRO_TIPS.map((tip) => {
            const Icon = tip.icon;
            const isExpanded = expandedTip === tip.id;
            return (
              <div
                key={tip.id}
                className="bg-[#1a1625]/60 border border-purple-500/20 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedTip(isExpanded ? null : tip.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-purple-500/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/20">
                      <Icon className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-purple-100">{tip.name}</p>
                      <p className="text-purple-400/60 text-sm">{tip.subtitle}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-purple-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-purple-400" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-purple-500/10">
                    <p className="text-purple-300/80 text-sm mt-3 mb-3">{tip.description}</p>
                    <div className="bg-[#0d0a12] rounded-lg p-3">
                      <p className="text-cyan-300 text-xs font-mono">{tip.example}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Gemini Prompts Toggle */}
      <div className="mt-8">
        <button
          onClick={() => setShowGemini(!showGemini)}
          className="w-full p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg flex items-center justify-between hover:from-blue-600/30 hover:to-purple-600/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <div className="text-left">
              <p className="font-orbitron font-semibold text-blue-100">Awesome Gemini AI Prompts</p>
              <p className="text-blue-300/60 text-sm">Advanced prompts from top prompt engineers</p>
            </div>
          </div>
          {showGemini ? (
            <ChevronDown className="w-5 h-5 text-blue-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-blue-400" />
          )}
        </button>
        
        {showGemini && (
          <div className="mt-4 space-y-4">
            {Object.entries(GEMINI_PROMPTS).map(([key, category]) => {
              const Icon = category.icon;
              return (
                <div key={key} className="bg-[#1a1625]/60 border border-blue-500/20 rounded-lg overflow-hidden">
                  <div className="p-3 bg-blue-500/10 flex items-center gap-2">
                    <Icon className="w-4 h-4 text-blue-400" />
                    <span className="font-medium text-blue-100">{category.name}</span>
                  </div>
                  <div className="divide-y divide-blue-500/10">
                    {category.prompts.map((prompt) => (
                      <div key={prompt.id} className="p-4 hover:bg-blue-500/5 transition-colors group">
                        <p className="font-medium text-blue-200 text-sm mb-2">{prompt.name}</p>
                        <p className="text-purple-300/70 text-xs font-mono leading-relaxed line-clamp-2">
                          {prompt.text}
                        </p>
                        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopy(prompt.id, prompt.text)}
                            className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                          >
                            {copiedId === prompt.id ? (
                              <>
                                <Check className="w-3 h-3" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
