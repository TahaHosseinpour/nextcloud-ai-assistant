import 'server-only';

function read(name: string, fallback?: string): string {
    const value = process.env[name] ?? fallback;
    if (value === undefined || value === '') {
        throw new Error(`متغیر محیطی ${name} تنظیم نشده است (فایل .env را ببینید).`);
    }
    return value;
}

export const env = {
    get llmBaseUrl() {
        return read('LLM_BASE_URL');
    },
    get llmApiKey() {
        return read('LLM_API_KEY');
    },
    get llmModel() {
        return read('LLM_MODEL');
    },
    /** Extra JSON merged into every chat-completion request body (provider-specific options). */
    get llmExtraBody(): Record<string, unknown> | undefined {
        const raw = process.env.LLM_EXTRA_BODY;
        if (!raw) return undefined;
        try {
            return JSON.parse(raw);
        } catch {
            throw new Error('LLM_EXTRA_BODY باید JSON معتبر باشد.');
        }
    },
    get ncUrl() {
        return read('NEXTCLOUD_URL').replace(/\/+$/, '');
    },
    get ncUser() {
        return read('NEXTCLOUD_USER');
    },
    get ncPassword() {
        return read('NEXTCLOUD_APP_PASSWORD');
    },
    get ncCalendar() {
        return read('NEXTCLOUD_CALENDAR', 'personal');
    },
    get meetingsFolder() {
        return read('NEXTCLOUD_MEETINGS_FOLDER', 'Meetings');
    },
    get timezone() {
        return read('APP_TIMEZONE', 'Asia/Tehran');
    },
};

/** Which required variables are missing — used by the status endpoint. */
export function missingEnv(): string[] {
    return [
        'LLM_BASE_URL',
        'LLM_API_KEY',
        'LLM_MODEL',
        'NEXTCLOUD_URL',
        'NEXTCLOUD_USER',
        'NEXTCLOUD_APP_PASSWORD',
    ].filter(name => !process.env[name]);
}
