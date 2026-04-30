import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/api"
import { sendMail } from "@/lib/mailer"

const schema = z.object({
  to: z.string().email(),
})

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 })
  }

  try {
    await sendMail({
      to: parsed.data.to,
      subject: "Test email — Opportunities",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <div style="background:#0a1220;padding:20px 28px;border-radius:8px 8px 0 0">
            <span style="color:#60a5fa;font-size:18px;font-weight:600">Opportunities</span>
            <sup style="color:#fff;font-size:10px;font-weight:700">AI</sup>
          </div>
          <div style="background:#f9fafb;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0;font-size:15px">This is a test email confirming your SMTP configuration is working correctly.</p>
          </div>
        </div>
      `,
      text: "This is a test email confirming your SMTP configuration is working correctly.",
    })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send email."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
