/** Time-zone helpers that need nothing but Intl (no moment/luxon). */

function tzOffsetMs(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).formatToParts(date);
    const m = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const asUtc = Date.UTC(+m.year, +m.month - 1, +m.day, +m.hour, +m.minute, +m.second);
    return asUtc - date.getTime();
}

/**
 * Parse "2026-10-20T10:00" as wall-clock time in `timeZone`.
 * Strings that already carry Z or an offset are parsed as-is.
 */
export function parseLocal(value: string, timeZone: string): Date {
    if (/[zZ]$|[+-]\d\d:?\d\d$/.test(value)) return new Date(value);
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!match) throw new Error(`زمان نامعتبر: ${value} (فرمت درست: 2026-10-20T10:00)`);
    const [, y, mo, d, h = '0', mi = '0', s = '0'] = match;
    const guess = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
    const offset = tzOffsetMs(new Date(guess), timeZone);
    return new Date(guess - offset);
}

/** Wall-clock "YYYY-MM-DDTHH:mm" of `date` in `timeZone`. */
export function toLocalIso(date: Date, timeZone: string): string {
    const shifted = new Date(date.getTime() + tzOffsetMs(date, timeZone));
    return shifted.toISOString().slice(0, 16);
}

export function formatFa(date: Date, timeZone: string, withDate = true): string {
    return new Intl.DateTimeFormat('fa-IR', {
        timeZone,
        ...(withDate ? { weekday: 'long', day: 'numeric', month: 'long' } : {}),
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

/** iCalendar UTC stamp: 20261020T063000Z */
export function icsStamp(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
