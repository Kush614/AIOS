import { useEffect } from "react";
import { useWidget } from "mcp-use/react";
import type { DesktopProps } from "./metadata";
import { useWindowStore } from "./store/windowStore";
import { KernelStatusBar } from "./components/KernelStatusBar";
import { WindowManager } from "./components/WindowManager";
import { Taskbar } from "./components/Taskbar";
import { NotificationStack } from "./components/NotificationStack";

export default function Desktop() {
  const { props, callTool } = useWidget<DesktopProps>();
  const { syncFromServer } = useWindowStore();

  // Keep local store in sync whenever server pushes new props
  useEffect(() => {
    if (props) {
      syncFromServer(
        props.windows ?? [],
        props.kernelStatus ?? "idle",
        props.notifications ?? [],
      );
    }
  }, [props]);

  // On mount: ask the server for the initial desktop state
  useEffect(() => {
    callTool("aios_init", {}).catch(console.error);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 520,
        background: "#0d1117",
        position: "relative",
        overflow: "hidden",
        fontFamily:
          "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
        userSelect: "none",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <KernelStatusBar callTool={callTool} />
      <WindowManager callTool={callTool} />
      <Taskbar callTool={callTool} />
      <NotificationStack />
    </div>
  );
}
