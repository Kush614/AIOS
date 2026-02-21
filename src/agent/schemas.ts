import { z } from "zod";

// Mirrors resources/desktop/metadata.ts — kept in sync manually
// Server uses this to build/validate DesktopState before returning to widget

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
  x: z.number().default(100),
  y: z.number().default(80),
  width: z.number().default(640),
  height: z.number().default(420),
  zIndex: z.number().default(100),
  state: z.enum(["normal", "minimized", "maximized"]).default("normal"),
  focused: z.boolean().default(true),
  content: z.record(z.unknown()).default({}),
});

export const DesktopStateSchema = z.object({
  windows: z.array(WindowSchema).default([]),
  kernelStatus: z
    .enum(["idle", "thinking", "executing", "error"])
    .default("idle"),
  notifications: z
    .array(
      z.object({
        id: z.string(),
        message: z.string(),
        level: z.enum(["info", "warning", "error", "success"]),
        timestamp: z.number(),
      })
    )
    .default([]),
});

export type WindowType = z.infer<typeof WindowTypeSchema>;
export type AIOSWindow = z.infer<typeof WindowSchema>;
export type DesktopState = z.infer<typeof DesktopStateSchema>;
