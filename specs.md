# AIOS — AI Operating System Widget
## Technical Specification v1.0

**Classification:** Tier 1 — Technically Unprecedented
**Tagline:** The chat IS the OS. Windows open inside a chat message.

---

## 1. Vision

AIOS is a full windowed desktop environment rendered as an MCP widget inside Claude. Claude acts as the kernel — orchestrating filesystem, browser, terminal, and code execution MCP servers simultaneously. Every "app" in the desktop is an MCP server. The user never leaves the chat window.

**Core insight:** MCP widgets can render arbitrary React UI inside Claude. We render an entire OS there. Claude's ReAct loop IS the scheduler. MCP servers ARE the system calls.

---

## 2. What Makes This Unprecedented

| Capability | Prior Art | AIOS |
|---|---|---|
| Draggable windows | Native OS / Electron | Inside a chat message |
| Multi-server orchestration | Most agents use 1 server | 4+ servers simultaneously via ServerManager |
| Terminal in chat | None | xterm.js streamed via MCP |
| File explorer in chat | None | Full tree with read/write via filesystem MCP |
| Browser previews in chat | None | Playwright-rendered screenshots as window panes |
| LLM as OS kernel | None | Claude routes every op to the right MCP server |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Claude Desktop / Claude.ai                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   AIOS Widget (MCP Resource)                │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │                    Taskbar                            │  │ │
│  │  ├──────────────────────────────────────────────────────┤  │ │
│  │  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │  │ │
│  │  │  │ File Explorer│  │   Terminal   │  │  Browser   │  │  │ │
│  │  │  │  (Window 1) │  │  (Window 2)  │  │ (Window 3) │  │  │ │
│  │  │  │             │  │              │  │            │  │  │ │
│  │  │  │  react-rnd  │  │  xterm.js    │  │  <iframe>  │  │  │ │
│  │  │  └─────────────┘  └──────────────┘  └────────────┘  │  │ │
│  │  │         ┌────────────────────────┐                   │  │ │
│  │  │         │   Code / Diagnostics   │                   │  │ │
│  │  │         │      (Window 4)        │                   │  │ │
│  │  │         │   Monaco Editor        │                   │  │ │
│  │  │         └────────────────────────┘                   │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│              MCP Widget Protocol (useWidget hook)                │
│                              │                                   │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   AIOS MCP Server   │  ← the widget host server
                    │  (TypeScript/Node)  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │     MCPAgent        │  ← Python, Claude as kernel
                    │  (use_server_      │
                    │   manager=True)     │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────────┐
              │                │                    │
    ┌─────────▼──────┐ ┌──────▼──────┐ ┌──────────▼──────┐
    │  Filesystem    │ │  Terminal   │ │    Browser      │
    │  MCP Server   │ │ MCP Server  │ │   MCP Server    │
    │  (@modelctx/  │ │ (custom,    │ │ (@playwright/   │
    │  filesystem)  │ │ node-pty)   │ │  mcp@latest)    │
    └───────────────┘ └─────────────┘ └─────────────────┘
              │
    ┌─────────▼──────┐
    │  Code Exec     │
    │  MCP Server   │
    │  (E2B sandbox  │
    │  or local py) │
    └───────────────┘
