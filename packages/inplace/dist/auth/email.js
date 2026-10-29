import { createHash } from "node:crypto";
import { Resend } from "resend";
export class ConsoleEmailSender {
    async sendMagicLink(input) {
        console.info(`[inplace] Magic link for ${input.to}: ${input.url}`);
    }
}
export class MemoryEmailSender {
    sent = [];
    async sendMagicLink(input) {
        this.sent.push(input);
    }
}
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
export class ResendEmailSender {
    from;
    resend;
    constructor(apiKey, from) {
        this.from = from;
        this.resend = new Resend(apiKey);
    }
    async sendMagicLink(input) {
        const safeUrl = escapeHtml(input.url);
        const { error } = await this.resend.emails.send({
            from: this.from,
            to: [input.to],
            subject: "Your Inplace sign-in link",
            html: `<p>Use this link to edit the site. It expires in 15 minutes and works once.</p><p><a href="${safeUrl}">${safeUrl}</a></p>`,
            text: `Sign in to Inplace:\n${input.url}\n\nThis link expires in 15 minutes and works once.`,
        }, {
            idempotencyKey: `inplace-magic/${createHash("sha256").update(input.url).digest("hex")}`,
        });
        if (error) {
            throw new Error(error.message);
        }
    }
}
export function createEmailSender(config) {
    if (config.resendApiKey && config.fromEmail) {
        return new ResendEmailSender(config.resendApiKey, config.fromEmail);
    }
    if (config.resendApiKey && !config.fromEmail) {
        console.warn("[inplace] RESEND_API_KEY is set but INPLACE_FROM_EMAIL is missing. Magic links will be logged instead of emailed.");
    }
    return new ConsoleEmailSender();
}
