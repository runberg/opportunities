import { z } from "zod"

export const clientInput = z.object({
  name: z.string().trim().min(1).max(160),
  codeName: z.string().trim().min(1).max(80).regex(/^[^=+@\-\r\n\t][^\r\n\t]*$/, "Use a single-line code name that starts with a letter, number, or plain text."),
  description: z.string().trim().max(12000).default(""),
}).refine((client) => client.name.toLowerCase() !== client.codeName.toLowerCase(), {
  message: "Choose a code name different from the real name.",
  path: ["codeName"],
})

export const deleteConfirmation = z.object({
  codeName: z.string().max(80),
  opportunities: z.number().int().nonnegative(),
  adhocPackages: z.number().int().nonnegative(),
  communications: z.number().int().nonnegative(),
})

export const CHANNELS = ["Email", "Phone", "Meeting", "Message", "Other"] as const

export const communicationInput = z.object({
  communicatedAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value)),
  channel: z.enum(CHANNELS),
  recipient: z.string().trim().min(1).max(300),
  summary: z.string().trim().min(1).max(8000),
})

export const workKind = z.enum(["opportunities", "adhoc"])
export type WorkKind = z.infer<typeof workKind>

export const workSearch = z.object({
  kind: workKind,
  q: z.string().trim().max(160).default(""),
  workId: z.string().min(1).max(128).optional(),
})

export const workChange = z.object({
  kind: workKind,
  workId: z.string().min(1).max(128),
  expectedClientId: z.string().min(1).max(128).nullable(),
  action: z.enum(["link", "unlink"]),
})
