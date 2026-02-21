import React from "react";
import type { AIOSWindow } from "../metadata";

interface Props {
  window: AIOSWindow;
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

export function WindowContent({ window: win, callTool }: Props) {
  switch (win.type) {
    case "file-explorer":
      return <FileExplorerContent content={win.content} />;
    case "terminal":
      return <TerminalContent content={win.content} callTool={callTool} />;
    case "browser":
      return <BrowserContent content={win.content} />;
    case "code":
      return <CodeContent content={win.content} />;
    default:
      return (
        <Placeholder>
          <pre style={{ fontSize: 11 }}>{JSON.stringify(win.content, null, 2)}</pre>
        </Placeholder>
      );
  }
}

// ── File Explorer ─────────────────────────────────────────────────────────────

type FSEntry = { name: string; type: "file" | "dir"; size?: number };

function FileExplorerContent({ content }: { content: Record<string, unknown> }) {
  const cwd = (content.cwd as string) ?? "/";
  const entries = (content.entries as FSEntry[]) ?? [];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#0d1117" }}>
      <div
        style={{
          padding: "6px 12px",
          fontSize: 11,
          color: "#8b949e",
          borderBottom: "1px solid #21262d",
          background: "#161b22",
        }}
      >
        {cwd}
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {entries.length === 0 && (
          <Placeholder>Empty directory</Placeholder>
        )}
        {entries.map((e, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 16px",
              fontSize: 13,
              color: e.type === "dir" ? "#58a6ff" : "#e6edf3",
              borderBottom: "1px solid #161b22",
              cursor: "pointer",
            }}
            onMouseEnter={(ev) => (ev.currentTarget.style.background = "#161b22")}
            onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontSize: 14 }}>{e.type === "dir" ? "📁" : "📄"}</span>
            <span style={{ flex: 1 }}>{e.name}</span>
            {e.type === "dir" && (
              <span style={{ fontSize: 10, color: "#30363d" }}>DIR</span>
            )}
            {e.size !== undefined && e.type === "file" && (
              <span style={{ fontSize: 10, color: "#30363d" }}>
                {formatBytes(e.size)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / 1024 / 1024).toFixed(1)}MB`;
}

// ── Terminal ──────────────────────────────────────────────────────────────────

function TerminalContent({
  content,
  callTool,
}: {
  content: Record<string, unknown>;
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}) {
  const lines = (content.lines as string[]) ?? [];
  const sessionId = content.sessionId as string | undefined;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !sessionId) return;
    const data = (e.currentTarget.value ?? "") + "\n";
    e.currentTarget.value = "";
    callTool("aios_terminal_input", { session_id: sessionId, data }).catch(
      console.error
    );
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0d1117",
        fontFamily: "inherit",
      }}
    >
      <div style={{ flex: 1, overflow: "auto", padding: "8px 12px" }}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize: 12,
              lineHeight: 1.6,
              color: lineColor(line),
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {line || "\u00a0"}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div
        style={{
          borderTop: "1px solid #21262d",
          padding: "4px 12px",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ color: "#3fb950", fontSize: 12 }}>$</span>
        <input
          ref={inputRef}
          onKeyDown={onKeyDown}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#e6edf3",
            fontSize: 12,
            fontFamily: "inherit",
          }}
          placeholder={sessionId ? "type a command…" : "no session"}
          disabled={!sessionId}
        />
      </div>
    </div>
  );
}

function lineColor(line: string): string {
  if (line.startsWith("$") || line.startsWith("#")) return "#3fb950";
  if (/error|Error|FAIL/i.test(line)) return "#f85149";
  if (/warn|Warning/i.test(line)) return "#d29922";
  return "#e6edf3";
}

// ── Browser ───────────────────────────────────────────────────────────────────

function BrowserContent({ content }: { content: Record<string, unknown> }) {
  const url = (content.url as string) ?? "";
  const screenshot = content.screenshotB64 as string | null;
  const isLoading = content.isLoading as boolean | undefined;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0d1117",
      }}
    >
      {/* URL bar */}
      <div
        style={{
          padding: "5px 12px",
          borderBottom: "1px solid #21262d",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#161b22",
          fontSize: 12,
        }}
      >
        <span>🌐</span>
        <div
          style={{
            flex: 1,
            background: "#21262d",
            border: "1px solid #30363d",
            borderRadius: 4,
            padding: "2px 8px",
            color: "#8b949e",
            fontSize: 11,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {url || "about:blank"}
        </div>
        {isLoading && <span style={{ color: "#d29922", fontSize: 11 }}>loading…</span>}
      </div>

      {/* Screenshot / placeholder */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {screenshot ? (
          <img
            src={`data:image/png;base64,${screenshot}`}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            alt="browser preview"
          />
        ) : (
          <Placeholder>Waiting for browser MCP screenshot…</Placeholder>
        )}
      </div>
    </div>
  );
}

// ── Code ──────────────────────────────────────────────────────────────────────

type Diagnostic = { line: number; col: number; message: string; severity: "error" | "warning" };

function CodeContent({ content }: { content: Record<string, unknown> }) {
  const filePath = (content.filePath as string) ?? "untitled";
  const code = (content.content as string) ?? "";
  const diagnostics = (content.diagnostics as Diagnostic[]) ?? [];
  const errors = diagnostics.filter((d) => d.severity === "error");

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0d1117",
      }}
    >
      {/* File path bar */}
      <div
        style={{
          padding: "4px 12px",
          borderBottom: "1px solid #21262d",
          fontSize: 11,
          color: "#8b949e",
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#161b22",
        }}
      >
        <span>📝</span>
        <span style={{ flex: 1 }}>{filePath}</span>
        {errors.length > 0 && (
          <span style={{ color: "#f85149" }}>✗ {errors.length} error{errors.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Code */}
      <pre
        style={{
          flex: 1,
          overflow: "auto",
          margin: 0,
          padding: 12,
          fontSize: 12,
          lineHeight: 1.6,
          color: "#e6edf3",
          fontFamily: "inherit",
          background: "#0d1117",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {code || "// empty file"}
      </pre>

      {/* Diagnostics panel */}
      {diagnostics.length > 0 && (
        <div
          style={{
            borderTop: "1px solid #21262d",
            maxHeight: 100,
            overflow: "auto",
            background: "#161b22",
          }}
        >
          {diagnostics.map((d, i) => (
            <div
              key={i}
              style={{
                padding: "2px 12px",
                fontSize: 11,
                color: d.severity === "error" ? "#f85149" : "#d29922",
                display: "flex",
                gap: 8,
                lineHeight: 1.6,
              }}
            >
              <span>{d.severity === "error" ? "✗" : "⚠"}</span>
              <span style={{ color: "#8b949e" }}>
                {d.line}:{d.col}
              </span>
              <span>{d.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#30363d",
        fontSize: 13,
        padding: 24,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}