```

---

## 4. Component Breakdown

### 4.1 AIOS MCP Server (Widget Host)
**Language:** TypeScript (Node.js)
**Role:** Serves the React desktop widget as an MCP resource. Bridges widget user actions → Claude agent calls. Pushes agent results → widget state updates.

**Key responsibilities:**
- Register the desktop widget via `widgetMetadata`
- Expose MCP tools that the widget can invoke (open window, close window, update window content)
- Maintain a WebSocket/SSE channel to push real-time state to the widget
- Buffer and stream terminal I/O

### 4.2 Desktop Widget (React)
**Language:** TypeScript + React
**Role:** The actual rendered desktop environment inside Claude.

**Key dependencies:**
```json
{
  "react": "^18.3.0",
  "react-rnd": "^10.4.1",
  "xterm": "^5.3.0",
  "@xterm/addon-fit": "^0.10.0",
  "@xterm/addon-web-links": "^0.11.0",
  "@monaco-editor/react": "^4.6.0",
  "zustand": "^4.5.0",
  "mcp-use": "latest"
}
```

### 4.3 MCPAgent Kernel (Python)
**Language:** Python 3.11+
**Role:** The Claude-powered kernel. Receives user natural language, routes to MCP servers via ServerManager, pushes results back.

**Key dependencies:**
```
mcp-use>=1.6.0
langchain-anthropic>=0.3.0
langchain>=0.3.0
python-dotenv
```

### 4.4 MCP Servers

| Server | Package | Transport | Capabilities |
|---|---|---|---|
| Filesystem | `@modelcontextprotocol/server-filesystem` | stdio | read_file, write_file, list_dir, search_files, create_dir, delete |
| Browser | `@playwright/mcp@latest` | stdio | navigate, screenshot, click, type, evaluate, pdf |
| Terminal | custom (`aios-terminal-mcp`) | stdio + node-pty | shell_exec, interactive_session, kill, list_processes |
| Code Exec | custom (`aios-codeexec-mcp`) | stdio or E2B | run_python, run_node, run_bash, install_package, get_diagnostics |

---

## 5. Widget Specification

### 5.1 Widget Metadata

```typescript
// src/resources/desktop/metadata.ts
import { z } from "zod";
import type { WidgetMetadata } from "mcp-use";

export const widgetMetadata: WidgetMetadata = {
  description: "AIOS — AI Operating System desktop environment",
  props: z.object({
    windows: z.array(WindowSchema),
    taskbar: TaskbarSchema,
    theme: ThemeSchema,
    notifications: z.array(NotificationSchema),
    kernelStatus: z.enum(["idle", "thinking", "executing", "error"]),
  }),
};
```

### 5.2 Window Schema

```typescript
const WindowSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["file-explorer", "terminal", "browser", "code", "image", "dialog"]),
  title: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  zIndex: z.number(),
  state: z.enum(["normal", "minimized", "maximized"]),
  focused: z.boolean(),
  content: WindowContentUnion,   // discriminated union per type
});
```

### 5.3 Window Content Types

```typescript
type WindowContent =
  | { type: "file-explorer"; cwd: string; entries: FSEntry[]; selectedPath: string | null }
  | { type: "terminal"; sessionId: string; scrollback: string[]; cols: number; rows: number }
  | { type: "browser"; url: string; screenshotB64: string | null; isLoading: boolean }
  | { type: "code"; filePath: string; language: string; content: string; diagnostics: Diagnostic[] }
  | { type: "image"; src: string; alt: string }
  | { type: "dialog"; message: string; buttons: string[] };
```

### 5.4 Desktop Component Tree

```
<Desktop>                         ← full viewport, dark theme
  <KernelStatusBar />             ← top bar: model, server status, thinking indicator
  <WindowManager>                 ← z-index sorted rendering
    {windows.map(w =>
      <Rnd key={w.id} ...>        ← react-rnd draggable/resizable
        <WindowChrome w={w}>      ← titlebar, controls
          <WindowContent w={w} /> ← type-switched content
        </WindowChrome>
      </Rnd>
    )}
  </WindowManager>
  <Taskbar>                       ← bottom: open windows, app launcher, clock
    <AppLauncher />               ← opens new windows via MCP tool call
    <TaskList />                  ← per-window buttons with minimize/restore
    <SystemTray />                ← MCP server connection indicators
  </Taskbar>
  <NotificationStack />           ← top-right toast notifications
