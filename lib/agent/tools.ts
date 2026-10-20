import 'server-only';
import { tool } from 'langchain';
import { z } from 'zod';
import { env } from '../env';
import { createEvent, deleteEvent, findFreeSlots, listCalendars, listEvents } from '../nextcloud/caldav';
import { createShareLink, createTalkRoom, listTalkRooms, sendTalkMessage } from '../nextcloud/talk';
import { formatFa, parseLocal, toLocalIso } from '../nextcloud/time';
import { listFolder, moveFile, readFile, searchFiles, webLink, writeFile } from '../nextcloud/webdav';

/** Tools return JSON so the UI can render rich cards; errors are returned, not thrown, so the model can recover. */
function run<T>(fn: (input: T) => Promise<unknown>) {
    return async (input: T) => {
        try {
            return JSON.stringify({ ok: true, ...((await fn(input)) as object) });
        } catch (err: any) {
            return JSON.stringify({ ok: false, error: err?.message ?? String(err) });
        }
    };
}

const tz = () => env.timezone;
const localTime = z.string().describe(`زمان محلی به فرمت YYYY-MM-DDTHH:mm (منطقه زمانی برنامه)`);

const describeEvent = (e: Awaited<ReturnType<typeof listEvents>>[number]) => ({
    uid: e.uid,
    calendar: e.calendar,
    title: e.title,
    start: toLocalIso(new Date(e.start), tz()),
    end: toLocalIso(new Date(e.end), tz()),
    when: formatFa(new Date(e.start), tz()),
    allDay: e.allDay,
    location: e.location,
    attendees: e.attendees,
});

// ---------------- files ----------------

const listFiles = tool(
    run(async ({ path }: { path: string }) => {
        const entries = await listFolder(path);
        return {
            path,
            entries: entries.map(e => ({ name: e.name, path: e.path, folder: e.isFolder, size: e.size, modified: e.modified })),
        };
    }),
    {
        name: 'list_files',
        description: 'فهرست فایل‌ها و پوشه‌های یک پوشه در Nextcloud. برای ریشه از "/" استفاده کن.',
        schema: z.object({ path: z.string().default('/').describe('مسیر پوشه، مثل /Documents') }),
    }
);

const searchFilesTool = tool(
    run(async ({ query }: { query: string }) => ({
        query,
        results: (await searchFiles(query)).map(e => ({ name: e.name, path: e.path, folder: e.isFolder })),
    })),
    {
        name: 'search_files',
        description: 'جست‌وجوی فایل یا پوشه بر اساس بخشی از نام در کل فضای Nextcloud.',
        schema: z.object({ query: z.string().describe('بخشی از نام فایل') }),
    }
);

const readFileTool = tool(
    run(async ({ path }: { path: string }) => {
        const file = await readFile(path);
        return { path: file.path, content: file.content, link: webLink(file.path) };
    }),
    {
        name: 'read_file',
        description: 'خواندن محتوای یک فایل متنی (md, txt, csv, json, ...). قبل از ویرایش فایل همیشه اول آن را بخوان.',
        schema: z.object({ path: z.string().describe('مسیر کامل فایل') }),
    }
);

const writeFileTool = tool(
    run(async ({ path, content }: { path: string; content: string }) => {
        const res = await writeFile(path, content);
        return { ...res, link: webLink(res.path) };
    }),
    {
        name: 'write_file',
        description:
            'ساخت فایل متنی جدید یا بازنویسی کامل یک فایل. پوشه‌های والد خودکار ساخته می‌شوند. برای تغییر جزئی از edit_file استفاده کن.',
        schema: z.object({
            path: z.string().describe('مسیر کامل فایل، مثل /Documents/note.md'),
            content: z.string().describe('محتوای کامل فایل'),
        }),
    }
);

const editFileTool = tool(
    run(async ({ path, old_text, new_text }: { path: string; old_text: string; new_text: string }) => {
        const file = await readFile(path);
        const count = file.content.split(old_text).length - 1;
        if (count === 0) throw new Error('متن مورد نظر در فایل پیدا نشد. فایل را دوباره بخوان و متن دقیق را بده.');
        if (count > 1) throw new Error(`این متن ${count} بار در فایل آمده؛ بخش بزرگ‌تر و یکتایی را انتخاب کن.`);
        await writeFile(path, file.content.replace(old_text, new_text), file.etag);
        return { path: file.path, link: webLink(file.path) };
    }),
    {
        name: 'edit_file',
        description: 'ویرایش بخشی از یک فایل متنی: old_text دقیقاً (و یک‌بار) با new_text جایگزین می‌شود.',
        schema: z.object({
            path: z.string(),
            old_text: z.string().describe('متن دقیق فعلی که باید عوض شود'),
            new_text: z.string().describe('متن جایگزین'),
        }),
    }
);

