/**
 * Server-side desktop state singleton.
 * This is the authoritative state — widget props are derived from it.
 */
import type { DesktopState, AIOSWindow, WindowType } from "../agent/schemas";

let zCounter = 100;

const state: DesktopState = {
  windows: [],
  kernelStatus: "idle",
  notifications: [],
};

export function getDesktopState(): DesktopState {
  return structuredClone(state);
}

export function setKernelStatus(s: DesktopState["kernelStatus"]): void {
  state.kernelStatus = s;
}

export function openWindow(
  type: WindowType,
  title: string,
  content: Record<string, unknown>,
  position?: { x: number; y: number; width?: number; height?: number }
): string {
  const id = crypto.randomUUID();
  const win: AIOSWindow = {
    id,
    type,
    title,
    x: position?.x ?? 80 + (state.windows.length % 5) * 30,
    y: position?.y ?? 60 + (state.windows.length % 5) * 20,
    width: position?.width ?? 640,
    height: position?.height ?? 420,
    zIndex: ++zCounter,
    state: "normal",
    focused: true,
    content,
  };
  // Unfocus all others
  state.windows = state.windows.map((w) => ({ ...w, focused: false }));
  state.windows.push(win);
  return id;
}

export function closeWindow(id: string): void {
  state.windows = state.windows.filter((w) => w.id !== id);
}

export function updateWindowContent(
  id: string,
  patch: Record<string, unknown>
): void {
  const win = state.windows.find((w) => w.id === id);
  if (win) {
    win.content = { ...win.content, ...patch };
  }
}

export function addNotification(
  message: string,
  level: "info" | "warning" | "error" | "success"
): void {
  state.notifications.push({
    id: crypto.randomUUID(),
    message,
    level,
    timestamp: Date.now(),
  });
  // Keep last 5 only
  if (state.notifications.length > 5) {
    state.notifications.shift();
  }
}

export function clearNotifications(): void {
  state.notifications = [];
}
