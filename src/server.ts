/**
 * AIOS MCP Server — entry point
 *
 * Registers the desktop widget and exposes MCP tools the widget calls back.
 * Run with: npm run dev  (mcp-use dev picks up src/server.ts automatically)
 *
 * Note: The `schema` fields use `as any` to bridge the zod v3 (project) /
 * zod v4 (mcp-use internal) type mismatch.  Runtime behaviour is identical.
 */
import { MCPServer, widget, text } from "mcp-use/server";
import { z } from "zod";
import {
  getDesktopState,
  openWindow,
  closeWindow,
  updateWindowContent,
  addNotification,
} from "./state/desktopState.js";
import { runKernel } from "./agent/kernel.js";
import type { WindowType } from "./agent/schemas.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyZ = z as any;

const server = new MCPServer({
  name: "aios",
  version: "0.1.0",
});

// ── aios_init ─────────────────────────────────────────────────────────────────
// Called by the widget on mount to get the initial desktop state.

server.tool(
  {
    name: "aios_init",
    description:
      "Initialize the AIOS desktop and return the current window layout",
    schema: anyZ.object({}),
    widget: {
      name: "desktop",
      invoking: "Starting AIOS…",
      invoked: "AIOS desktop ready",
    },
  },
  async () => widget({ props: getDesktopState() })
);

// ── aios_send_message ─────────────────────────────────────────────────────────
// The primary kernel entry point.  Claude calls this with the user's command;
// the kernel runs and returns an updated DesktopState.

server.tool(
  {
    name: "aios_send_message",
    description:
      "Send a natural language command to the AIOS kernel. " +
      "The kernel will open windows, run code, navigate the web, manage files, " +
      "and more — returning a live desktop update.",
    schema: anyZ.object({
      message: anyZ
        .string()
        .describe("The user's natural-language command or question"),
    }),
    widget: {
      name: "desktop",
      invoking: "Kernel thinking…",
      invoked: "Done",
    },
  },
  async (params: { message: string }) => {
    const state = await runKernel(params.message);
    return widget({
      props: state,
      output: text(`AIOS: "${params.message.slice(0, 80)}"`),
    });
  }
);

// ── aios_open_window ──────────────────────────────────────────────────────────
// Triggered by the taskbar app-launcher buttons.

const WINDOW_DEFAULTS: Record<string, Record<string, unknown>> = {
  "file-explorer": { cwd: "/", entries: [] },
  terminal: { lines: ["$ AIOS Terminal — connect a session via the kernel"] },
  browser: { url: "", screenshotB64: null, isLoading: false },
  code: { filePath: "untitled", content: "", diagnostics: [] },
  image: {},
  dialog: {},
};

server.tool(
  {
    name: "aios_open_window",
    description: "Open a new window on the AIOS desktop",
    schema: anyZ.object({
      type: anyZ
        .enum(["file-explorer", "terminal", "browser", "code", "image", "dialog"])
        .describe("Window type"),
      title: anyZ.string().describe("Window title"),
    }),
    widget: {
      name: "desktop",
      invoking: "Opening window…",
      invoked: "Window opened",
    },
  },
  async (params: { type: string; title: string }) => {
    openWindow(params.type as WindowType, params.title, WINDOW_DEFAULTS[params.type] ?? {});
    return widget({
      props: getDesktopState(),
      output: text(`Opened ${params.type} window: ${params.title}`),
    });
  }
);

// ── aios_close_window ─────────────────────────────────────────────────────────
// Triggered by the window chrome close (×) button.

server.tool(
  {
    name: "aios_close_window",
    description: "Close a window on the AIOS desktop",
    schema: anyZ.object({
      window_id: anyZ.string().describe("ID of the window to close"),
    }),
    widget: {
      name: "desktop",
      invoking: "Closing window…",
      invoked: "Window closed",
    },
  },
  async (params: { window_id: string }) => {
    closeWindow(params.window_id);
    return widget({ props: getDesktopState(), output: text("Window closed") });
  }
);

// ── aios_update_window ────────────────────────────────────────────────────────
// Allows Claude (or the widget) to push new content into an existing window.

server.tool(
  {
    name: "aios_update_window",
    description: "Update the content of an existing window on the AIOS desktop",
    schema: anyZ.object({
      window_id: anyZ.string().describe("ID of the window to update"),
      content: anyZ.record(anyZ.unknown()).describe("Partial content patch to merge"),
    }),
    widget: {
      name: "desktop",
      invoking: "Updating window…",
      invoked: "Window updated",
    },
  },
  async (params: { window_id: string; content: Record<string, unknown> }) => {
    updateWindowContent(params.window_id, params.content);
    return widget({ props: getDesktopState(), output: text("Window updated") });
  }
);

// ── aios_terminal_input ───────────────────────────────────────────────────────
// Forwards raw input from the terminal window to the PTY session.
// Phase 0: just echoes back as a notification.  Phase 2: wire to node-pty.

server.tool(
  {
    name: "aios_terminal_input",
    description: "Send raw input to an active PTY terminal session",
    schema: anyZ.object({
      session_id: anyZ.string().describe("PTY session ID"),
      data: anyZ.string().describe("Raw input data (may include control characters)"),
    }),
    widget: {
      name: "desktop",
      invoking: "Sending input…",
      invoked: "Input sent",
    },
  },
  async (params: { session_id: string; data: string }) => {
    const cmd = params.data.trim();
    if (cmd) {
      addNotification(`Terminal: ${cmd.slice(0, 60)}`, "info");
    }
    return widget({ props: getDesktopState(), output: text("Input forwarded") });
  }
);

// ── Boot ──────────────────────────────────────────────────────────────────────
// mcp-use dev CLI auto-discovers the resources/ directory and mounts widgets.
// server.listen() wires up the MCP endpoints and starts the HTTP server.

await server.listen();
