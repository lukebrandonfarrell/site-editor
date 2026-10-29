export interface EmailSender {
    sendMagicLink(input: {
        to: string;
        url: string;
    }): Promise<void>;
}
export declare class ConsoleEmailSender implements EmailSender {
    sendMagicLink(input: {
        to: string;
        url: string;
    }): Promise<void>;
}
export declare class MemoryEmailSender implements EmailSender {
    readonly sent: Array<{
        to: string;
        url: string;
    }>;
    sendMagicLink(input: {
        to: string;
        url: string;
    }): Promise<void>;
}
export declare class ResendEmailSender implements EmailSender {
    private readonly from;
    private readonly resend;
    constructor(apiKey: string, from: string);
    sendMagicLink(input: {
        to: string;
        url: string;
    }): Promise<void>;
}
export declare function createEmailSender(config: {
    resendApiKey: string | null;
    fromEmail: string | null;
}): EmailSender;
