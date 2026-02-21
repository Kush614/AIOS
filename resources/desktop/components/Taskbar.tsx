import React from "react";
import { useWindowStore } from "../store/windowStore";
import type { WindowType } from "../metadata";

interface Props {
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

const APPS: { icon: string; type: WindowType; label: string }[] = [
  { icon: "📁", type: "file-explorer", label: "Files" },
  { icon: "⬛", type: "terminal", label: "Terminal" },
  { icon: "🌐", type: "browser", label: "Browser" },
  { icon: "</>", type: "code", label: "Code" },
];

const DEFAULT_CONTENT: Record<WindowType, Record<string, unknown>> = {
  "file-explorer": { cwd: "/", entries: [] },
  terminal: { lines: ["$ AIOS Terminal — connect a session via the kernel"] },
  browser: { url: "", screenshotB64: null, isLoading: false },
  code: { filePath: "untitled", content: "", diagnostics: [] },
  image: {},
  dialog: {},
};

export function Taskbar({ callTool }: Props) {
  const { windows, focusWindow, restoreWindow, openWindow } = useWindowStore();

  const launch = (type: WindowType) => {
    // Ask the server to open the window (it may seed content from MCP)
    callTool("aios_open_window", { type, title: titleFor(type) }).catch(() => {
      // Fallback: open locally with empty content
      openWindow({ type, title: titleFor(type), content: DEFAULT_CONTENT[type] });
    });
  };

  return (
    <div
      style={{
        height: 48,
        background: "#161b22cc",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid #30363d",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 4,
        flexShrink: 0,
      }}
    >
      {/* App launcher icons */}
      {APPS.map(({ icon, type, label }) => (
        <button
          key={type}
          onClick={() => launch(type)}
          title={`Open ${label}`}
          style={iconButtonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#21262d")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <span style={{ fontSize: 16 }}>{icon}</span>
        </button>
      ))}

      <div style={{ width: 1, height: 24, background: "#30363d", margin: "0 6px" }} />

      {/* Open window list */}
      <div
        style={{
          display: "flex",
          gap: 4,
          flex: 1,
          overflow: "hidden",
        }}
      >
        {windows.map((win) => (
          <button
            key={win.id}
            onClick={() =>
              win.state === "minimized"
                ? restoreWindow(win.id)
                : focusWindow(win.id)
            }
            style={{
              background: win.focused ? "#21262d" : "transparent",
              border: `1px solid ${win.focused ? "#58a6ff" : "#30363d"}`,
              borderRadius: 4,
              padding: "0 10px",
              height: 28,
              fontSize: 11,
              color: win.focused ? "#e6edf3" : "#8b949e",
              cursor: "pointer",
              maxWidth: 140,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flexShrink: 0,
              fontFamily: "inherit",
            }}
          >
            {win.state === "minimized" ? "▫ " : ""}
            {win.title}
          </button>
        ))}
      </div>

      <Clock />
    </div>
  );
}

function Clock() {
  const [time, setTime] = React.useState(fmt);
  React.useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span
      style={{
        fontSize: 11,
        color: "#8b949e",
        flexShrink: 0,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {time}
    </span>
  );
}

function fmt() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function titleFor(type: WindowType): string {
  const map: Record<WindowType, string> = {
    "file-explorer": "File Explorer",
    terminal: "Terminal",
    browser: "Browser",
    code: "Code",
    image: "Image",
    dialog: "Dialog",
  };
  return map[type];
}

const iconButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  background: "transparent",
  border: "1px solid #30363d",
  borderRadius: 6,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transition: "background 0.1s",
};
