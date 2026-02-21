import { Rnd } from "react-rnd";
import { useWindowStore } from "../store/windowStore";
import { WindowChrome } from "./WindowChrome";

interface Props {
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

export function WindowManager({ callTool }: Props) {
  const { windows, focusWindow, moveWindow, resizeWindow } = useWindowStore();

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      {windows
        .filter((w) => w.state !== "minimized")
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((win) => (
          <Rnd
            key={win.id}
            position={{ x: win.x, y: win.y }}
            size={{ width: win.width, height: win.height }}
            style={{ zIndex: win.zIndex, position: "absolute" }}
            minWidth={320}
            minHeight={200}
            bounds="parent"
            dragHandleClassName="aios-drag-handle"
            onMouseDown={() => focusWindow(win.id)}
            onDragStop={(_, d) => moveWindow(win.id, d.x, d.y)}
            onResizeStop={(_, __, ref, ___, pos) => {
              resizeWindow(win.id, ref.offsetWidth, ref.offsetHeight);
              moveWindow(win.id, pos.x, pos.y);
            }}
          >
            <WindowChrome window={win} callTool={callTool} />
          </Rnd>
        ))}
    </div>
  );
}
