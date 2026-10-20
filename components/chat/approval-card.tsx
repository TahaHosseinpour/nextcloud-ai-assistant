'use client';
import { ToolIcon } from '@/components/tool-icon';
import { Button } from '@/components/ui/button';
import type { ChatItem, Decision } from '@/lib/chat/types';
import { ARG_LABELS, TOOL_META } from '@/lib/tool-meta';
import { cn } from '@/lib/utils';
import { IconCheck, IconShieldCheck, IconX } from '@tabler/icons-react';
import { useState } from 'react';

type ApprovalItem = Extract<ChatItem, { kind: 'approval' }>;

function formatValue(value: unknown): string {
    if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
    if (Array.isArray(value)) {
        return value.map(v => (typeof v === 'object' ? Object.values(v).filter(Boolean).join(' — ') : String(v))).join('\n');
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
        const [d, t] = value.split('T');
        return `${new Date(d + 'T00:00').toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })} ساعت ${t.slice(0, 5).replace(/\d/g, x => '۰۱۲۳۴۵۶۷۸۹'[+x])}`;
    }
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

const LONG_FIELDS = new Set(['content', 'old_text', 'new_text', 'notes', 'description', 'message']);

export function ApprovalCard({
    item,
    disabled,
    onDecide,
}: {
    item: ApprovalItem;
    disabled: boolean;
    onDecide: (decision: Decision) => void;
}) {
    const [reason, setReason] = useState('');
    const [rejecting, setRejecting] = useState(false);
    const pending = item.status === 'pending';

    return (
        <div
            className={cn(
                'w-full overflow-hidden rounded-xl border text-sm',
                pending ? 'border-brand/40 bg-brand/[0.04]' : 'border-border bg-background opacity-80'
            )}
        >
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                <IconShieldCheck size={16} className="text-brand" />
                <span className="font-semibold">
                    {pending ? 'این اقدام نیاز به تأیید شما دارد' : item.status === 'approved' ? 'تأیید شد' : 'رد شد'}
                </span>
            </div>

            <div className="flex flex-col gap-2 px-3 pb-3">
                {item.requests.map((req, idx) => {
                    const meta = TOOL_META[req.name];
                    const entries = Object.entries(req.args).filter(([, v]) => v !== undefined && v !== '' && !(Array.isArray(v) && !v.length));
                    return (
                        <div key={idx} className="bg-background shadow-subtle-xs rounded-lg p-3">
                            <div className="mb-2 flex items-center gap-2 font-medium">
                                <span className="bg-brand/10 text-brand flex size-6 items-center justify-center rounded-md">
                                    <ToolIcon name={meta?.icon} />
                                </span>
                                {meta?.label ?? req.name}
                            </div>
                            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                                {entries.map(([key, value]) => (
                                    <div key={key} className="contents">
                                        <dt className="text-muted-foreground pt-0.5">{ARG_LABELS[key] ?? key}</dt>
                                        <dd className="min-w-0">
                                            {LONG_FIELDS.has(key) ? (
                                                <pre
                                                    dir="auto"
                                                    className="bg-tertiary no-scrollbar max-h-48 overflow-auto rounded-md p-2 font-sans text-xs whitespace-pre-wrap"
                                                >
                                                    {String(value)}
                                                </pre>
                                            ) : (
                                                <span dir="auto" className="break-words whitespace-pre-line">
                                                    {formatValue(value)}
                                                </span>
                                            )}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    );
                })}

                {pending && rejecting && (
                    <input
                        autoFocus
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="دلیل رد یا تغییر مورد نظر (اختیاری)…"
                        className="bg-background border-border focus:border-hard rounded-lg border px-3 py-2 text-sm outline-none"
                        onKeyDown={e => {
                            if (e.key === 'Enter') onDecide({ type: 'reject', message: reason || undefined });
                        }}
                    />
                )}

                {pending && (
                    <div className="flex items-center gap-2">
                        <Button variant="brand" size="sm" disabled={disabled} onClick={() => onDecide({ type: 'approve' })}>
                            <IconCheck size={14} />
                            تأیید و اجرا
                        </Button>
                        {rejecting ? (
                            <Button
                                variant="bordered"
                                size="sm"
                                disabled={disabled}
                                onClick={() =>
                                    onDecide({
                                        type: 'reject',
                                        message: reason ? `کاربر رد کرد: ${reason}` : 'کاربر این اقدام را رد کرد.',
                                    })
                                }
                            >
                                <IconX size={14} />
                                ارسال رد
                            </Button>
                        ) : (
                            <Button variant="bordered" size="sm" disabled={disabled} onClick={() => setRejecting(true)}>
                                <IconX size={14} />
                                رد
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
