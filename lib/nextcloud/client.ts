import 'server-only';
import { XMLParser } from 'fast-xml-parser';
import { env } from '../env';

export class NextcloudError extends Error {
    constructor(
        message: string,
        public status: number
    ) {
        super(message);
    }
}

const xml = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    parseTagValue: false,
    isArray: name => name === 'response' || name === 'propstat' || name === 'comp',
});

export function parseXml(text: string): any {
    return xml.parse(text);
}

function authHeader() {
    return 'Basic ' + Buffer.from(`${env.ncUser}:${env.ncPassword}`).toString('base64');
}

/** Low-level request against the Nextcloud server (path starts with "/"). */
export async function ncFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', authHeader());
    headers.set('OCS-APIRequest', 'true');
    const res = await fetch(env.ncUrl + path, { ...init, headers, cache: 'no-store' });
    if (!res.ok && res.status !== 207) {
        const body = await res.text().catch(() => '');
        const hint =
            res.status === 401
                ? 'نام کاربری یا App Password اشتباه است.'
                : res.status === 404
                  ? 'مسیر پیدا نشد.'
                  : res.status === 412
                    ? 'فایل در این فاصله تغییر کرده است (تداخل ویرایش).'
                    : '';
        throw new NextcloudError(
            `Nextcloud ${init.method ?? 'GET'} ${path} → ${res.status}. ${hint} ${body.slice(0, 200)}`.trim(),
            res.status
        );
    }
    return res;
}

/** OCS (JSON) API helper; returns `ocs.data`. */
export async function ocs<T = any>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    params?: Record<string, string | number | boolean>
): Promise<T> {
    const body = params
        ? new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
        : undefined;
    const res = await ncFetch(path + (path.includes('?') ? '&' : '?') + 'format=json', {
        method,
        body,
        headers: { Accept: 'application/json' },
    });
    const json = await res.json();
    return json.ocs?.data as T;
}

/** Encode each segment of a slash-separated path. */
export function encodePath(path: string): string {
    return path
        .split('/')
        .filter(Boolean)
        .map(encodeURIComponent)
        .join('/');
}

export function normalizePath(path: string): string {
    const clean = path.replace(/\\/g, '/').split('/').filter(Boolean);
    if (clean.some(seg => seg === '..')) throw new Error('مسیر نامعتبر است.');
    return '/' + clean.join('/');
}
