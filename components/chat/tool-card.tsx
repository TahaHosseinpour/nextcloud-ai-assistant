'use client';
import { ToolIcon } from '@/components/tool-icon';
import type { ChatItem } from '@/lib/chat/types';
import { TOOL_META } from '@/lib/tool-meta';
import { cn, faNum } from '@/lib/utils';
import { IconAlertTriangle, IconCheck, IconChevronDown, IconExternalLink, IconLoader2 } from '@tabler/icons-react';
import { useState } from 'react';

type ToolItem = Extract<ChatItem, { kind: 'tool' }>;

/** One-line headline for the most relevant argument of a tool call. */
function subject(args: Record<string, any>) {
    return args.title ?? args.path ?? args.query ?? args.name ?? (args.from ? `${args.from} ← ${args.to}` : undefined);
}

function summary(item: ToolItem): string | undefined {
    const r = item.result;
    if (!r || typeof r !== 'object') return typeof r === 'string' ? r : undefined;
    if (r.ok === false) return r.error;
    if (r.entries) return `${faNum(r.entries.length)} مورد`;
    if (r.results) return `${faNum(r.results.length)} نتیجه`;
    if (r.events) return `${faNum(r.events.length)} جلسه`;
    if (r.slots) return `${faNum(r.slots.length)} بازه آزاد`;
    if (r.calendars) return `${faNum(r.calendars.length)} تقویم`;
    if (r.rooms) return `${faNum(r.rooms.length)} گفتگو`;
    if (r.event) return r.event.when;
    if (r.room) return 'اتاق ساخته شد';
    if (r.url) return 'لینک ساخته شد';
    if (r.content !== undefined) return `${faNum(r.content.length)} نویسه`;
    if (r.path) return r.created ? 'ساخته شد' : 'ذخیره شد';
}

function links(item: ToolItem): { label: string; href: string }[] {
    const r = item.result;
    if (!r || typeof r !== 'object' || r.ok === false) return [];
    const out: { label: string; href: string }[] = [];
    if (r.meetingLink) out.push({ label: 'لینک میت', href: r.meetingLink });
    if (r.room?.link) out.push({ label: 'ورود به تماس', href: r.room.link });
    if (r.url) out.push({ label: 'لینک اشتراک', href: r.url });
    if (r.link) out.push({ label: 'باز کردن در Nextcloud', href: r.link });
    return out;
}

export function ToolCard({ item, waitingApproval }: { item: ToolItem; waitingApproval: boolean }) {
    const [open, setOpen] = useState(false);
    const meta = TOOL_META[item.name];
    const sub = subject(item.args);
    const result = summary(item);

    return (
        <div className="border-border bg-background shadow-subtle-xs w-full overflow-hidden rounded-lg border text-sm dark:border">
            <button className="flex w-full items-center gap-2 px-3 py-2 text-right" onClick={() => setOpen(o => !o)}>
                <span
                    className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-md',
                        item.status === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-brand/10 text-brand'
                    )}
                >
                    <ToolIcon name={meta?.icon} />
                </span>
                <span className="text-foreground font-medium">{meta?.label ?? item.name}</span>
                {sub && (
                    <span className="text-muted-foreground min-w-0 truncate text-xs" dir="auto">
                        {String(sub)}
                    </span>
                )}
                <span className="flex-1" />
                {item.status === 'running' ? (
                    waitingApproval ? (
                        <span className="text-xs text-amber-600 dark:text-amber-400">در انتظار تأیید</span>
                    ) : (
                        <IconLoader2 size={14} className="text-muted-foreground animate-spin" />
                    )
                ) : item.status === 'done' ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <IconCheck size={14} />
                        {result}
                    </span>
                ) : (
                    <span className="text-destructive flex items-center gap-1 text-xs">
                        <IconAlertTriangle size={14} />
                        خطا
                    </span>
                )}
                <IconChevronDown size={14} className={cn('text-muted-foreground transition-transform', open && 'rotate-180')} />
            </button>

            {links(item).length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                    {links(item).map(l => (
                        <a
                            key={l.href + l.label}
                            href={l.href}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-tertiary text-foreground hover:bg-quaternary inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
                        >
                            <IconExternalLink size={12} />
                            {l.label}
                        </a>
                    ))}
                </div>
            )}

            {item.status === 'error' && result && !open && (
                <p className="text-destructive px-3 pb-2 text-xs">{result}</p>
            )}

            {open && (
                <div className="border-border bg-secondary border-t border-dashed px-3 py-2">
                    <pre dir="ltr" className="no-scrollbar max-h-64 overflow-auto text-left font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify({ args: item.args, result: item.result }, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