</Desktop>
```

### 5.5 Terminal Window (xterm.js)

```typescript
// Terminal receives raw PTY output from Terminal MCP server over SSE
// Sends keystrokes back as MCP tool calls: terminal_input(sessionId, data)
const TerminalWindow: React.FC<{ content: TerminalContent }> = ({ content }) => {
  const termRef = useRef<Terminal>();
  const { callTool } = useWidget();

  useEffect(() => {
    const term = new Terminal({ cursorBlink: true, fontSize: 13, theme: MONOKAI });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    // Replay scrollback from MCP state
    content.scrollback.forEach(line => term.writeln(line));

    // Forward user input → MCP tool
    term.onData(data => callTool("terminal_input", { sessionId: content.sessionId, data }));

    termRef.current = term;
  }, []);

  // Receive new output via widget prop updates
  useEffect(() => {
    if (termRef.current && content.newOutput) {
      termRef.current.write(content.newOutput);
    }
  }, [content.newOutput]);
};
```

---

## 6. MCPAgent Kernel Specification

### 6.1 Kernel Entry Point

```python
# kernel/agent.py
import asyncio
from langchain_anthropic import ChatAnthropic
from mcp_use import MCPAgent, MCPClient

SYSTEM_PROMPT = """
You are the AIOS kernel — the operating system intelligence inside the user's desktop.

You have full access to:
- FILESYSTEM: read files, list directories, search, write
- TERMINAL: execute shell commands, run processes
- BROWSER: navigate URLs, take screenshots, interact with pages
- CODE_EXEC: run Python/Node/Bash, get diagnostics, install packages

When the user gives a natural language command, you:
1. Decompose it into concrete MCP tool calls
2. Execute them via the appropriate servers
3. Format results as window update instructions
4. Return a structured DesktopUpdate

Always prefer doing multiple operations concurrently when they are independent.
Never ask for confirmation for read operations. Always confirm before deletes.

Current working directory context is maintained in conversation memory.
"""

async def create_kernel(config_path: str = "config/servers.json") -> MCPAgent:
    client = MCPClient.from_config_file(config_path)
    agent = MCPAgent(
        llm=ChatAnthropic(model="claude-opus-4-6", temperature=0),
        client=client,
        max_steps=50,
        memory_enabled=True,
        system_prompt=SYSTEM_PROMPT,
        use_server_manager=True,      # dynamic server orchestration
        disallowed_tools=[
            "delete_file",            # require explicit user confirmation
            "format_disk",
        ],
    )
    return agent
```

### 6.2 MCP Servers Config

```json
// config/servers.json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/"],
      "env": {}
    },
    "browser": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest", "--headless"],
      "env": {}
    },
    "terminal": {
      "command": "node",
      "args": ["servers/terminal/index.js"],
      "env": {
        "SHELL": "/bin/bash",
        "MAX_SESSIONS": "4"
      }
    },
    "codeexec": {
      "command": "python",
      "args": ["-m", "servers.codeexec"],
      "env": {
        "SANDBOX_MODE": "local",
        "MAX_EXECUTION_TIME": "30"
      }
    }
  }
}
```

### 6.3 Structured Output Schema

```python
# kernel/schemas.py
from pydantic import BaseModel
from typing import Literal, Union
from uuid import UUID

class OpenWindowAction(BaseModel):
    action: Literal["open_window"]
    window_type: Literal["file-explorer", "terminal", "browser", "code", "image"]
    title: str
    content: dict
    x: int = 100
    y: int = 100
    width: int = 600
    height: int = 400

class UpdateWindowAction(BaseModel):
    action: Literal["update_window"]
    window_id: str
    content: dict

class CloseWindowAction(BaseModel):
    action: Literal["close_window"]
    window_id: str

class NotifyAction(BaseModel):
    action: Literal["notify"]
    message: str
    level: Literal["info", "warning", "error", "success"]

class DesktopUpdate(BaseModel):
    actions: list[Union[OpenWindowAction, UpdateWindowAction, CloseWindowAction, NotifyAction]]
    kernel_message: str   # natural language summary shown in chat
