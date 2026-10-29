import { createHash } from "node:crypto";
import { Resend } from "resend";

export interface EmailSender {
  sendMagicLink(input: { to: string; url: string }): Promise<void>;
}

export class ConsoleEmailSender implements EmailSender {
  async sendMagicLink(input: { to: string; url: string }): Promise<void> {
    console.info(`[site-editor] Magic link for ${input.to}: ${input.url}`);
  }
}

export class MemoryEmailSender implements EmailSender {
  readonly sent: Array<{ to: string; url: string }> = [];

  async sendMagicLink(input: { to: string; url: string }): Promise<void> {
    this.sent.push(input);
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export class ResendEmailSender implements EmailSender {
  private readonly resend: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.resend = new Resend(apiKey);
  }

  async sendMagicLink(input: { to: string; url: string }): Promise<void> {
    const safeUrl = escapeHtml(input.url);
    const { error } = await this.resend.emails.send(
      {
        from: this.from,
        to: [input.to],
        subject: "Your Site Editor sign-in link",
        html: `<p>Use this link to edit the site. It expires in 15 minutes and works once.</p><p><a href="${safeUrl}">${safeUrl}</a></p>`,
        text: `Sign in to Site Editor:\n${input.url}\n\nThis link expires in 15 minutes and works once.`,
      },
      {
        idempotencyKey: `site-editor-magic/${createHash("sha256").update(input.url).digest("hex")}`,
      },
    );
    if (error) {
      throw new Error(error.message);
    }
  }
}

export function createEmailSender(config: {
  resendApiKey: string | null;
  fromEmail: string | null;
}): EmailSender {
  if (config.resendApiKey && config.fromEmail) {
    return new ResendEmailSender(config.resendApiKey, config.fromEmail);
  }
  if (config.resendApiKey && !config.fromEmail) {
    console.warn(
      "[site-editor] RESEND_API_KEY is set but SITE_EDITOR_FROM_EMAIL is missing. Magic links will be logged instead of emailed.",
    );
  }
  return new ConsoleEmailSender();
}
