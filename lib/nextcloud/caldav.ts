import 'server-only';
import { randomUUID } from 'crypto';
import { env } from '../env';
import { ncFetch, parseXml } from './client';
import { icsStamp, parseLocal } from './time';

export type CalendarInfo = { id: string; name: string; color?: string };

export type CalendarEvent = {
    uid: string;
    calendar: string;
    title: string;
    start: string; // ISO (UTC)
    end: string; // ISO (UTC)
    allDay: boolean;
    location?: string;
    description?: string;
    attendees: string[];
};

const calRoot = () => `/remote.php/dav/calendars/${encodeURIComponent(env.ncUser)}`;

export async function listCalendars(): Promise<CalendarInfo[]> {
    const res = await ncFetch(`${calRoot()}/`, {
        method: 'PROPFIND',
        headers: { Depth: '1', 'Content-Type': 'application/xml' },
        body: `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:x="http://apple.com/ns/ical/">
  <d:prop><d:displayname/><d:resourcetype/><c:supported-calendar-component-set/><x:calendar-color/></d:prop>
</d:propfind>`,
    });
    const doc = parseXml(await res.text());
    const out: CalendarInfo[] = [];
    for (const r of doc.multistatus?.response ?? []) {
        const prop = r.propstat?.find((p: any) => String(p.status).includes('200'))?.prop ?? {};
        const isCalendar = prop.resourcetype && typeof prop.resourcetype === 'object' && 'calendar' in prop.resourcetype;
        const comps: any[] = prop['supported-calendar-component-set']?.comp ?? [];
        const supportsEvents = comps.length === 0 || comps.some(c => c['@_name'] === 'VEVENT');
        if (!isCalendar || !supportsEvents) continue;
        const id = decodeURIComponent(String(r.href)).split('/').filter(Boolean).pop()!;
        out.push({ id, name: prop.displayname || id, color: prop['calendar-color'] || undefined });
    }
    return out;
}

export async function listEvents(from: Date, to: Date, calendarId?: string): Promise<CalendarEvent[]> {
    const calendars = calendarId ? [calendarId] : (await listCalendars()).map(c => c.id);
    const results = await Promise.all(
        calendars.map(async cal => {
            const res = await ncFetch(`${calRoot()}/${encodeURIComponent(cal)}/`, {
                method: 'REPORT',
                headers: { Depth: '1', 'Content-Type': 'application/xml' },
                body: `<?xml version="1.0"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop><c:calendar-data/></d:prop>
  <c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT">
    <c:time-range start="${icsStamp(from)}" end="${icsStamp(to)}"/>
  </c:comp-filter></c:comp-filter></c:filter>
</c:calendar-query>`,
            });
            const doc = parseXml(await res.text());
            return (doc.multistatus?.response ?? []).flatMap((r: any) => {
                const prop = r.propstat?.find((p: any) => String(p.status).includes('200'))?.prop;
                const data = prop?.['calendar-data'];
                const text = typeof data === 'string' ? data : data?.['#text'];
                return text ? parseIcsEvents(text, cal) : [];
            });
        })
    );
    return results
        .flat()
        .filter(e => new Date(e.end) > from && new Date(e.start) < to)
        .sort((a, b) => a.start.localeCompare(b.start));
}

export type NewEvent = {
    title: string;
    start: string; // local wall-clock, e.g. 2026-10-20T10:00
    end: string;
    description?: string;
    location?: string;
    attendees?: string[]; // emails
    calendarId?: string;
};

export async function createEvent(input: NewEvent): Promise<CalendarEvent> {
    const tz = env.timezone;
    const start = parseLocal(input.start, tz);
    const end = parseLocal(input.end, tz);
    if (end <= start) throw new Error('زمان پایان باید بعد از زمان شروع باشد.');
    const uid = randomUUID();
    const calendar = input.calendarId || env.ncCalendar;
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//nextcloud-assistant//FA',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${icsStamp(new Date())}`,
        `DTSTART:${icsStamp(start)}`,
        `DTEND:${icsStamp(end)}`,
        `SUMMARY:${escapeText(input.title)}`,
        input.location ? `LOCATION:${escapeText(input.location)}` : '',
        input.description ? `DESCRIPTION:${escapeText(input.description)}` : '',
        ...(input.attendees?.length
            ? [
                  `ORGANIZER;CN=${env.ncUser}:mailto:${env.ncUser}`,
                  ...input.attendees.map(
                      email => `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${email}`
                  ),
              ]
            : []),
        'END:VEVENT',
        'END:VCALENDAR',
    ].filter(Boolean);

    await ncFetch(`${calRoot()}/${encodeURIComponent(calendar)}/${uid}.ics`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'If-None-Match': '*' },
        body: lines.map(foldLine).join('\r\n') + '\r\n',
    });

    return {
        uid,
        calendar,
        title: input.title,
        start: start.toISOString(),
        end: end.toISOString(),
        allDay: false,
        location: input.location,
        description: input.description,
        attendees: input.attendees ?? [],
    };
}

export async function deleteEvent(uid: string, calendarId?: string): Promise<void> {
    await ncFetch(`${calRoot()}/${encodeURIComponent(calendarId || env.ncCalendar)}/${encodeURIComponent(uid)}.ics`, {
        method: 'DELETE',
    });
}