```

---

## 7. Terminal MCP Server Specification

**Language:** TypeScript (Node.js)
**Package:** `aios-terminal-mcp` (custom)

### 7.1 Tools Exposed

```typescript
tools = [
  {
    name: "terminal_create_session",
    description: "Create a new interactive PTY shell session",
    inputSchema: {
      shell: { type: "string", default: "/bin/bash" },
      cwd: { type: "string", default: process.env.HOME },
      env: { type: "object" }
    }
  },
  {
    name: "terminal_execute",
    description: "Execute a command and return stdout+stderr (non-interactive)",
    inputSchema: {
      command: { type: "string" },
      cwd: { type: "string" },
      timeout_ms: { type: "number", default: 30000 }
    }
  },
  {
    name: "terminal_input",
    description: "Send raw input to a PTY session",
    inputSchema: {
      session_id: { type: "string" },
      data: { type: "string" }   // raw bytes, including control chars
    }
  },
  {
    name: "terminal_read_output",
    description: "Read buffered output from a PTY session since last read",
    inputSchema: {
      session_id: { type: "string" }
    }
  },
  {
    name: "terminal_kill_session",
    description: "Terminate a PTY session",
    inputSchema: {
      session_id: { type: "string" }
    }
  },
  {
    name: "terminal_list_sessions",
    description: "List all active PTY sessions",
    inputSchema: {}
  }
]
```

### 7.2 Implementation Sketch

```typescript
import * as pty from "node-pty";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

const sessions = new Map<string, { pty: pty.IPty; buffer: string[] }>();

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  switch (req.params.name) {
    case "terminal_execute": {
      const { command, cwd, timeout_ms } = req.params.arguments;
      const result = await execWithTimeout(command, { cwd, timeout: timeout_ms });
      return { content: [{ type: "text", text: result.stdout + result.stderr }] };
    }
    case "terminal_create_session": {
      const id = crypto.randomUUID();
      const p = pty.spawn(shell, [], { cwd, env, cols: 120, rows: 30 });
      p.onData(data => sessions.get(id)?.buffer.push(data));
      sessions.set(id, { pty: p, buffer: [] });
      return { content: [{ type: "text", text: JSON.stringify({ session_id: id }) }] };
    }
    // ...
  }
});
```

---

## 8. Code Execution MCP Server Specification

**Language:** Python
**Package:** `aios-codeexec-mcp` (custom)

### 8.1 Tools Exposed

```
run_code(language, code, timeout_s=30, install_packages=[])
  → { stdout, stderr, exit_code, execution_time_ms }

get_diagnostics(file_path)
  → { errors: [{line, col, message, severity}], warnings: [...] }

install_package(manager, package)
  → { success, output }

list_installed(language)
  → { packages: [{name, version}] }
```

### 8.2 Execution Strategy

- **Local mode** (default): `subprocess` with resource limits (`ulimit`, timeout via `asyncio.wait_for`)
- **Sandbox mode**: E2B cloud sandbox via `SandboxConnector` — no local code execution risk
- Configurable per-project via `SANDBOX_MODE` env var

### 8.3 Diagnostics

```python
async def get_diagnostics(file_path: str) -> DiagnosticResult:
    ext = Path(file_path).suffix
    if ext == ".py":
        # Run ruff + mypy
        ruff = await run(["ruff", "check", "--output-format=json", file_path])
        mypy = await run(["mypy", "--json-report", "-", file_path])
        return merge_diagnostics(ruff, mypy)
    elif ext in (".ts", ".tsx", ".js", ".jsx"):
        # Run tsc + eslint
        tsc = await run(["tsc", "--noEmit", "--pretty", "false"])
        eslint = await run(["eslint", "--format=json", file_path])
        return merge_diagnostics(tsc, eslint)
```

---

## 9. Key Data Flows

### 9.1 "Open my project and show me what's broken"

```
User: "Open my project and show me what's broken"
       ↓
MCPAgent receives query
       ↓
ServerManager: all 4 servers available
       ↓
