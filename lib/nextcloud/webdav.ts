import 'server-only';
import { env } from '../env';
import { encodePath, ncFetch, normalizePath, parseXml } from './client';

export type FileEntry = {
    name: string;
    path: string;
    isFolder: boolean;
    size: number;
    contentType?: string;
    modified?: string;
    etag?: string;
};

const PROPS = `<d:prop>
  <d:displayname/><d:getcontentlength/><d:getlastmodified/>
  <d:resourcetype/><d:getcontenttype/><d:getetag/><oc:size/>
</d:prop>`;

const TEXT_TYPES = /^(text\/|application\/(json|xml|x-yaml|javascript))/;
const TEXT_EXT = /\.(md|markdown|txt|csv|json|ya?ml|xml|html?|ics|log|ini|conf)$/i;
const MAX_READ_BYTES = 512 * 1024;

const filesRoot = () => `/remote.php/dav/files/${encodeURIComponent(env.ncUser)}`;

function toEntry(response: any): FileEntry {
    const href = decodeURIComponent(String(response.href));
    const rootPrefix = `/remote.php/dav/files/${env.ncUser}`;
    const idx = href.indexOf(rootPrefix);
    const rel = idx >= 0 ? href.slice(idx + rootPrefix.length) : href;
    const prop = response.propstat?.find((p: any) => String(p.status).includes('200'))?.prop ?? {};
    const isFolder = prop.resourcetype && typeof prop.resourcetype === 'object' && 'collection' in prop.resourcetype;
    const path = normalizePath(rel);
    return {
        name: path.split('/').pop() || '/',
        path,
        isFolder: Boolean(isFolder),
        size: Number(prop.size ?? prop.getcontentlength ?? 0),
        contentType: prop.getcontenttype || undefined,
        modified: prop.getlastmodified ? new Date(prop.getlastmodified).toISOString() : undefined,
        etag: prop.getetag ? String(prop.getetag) : undefined,
    };
}

export async function listFolder(path = '/'): Promise<FileEntry[]> {
    const target = normalizePath(path);
    const res = await ncFetch(`${filesRoot()}/${encodePath(target)}`, {
        method: 'PROPFIND',
        headers: { Depth: '1', 'Content-Type': 'application/xml' },
        body: `<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">${PROPS}</d:propfind>`,
    });
    const doc = parseXml(await res.text());
    const entries: FileEntry[] = (doc.multistatus?.response ?? []).map(toEntry);
    return entries
        .filter(e => e.path !== target)
        .sort((a, b) => Number(b.isFolder) - Number(a.isFolder) || a.name.localeCompare(b.name, 'fa'));
}

export async function searchFiles(query: string, limit = 25): Promise<FileEntry[]> {
    const escaped = query.replace(/[<>&]/g, '');
    const res = await ncFetch('/remote.php/dav/', {
        method: 'SEARCH',
        headers: { 'Content-Type': 'text/xml' },
        body: `<?xml version="1.0"?>
<d:searchrequest xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
 <d:basicsearch>
  <d:select>${PROPS}</d:select>
  <d:from><d:scope><d:href>/files/${env.ncUser}</d:href><d:depth>infinity</d:depth></d:scope></d:from>
  <d:where><d:like><d:prop><d:displayname/></d:prop><d:literal>%${escaped}%</d:literal></d:like></d:where>
  <d:orderby/>
  <d:limit><d:nresults>${limit}</d:nresults></d:limit>
 </d:basicsearch>
</d:searchrequest>`,
    });
    const doc = parseXml(await res.text());
    return (doc.multistatus?.response ?? []).map(toEntry);
}

export function isTextFile(path: string, contentType?: string | null) {
    return TEXT_EXT.test(path) || (contentType ? TEXT_TYPES.test(contentType) : false);
}

export async function readFile(path: string): Promise<{ path: string; content: string; etag?: string }> {
    const target = normalizePath(path);
    const res = await ncFetch(`${filesRoot()}/${encodePath(target)}`);
    const contentType = res.headers.get('content-type');
    if (!isTextFile(target, contentType)) {
        throw new Error(
            `فایل «${target}» متنی نیست (${contentType}). فعلاً فقط فایل‌های متنی مثل md و txt قابل خواندن/ویرایش‌اند.`
        );
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_READ_BYTES) throw new Error('فایل برای خواندن بیش از حد بزرگ است.');
    return {
        path: target,
        content: new TextDecoder('utf-8').decode(buf),
        etag: res.headers.get('etag') ?? undefined,
    };
}

export async function ensureFolder(path: string): Promise<void> {
    const segments = normalizePath(path).split('/').filter(Boolean);
    let current = '';
    for (const seg of segments) {
        current += '/' + seg;
        const res = await fetchMkcol(current);
        if (![201, 405].includes(res)) throw new Error(`ساخت پوشه ${current} ناموفق بود (${res}).`);
    }
}

async function fetchMkcol(path: string): Promise<number> {
    try {
        const res = await ncFetch(`${filesRoot()}/${encodePath(path)}`, { method: 'MKCOL' });
        return res.status;
    } catch (err: any) {
        return err.status ?? 500; // 405 = already exists
    }
}

/**
 * Create or overwrite a file. When `etag` is given, the write fails if the file changed
 * since it was read (prevents clobbering someone else's edits).
 */
export async function writeFile(path: string, content: string, etag?: string): Promise<{ path: string; created: boolean }> {
    const target = normalizePath(path);
    const parent = target.split('/').slice(0, -1).join('/');
    if (parent) await ensureFolder(parent);
    const headers: Record<string, string> = { 'Content-Type': 'text/plain; charset=utf-8' };
    if (etag) headers['If-Match'] = etag;
    const res = await ncFetch(`${filesRoot()}/${encodePath(target)}`, { method: 'PUT', headers, body: content });
    return { path: target, created: res.status === 201 };
}

export async function moveFile(from: string, to: string): Promise<void> {
    const destination = `${env.ncUrl}${filesRoot()}/${encodePath(normalizePath(to))}`;
    await ncFetch(`${filesRoot()}/${encodePath(normalizePath(from))}`, {
        method: 'MOVE',
        headers: { Destination: destination, Overwrite: 'F' },
    });
}

/** Link that opens the file/folder in the Nextcloud web UI. */
export function webLink(path: string, isFolder = false): string {
    const target = normalizePath(path);
    if (isFolder) return `${env.ncUrl}/apps/files/?dir=${encodeURIComponent(target)}`;
    const dir = target.split('/').slice(0, -1).join('/') || '/';
    return `${env.ncUrl}/apps/files/?dir=${encodeURIComponent(dir)}&scrollto=${encodeURIComponent(target.split('/').pop()!)}`;
}
