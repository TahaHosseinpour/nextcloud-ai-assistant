import { env, missingEnv } from '@/lib/env';
import { ncFetch } from '@/lib/nextcloud/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    const missing = missingEnv();
    if (missing.length) {
        return Response.json({ ok: false, message: `متغیرهای محیطی تنظیم نشده: ${missing.join('، ')}` });
    }
    try {
        await ncFetch(`/ocs/v2.php/cloud/user?format=json`, { headers: { Accept: 'application/json' } });
        return Response.json({ ok: true, user: env.ncUser, server: env.ncUrl, model: env.llmModel });
    } catch (err: any) {
        return Response.json({ ok: false, message: err.message });
    }
}