Claude plans concurrent execution:
  A) filesystem MCP → list_directory(cwd)
  B) filesystem MCP → read_file(package.json or pyproject.toml)
  ↓ (parallel)
A result: project structure tree
B result: dependencies, scripts, entry points
       ↓
Claude plans next step:
  C) codeexec MCP → run_code("bash", "npm test 2>&1" or "pytest -v 2>&1")
  ↓
C result: test output with failures
       ↓
Claude plans:
  D) For each failing file → filesystem MCP → read_file(path)
  E) codeexec MCP → get_diagnostics(path) for each file
  ↓ (parallel)
All results collected
       ↓
Claude generates DesktopUpdate:
  actions: [
    open_window(type="file-explorer", content={tree}),
    open_window(type="terminal", content={test_output}),
    open_window(type="code", content={broken_file, diagnostics}),
    notify("Found 3 errors in 2 files")
  ]
       ↓
Widget renders 3 new windows + notification
```

### 9.2 "Navigate to the React docs and show me the hooks API"

```
User: "Navigate to the React docs and show me the hooks API"
       ↓
ServerManager: selects browser MCP
       ↓
browser MCP → navigate("https://react.dev/reference/react")
browser MCP → screenshot()
browser MCP → get_text(".reference-list")
       ↓
DesktopUpdate:
  open_window(type="browser", content={url, screenshot_b64})
       ↓
Widget renders browser window with live screenshot
```

### 9.3 "Run the failing test and fix it"

```
User: "Run the failing test and fix it"
       ↓
Claude (has test output in memory from flow 9.1)
       ↓
Parallel:
  A) filesystem MCP → read_file(test_file)
  B) filesystem MCP → read_file(implementation_file)
       ↓
Claude analyzes, generates fix
       ↓
filesystem MCP → write_file(implementation_file, fixed_content)
       ↓
codeexec MCP → run_code("bash", "npm test 2>&1")
       ↓
DesktopUpdate:
  update_window(code_window, {content: fixed_code, diagnostics: []})
  update_window(terminal_window, {new_output: "✓ All tests passed"})
  notify("Fixed: off-by-one in parseDate()", level="success")
```

---

## 10. File Structure

```
aios/
├── specs.md                        ← this file
│
├── widget/                         ← TypeScript MCP widget server + React UI
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── server.ts               ← MCP server entry point
│   │   ├── resources/
│   │   │   └── desktop/
│   │   │       ├── metadata.ts     ← widgetMetadata + prop schemas
│   │   │       ├── Desktop.tsx     ← root widget component
│   │   │       ├── components/
│   │   │       │   ├── WindowManager.tsx
│   │   │       │   ├── Taskbar.tsx
│   │   │       │   ├── KernelStatusBar.tsx
│   │   │       │   ├── NotificationStack.tsx
│   │   │       │   └── windows/
│   │   │       │       ├── FileExplorerWindow.tsx
│   │   │       │       ├── TerminalWindow.tsx    ← xterm.js
│   │   │       │       ├── BrowserWindow.tsx
│   │   │       │       ├── CodeWindow.tsx        ← Monaco
│   │   │       │       └── WindowChrome.tsx      ← titlebar + controls
│   │   │       ├── store/
│   │   │       │   ├── windowStore.ts            ← zustand window manager state
│   │   │       │   └── kernelStore.ts            ← kernel status + notifications
│   │   │       ├── hooks/
│   │   │       │   ├── useTerminalSession.ts
│   │   │       │   └── useKernelBridge.ts
│   │   │       └── styles/
│   │   │           └── theme.ts                  ← dark OS theme tokens
│   │   └── tools/                  ← MCP tools the widget host exposes
│   │       ├── openWindow.ts
│   │       ├── closeWindow.ts
│   │       ├── updateWindow.ts
│   │       └── pushNotification.ts
│   └── vite.config.ts
│
├── kernel/                         ← Python MCPAgent kernel
│   ├── pyproject.toml
│   ├── agent.py                    ← MCPAgent setup + SYSTEM_PROMPT
│   ├── schemas.py                  ← DesktopUpdate Pydantic models
│   ├── api.py                      ← FastAPI HTTP endpoint (widget → kernel)
│   └── config/
│       └── servers.json            ← MCP server definitions
│
├── servers/                        ← Custom MCP servers
│   ├── terminal/                   ← node-pty PTY server (TypeScript)
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── ptyManager.ts
│   │   │   └── tools.ts
│   │   └── tsconfig.json
│   └── codeexec/                   ← Code execution server (Python)
│       ├── __main__.py
│       ├── executor.py
│       ├── diagnostics.py
│       └── sandbox.py
│
├── examples/
│   ├── open_project.py             ← demo flow 9.1
│   ├── debug_and_fix.py            ← demo flow 9.3
│   └── browser_research.py        ← demo flow 9.2
│
└── docker-compose.yml              ← spin up all servers for dev
```

---

## 11. State Management (Widget)

### Window Manager (Zustand)

```typescript
// store/windowStore.ts
interface WindowStore {
  windows: Window[];
  focusedId: string | null;

