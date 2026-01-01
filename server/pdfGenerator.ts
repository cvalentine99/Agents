import puppeteer from "puppeteer";

interface ResearchPDFData {
  topic: string;
  depth: string;
  status: string;
  sourcesCount: number;
  createdAt: Date;
  completedAt?: Date | null;
  summary: string | null;
  findings: Array<{
    title: string;
    content: string;
    sourceType: string;
    confidence: string;
    relevanceScore: number;
  }>;
  followUps: Array<{
    question: string;
    answer: string | null;
  }>;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function generateHTML(data: ResearchPDFData): string {
  const findingsHtml = data.findings
    .map(
      (finding, index) => `
      <div class="finding">
        <h3>${index + 1}. ${escapeHtml(finding.title)}</h3>
        <div class="finding-meta">
          <span class="badge source">${escapeHtml(finding.sourceType)}</span>
          <span class="badge confidence confidence-${finding.confidence}">${escapeHtml(finding.confidence)}</span>
          <span class="badge relevance">${finding.relevanceScore}% relevant</span>
        </div>
        <p>${escapeHtml(finding.content)}</p>
      </div>
    `
    )
    .join("");

  const followUpsHtml = data.followUps
    .filter((f) => f.answer)
    .map(
      (followUp) => `
      <div class="followup">
        <h4 class="question">Q: ${escapeHtml(followUp.question)}</h4>
        <div class="answer">${escapeHtml(followUp.answer || "")}</div>
      </div>
    `
    )
    .join("");

  // Calculate TOC entries
  const tocEntries = [
    { title: "Executive Summary", page: 2 },
    { title: "Research Findings", page: 3 },
  ];
  if (data.followUps.filter((f) => f.answer).length > 0) {
    tocEntries.push({ title: "Follow-up Questions & Answers", page: 4 });
  }
  tocEntries.push({ title: "Research Methodology", page: tocEntries.length + 2 });

  const tocHtml = tocEntries
    .map(
      (entry) => `
      <div class="toc-entry">
        <span class="toc-title">${entry.title}</span>
        <span class="toc-dots"></span>
        <span class="toc-page">${entry.page}</span>
      </div>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a2e;
      background: white;
    }
    
    /* Cover Page */
    .cover-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: white;
      text-align: center;
      padding: 60px;
      page-break-after: always;
    }
    
    .cover-logo {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #a855f7, #6366f1);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 40px;
      font-size: 36px;
      font-weight: bold;
    }
    
    .cover-brand {
      font-size: 14pt;
      text-transform: uppercase;
      letter-spacing: 4px;
      color: #a855f7;
      margin-bottom: 20px;
    }
    
    .cover-title {
      font-size: 32pt;
      font-weight: 700;
      margin-bottom: 20px;
      max-width: 600px;
      line-height: 1.2;
    }
    
    .cover-subtitle {
      font-size: 14pt;
      color: #94a3b8;
      margin-bottom: 60px;
    }
    
    .cover-meta {
      display: flex;
      gap: 40px;
      font-size: 10pt;
      color: #64748b;
    }
    
    .cover-meta-item {
      text-align: center;
    }
    
    .cover-meta-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #a855f7;
      margin-bottom: 4px;
    }
    
    /* Table of Contents */
    .toc-page {
      padding: 60px;
      page-break-after: always;
    }
    
    .toc-header {
      font-size: 24pt;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #a855f7;
    }
    
    .toc-entry {
      display: flex;
      align-items: baseline;
      margin-bottom: 16px;
      font-size: 12pt;
    }
    
    .toc-title {
      font-weight: 500;
    }
    
    .toc-dots {
      flex: 1;
      border-bottom: 2px dotted #e2e8f0;
      margin: 0 12px 4px;
    }
    
    .toc-page {
      font-weight: 600;
      color: #a855f7;
    }
    
    /* Content Pages */
    .content-page {
      padding: 50px 60px;
      page-break-after: always;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .page-title {
      font-size: 10pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .page-brand {
      font-size: 9pt;
      color: #a855f7;
      font-weight: 600;
    }
    
    h2 {
      font-size: 20pt;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 24px;
    }
    
    h3 {
      font-size: 14pt;
      font-weight: 600;
      color: #1a1a2e;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    
    h4 {
      font-size: 12pt;
      font-weight: 600;
      color: #6366f1;
      margin-top: 20px;
      margin-bottom: 8px;
    }
    
    p {
      margin-bottom: 16px;
      text-align: justify;
    }
    
    /* Summary Section */
    .summary-content {
      background: #f8fafc;
      padding: 30px;
      border-radius: 12px;
      border-left: 4px solid #a855f7;
    }
    
    /* Findings */
    .finding {
      background: #fafafa;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 1px solid #e2e8f0;
    }
    
    .finding h3 {
      margin-top: 0;
      color: #1a1a2e;
    }
    
    .finding-meta {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .badge {
      font-size: 9pt;
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 500;
    }
    
    .badge.source {
      background: #e0e7ff;
      color: #4338ca;
    }
    
    .badge.confidence-high {
      background: #dcfce7;
      color: #166534;
    }
    
    .badge.confidence-medium {
      background: #fef3c7;
      color: #92400e;
    }
    
    .badge.confidence-low {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .badge.relevance {
      background: #f3e8ff;
      color: #7c3aed;
    }
    
    /* Follow-ups */
    .followup {
      margin-bottom: 24px;
      padding: 20px;
      background: #faf5ff;
      border-radius: 8px;
      border: 1px solid #e9d5ff;
    }
    
    .followup .question {
      color: #7c3aed;
      margin-top: 0;
    }
    
    .followup .answer {
      color: #374151;
    }
    
    /* Methodology Section */
    .methodology-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 24px;
    }
    
    .methodology-item {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
    }
    
    .methodology-item h4 {
      margin-top: 0;
      color: #1a1a2e;
    }
    
    /* Footer */
    .page-footer {
      position: fixed;
      bottom: 30px;
      left: 60px;
      right: 60px;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #94a3b8;
    }
    
    @media print {
      .cover-page {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-logo">A</div>
    <div class="cover-brand">Agents by Valentine RF</div>
    <h1 class="cover-title">${escapeHtml(data.topic)}</h1>
    <p class="cover-subtitle">Deep Research Report</p>
    <div class="cover-meta">
      <div class="cover-meta-item">
        <div class="cover-meta-label">Research Depth</div>
        <div>${escapeHtml(data.depth.charAt(0).toUpperCase() + data.depth.slice(1))}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Sources Analyzed</div>
        <div>${data.sourcesCount}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Date</div>
        <div>${formatDate(data.createdAt)}</div>
      </div>
    </div>
  </div>
  
  <!-- Table of Contents -->
  <div class="toc-page">
    <h1 class="toc-header">Table of Contents</h1>
    ${tocHtml}
  </div>
  
  <!-- Executive Summary -->
  <div class="content-page">
    <div class="page-header">
      <span class="page-title">Executive Summary</span>
      <span class="page-brand">Agents by Valentine RF</span>
    </div>
    <h2>Executive Summary</h2>
    <div class="summary-content">
      ${data.summary ? `<p>${escapeHtml(data.summary).replace(/\n/g, "</p><p>")}</p>` : "<p>No summary available.</p>"}
    </div>
  </div>
  
  <!-- Research Findings -->
  <div class="content-page">
    <div class="page-header">
      <span class="page-title">Research Findings</span>
      <span class="page-brand">Agents by Valentine RF</span>
    </div>
    <h2>Research Findings</h2>
    ${findingsHtml || "<p>No findings recorded.</p>"}
  </div>
  
  ${
    followUpsHtml
      ? `
  <!-- Follow-up Q&A -->
  <div class="content-page">
    <div class="page-header">
      <span class="page-title">Follow-up Questions & Answers</span>
      <span class="page-brand">Agents by Valentine RF</span>
    </div>
    <h2>Follow-up Questions & Answers</h2>
    ${followUpsHtml}
  </div>
  `
      : ""
  }
  
  <!-- Methodology -->
  <div class="content-page">
    <div class="page-header">
      <span class="page-title">Research Methodology</span>
      <span class="page-brand">Agents by Valentine RF</span>
    </div>
    <h2>Research Methodology</h2>
    <p>This research was conducted using AI-powered deep research capabilities provided by Agents by Valentine RF. The methodology employed multi-step reasoning and synthesis to gather, analyze, and present findings.</p>
    
    <div class="methodology-grid">
      <div class="methodology-item">
        <h4>Research Depth</h4>
        <p>${escapeHtml(data.depth.charAt(0).toUpperCase() + data.depth.slice(1))} analysis with ${data.depth === "quick" ? "3" : data.depth === "standard" ? "5" : "8"} research steps</p>
      </div>
      <div class="methodology-item">
        <h4>Sources</h4>
        <p>${data.sourcesCount} sources analyzed and synthesized</p>
      </div>
      <div class="methodology-item">
        <h4>Findings</h4>
        <p>${data.findings.length} key findings identified</p>
      </div>
      <div class="methodology-item">
        <h4>Completion</h4>
        <p>${data.completedAt ? formatDate(data.completedAt) : "In Progress"}</p>
      </div>
    </div>
    
    <h3>Disclaimer</h3>
    <p>This report was generated using AI-assisted research tools. While every effort has been made to ensure accuracy, users should verify critical information from primary sources. The findings represent a synthesis of available information at the time of research.</p>
  </div>
</body>
</html>
`;
}

export async function generateResearchPDF(data: ResearchPDFData): Promise<Buffer> {
  const html = generateHTML(data);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export function generatePDFFilename(topic: string): string {
  const sanitized = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  const date = new Date().toISOString().split("T")[0];
  return `research-${sanitized}-${date}.pdf`;
}
