# Prompt Resources from awesome-gemini-ai

## Categories from Repository

### 1. Web Development & Coding
- Futuristic AI Agency Landing Page (Next.js 14)
- Enterprise Landing Page Generator
- "Winnux" OS Simulator
- Dither + Shaders Landing Page

### 2. UI/UX & Design
- Futuristic Crypto Dashboard
- Maximalist Design (Digital Hot Dogs)
- Jarvis HUD Interface
- Gemini 3.0 Design Prompt (Elite Web Designer)

### 3. Creative & 3D Experiments
- Various shader and 3D prompts

### 4. Multilingual Prompts (Chinese/CN)

### 5. n8n Workflow Generation

## Key Design Guidelines from Prompts

### Typography Rules
- DO NOT USE: Inter, Roboto, Open Sans, Segoe UI, system defaults
- USE: Space Grotesk, Syne (headings), JetBrains Mono, DM Sans (body)
- Extreme contrast in weights (Light 200 vs Black 800)

### Visual Atmosphere
- Deep dark voids (#030305) with radial/mesh gradients
- Shaders that react to mouse movement
- Dark Mode with neon accents (Electric Blue #3B82F6, Cyber Purple #8B5CF6)

### Motion & Interactivity
- Staggered reveals with framer-motion
- Scroll animations (float up, blur-in, scale)
- Micro-interactions (magnetic buttons, 3D parallax cards)

### Layout Principles
- Bento Grids (asymmetrical)
- Overlapping elements and negative space
- Glassmorphism navbars

---

## 50 Single-Line Prompts (from cheat sheet image)

### Writing & Editing (Un-Robot Filter)
1. Rewrite this to sound like I'm an expert, but not arrogant
2. Give me 10 headline variations for this topic
3. Turn these messy notes into a structured outline using Roman numerals
4. Critique this draft for logical fallacies and gaps in reasoning
5. Explain [complex topic] using only the 1,000 most common words
6. Find the steelman argument against my position
7. Rewrite this in half the word count without losing key points
8. Make this email sound firm but diplomatic
9. Turn this technical explanation into a fable with a moral
10. Extract the 'BLUF' and 3 action items from this text

### Work & Productivity (10x Multiplier)
1. Break this project into a checklist of 15-minute tasks
2. What are the 3 things I should do first to prevent bottleneck later
3. Draft a meeting agenda that ensures we leave with a decision
4. Translate this corporate jargon into plain, blunt English
5. Draft 3 options for a reply: Yes, No, Maybe/Negotiate
6. What questions should I ask in this meeting to look strategic but not obstructionist
7. Simulate a negotiation with a skeptical client
8. Identify the underlying emotion driving this email
9. Create a "Pre-Mortem" for [project]: list 5 reasons why this failed 6 months from now
10. Summarize this long chain of emails into a bulleted timeline

### Learning & Research (Speed-Running Knowledge)
1. Explain the mental model behind [concept] rather than the definition
2. What are the 3 'Noble Lies' (simplifications) taught to beginners about [topic]
3. Create a learning syllabus for [skill] that gets me to 'competent' in 20 hours
4. Apply the Pareto Principle to [topic]: what is the 20% I need to understand 80%
5. Compare [Concept A] and [Concept B] in a table highlighting differences in cost, speed, and risk
6. What prerequisite knowledge am I likely missing if I find [topic] confusing
7. Teach me [concept] by using an analogy involving [hobby/interest]
8. List the 5 industry-standard terms for [description] so I can Google them effectively
9. What would a detractor say is the biggest flaw in [theory/idea]
10. Quiz me on [topic] one question at a time, don't give me the answer until I guess

### Creative & Brainstorming (Unstucking the Brain)
1. Give me 10 'Bad Ideas' for [problem] that are impossible or illegal
2. Invert the problem: How would I guarantee [project] fails miserably
3. What would [Famous Person/Company] do to solve [problem]
4. Combine the mechanics of [Thing A] with the aesthetic of [Thing B] to create [Thing C]
5. Rewrite this boring paragraph in the style of a hard-boiled noir detective
6. List 5 assumptions I am making about [problem] that might be false
7. Give me a metaphor for [concept] that doesn't involve [standard cliche]
8. Scanner method: How can I Substitute, Combine, Adapt, Modify, Put to another use, Eliminate, or Reverse [product]
9. Generate a title for this that creates a "Curiosity Gap"
10. Turn this serious topic into a humorous 3-panel comic strip script

### Technical & Data (Gemini Superpowers)
1. Act as a Senior Developer: Review this code for security vulnerabilities only
2. Explain this SQL query in plain English to a project manager
3. Generate a JSON schema for [data description] that includes validation
4. I am getting error [paste error]. Tell me the root cause and the fix
5. Refactor this function to be O(n) instead of O(n^2) if possible
6. Write a Python script to [task] using only standard libraries
7. Generate dummy data for [app] in CSV format: 50 rows, realistic names and edge-case addresses
8. Explain the trade-offs between using [Tech A] vs [Tech B] for [Specific Scale]
9. Comment this code explain why this logic handles the edge case
10. Convert this curl command into a Python requests function

## Pro Tips (How to Supercharge These)

1. **Think It Through Override (Chain of Thought)**
   - Add "...and explain your step-by-step reasoning before giving the final answer." for complex tasks

2. **Format is the Ultimate Constraint**
   - Append formats like "...in a Markdown table", "...as a CSV code block", "...as a bulleted list sorted by priority", "...in a single, tweetable sentence"

3. **The Meta-Prompt Technique**
   - Ask AI to write the prompt: "I need to get [result] from an AI every day. Write the best possible one-line prompt for me to use."

4. **Context Stacking (Gemini Specific)**
   - Paste large context (e.g., 3 months of notes) before the one-line prompt. Gemini's large context window excels here.

5. **The Temperature Control**
   - Use language for temperature: Low Temp (Precise): Strict, Exact, Verbatim, No fluff. High Temp (Creative): Unusual, Abstract, Metaphorical, Wild.