  openWindow: (spec: OpenWindowAction) => string;
  closeWindow: (id: string) => void;
  updateWindowContent: (id: string, content: Partial<WindowContent>) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, w: number, h: number) => void;
  bringToFront: (id: string) => void;   // reassigns z-indexes
}
```

### Kernel Bridge (SSE)

```typescript
// hooks/useKernelBridge.ts
// Connects widget to kernel via Server-Sent Events.
// Kernel pushes DesktopUpdate → widget applies actions to windowStore.
export function useKernelBridge() {
  const store = useWindowStore();
  useEffect(() => {
    const es = new EventSource("/kernel/events");
    es.onmessage = (e) => {
      const update: DesktopUpdate = JSON.parse(e.data);
      update.actions.forEach(action => {
        switch (action.action) {
          case "open_window":  store.openWindow(action); break;
          case "update_window": store.updateWindowContent(action.window_id, action.content); break;
          case "close_window": store.closeWindow(action.window_id); break;
          case "notify": store.addNotification(action); break;
        }
      });
    };
    return () => es.close();
  }, []);
}
```

---

## 12. Kernel API

The Python kernel exposes a thin FastAPI layer that:

1. Receives user messages from the widget's chat input
2. Runs `agent.run(message)` with structured output
3. Streams `DesktopUpdate` actions via SSE back to the widget

```
POST /kernel/message
  Body: { "message": string, "context": { cwd, openWindows } }
  Response: SSE stream of DesktopUpdate chunks

GET  /kernel/events
  Response: SSE stream of proactive updates (terminal output, process completion)

GET  /kernel/status
  Response: { "status": "idle|thinking|executing", "active_servers": [...] }

DELETE /kernel/session
  Response: 204 — clears conversation memory
