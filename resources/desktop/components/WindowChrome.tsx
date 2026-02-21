import { useWindowStore } from "../store/windowStore";
import { WindowContent } from "./WindowContent";
import type { AIOSWindow } from "../metadata";

interface Props {
  window: AIOSWindow;
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

export function WindowChrome({ window: win, callTool }: Props) {
  const { closeWindow, minimizeWindow } = useWindowStore();

  const onClose = () => {
    callTool("aios_close_window", { window_id: win.id }).catch(console.error);
    closeWindow(win.id);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#161b22",
        border: `1px solid ${win.focused ? "#58a6ff" : "#30363d"}`,
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: win.focused
          ? "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px #58a6ff22"
          : "0 4px 16px rgba(0,0,0,0.4)",
        transition: "border-color 0.1s, box-shadow 0.1s",
      }}
    >
      {/* Titlebar */}
      <div
        className="aios-drag-handle"
        style={{
          height: 36,
          background: "#21262d",
          borderBottom: "1px solid #30363d",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 8,
          cursor: "move",
          flexShrink: 0,
        }}
      >
        <TrafficLight color="#f85149" onClick={onClose} title="Close" />
        <TrafficLight
          color="#d29922"
          onClick={() => minimizeWindow(win.id)}
          title="Minimize"
        />
        <TrafficLight color="#3fb950" disabled title="Maximize" />

        <span
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 12,
            color: "#8b949e",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {win.title}
        </span>

        <span
          style={{
            fontSize: 10,
            color: "#30363d",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {win.type}
        </span>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <WindowContent window={win} callTool={callTool} />
      </div>
    </div>
  );
}

function TrafficLight({
  color,
  onClick,
  title,
  disabled = false,
}: {
  color: string;
  onClick?: () => void;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: color,
        border: "none",
        cursor: disabled ? "default" : "pointer",
        flexShrink: 0,
        opacity: disabled ? 0.35 : 1,
        padding: 0,
      }}
    />
  );
}
