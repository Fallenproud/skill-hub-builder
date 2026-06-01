import { runLLM, rememberLongTerm, recallLongTerm } from "./runtime";

export type AdapterContext = { requestId: string };
export type SkillAdapter = {
  id: string;
  name: string;
  mode: "sync" | "async";
  costClass: "low" | "medium" | "high";
  latencyClass: "fast" | "normal" | "slow";
  execute: (input: Record<string, unknown>, ctx: AdapterContext) => Promise<unknown>;
};

const shortTermStore = new Map<string, Array<{ k: string; v: unknown; at: number }>>();

function str(input: Record<string, unknown>, key: string, fallback = ""): string {
  const v = input?.[key];
  return typeof v === "string" ? v : v == null ? fallback : JSON.stringify(v);
}

export const adapters: Record<string, SkillAdapter> = {
  "core-001": {
    id: "core-001", name: "LLM", mode: "sync", costClass: "low", latencyClass: "fast",
    execute: async (input) => {
      const prompt = str(input, "prompt");
      if (!prompt) throw new Error("input.prompt required");
      const r = await runLLM({ prompt, system: str(input, "system") || undefined });
      return { text: r.text, model: r.model };
    },
  },
  "core-002": {
    id: "core-002", name: "Reasoning-Engine", mode: "sync", costClass: "medium", latencyClass: "normal",
    execute: async (input) => {
      const problem = str(input, "problem") || str(input, "prompt");
      if (!problem) throw new Error("input.problem required");
      const r = await runLLM({
        model: "google/gemini-2.5-pro",
        system: "You are a rigorous reasoning engine. Think step-by-step internally, then return a concise final answer plus 3-5 bullet rationale.",
        prompt: problem,
      });
      return { reasoning: r.text, model: r.model };
    },
  },
  "core-003": {
    id: "core-003", name: "Planning", mode: "sync", costClass: "low", latencyClass: "fast",
    execute: async (input) => {
      const goal = str(input, "goal") || str(input, "prompt");
      if (!goal) throw new Error("input.goal required");
      const r = await runLLM({
        system: "Convert the user's goal into 3-8 ordered steps. Respond ONLY as JSON: {\"steps\":[{\"n\":1,\"title\":\"\",\"why\":\"\"}]}",
        prompt: goal,
        json: true,
      });
      try { return JSON.parse(r.text); } catch { return { steps: [], raw: r.text }; }
    },
  },
  "core-004": {
    id: "core-004", name: "Task-Decomposition", mode: "sync", costClass: "low", latencyClass: "fast",
    execute: async (input) => {
      const task = str(input, "task") || str(input, "prompt");
      if (!task) throw new Error("input.task required");
      const r = await runLLM({
        system: "Decompose the task into atomic subtasks suitable for parallel skill invocation. JSON: {\"subtasks\":[{\"id\":\"t1\",\"description\":\"\",\"suggested_skill\":\"\"}]}",
        prompt: task,
        json: true,
      });
      try { return JSON.parse(r.text); } catch { return { subtasks: [], raw: r.text }; }
    },
  },
  "core-005": {
    id: "core-005", name: "Chain-of-Thought-Control", mode: "sync", costClass: "low", latencyClass: "fast",
    execute: async (input) => {
      const thought = str(input, "thought") || str(input, "prompt");
      const r = await runLLM({
        system: "You are a CoT controller. Given a current reasoning trace, decide: continue | branch | stop. JSON: {\"decision\":\"continue|branch|stop\",\"reason\":\"\",\"next_prompt\":\"\"}",
        prompt: thought,
        json: true,
      });
      try { return JSON.parse(r.text); } catch { return { decision: "continue", raw: r.text }; }
    },
  },
  "core-006": {
    id: "core-006", name: "Memory-Short-Term", mode: "sync", costClass: "low", latencyClass: "fast",
    execute: async (input, ctx) => {
      const op = str(input, "op", "get"); // get | set | list | clear
      const bucket = str(input, "bucket") || ctx.requestId;
      const arr = shortTermStore.get(bucket) ?? [];
      if (op === "set") {
        arr.push({ k: str(input, "key"), v: input.value ?? null, at: Date.now() });
        shortTermStore.set(bucket, arr);
        return { ok: true, size: arr.length };
      }
      if (op === "clear") { shortTermStore.delete(bucket); return { ok: true }; }
      if (op === "get") {
        const k = str(input, "key");
        return { value: arr.find((e) => e.k === k)?.v ?? null };
      }
      return { items: arr };
    },
  },
  "core-007": {
    id: "core-007", name: "Memory-Long-Term", mode: "sync", costClass: "low", latencyClass: "fast",
    execute: async (input) => {
      const op = str(input, "op", "recall");
      if (op === "remember") {
        const id = await rememberLongTerm(
          str(input, "content"),
          typeof input.importance === "number" ? input.importance : 3,
          Array.isArray(input.tags) ? (input.tags as string[]) : [],
        );
        return { ok: true, id };
      }
      const items = await recallLongTerm(str(input, "query"), Number(input.limit) || 10);
      return { items };
    },
  },
  "core-008": {
    id: "core-008", name: "Vector-Retrieval", mode: "sync", costClass: "low", latencyClass: "fast",
    execute: async (input) => {
      // Stub until pgvector wired. Falls back to ILIKE recall for usability.
      const items = await recallLongTerm(str(input, "query"), Number(input.k) || 5);
      return { items, note: "stub: ILIKE fallback; pgvector pending" };
    },
  },
  "core-009": {
    id: "core-009", name: "RAG-Orchestration", mode: "sync", costClass: "medium", latencyClass: "normal",
    execute: async (input) => {
      const question = str(input, "question") || str(input, "prompt");
      if (!question) throw new Error("input.question required");
      const ctx = await recallLongTerm(question, 8);
      const ctxStr = ctx.map((m) => `- ${m.content}`).join("\n") || "(no memory)";
      const r = await runLLM({
        system: "Answer using ONLY the provided context. Cite which bullets you used. If context is insufficient, say so.",
        prompt: `Context:\n${ctxStr}\n\nQuestion: ${question}`,
      });
      return { answer: r.text, context_used: ctx.length };
    },
  },
  "core-010": {
    id: "core-010", name: "Multi-Agent-Coordinator", mode: "sync", costClass: "high", latencyClass: "slow",
    execute: async (input) => {
      const goal = str(input, "goal") || str(input, "prompt");
      const agents = Array.isArray(input.agents) ? input.agents : ["planner", "executor", "critic"];
      const r = await runLLM({
        model: "google/gemini-2.5-pro",
        system: "Coordinate the given agents to achieve the goal. JSON: {\"assignments\":[{\"agent\":\"\",\"task\":\"\",\"depends_on\":[]}]}",
        prompt: `Goal: ${goal}\nAgents: ${JSON.stringify(agents)}`,
        json: true,
      });
      try { return JSON.parse(r.text); } catch { return { assignments: [], raw: r.text }; }
    },
  },
};

export function getAdapter(skillIdOrName: string): SkillAdapter | undefined {
  if (adapters[skillIdOrName]) return adapters[skillIdOrName];
  return Object.values(adapters).find((a) => a.name === skillIdOrName);
}

export function listExecutableSkills(): string[] {
  return Object.keys(adapters);
}