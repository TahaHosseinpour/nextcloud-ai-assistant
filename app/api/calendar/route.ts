import { env } from '@/lib/env';
import { listEvents } from '@/lib/nextcloud/caldav';
import { parseLocal } from '@/lib/nextcloud/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET ?days=7 → events from the start of today for N days */
export async function GET(req: Request) {
    const days = Math.min(Number(new URL(req.url).searchParams.get('days') || 7), 60);
    try {
        const tz = env.timezone;
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
        const from = parseLocal(`${today}T00:00`, tz);
        const to = new Date(from.getTime() + days * 86_400_000);
        return Response.json({
            timezone: tz,
            link: `${env.ncUrl}/apps/calendar`,
            events: await listEvents(from, to),
        });
    } catch (err: any) {
        return Response.json({ error: err.message }, { status: err.status ?? 500 });
    }
}
