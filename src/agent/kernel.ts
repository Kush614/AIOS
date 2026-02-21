/**
 * AIOS Kernel — Hackathon Edition
 *
 * Two modes:
 *  1. Showcase mode: pre-crafted responses for demo commands (always works, no API needed)
 *  2. Live mode: real Anthropic API call (when API is available)
 *
 * Showcase mode fires when input matches known demo patterns.
 * Falls through to live API for everything else.
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  getDesktopState,
  openWindow,
  updateWindowContent,
  setKernelStatus,
  addNotification,
} from "../state/desktopState.js";
import type { DesktopState, WindowType } from "./schemas.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "none" });

// ── System prompt (used for live mode) ────────────────────────────────────

export const KERNEL_SYSTEM_PROMPT = `You are AIOS — an AI Operating System running inside a chat widget.
The user types natural language commands. You respond by opening windows on their desktop.

ALWAYS end your response with a <desktop_update> JSON block:

<desktop_update>
{
  "actions": [
    { "action": "open_window", "type": "file-explorer", "title": "Files", "content": { "cwd": "/project", "entries": [{"name":"src","type":"dir"},{"name":"README.md","type":"file","size":1200}] } },
    { "action": "open_window", "type": "terminal",      "title": "Output", "content": { "lines": ["$ npm test", "✓ All tests passed"] } },
    { "action": "open_window", "type": "code",          "title": "main.ts", "content": { "filePath": "src/main.ts", "content": "const x = 1;", "diagnostics": [] } },
    { "action": "notify",      "message": "Done!", "level": "success" }
  ]
}
</desktop_update>

Rules:
- Always include at least one action.
- Use "file-explorer" for directory listings.
- Use "terminal" for command output / logs.
- Use "code" for source code / config files.
- Use "browser" for web results (set screenshotB64 to null).
- Keep window titles under 30 characters.
- Populate windows with realistic, useful content.`.trim();

// ── Types ──────────────────────────────────────────────────────────────────

type Level = "info" | "success" | "warning" | "error";
type DesktopAction =
  | { action: "open_window"; type: string; title: string; content: Record<string, unknown> }
  | { action: "update_window"; window_id: string; content: Record<string, unknown> }
  | { action: "notify"; message: string; level: Level };

// ── Showcase responses ─────────────────────────────────────────────────────
// Pre-crafted demo commands. Keys are regex patterns.

const SHOWCASE: Array<[RegExp, () => DesktopAction[]]> = [
  [
    /list.*files|show.*files|file.*explorer|ls|dir/i,
    () => [
      {
        action: "open_window", type: "file-explorer", title: "AIOS Project",
        content: {
          cwd: "C:/Users/KUSH/Downloads/AIOS",
          entries: [
            { name: "src",           type: "dir" },
            { name: "resources",     type: "dir" },
            { name: "node_modules",  type: "dir" },
            { name: ".env",          type: "file", size: 87 },
            { name: "package.json",  type: "file", size: 612 },
            { name: "specs.md",      type: "file", size: 14200 },
            { name: "tsconfig.json", type: "file", size: 320 },
          ],
        },
      },
      { action: "notify", message: "7 items in project root", level: "info" },
    ],
  ],
  [
    /terminal|bash|shell|command/i,
    () => [
      {
        action: "open_window", type: "terminal", title: "AIOS Terminal",
        content: {
          lines: [
            "$ npm run dev",
            "",
            "> aios@0.1.0 dev",
            "> tsx watch src/server.ts",
            "",
            "[WIDGETS] Serving desktop widget with HMR",
            "[WIDGET] desktop mounted at /mcp-use/widgets/desktop",
            "[SERVER] Listening on http://localhost:3000",
            "",
            "✓ AIOS server is running",
            "$ _",
          ],
        },
      },
      { action: "notify", message: "Terminal opened", level: "success" },
    ],
  ],
  [
    /todo|task|list|checklist/i,
    () => [
      {
        action: "open_window", type: "code", title: "TodoApp.tsx",
        content: {
          filePath: "src/components/TodoApp.tsx",
          content: `import { useState } from "react"

interface Todo {
  id: number
  text: string
  done: boolean
}

export function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: "Build AIOS desktop widget", done: true },
    { id: 2, text: "Connect MCPAgent kernel",   done: true },
    { id: 3, text: "Demo at hackathon",          done: false },
    { id: 4, text: "Win the prize 🏆",            done: false },
  ])

  const toggle = (id: number) =>
    setTodos(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t))

  return (
    <div className="todo-app">
      <h1>My Tasks</h1>
      {todos.map(t => (
        <div key={t.id} onClick={() => toggle(t.id)}
          className={t.done ? "done" : ""}>
          {t.done ? "✓" : "○"} {t.text}
        </div>
      ))}
    </div>
  )
}`,
          diagnostics: [],
        },
      },
      { action: "notify", message: "TodoApp.tsx opened", level: "success" },
    ],
  ],
  [
    /react|component|typescript|code/i,
    () => [
      {
        action: "open_window", type: "code", title: "Desktop.tsx",
        content: {
          filePath: "resources/desktop/Desktop.tsx",
          content: `import { useEffect } from "react"
import { useWidget } from "mcp-use/react"
import { useWindowStore } from "./store/windowStore"
import { WindowManager } from "./components/WindowManager"
import { Taskbar } from "./components/Taskbar"

export default function Desktop() {
  const { props, callTool } = useWidget<DesktopProps>()
  const { syncFromServer } = useWindowStore()

  useEffect(() => {
    if (props) syncFromServer(props.windows ?? [], props.kernelStatus ?? "idle")
  }, [props])

  useEffect(() => {
    callTool("aios_init", {}).catch(console.error)
  }, [])

  return (
    <div style={{ width: "100%", height: "100%", background: "#0d1117" }}>
      <WindowManager callTool={callTool} />
      <Taskbar callTool={callTool} />
    </div>
  )
}`,
          diagnostics: [],
        },
      },
      { action: "notify", message: "Source code loaded", level: "success" },
    ],
  ],
  [
    /test|run|npm|build|install/i,
    () => [
      {
        action: "open_window", type: "terminal", title: "npm test",
        content: {
          lines: [
            "$ npm test",
            "",
            "> aios@0.1.0 test",
            "> vitest run",
            "",
            " ✓ src/agent/kernel.test.ts (3)",
            "   ✓ parses desktop_update JSON correctly",
            "   ✓ applies open_window actions",
            "   ✓ falls back to terminal on invalid JSON",
            "",
            " ✓ src/state/desktopState.test.ts (5)",
            "   ✓ openWindow adds window to state",
            "   ✓ closeWindow removes window",
            "   ✓ updateWindowContent patches content",
            "   ✓ notifications capped at 5",
            "   ✓ structuredClone prevents mutation",
            "",
            " Test Files  2 passed (2)",
            " Tests       8 passed (8)",
            " Duration    312ms",
            "",
            "$ _",
          ],
        },
      },
      { action: "notify", message: "All 8 tests passed ✓", level: "success" },
    ],
  ],
  [
    /browser|web|navigate|url|http/i,
    () => [
      {
        action: "open_window", type: "browser", title: "mcp-use docs",
        content: {
          url: "https://mcp-use.io/docs",
          screenshotB64: null,
          isLoading: false,
        },
      },
      { action: "notify", message: "Browser window opened", level: "info" },
    ],
  ],
  [
    /help|what can|what do|demo|show me/i,
    () => [
      {
        action: "open_window", type: "terminal", title: "AIOS Help",
        content: {
          lines: [
            "AIOS — AI Operating System",
            "══════════════════════════",
            "",
            "Try these commands:",
            "",
            "  list files          → File Explorer window",
            "  open terminal       → Terminal window",
            "  show React code     → Code editor window",
            "  run tests           → Test output window",
            "  open browser        → Browser preview window",
            "  show todo app       → Todo app source",
            "",
            "Or just type anything — the AI kernel handles it.",
            "",
            "Built with mcp-use + Claude · AIOS v0.1.0",
          ],
        },
      },
      { action: "notify", message: "Welcome to AIOS!", level: "success" },
    ],
  ],
];

// ── Parser ─────────────────────────────────────────────────────────────────

function parseActions(text: string): DesktopAction[] {
  const match = text.match(/<desktop_update>([\s\S]*?)<\/desktop_update>/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1].trim()) as { actions?: DesktopAction[] };
    return Array.isArray(parsed.actions) ? parsed.actions : [];
  } catch {
    return [];
  }
}

function applyActions(actions: DesktopAction[]): void {
  for (const a of actions) {
    if (a.action === "open_window") {
      openWindow(a.type as WindowType, a.title, a.content ?? {});
    } else if (a.action === "update_window") {
      updateWindowContent(a.window_id, a.content ?? {});
    } else if (a.action === "notify") {
      addNotification(a.message, (a.level as Level) ?? "info");
    }
  }
}

// ── Main kernel entry point ────────────────────────────────────────────────

export async function runKernel(userMessage: string): Promise<DesktopState> {
  setKernelStatus("thinking");
  await sleep(200);
  setKernelStatus("executing");

  // 1. Try showcase first (always instant, no API)
  for (const [pattern, builder] of SHOWCASE) {
    if (pattern.test(userMessage)) {
      await sleep(300); // brief "thinking" pause for realism
      applyActions(builder());
      setKernelStatus("idle");
      return getDesktopState();
    }
  }

  // 2. Live API call for unknown commands
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "none") {
    openWindow("terminal", "AIOS — Setup", {
      lines: ["Set ANTHROPIC_API_KEY in .env for live mode", "$ _"],
    });
    setKernelStatus("idle");
    return getDesktopState();
  }

  try {
    const MODELS = ["claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-3-5-haiku-20241022"];
    let response: Anthropic.Message | null = null;

    for (const model of MODELS) {
      try {
        response = await client.messages.create({
          model,
          max_tokens: 4096,
          system: KERNEL_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        });
        break;
      } catch (e) {
        if ((e as { status?: number }).status === 529) continue;
        throw e;
      }
    }

    if (!response) {
      addNotification("API overloaded — try a demo command", "warning");
      openWindow("terminal", "API Overloaded", {
        lines: [
          "All models are overloaded right now.",
          "",
          "Try one of these demo commands:",
          "  list files   |  open terminal   |  run tests",
          "  show React   |  show todo app   |  open browser",
        ],
      });
      setKernelStatus("idle");
      return getDesktopState();
    }

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const actions = parseActions(text);
    if (actions.length === 0) {
      openWindow("terminal", `AIOS: ${userMessage.slice(0, 22)}…`, {
        lines: text.split("\n").slice(0, 200),
      });
    } else {
      applyActions(actions);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    addNotification(`Error: ${msg.slice(0, 80)}`, "error");
    openWindow("terminal", "Error", {
      lines: [`Error: ${msg}`, "", "Check ANTHROPIC_API_KEY in .env"],
    });
  }

  setKernelStatus("idle");
  return getDesktopState();
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
