
-- Categories
CREATE TABLE public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT NOT NULL DEFAULT '◈',
  sort_order INTEGER DEFAULT 0
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public write categories" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update categories" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Public delete categories" ON public.categories FOR DELETE USING (true);

-- Skills
CREATE TABLE public.skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES public.categories(id),
  description TEXT,
  trigger_condition TEXT,
  boundary TEXT,
  priority INTEGER DEFAULT 2,
  cost_class TEXT DEFAULT 'medium',
  latency_class TEXT DEFAULT 'normal',
  requires_auth BOOLEAN DEFAULT false,
  requires_freshness BOOLEAN DEFAULT false,
  safe_for_parallel BOOLEAN DEFAULT false,
  stateful BOOLEAN DEFAULT false,
  logs_required BOOLEAN DEFAULT false,
  inputs JSONB DEFAULT '[]',
  outputs JSONB DEFAULT '[]',
  fallback_chain JSONB DEFAULT '[]',
  invoke_conditions JSONB DEFAULT '[]',
  block_conditions JSONB DEFAULT '[]',
  tool_definition JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read skills" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Public write skills" ON public.skills FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update skills" ON public.skills FOR UPDATE USING (true);
CREATE POLICY "Public delete skills" ON public.skills FOR DELETE USING (true);

-- Agent Sessions
CREATE TABLE public.agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  routing_plan JSONB DEFAULT NULL,
  router_reasoning TEXT DEFAULT NULL,
  synthesis TEXT DEFAULT NULL,
  total_skills INTEGER DEFAULT 0,
  estimated_cost TEXT DEFAULT NULL,
  duration_ms INTEGER DEFAULT NULL,
  model_used TEXT DEFAULT NULL,
  token_usage JSONB DEFAULT NULL,
  execution_tokens INTEGER DEFAULT 0,
  error TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ DEFAULT NULL
);

ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sessions" ON public.agent_sessions FOR SELECT USING (true);
CREATE POLICY "Public write sessions" ON public.agent_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update sessions" ON public.agent_sessions FOR UPDATE USING (true);
CREATE POLICY "Public delete sessions" ON public.agent_sessions FOR DELETE USING (true);

