import { useWindowStore } from "../store/windowStore";

const STATUS_COLOR: Record<string, string> = {
  idle: "#3fb950",
  thinking: "#58a6ff",
  executing: "#d29922",
  error: "#f85149",
};

const STATUS_LABEL: Record<string, string> = {
  idle: "Kernel ready",
  thinking: "Claude thinking…",
  executing: "Executing…",
  error: "Kernel error",
};

interface Props {
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

export function KernelStatusBar({ callTool: _callTool }: Props) {
  const status = useWindowStore((s) => s.kernelStatus);
  const color = STATUS_COLOR[status] ?? STATUS_COLOR.idle;

  return (
    <div
      style={{
        height: 28,
        background: "#161b22",
        borderBottom: "1px solid #30363d",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 8,
        fontSize: 11,
        color: "#8b949e",
        flexShrink: 0,
      }}
    >
      <span style={{ fontWeight: 700, color: "#e6edf3", letterSpacing: 1 }}>
        AIOS
      </span>
      <span style={{ color: "#30363d" }}>│</span>

      {/* Kernel status dot */}
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 6px ${color}`,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span>{STATUS_LABEL[status]}</span>

      <span style={{ marginLeft: "auto", color: "#30363d" }}>
        claude-opus-4-6 · Manufact MCP Cloud
      </span>
    </div>
  );
}