/** Free slots between `from` and `to`, within working hours, of at least `minutes`. */
export async function findFreeSlots(opts: {
    from: Date;
    to: Date;
    minutes: number;
    dayStartHour?: number;
    dayEndHour?: number;
}): Promise<{ start: Date; end: Date }[]> {
    const { from, to, minutes, dayStartHour = 9, dayEndHour = 17 } = opts;
    const busy = (await listEvents(from, to))
        .filter(e => !e.allDay)
        .map(e => ({ start: new Date(e.start).getTime(), end: new Date(e.end).getTime() }));
    const tz = env.timezone;
    const slots: { start: Date; end: Date }[] = [];
    const need = minutes * 60_000;

    for (let day = new Date(from); day < to; day = new Date(day.getTime() + 86_400_000)) {
        const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(day); // YYYY-MM-DD
        const pad = (n: number) => String(n).padStart(2, '0');
        let cursor = Math.max(parseLocal(`${isoDay}T${pad(dayStartHour)}:00`, tz).getTime(), from.getTime());
        const dayEnd = Math.min(parseLocal(`${isoDay}T${pad(dayEndHour)}:00`, tz).getTime(), to.getTime());
        for (const b of busy.filter(b => b.end > cursor && b.start < dayEnd).sort((a, b) => a.start - b.start)) {
            if (b.start - cursor >= need) slots.push({ start: new Date(cursor), end: new Date(b.start) });
            cursor = Math.max(cursor, b.end);
        }
        if (dayEnd - cursor >= need) slots.push({ start: new Date(cursor), end: new Date(dayEnd) });
    }
    return slots;
}

// ---------- minimal iCalendar parsing ----------

function escapeText(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function unescapeText(value: string) {
    return value.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

/** Fold to 75 octets per RFC 5545 (UTF-8 aware). */
function foldLine(line: string): string {
    const bytes = Buffer.from(line, 'utf8');
    if (bytes.length <= 75) return line;
    const chunks: string[] = [];
    let current = '';
    for (const ch of line) {
        const limit = chunks.length === 0 ? 75 : 74;
        if (Buffer.byteLength(current + ch, 'utf8') > limit) {
            chunks.push(current);
            current = '';
        }
        current += ch;
    }
    chunks.push(current);
    return chunks.join('\r\n ');
}

function parseIcsDate(value: string, params: Record<string, string>): { date: Date; allDay: boolean } {
    if (params.VALUE === 'DATE' || /^\d{8}$/.test(value)) {
        const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
        return { date: parseLocal(`${iso}T00:00`, params.TZID || env.timezone), allDay: true };
    }
    const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}`;
    if (value.endsWith('Z')) return { date: new Date(iso + 'Z'), allDay: false };
    let tz = params.TZID || env.timezone;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
    } catch {
        tz = env.timezone; // non-IANA TZID (e.g. Outlook names)
    }
    return { date: parseLocal(iso, tz), allDay: false };
}

export function parseIcsEvents(ics: string, calendar: string): CalendarEvent[] {
    const lines = ics.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
    const events: CalendarEvent[] = [];
    let current: Record<string, { value: string; params: Record<string, string> }[]> | null = null;
    let depth = 0; // skip nested VALARM etc.

    for (const line of lines) {
        if (line === 'BEGIN:VEVENT') {
            current = {};
            depth = 0;
            continue;
        }
        if (!current) continue;
        if (line.startsWith('BEGIN:')) depth++;
        else if (line.startsWith('END:') && line !== 'END:VEVENT') depth--;
        else if (line === 'END:VEVENT') {
            const get = (k: string) => current![k]?.[0];
            const startRaw = get('DTSTART');
            if (startRaw) {
                const start = parseIcsDate(startRaw.value, startRaw.params);
                const endRaw = get('DTEND');
                const end = endRaw
                    ? parseIcsDate(endRaw.value, endRaw.params).date
                    : new Date(start.date.getTime() + (start.allDay ? 86_400_000 : 3_600_000));
                events.push({
                    uid: get('UID')?.value ?? randomUUID(),
                    calendar,
                    title: unescapeText(get('SUMMARY')?.value ?? '(بدون عنوان)'),
                    start: start.date.toISOString(),
                    end: end.toISOString(),
                    allDay: start.allDay,
                    location: get('LOCATION') ? unescapeText(get('LOCATION')!.value) : undefined,
                    description: get('DESCRIPTION') ? unescapeText(get('DESCRIPTION')!.value) : undefined,
                    attendees: (current.ATTENDEE ?? []).map(a => a.params.CN || a.value.replace(/^mailto:/i, '')),
                });
            }
            current = null;
            continue;
        }
        if (depth > 0) continue;
        const colon = line.indexOf(':');
        if (colon < 0) continue;
        const [name, ...paramParts] = line.slice(0, colon).split(';');
        const params = Object.fromEntries(
            paramParts.map(p => {
                const [k, v = ''] = p.split('=');
                return [k.toUpperCase(), v.replace(/^"|"$/g, '')];
            })
        );
        (current[name.toUpperCase()] ??= []).push({ value: line.slice(colon + 1), params });
    }
    return events;
}