```

---

## 13. Theme & Visual Design

**Aesthetic:** Dark OS, monospace everywhere, subtle glass effects

```typescript
const theme = {
  bg: "#0d1117",           // desktop background
  surface: "#161b22",      // window background
  border: "#30363d",       // window borders
  titlebar: "#21262d",     // window chrome
  text: "#e6edf3",         // primary text
  textMuted: "#8b949e",    // secondary text
  accent: "#58a6ff",       // selection, focus rings
  accentGreen: "#3fb950",  // success, connected servers
  accentRed: "#f85149",    // errors, disconnected
  accentYellow: "#d29922", // warnings
  fontMono: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
  fontSans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  radius: "6px",
  shadow: "0 8px 32px rgba(0,0,0,0.5)",
  windowMinWidth: 320,
  windowMinHeight: 200,
  taskbarHeight: 48,
  statusBarHeight: 28,
};
```

**Taskbar app icons** (launch new windows):
- Folder icon → opens File Explorer window (filesystem MCP)
- Terminal icon → opens Terminal window (terminal MCP)
- Globe icon → opens Browser window with URL bar (browser MCP)
- `</>` icon → opens Code window with Monaco (codeexec MCP)
- CPU icon → opens Process Monitor (terminal MCP: `ps aux`)

---




## 14. Implementation Phases

### Phase 0 — Skeleton (Week 1)
- [ ] `widget/` TypeScript project: bare MCP server + static `Desktop.tsx` with hardcoded windows
- [ ] `kernel/` Python project: MCPAgent with `use_server_manager=True` against real filesystem + browser servers
- [ ] Wire kernel → widget via SSE: send a hardcoded `OpenWindowAction` on startup
- [ ] Milestone: A window appears inside Claude when the kernel starts

### Phase 1 — Core Windows (Week 2)
- [ ] File Explorer window: real directory tree from filesystem MCP
- [ ] Browser window: screenshot from Playwright MCP rendered as `<img>`
- [ ] Terminal window: `terminal_execute` output rendered in xterm.js (non-interactive)
- [ ] Code window: Monaco editor with syntax highlighting (read-only)
- [ ] Milestone: "Open my project" produces 2 real windows with real data

### Phase 2 — Interactivity (Week 3)
- [ ] Terminal interactive PTY via `aios-terminal-mcp` (node-pty)
- [ ] File Explorer: double-click opens file in Code window
- [ ] Code window: Monaco edits → `write_file` via filesystem MCP
- [ ] Taskbar app launcher fully wired
- [ ] Window dragging/resizing (react-rnd)
- [ ] Milestone: User can edit and save a real file from inside the widget

### Phase 3 — Intelligence (Week 4)
- [ ] Diagnostics pipeline: get_diagnostics() populates Code window error markers
- [ ] Multi-step flows: "Open project and show what's broken" (flow 9.1)
- [ ] Concurrent server orchestration: filesystem + codeexec in parallel
- [ ] Conversation memory: kernel remembers open windows and cwd across turns
- [ ] Milestone: Full demo of flow 9.1 working end to end

### Phase 4 — Polish (Week 5)
- [ ] Notification system (toasts)
- [ ] KernelStatusBar with real server connection indicators
- [ ] Window minimize animation + taskbar badge
- [ ] `aios-codeexec-mcp` with E2B sandbox option
- [ ] Docker Compose for one-command dev setup
- [ ] README + demo video
- [ ] Milestone: Ship-ready demo

---

## 15. Technical Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| xterm.js doesn't work in MCP widget iframe/sandbox | High | Test early; fallback: render terminal output as styled `<pre>` |
| MCP widget has no SSE access back to kernel | Medium | Use MCP tool polling instead; widget calls `get_updates()` tool every 500ms |
| node-pty unavailable on Windows | Medium | Docker container for terminal server; `child_process.exec` fallback (non-PTY) |
| Monaco editor too heavy for widget bundle | Low | Lazy-load Monaco; fallback to CodeMirror 6 (~35KB gzipped) |
| Playwright MCP screenshot latency | Low | Show loading state in browser window; stream partial screenshots |
| ServerManager restart limit (3x) hit during complex flows | Low | Break complex flows into sequential `agent.run()` calls |
| Claude context window exhaustion with many tool results | Medium | Summarize tool results before adding to memory; truncate scrollbacks |

---

## 16. Success Metrics

A working AIOS demonstrates all of the following in a single Claude conversation:

1. User types natural language → windows open inside the chat response
2. At least 3 windows open simultaneously with different types (terminal + file explorer + code)
3. Terminal window accepts live keyboard input via xterm.js
4. File edits in Monaco are saved to disk via filesystem MCP
5. Claude orchestrates 2+ MCP servers in parallel for a single user request
6. All windows are draggable and resizable
7. The kernel's ServerManager correctly routes to the right server per operation

---

*End of specification. Start with Phase 0.*