-- Execution Log
CREATE TABLE public.execution_log (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  sequence_order INTEGER DEFAULT 0,
  reason TEXT,
  fallback_for TEXT DEFAULT NULL,
  estimated_cost TEXT DEFAULT NULL,
  latency_class TEXT DEFAULT NULL,
  requires_auth BOOLEAN DEFAULT false,
  parallel_group INTEGER DEFAULT NULL,
  status TEXT DEFAULT 'planned',
  output_summary TEXT DEFAULT NULL,
  output_data JSONB DEFAULT NULL,
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  error_msg TEXT DEFAULT NULL,
  started_at TIMESTAMPTZ DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.execution_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read execution_log" ON public.execution_log FOR SELECT USING (true);
CREATE POLICY "Public write execution_log" ON public.execution_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update execution_log" ON public.execution_log FOR UPDATE USING (true);
CREATE POLICY "Public delete execution_log" ON public.execution_log FOR DELETE USING (true);

-- Memories
CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 3,
  tags JSONB DEFAULT '[]',
  source TEXT DEFAULT 'manual',
  session_id UUID DEFAULT NULL,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_accessed TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read memories" ON public.memories FOR SELECT USING (true);
CREATE POLICY "Public write memories" ON public.memories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update memories" ON public.memories FOR UPDATE USING (true);
CREATE POLICY "Public delete memories" ON public.memories FOR DELETE USING (true);

-- Agent Config
CREATE TABLE public.agent_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read config" ON public.agent_config FOR SELECT USING (true);
CREATE POLICY "Public write config" ON public.agent_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update config" ON public.agent_config FOR UPDATE USING (true);
CREATE POLICY "Public delete config" ON public.agent_config FOR DELETE USING (true);

-- Hub Pages
CREATE TABLE public.hub_pages (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT '◈',
  description TEXT,
  category TEXT DEFAULT 'custom',
  color TEXT DEFAULT '#3b82f6',
  enabled BOOLEAN DEFAULT true,
  built_in BOOLEAN DEFAULT false,
  source_url TEXT,
  sort_order INTEGER DEFAULT 99,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hub_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read hub_pages" ON public.hub_pages FOR SELECT USING (true);
CREATE POLICY "Public write hub_pages" ON public.hub_pages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update hub_pages" ON public.hub_pages FOR UPDATE USING (true);
CREATE POLICY "Public delete hub_pages" ON public.hub_pages FOR DELETE USING (true);

-- Audit Log
CREATE TABLE public.audit_log (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read audit_log" ON public.audit_log FOR SELECT USING (true);
CREATE POLICY "Public write audit_log" ON public.audit_log FOR INSERT WITH CHECK (true);

-- Seed categories
INSERT INTO public.categories (id, name, color, icon, sort_order) VALUES
  ('core', 'Core Intelligence', '#3b82f6', '◈', 0),
  ('vision', 'Vision & Media', '#8b5cf6', '◉', 1),
  ('audio', 'Audio & Speech', '#10b981', '◎', 2),
  ('web', 'Web & Data', '#f59e0b', '◌', 3),
  ('code', 'Code & Engineering', '#84cc16', '◧', 4),
  ('ux', 'UX & Design', '#ec4899', '◫', 5),
  ('strategy', 'Strategy & Governance', '#eab308', '◦', 6),
  ('auto', 'Autonomous Control', '#06b6d4', '◐', 7),
  ('sys', 'System Runtime', '#ef4444', '◑', 8),
  ('opt', 'Optional High-Value', '#a3a3a3', '◒', 9);

-- Seed default agent config
INSERT INTO public.agent_config (key, value) VALUES
  ('agent_name', 'My Agent'),
  ('agent_persona', 'You are a precise, capable AI agent. Be direct, thorough, and accurate.'),
  ('default_context', ''),
  ('memory_injection', '1'),
  ('max_memory_inject', '5'),
  ('skill_priorities', '{}'),
  ('blocked_skills', '[]'),
  ('preferred_cost', 'medium');

-- Seed skills (Core Intelligence)
INSERT INTO public.skills (id, name, category_id, description, trigger_condition, boundary, priority, cost_class, latency_class, requires_auth, requires_freshness, safe_for_parallel, stateful, logs_required, inputs, outputs, fallback_chain, invoke_conditions, block_conditions) VALUES
  ('core-001', 'LLM', 'core', 'General text reasoning, generation, summarization, rewriting, and structured response synthesis.', 'Default for text-first tasks where no specialized modality is required.', 'Do not use when a specialized modality is clearly required.', 1, 'low', 'fast', false, false, true, false, false, '["natural language","instructions","optional context"]', '["text","markdown","JSON"]', '["Reasoning-Engine","Task-Decomposition"]', '["text input present","no media or specialized tool required"]', '["media generation requested","code execution required"]'),
  ('core-002', 'Reasoning-Engine', 'core', 'Performs multi-step logical analysis, constraint solving, and higher-difficulty decision support.', 'Complex planning or nontrivial logic chains requiring decomposition.', 'Avoid for simple drafting or single-step generation.', 2, 'medium', 'normal', false, false, false, true, true, '["problem statement","constraints","objectives"]', '["structured reasoning path","ranked conclusions"]', '["Task-Decomposition","LLM"]', '["multi-step logic required","constraint satisfaction needed"]', '["simple one-step task"]'),
  ('core-003', 'Planning', 'core', 'Converts goals into ordered steps, milestones, dependencies, and execution phases.', 'User asks for roadmap, implementation sequence, or rollout strategy.', 'Do not use as the final executor — plan only.', 2, 'low', 'fast', false, false, false, false, false, '["goal","scope","deadlines","constraints"]', '["step plan","phases","timeline"]', '["Task-Decomposition","Reasoning-Engine"]', '["roadmap requested","timeline needed"]', '["execution expected immediately"]'),
  ('core-004', 'Task-Decomposition', 'core', 'Breaks large work into atomic subtasks with clear ownership and interfaces.', 'Multi-part work or large ambiguous requests needing structured breakdown.', 'Not for final content generation alone.', 2, 'low', 'fast', false, false, false, false, false, '["complex task","target outcome"]', '["subtasks","dependency graph"]', '["Planning","Reasoning-Engine"]', '["complex multi-part request"]', '["single clear deliverable"]'),
  ('core-005', 'Chain-of-Thought-Control', 'core', 'Enforces concise, bounded, non-leaky internal reasoning behavior and output discipline.', 'Sensitive, high-stakes, or token-limited tasks requiring disciplined trace management.', 'Must not expose private reasoning traces externally.', 1, 'low', 'fast', false, false, false, false, true, '["task complexity","response policy","privacy constraints"]', '["controlled reasoning mode"]', '["Reasoning-Engine"]', '["sensitive task context","token budget constraint"]', '["no reasoning constraint required"]'),
  ('core-006', 'Memory-Short-Term', 'core', 'Tracks immediate conversational state, active variables, and turn-local decisions.', 'Ongoing multi-step interaction requiring state carry-forward.', 'Do not treat as durable memory — session-scoped only.', 1, 'low', 'fast', false, false, false, true, false, '["current thread context"]', '["active session state"]', '["State-Monitoring"]', '["multi-turn conversation"]', '["single-turn task"]'),
  ('core-007', 'Memory-Long-Term', 'core', 'Stores stable user, project, or system preferences for future reuse across sessions.', 'Repeat workflows or user-specific continuity needing persistence.', 'Avoid storing trivial or sensitive data without explicit need.', 2, 'low', 'fast', false, false, false, true, true, '["durable facts","preferences","context"]', '["long-horizon context"]', '["Vector-Retrieval"]', '["cross-session recall needed"]', '["one-off task"]'),
  ('core-008', 'Vector-Retrieval', 'core', 'Retrieves semantically similar chunks from indexed knowledge bases using embedding similarity.', 'Contextual recall from documents or memory stores is required.', 'Not for direct generation — retrieval and ranking only.', 2, 'low', 'fast', false, false, true, false, false, '["query embedding","semantic prompt"]', '["ranked passages"]', '["Web-Search","RAG-Orchestration"]', '["knowledge base exists"]', '["no vector store connected"]'),
  ('core-009', 'RAG-Orchestration', 'core', 'Combines retrieval, grounding, and answer synthesis into a citation-aware output flow.', 'Knowledge-backed answers requiring accuracy and source attribution.', 'Avoid when no source base exists.', 2, 'medium', 'normal', false, true, false, false, true, '["question","indexed sources","retrieval policy"]', '["grounded answer","source mapping"]', '["Vector-Retrieval","Web-Search"]', '["factual grounding required"]', '["no indexed sources available"]'),
  ('core-010', 'Multi-Agent-Coordinator', 'core', 'Assigns roles, routes subtasks, merges outputs, and resolves conflicts across agents.', 'Parallel or role-based multi-agent systems needing orchestration.', 'Avoid for single-skill tasks — overhead not justified.', 3, 'high', 'slow', true, false, false, true, true, '["task graph","available agents","policies"]', '["execution plan","merged result"]', '["Workflow-Orchestration"]', '["multiple agents available"]', '["single agent system"]');

-- Seed Vision & Media skills
INSERT INTO public.skills (id, name, category_id, description, trigger_condition, boundary, priority, cost_class, latency_class, safe_for_parallel, inputs, outputs, fallback_chain) VALUES
  ('vision-001', 'VLM', 'vision', 'Understands images/screenshots and answers questions about visual content.', 'User asks to inspect, analyze, or interpret an image.', 'Do not use for image creation or generation.', 2, 'medium', 'normal', true, '["image","prompt","region hints"]', '["caption","analysis","meaning"]', '["OCR","Image-Classification"]'),
  ('vision-002', 'Image-Generation', 'vision', 'Creates new images from prompts, references, or art direction.', 'User requests visual creation from scratch.', 'Avoid when analysis of an existing image is needed.', 2, 'high', 'slow', true, '["prompt","style","ratio"]', '["image asset(s)","metadata"]', '["Image-Editing"]'),
  ('vision-003', 'Image-Editing', 'vision', 'Modifies an existing image by adding, removing, or restyling elements.', 'User requests changes to an uploaded image.', 'Do not use when a brand-new image is better suited.', 2, 'high', 'slow', false, '["source image","edit instructions","masks"]', '["edited image"]', '["Image-Generation"]'),
  ('vision-004', 'Image-Upscaling', 'vision', 'Enhances image resolution and perceived detail.', 'Existing image is too small or blurry for intended use.', 'Do not promise true lost-detail recovery.', 3, 'medium', 'normal', true, '["low-res image","target size"]', '["upscaled image"]', '["Image-Editing"]'),
  ('vision-005', 'Image-Classification', 'vision', 'Labels or categorizes an image into known classes.', 'Fast category or content-type detection needed.', 'Not for pixel-level localization.', 3, 'low', 'fast', true, '["image","class schema"]', '["labels","confidence scores"]', '["Object-Detection","VLM"]'),
  ('vision-006', 'Object-Detection', 'vision', 'Finds and locates objects within an image with bounding boxes.', 'Spatial detection or counting of objects needed.', 'Not for abstract visual QA.', 3, 'medium', 'normal', true, '["image","detection targets"]', '["bounding boxes","labels"]', '["VLM","Image-Classification"]'),
  ('vision-007', 'OCR', 'vision', 'Extracts text from images, screenshots, and scanned documents.', 'Text extraction from visual media.', 'Not for handwriting recognition in difficult cases.', 2, 'low', 'fast', true, '["image","language hints"]', '["extracted text","confidence"]', '["VLM"]'),
  ('vision-008', 'Video-Analysis', 'vision', 'Analyzes video content for scene detection, object tracking, and event recognition.', 'User submits video for analysis.', 'Not for real-time streaming analysis.', 3, 'high', 'slow', false, '["video","analysis targets"]', '["scene analysis","events"]', '["VLM"]');

-- Seed Audio & Speech skills
INSERT INTO public.skills (id, name, category_id, description, trigger_condition, boundary, priority, cost_class, latency_class, safe_for_parallel, inputs, outputs, fallback_chain) VALUES
  ('audio-001', 'Speech-to-Text', 'audio', 'Transcribes spoken audio into text with timestamps and speaker labels.', 'Audio file or recording needs transcription.', 'Not for music or non-speech audio.', 2, 'medium', 'normal', true, '["audio file","language"]', '["transcript","timestamps"]', '["LLM"]'),
  ('audio-002', 'Text-to-Speech', 'audio', 'Converts text into natural-sounding speech with voice selection.', 'User requests audio output from text.', 'Not for real-time conversation.', 2, 'medium', 'normal', true, '["text","voice preference"]', '["audio file"]', '[]'),
  ('audio-003', 'Audio-Classification', 'audio', 'Classifies audio segments into categories like speech, music, noise.', 'Audio content type detection needed.', 'Not for speech content understanding.', 3, 'low', 'fast', true, '["audio file"]', '["classifications"]', '["Speech-to-Text"]'),
  ('audio-004', 'Sentiment-Detection', 'audio', 'Detects emotional tone and sentiment from speech audio.', 'Emotional analysis of spoken content needed.', 'Not highly accurate for sarcasm.', 3, 'medium', 'normal', false, '["audio/text"]', '["sentiment scores"]', '["LLM"]');

-- Seed Web & Data skills
INSERT INTO public.skills (id, name, category_id, description, trigger_condition, boundary, priority, cost_class, latency_class, requires_freshness, safe_for_parallel, inputs, outputs, fallback_chain) VALUES
  ('web-001', 'Web-Search', 'web', 'Searches the web for real-time information and returns relevant results.', 'User needs current or factual information not in training data.', 'Not for generating content — retrieval only.', 1, 'low', 'fast', true, true, '["search query"]', '["search results","snippets"]', '["RAG-Orchestration"]'),
  ('web-002', 'Web-Scraping', 'web', 'Extracts structured data from web pages and APIs.', 'User needs data from a specific URL or website.', 'Respect robots.txt and rate limits.', 2, 'medium', 'normal', true, true, '["URL","extraction rules"]', '["structured data"]', '["Web-Search"]'),
  ('web-003', 'Data-Analysis', 'web', 'Analyzes datasets with statistical methods, pattern detection, and visualization.', 'User provides data for analysis or asks analytical questions.', 'Not for data collection.', 2, 'medium', 'normal', false, false, '["dataset","analysis goals"]', '["insights","charts","statistics"]', '["LLM"]'),
  ('web-004', 'Data-Transformation', 'web', 'Converts, cleans, and reshapes data between formats.', 'Data needs reformatting or cleaning.', 'Not for analysis or interpretation.', 2, 'low', 'fast', false, true, '["source data","target format"]', '["transformed data"]', '["Data-Analysis"]'),
  ('web-005', 'API-Integration', 'web', 'Calls external APIs with proper authentication and error handling.', 'Integration with third-party service needed.', 'Requires valid API credentials.', 2, 'medium', 'normal', false, true, '["API spec","credentials","request"]', '["API response"]', '["Web-Scraping"]'),
  ('web-006', 'PDF-Processing', 'web', 'Extracts text, tables, and metadata from PDF documents.', 'PDF document needs parsing.', 'Not for PDF generation.', 2, 'medium', 'normal', false, true, '["PDF file"]', '["extracted content","tables"]', '["OCR"]'),
  ('web-007', 'Spreadsheet-Processing', 'web', 'Reads, writes, and manipulates spreadsheet data.', 'Spreadsheet operations needed.', 'Not for complex data analysis.', 2, 'low', 'fast', false, true, '["spreadsheet file","operations"]', '["processed data"]', '["Data-Transformation"]');

-- Seed Code & Engineering skills
INSERT INTO public.skills (id, name, category_id, description, trigger_condition, boundary, priority, cost_class, latency_class, safe_for_parallel, stateful, inputs, outputs, fallback_chain) VALUES
  ('code-001', 'Code-Generation', 'code', 'Generates code in any language from natural language specifications.', 'User requests code creation or implementation.', 'Always review generated code before execution.', 1, 'medium', 'normal', true, false, '["specification","language","framework"]', '["source code","documentation"]', '["LLM"]'),
  ('code-002', 'Code-Review', 'code', 'Reviews code for bugs, security issues, performance, and best practices.', 'User submits code for review or quality check.', 'Not a replacement for security audits.', 2, 'medium', 'normal', true, false, '["source code","review criteria"]', '["findings","suggestions"]', '["Code-Generation"]'),
  ('code-003', 'Code-Refactoring', 'code', 'Improves code structure, readability, and maintainability without changing behavior.', 'Code needs cleanup or modernization.', 'Must preserve existing behavior.', 2, 'medium', 'normal', false, false, '["source code","refactor goals"]', '["refactored code","diff"]', '["Code-Review"]'),
  ('code-004', 'Testing', 'code', 'Generates unit, integration, and e2e tests for code.', 'User needs test coverage for their code.', 'Tests should be deterministic and isolated.', 2, 'medium', 'normal', true, false, '["source code","test framework"]', '["test files","coverage report"]', '["Code-Review"]'),
  ('code-005', 'Debugging', 'code', 'Identifies and fixes bugs using error analysis and trace inspection.', 'User reports a bug or error in their code.', 'May need runtime access for complex bugs.', 1, 'medium', 'normal', false, true, '["error details","source code","logs"]', '["root cause","fix"]', '["Code-Review"]'),
  ('code-006', 'Documentation', 'code', 'Generates technical documentation, API docs, and READMEs.', 'User needs documentation for their code or project.', 'Not for end-user tutorials.', 2, 'low', 'fast', true, false, '["source code","doc format"]', '["documentation"]', '["LLM"]'),
  ('code-007', 'DevOps', 'code', 'Manages CI/CD pipelines, infrastructure, and deployment configurations.', 'Deployment, infrastructure, or pipeline configuration needed.', 'Not for application code changes.', 3, 'medium', 'normal', false, true, '["infrastructure spec","platform"]', '["config files","scripts"]', '["Code-Generation"]'),
  ('code-008', 'Security-Scanning', 'code', 'Scans code for security vulnerabilities and compliance issues.', 'Security assessment of code needed.', 'Not a replacement for penetration testing.', 2, 'medium', 'normal', true, false, '["source code","security policy"]', '["vulnerabilities","remediations"]', '["Code-Review"]');

-- Seed UX & Design skills
INSERT INTO public.skills (id, name, category_id, description, trigger_condition, boundary, priority, cost_class, latency_class, safe_for_parallel, inputs, outputs, fallback_chain) VALUES
  ('ux-001', 'UI-Design', 'ux', 'Creates UI component designs, layouts, and visual hierarchies.', 'User needs UI design for a feature or page.', 'Not for backend logic.', 2, 'medium', 'normal', true, '["requirements","brand guidelines"]', '["UI designs","component specs"]', '["LLM"]'),
  ('ux-002', 'UX-Research', 'ux', 'Analyzes user behavior, conducts heuristic evaluations, and identifies usability issues.', 'User experience assessment or improvement needed.', 'Not for visual design implementation.', 2, 'medium', 'normal', false, '["product context","user feedback"]', '["UX findings","recommendations"]', '["LLM"]'),
  ('ux-003', 'Copywriting', 'ux', 'Writes UI copy, microcopy, error messages, and marketing text.', 'Text content needed for interfaces or marketing.', 'Not for long-form content writing.', 2, 'low', 'fast', true, '["context","tone","constraints"]', '["copy variants"]', '["LLM"]'),
  ('ux-004', 'Accessibility-Audit', 'ux', 'Evaluates interfaces for WCAG compliance and accessibility issues.', 'Accessibility review needed.', 'Not a legal compliance certification.', 3, 'medium', 'normal', true, '["UI code/screenshots"]', '["accessibility report"]', '["UX-Research"]'),
  ('ux-005', 'Design-System', 'ux', 'Creates and maintains design tokens, component libraries, and style guides.', 'Design system creation or update needed.', 'Not for individual UI implementations.', 3, 'medium', 'normal', false, '["brand guidelines","platform"]', '["design tokens","component library"]', '["UI-Design"]');

-- Seed Strategy & Governance skills
INSERT INTO public.skills (id, name, category_id, description, trigger_condition, boundary, priority, cost_class, latency_class, safe_for_parallel, inputs, outputs, fallback_chain) VALUES
  ('strategy-001', 'Competitive-Analysis', 'strategy', 'Analyzes competitors, market positioning, and strategic opportunities.', 'Market or competitive analysis needed.', 'Based on available public information only.', 2, 'medium', 'normal', true, '["industry","competitors"]', '["analysis report","recommendations"]', '["Web-Search","LLM"]'),
  ('strategy-002', 'Risk-Assessment', 'strategy', 'Identifies, evaluates, and prioritizes risks with mitigation strategies.', 'Risk evaluation for a project or decision needed.', 'Not a legal or financial advisory.', 2, 'medium', 'normal', false, '["project context","risk factors"]', '["risk matrix","mitigations"]', '["Reasoning-Engine"]'),
  ('strategy-003', 'Decision-Framework', 'strategy', 'Structures complex decisions using frameworks like SWOT, decision trees, and weighted scoring.', 'Complex decision requiring structured analysis.', 'Framework-based — final judgment remains with user.', 2, 'low', 'fast', false, '["decision context","criteria"]', '["decision framework","recommendation"]', '["Reasoning-Engine"]'),
  ('strategy-004', 'Compliance-Check', 'strategy', 'Reviews content or processes against regulatory and policy requirements.', 'Compliance verification needed.', 'Not legal advice.', 3, 'medium', 'normal', true, '["content","regulations"]', '["compliance report"]', '["Risk-Assessment"]'),
  ('strategy-005', 'Business-Writing', 'strategy', 'Writes business documents: proposals, reports, memos, and presentations.', 'Professional business document needed.', 'Not for creative writing.', 2, 'medium', 'normal', true, '["context","document type","audience"]', '["business document"]', '["LLM","Copywriting"]');

-- Seed Autonomous Control skills
INSERT INTO public.skills (id, name, category_id, description, trigger_condition, boundary, priority, cost_class, latency_class, safe_for_parallel, stateful, inputs, outputs, fallback_chain) VALUES
  ('auto-001', 'Workflow-Orchestration', 'auto', 'Manages multi-step automated workflows with branching, error handling, and retries.', 'Complex automated workflow needed.', 'Not for simple sequential tasks.', 2, 'medium', 'normal', false, true, '["workflow definition","triggers"]', '["execution result","logs"]', '["Task-Decomposition"]'),
  ('auto-002', 'State-Monitoring', 'auto', 'Monitors system state, detects anomalies, and triggers alerts.', 'Continuous monitoring or anomaly detection needed.', 'Not for historical analysis.', 2, 'low', 'fast', true, true, '["metrics","thresholds"]', '["alerts","status"]', '["Data-Analysis"]'),
  ('auto-003', 'Self-Correction', 'auto', 'Detects and corrects errors in agent output through validation loops.', 'Output quality assurance needed.', 'Limited to detectable errors.', 2, 'medium', 'normal', false, true, '["output","validation rules"]', '["corrected output"]', '["Reasoning-Engine"]'),
  ('auto-004', 'Tool-Selection', 'auto', 'Dynamically selects the best tool or API for a given subtask.', 'Multiple tools could serve the same subtask.', 'Selection based on available tools only.', 1, 'low', 'fast', false, false, '["task","available tools"]', '["selected tool","rationale"]', '["LLM"]');

-- Seed System Runtime skills
INSERT INTO public.skills (id, name, category_id, description, trigger_condition, boundary, priority, cost_class, latency_class, safe_for_parallel, stateful, inputs, outputs, fallback_chain) VALUES
  ('sys-001', 'Token-Management', 'sys', 'Tracks and optimizes token usage across model calls.', 'Token budget management needed.', 'Cannot reduce inherent task complexity.', 1, 'low', 'fast', true, true, '["token budget","usage history"]', '["usage report","optimization plan"]', '[]'),
  ('sys-002', 'Error-Recovery', 'sys', 'Handles errors, retries failed operations, and provides fallback paths.', 'Operation failure needing graceful recovery.', 'Cannot fix fundamental system issues.', 1, 'low', 'fast', false, true, '["error context","retry policy"]', '["recovery result"]', '["Self-Correction"]'),
  ('sys-003', 'Context-Window-Management', 'sys', 'Manages context window size through summarization and prioritization.', 'Context exceeds available window.', 'May lose nuance through summarization.', 1, 'low', 'fast', false, true, '["context items","priority rules"]', '["optimized context"]', '["Token-Management"]'),
  ('sys-004', 'Logging', 'sys', 'Records system events, decisions, and outputs for debugging and audit.', 'Audit trail or debugging information needed.', 'Not for user-facing output.', 3, 'low', 'fast', true, false, '["events","log level"]', '["log entries"]', '[]'),
  ('sys-005', 'Cache-Management', 'sys', 'Caches and retrieves frequently used results to reduce latency and cost.', 'Repeated queries or computations detected.', 'Cache may become stale.', 3, 'low', 'fast', true, true, '["cache key","TTL"]', '["cached result"]', '[]');

-- Seed Optional High-Value skills
INSERT INTO public.skills (id, name, category_id, description, trigger_condition, boundary, priority, cost_class, latency_class, safe_for_parallel, inputs, outputs, fallback_chain) VALUES
  ('opt-001', 'Translation', 'opt', 'Translates text between languages with context awareness.', 'Multi-language translation needed.', 'Not for specialized legal or medical translation.', 2, 'medium', 'normal', true, '["text","source language","target language"]', '["translated text"]', '["LLM"]'),
  ('opt-002', 'Summarization', 'opt', 'Creates concise summaries of long documents or conversations.', 'Content needs condensing while preserving key points.', 'May miss nuance in highly technical content.', 1, 'low', 'fast', true, '["content","summary length"]', '["summary"]', '["LLM"]'),
  ('opt-003', 'Classification', 'opt', 'Classifies text into predefined or discovered categories.', 'Content categorization needed.', 'Accuracy depends on category clarity.', 2, 'low', 'fast', true, '["text","categories"]', '["classification","confidence"]', '["LLM"]'),
  ('opt-004', 'Entity-Extraction', 'opt', 'Extracts named entities (people, places, orgs, dates) from text.', 'Structured data extraction from unstructured text needed.', 'Not for relationship extraction.', 2, 'low', 'fast', true, '["text","entity types"]', '["entities"]', '["LLM"]'),
  ('opt-005', 'Email-Drafting', 'opt', 'Drafts professional emails with appropriate tone and structure.', 'Email composition assistance needed.', 'User should review before sending.', 2, 'low', 'fast', true, '["context","tone","recipients"]', '["email draft"]', '["LLM","Copywriting"]'),
  ('opt-006', 'Meeting-Notes', 'opt', 'Generates structured meeting notes with action items and decisions.', 'Meeting transcript or notes need processing.', 'Not for real-time transcription.', 2, 'low', 'fast', true, '["transcript/notes"]', '["structured notes","action items"]', '["Summarization"]'),
  ('opt-007', 'Presentation-Builder', 'opt', 'Creates slide deck outlines and content from topics or data.', 'Presentation creation needed.', 'Not for visual slide design.', 3, 'medium', 'normal', false, '["topic","audience","key points"]', '["slide outline","speaker notes"]', '["Business-Writing"]'),
  ('opt-008', 'Math-Solver', 'opt', 'Solves mathematical problems with step-by-step explanations.', 'Mathematical computation or proof needed.', 'Not for approximate or statistical problems.', 2, 'medium', 'normal', true, '["math problem"]', '["solution","steps"]', '["Reasoning-Engine"]');

-- Update function for timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_skills_updated_at
BEFORE UPDATE ON public.skills
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_config_updated_at
BEFORE UPDATE ON public.agent_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
