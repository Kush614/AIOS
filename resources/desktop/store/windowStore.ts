/**
 * Client-side UI state only.
 * Window positions, sizes, focus, z-index live here.
 * Window *contents* come from server via useWidget() props.
 */
import { create } from "zustand";
import type { AIOSWindow, WindowType, Notification, KernelStatus } from "../metadata";

let zCounter = 100;

interface OpenSpec {
  type: WindowType;
  title: string;
  content: Record<string, unknown>;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface WindowStore {
  windows: AIOSWindow[];
  kernelStatus: KernelStatus;
  notifications: Notification[];

  // Window lifecycle
  openWindow: (spec: OpenSpec) => string;
  closeWindow: (id: string) => void;
  updateWindowContent: (id: string, patch: Record<string, unknown>) => void;

  // Window UI state
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, w: number, h: number) => void;

  // Merge server state into local store (called from useWidget)
  syncFromServer: (windows: AIOSWindow[], kernelStatus: KernelStatus, notifications?: Notification[]) => void;

  // Notifications
  setKernelStatus: (s: KernelStatus) => void;
  addNotification: (message: string, level: Notification["level"]) => void;
  dismissNotification: (id: string) => void;
}

export const useWindowStore = create<WindowStore>((set) => ({
  windows: [],
  kernelStatus: "idle",
  notifications: [],

  openWindow: (spec) => {
    const id = crypto.randomUUID();
    const win: AIOSWindow = {
      id,
      type: spec.type,
      title: spec.title,
      x: spec.x ?? 80 + Math.random() * 100,
      y: spec.y ?? 60 + Math.random() * 60,
      width: spec.width ?? 640,
      height: spec.height ?? 420,
      zIndex: ++zCounter,
      state: "normal",
      focused: true,
      content: spec.content,
    };
    set((s) => ({
      windows: [...s.windows.map((w) => ({ ...w, focused: false })), win],
    }));
    return id;
  },

  closeWindow: (id) =>
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

  updateWindowContent: (id, patch) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, content: { ...w.content, ...patch } } : w
      ),
    })),

  focusWindow: (id) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id
          ? { ...w, focused: true, zIndex: ++zCounter, state: w.state === "minimized" ? "normal" : w.state }
          : { ...w, focused: false }
      ),
    })),

  minimizeWindow: (id) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, state: "minimized", focused: false } : w
      ),
    })),

  restoreWindow: (id) =>
    set((s) => ({
      windows: s.windows.map((w) =>
        w.id === id ? { ...w, state: "normal", focused: true, zIndex: ++zCounter } : w
      ),
    })),

  moveWindow: (id, x, y) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    })),

  resizeWindow: (id, width, height) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, width, height } : w)),
    })),

  syncFromServer: (serverWindows, kernelStatus, notifications) =>
    set((s) => {
      // Merge: preserve local positions/sizes; update contents from server
      const localById = new Map(s.windows.map((w) => [w.id, w]));
      const merged = serverWindows.map((sw) => {
        const local = localById.get(sw.id);
        return local
          ? { ...sw, x: local.x, y: local.y, width: local.width, height: local.height, zIndex: local.zIndex, state: local.state, focused: local.focused }
          : { ...sw, zIndex: ++zCounter };
      });
      // Merge server notifications: add any new ones not already in local store
      const existingIds = new Set(s.notifications.map((n) => n.id));
      const newNotifs = (notifications ?? []).filter((n) => !existingIds.has(n.id));
      return { windows: merged, kernelStatus, notifications: [...s.notifications, ...newNotifs] };
    }),

  setKernelStatus: (kernelStatus) => set({ kernelStatus }),

  addNotification: (message, level) => {
    const id = crypto.randomUUID();
    const n: Notification = { id, message, level, timestamp: Date.now() };
    set((s) => ({ notifications: [...s.notifications, n] }));
    setTimeout(
      () => set((s) => ({ notifications: s.notifications.filter((x) => x.id !== id) })),
      5000
    );
  },

  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}));
