import { z } from "zod";

// ── Window types ─────────────────────────────────────────────────────────────

export const WindowTypeSchema = z.enum([
  "file-explorer",
  "terminal",
  "browser",
  "code",
  "image",
  "dialog",
]);

export const WindowSchema = z.object({
  id: z.string(),
  type: WindowTypeSchema,
  title: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  zIndex: z.number(),
  state: z.enum(["normal", "minimized", "maximized"]),
  focused: z.boolean(),
  content: z.record(z.unknown()),
});

export const NotificationSchema = z.object({
  id: z.string(),
  message: z.string(),
  level: z.enum(["info", "warning", "error", "success"]),
  timestamp: z.number(),
});

// ── Widget metadata (mcp-use auto-discovers this export) ────────────────────

export const widgetMetadata = {
  description: "AIOS — AI Operating System desktop environment",
  props: z.object({
    windows: z.array(WindowSchema).default([]),
    kernelStatus: z
      .enum(["idle", "thinking", "executing", "error"])
      .default("idle"),
    notifications: z.array(NotificationSchema).default([]),
  }),
};

// ── Derived types ────────────────────────────────────────────────────────────

export type WindowType = z.infer<typeof WindowTypeSchema>;
export type AIOSWindow = z.infer<typeof WindowSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type DesktopProps = z.infer<typeof widgetMetadata.props>;
export type KernelStatus = DesktopProps["kernelStatus"];
