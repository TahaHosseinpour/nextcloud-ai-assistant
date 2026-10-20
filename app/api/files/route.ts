import { listFolder, readFile, webLink, writeFile } from '@/lib/nextcloud/webdav';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET ?path=/x → folder listing;  GET ?file=/x.md → file content */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    try {
        const file = searchParams.get('file');
        if (file) return Response.json({ ...(await readFile(file)), link: webLink(file) });
        const path = searchParams.get('path') || '/';
        return Response.json({ path, entries: await listFolder(path), link: webLink(path, true) });
    } catch (err: any) {
        return Response.json({ error: err.message }, { status: err.status ?? 500 });
    }
}

/** POST { path, content, etag } → save edits made by the user in the panel */
export async function POST(req: Request) {
    try {
        const { path, content, etag } = await req.json();
        const res = await writeFile(path, content, etag);
        const fresh = await readFile(res.path);
        return Response.json({ ...res, etag: fresh.etag });
    } catch (err: any) {
        return Response.json({ error: err.message }, { status: err.status ?? 500 });
    }
}