const moveFileTool = tool(
    run(async ({ from, to }: { from: string; to: string }) => {
        await moveFile(from, to);
        return { from, to, link: webLink(to) };
    }),
    {
        name: 'move_file',
        description: 'جابه‌جا کردن یا تغییر نام فایل/پوشه.',
        schema: z.object({ from: z.string(), to: z.string() }),
    }
);

const shareFileTool = tool(
    run(async ({ path }: { path: string }) => ({ path, ...(await createShareLink(path)) })),
    {
        name: 'share_file',
        description: 'ساخت لینک عمومی فقط‌خواندنی برای یک فایل یا پوشه.',
        schema: z.object({ path: z.string() }),
    }
);

const meetingMinutes = tool(
    run(
        async (input: {
            title: string;
            date: string;
            attendees: string[];
            agenda: string[];
            notes: string;
            decisions: string[];
            action_items: { task: string; owner?: string; due?: string }[];
        }) => {
            const day = input.date.slice(0, 10);
            const slug = input.title.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').slice(0, 60);
            const path = `/${env.meetingsFolder}/${day}-${slug}.md`;
            const dateFa = formatFa(parseLocal(input.date.length > 10 ? input.date : `${day}T09:00`, tz()), tz());
            const list = (items: string[]) => (items.length ? items.map(i => `- ${i}`).join('\n') : '- —');
            const content = `# صورت‌جلسه: ${input.title}

**تاریخ:** ${dateFa}
**حاضران:** ${input.attendees.join('، ') || '—'}

## دستور جلسه
${list(input.agenda)}

## خلاصه مذاکرات
${input.notes || '—'}

## تصمیم‌ها
${list(input.decisions)}

## اقدامات
| کار | مسئول | مهلت |
|---|---|---|
${input.action_items.map(a => `| ${a.task} | ${a.owner ?? '—'} | ${a.due ?? '—'} |`).join('\n') || '| — | — | — |'}
`;
            const res = await writeFile(path, content);
            return { ...res, link: webLink(res.path) };
        }
    ),
    {
        name: 'create_meeting_minutes',
        description:
            'ساخت فایل صورت‌جلسه (Markdown) با قالب استاندارد در پوشه صورت‌جلسه‌ها. فیلدهایی را که اطلاعاتش را نداری خالی بگذار.',
        schema: z.object({
            title: z.string().describe('موضوع جلسه'),
            date: z.string().describe('تاریخ میلادی جلسه YYYY-MM-DD یا YYYY-MM-DDTHH:mm'),
            attendees: z.array(z.string()).default([]),
            agenda: z.array(z.string()).default([]),
            notes: z.string().default('').describe('خلاصه گفتگوها به Markdown'),
            decisions: z.array(z.string()).default([]),
            action_items: z
                .array(z.object({ task: z.string(), owner: z.string().optional(), due: z.string().optional() }))
                .default([]),
        }),
    }
);

// ---------------- calendar ----------------

const listCalendarsTool = tool(
    run(async () => ({ calendars: await listCalendars() })),
    {
        name: 'list_calendars',
        description: 'فهرست تقویم‌های کاربر در Nextcloud.',
        schema: z.object({}),
    }
);

const listEventsTool = tool(
    run(async ({ start, end, calendar_id }: { start: string; end: string; calendar_id?: string }) => {
        const events = await listEvents(parseLocal(start, tz()), parseLocal(end, tz()), calendar_id);
        return { events: events.map(describeEvent) };
    }),
    {
        name: 'list_events',
        description: 'فهرست جلسات/رویدادهای تقویم در یک بازه زمانی.',
        schema: z.object({
            start: localTime,
            end: localTime,
            calendar_id: z.string().optional().describe('خالی = همه تقویم‌ها'),
        }),
    }
);

