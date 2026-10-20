'use client';
import type { ChatItem, Decision, Thread } from '@/lib/chat/types';
import { TOOL_META } from '@/lib/tool-meta';
import { IconAlertTriangle, IconCalendarPlus, IconFileText, IconFolderSearch, IconVideo } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ApprovalCard } from './approval-card';
import { ToolCard } from './tool-card';

const EXAMPLES = [
    { icon: IconCalendarPlus, text: 'فردا ساعت ۱۰ صبح یک جلسه ۴۵ دقیقه‌ای «بررسی اسپرینت» با لینک میت رزرو کن' },
    { icon: IconFileText, text: 'برای جلسه امروز صورت‌جلسه بساز؛ حاضران: علی و سارا، تصمیم: انتشار نسخه ۲ در هفته بعد' },
    { icon: IconFolderSearch, text: 'جلسات این هفته من چیست و کدام ساعت‌ها خالی‌ام؟' },
    { icon: IconVideo, text: 'یک اتاق Talk برای تیم طراحی بساز و لینکش را بده' },
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-8">
            <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="from-muted-foreground/60 via-muted-foreground/40 to-muted-foreground/20 bg-gradient-to-l bg-clip-text text-center text-[30px] font-semibold tracking-tight text-transparent"
            >
                امروز در Nextcloud چه کاری انجام بدهم؟
            </motion.h1>
            <div className="grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                {EXAMPLES.map(({ icon: Icon, text }, i) => (
                    <motion.button
                        key={text}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * (i + 1) }}
                        onClick={() => onPick(text)}
                        className="bg-background shadow-subtle-xs hover:shadow-subtle-sm text-muted-foreground hover:text-foreground flex items-start gap-2 rounded-xl p-3 text-right text-sm transition-all"
                    >
                        <Icon size={16} className="text-brand mt-0.5 shrink-0" />
                        {text}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

function Markdown({ text }: { text: string }) {
    return (
        <div className="prose prose-sm prose-chat dark:prose-invert max-w-none text-base leading-7" dir="auto">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{ a: props => <a {...props} target="_blank" rel="noreferrer" /> }}
            >
                {text}
            </ReactMarkdown>
        </div>
    );
}

export function ThreadView({
    thread,
    busy,
    onDecide,
}: {
    thread: Thread;
    busy: boolean;
    onDecide: (approvalId: string, decision: Decision) => void;
}) {
    const bottom = useRef<HTMLDivElement>(null);
    const items = thread.items;
    const last = items[items.length - 1];
    const hasPendingApproval = items.some(i => i.kind === 'approval' && i.status === 'pending');

    useEffect(() => {
        bottom.current?.scrollIntoView({ block: 'end' });
    }, [items]);

    const render = (item: ChatItem) => {
        switch (item.kind) {
            case 'user':
                return (
                    <div className="flex justify-start">
                        <div
                            dir="auto"
                            className="bg-tertiary text-foreground max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-base whitespace-pre-wrap"
                        >
                            {item.text}
                        </div>
                    </div>
                );
            case 'assistant':
                return <Markdown text={item.text} />;
            case 'tool':
                return (
                    <ToolCard
                        item={item}
                        waitingApproval={Boolean(TOOL_META[item.name]?.needsApproval) && !busy}
                    />
                );
            case 'approval':
                return <ApprovalCard item={item} disabled={busy} onDecide={d => onDecide(item.id, d)} />;
            case 'error':
                return (
                    <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 rounded-lg border p-3 text-sm">
                        <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span dir="auto" className="break-words">{item.text}</span>
                    </div>
                );
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 pt-16 pb-6">
            {items.map(item => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                    {render(item)}
                </motion.div>
            ))}
            {busy && last?.kind !== 'assistant' && !hasPendingApproval && (
                <span className="text-shimmer text-sm font-medium">در حال فکر کردن…</span>
            )}
            <div ref={bottom} />
        </div>
    );
}