const freeSlotsTool = tool(
    run(async ({ start, end, duration_minutes }: { start: string; end: string; duration_minutes: number }) => {
        const slots = await findFreeSlots({
            from: parseLocal(start, tz()),
            to: parseLocal(end, tz()),
            minutes: duration_minutes,
        });
        return {
            slots: slots.slice(0, 12).map(s => ({
                start: toLocalIso(s.start, tz()),
                end: toLocalIso(s.end, tz()),
                label: `${formatFa(s.start, tz())} تا ${formatFa(s.end, tz(), false)}`,
            })),
        };
    }),
    {
        name: 'find_free_slots',
        description: 'پیدا کردن بازه‌های خالی تقویم (ساعت کاری ۹ تا ۱۷) برای جلسه‌ای با مدت مشخص.',
        schema: z.object({ start: localTime, end: localTime, duration_minutes: z.number().int().min(5) }),
    }
);

const createEventTool = tool(
    run(
        async (input: {
            title: string;
            start: string;
            end: string;
            description?: string;
            location?: string;
            attendees: string[];
            with_online_meeting: boolean;
            calendar_id?: string;
        }) => {
            let meetingLink: string | undefined;
            if (input.with_online_meeting) {
                meetingLink = (await createTalkRoom(input.title)).link;
            }
            const event = await createEvent({
                title: input.title,
                start: input.start,
                end: input.end,
                location: meetingLink ?? input.location,
                description: [input.description, meetingLink && `لینک جلسه آنلاین: ${meetingLink}`]
                    .filter(Boolean)
                    .join('\n\n'),
                attendees: input.attendees,
                calendarId: input.calendar_id,
            });
            return { event: describeEvent(event), meetingLink, link: `${env.ncUrl}/apps/calendar` };
        }
    ),
    {
        name: 'create_event',
        description:
            'رزرو جلسه در تقویم Nextcloud. اگر with_online_meeting=true باشد یک اتاق Talk ساخته و لینکش در جلسه قرار می‌گیرد. شرکت‌کنندگان با ایمیل دعوت می‌شوند.',
        schema: z.object({
            title: z.string(),
            start: localTime,
            end: localTime,
            description: z.string().optional(),
            location: z.string().optional(),
            attendees: z.array(z.string()).default([]).describe('ایمیل شرکت‌کنندگان'),
            with_online_meeting: z.boolean().default(false),
            calendar_id: z.string().optional(),
        }),
    }
);

const deleteEventTool = tool(
    run(async ({ uid, calendar_id }: { uid: string; calendar_id?: string }) => {
        await deleteEvent(uid, calendar_id);
        return { uid };
    }),
    {
        name: 'delete_event',
        description: 'حذف یک جلسه از تقویم (uid و calendar را از list_events بگیر).',
        schema: z.object({ uid: z.string(), calendar_id: z.string().optional() }),
    }
);

// ---------------- talk ----------------

const createTalkRoomTool = tool(
    run(async ({ name, participants }: { name: string; participants: string[] }) => ({
        room: await createTalkRoom(name, participants),
    })),
    {
        name: 'create_talk_room',
        description: 'ساخت یک اتاق گفتگو/تماس تصویری Nextcloud Talk و گرفتن لینک آن.',
        schema: z.object({
            name: z.string(),
            participants: z.array(z.string()).default([]).describe('نام کاربری یا ایمیل'),
        }),
    }
);

const listTalkRoomsTool = tool(
    run(async () => ({ rooms: await listTalkRooms() })),
    { name: 'list_talk_rooms', description: 'فهرست گفتگوهای Talk کاربر.', schema: z.object({}) }
);

const sendTalkMessageTool = tool(
    run(async ({ token, message }: { token: string; message: string }) => {
        await sendTalkMessage(token, message);
        return { token };
    }),
    {
        name: 'send_talk_message',
        description: 'ارسال پیام در یک گفتگوی Talk (token را از list_talk_rooms بگیر).',
        schema: z.object({ token: z.string(), message: z.string() }),
    }
);

export const tools = [
    listFiles,
    searchFilesTool,
    readFileTool,
    writeFileTool,
    editFileTool,
    moveFileTool,
    shareFileTool,
    meetingMinutes,
    listCalendarsTool,
    listEventsTool,
    freeSlotsTool,
    createEventTool,
    deleteEventTool,
    createTalkRoomTool,
    listTalkRoomsTool,
    sendTalkMessageTool,
];
