'use client';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import type { Thread } from '@/lib/chat/types';
import { cn } from '@/lib/utils';
import {
    IconArrowBarLeft,
    IconArrowBarRight,
    IconMoon,
    IconPinned,
    IconPinnedOff,
    IconPlus,
    IconSun,
    IconTrash,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';

type Status = { ok: boolean; user?: string; server?: string; model?: string; message?: string } | null;

const DAY = 86_400_000;

function groupThreads(threads: Thread[]) {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const groups: { title: string; items: Thread[] }[] = [
        { title: 'پین‌شده', items: [] },
        { title: 'امروز', items: [] },
        { title: 'دیروز', items: [] },
        { title: '۷ روز گذشته', items: [] },
        { title: 'قدیمی‌تر', items: [] },
    ];
    for (const t of [...threads].sort((a, b) => b.createdAt - a.createdAt)) {
        if (t.pinned) groups[0].items.push(t);
        else if (t.createdAt >= startOfToday) groups[1].items.push(t);
        else if (t.createdAt >= startOfToday - DAY) groups[2].items.push(t);
        else if (t.createdAt >= startOfToday - 7 * DAY) groups[3].items.push(t);
        else groups[4].items.push(t);
    }
    return groups.filter(g => g.items.length);
}

export function Sidebar({
    threads,
    activeId,
    open,
    onToggle,
    onSelect,
    onNew,
    onDelete,
    onTogglePin,
}: {
    threads: Thread[];
    activeId: string | null;
    open: boolean;
    onToggle: () => void;
    onSelect: (id: string) => void;
    onNew: () => void;
    onDelete: (id: string) => void;
    onTogglePin: (id: string) => void;
}) {
    const [status, setStatus] = useState<Status>(null);
    const [dark, setDark] = useState(false);

    useEffect(() => {
        setDark(document.documentElement.classList.contains('dark'));
        fetch('/api/status')
            .then(r => r.json())
            .then(setStatus)
            .catch(() => setStatus({ ok: false, message: 'سرور در دسترس نیست' }));
    }, []);

    const toggleTheme = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
        try {
            localStorage.setItem('theme', next ? 'dark' : 'light');
        } catch {}
    };

    return (
        <aside
            className={cn(
                'relative flex h-[100dvh] shrink-0 flex-col py-2 transition-all duration-200',
                open ? 'w-[240px]' : 'w-[52px]'
            )}
        >
            {/* header */}
            <div className={cn('mb-3 flex items-center justify-between px-3', !open && 'flex-col gap-2 px-0')}>
                <button onClick={onNew} className="flex h-8 items-center gap-1.5">
                    <Logo className="text-brand size-6" />
                    {open && <span className="text-foreground text-lg font-bold">دستیار نکست‌کلاد</span>}
                </button>
                <Button variant="ghost" size="icon-sm" tooltip={open ? 'بستن نوار کناری' : 'باز کردن'} onClick={onToggle}>
                    {open ? <IconArrowBarRight size={16} /> : <IconArrowBarLeft size={16} />}
                </Button>
            </div>

            <div className={cn('px-3', !open && 'flex justify-center px-0')}>
                <Button
                    variant="bordered"
                    size={open ? 'sm' : 'icon-sm'}
                    className={cn(open && 'w-full')}
                    tooltip="گفتگوی جدید"
                    onClick={onNew}
                >
                    <IconPlus size={16} strokeWidth={2} />
                    {open && 'گفتگوی جدید'}
                </Button>
            </div>

            {/* history */}
            {open && (
                <div className="no-scrollbar mt-4 flex flex-1 flex-col gap-3 overflow-y-auto px-3">
                    {threads.length === 0 && (
                        <p className="text-muted-foreground/70 px-2 text-xs">هنوز گفتگویی ندارید.</p>
                    )}
                    {groupThreads(threads).map(group => (
                        <div key={group.title} className="flex flex-col gap-0.5">
                            <div className="text-muted-foreground/70 flex items-center gap-1 px-2 py-1 text-xs font-medium">
                                {group.title === 'پین‌شده' && <IconPinned size={12} />}
                                {group.title}
                            </div>
                            {group.items.map(t => (
                                <div
                                    key={t.id}
                                    className={cn(
                                        'group flex h-8 items-center gap-1 rounded-lg px-2 text-sm transition-colors',
                                        t.id === activeId
                                            ? 'bg-background shadow-subtle-xs text-foreground'
                                            : 'text-muted-foreground hover:bg-quaternary/60 hover:text-foreground'
                                    )}
                                >
                                    <button className="min-w-0 flex-1 truncate text-right" onClick={() => onSelect(t.id)}>
                                        {t.title}
                                    </button>
                                    <div className="hidden items-center group-hover:flex">
                                        <Button
                                            variant="ghost"
                                            size="icon-xs"
                                            tooltip={t.pinned ? 'برداشتن پین' : 'پین کردن'}
                                            onClick={() => onTogglePin(t.id)}
                                        >
                                            {t.pinned ? <IconPinnedOff size={13} /> : <IconPinned size={13} />}
                                        </Button>
                                        <Button variant="ghost" size="icon-xs" tooltip="حذف" onClick={() => onDelete(t.id)}>
                                            <IconTrash size={13} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
            {!open && <div className="flex-1" />}

            {/* footer */}
            <div className={cn('mt-2 flex flex-col gap-2 px-3', !open && 'items-center px-0')}>
                {open && (
                    <div
                        className="bg-background shadow-subtle-xs flex items-start gap-2 rounded-lg p-2 text-xs"
                        title={status?.message}
                    >
                        <span
                            className={cn(
                                'mt-1.5 size-2 shrink-0 rounded-full',
                                status === null ? 'bg-muted animate-pulse' : status.ok ? 'bg-emerald-500' : 'bg-destructive'
                            )}
                        />
                        <div className="min-w-0 flex-1">
                            <div className="text-foreground font-medium">
                                {status === null ? 'در حال بررسی اتصال…' : status.ok ? 'متصل به Nextcloud' : 'اتصال برقرار نیست'}
                            </div>
                            <div className="text-muted-foreground truncate" dir={status?.ok ? 'ltr' : undefined}>
                                {status?.ok ? `${status.user} · ${status.model}` : status?.message}
                            </div>
                        </div>
                    </div>
                )}
                <Button variant="ghost" size={open ? 'sm' : 'icon-sm'} className={cn(open && 'justify-start')} onClick={toggleTheme} tooltip="تغییر پوسته">
                    {dark ? <IconSun size={16} /> : <IconMoon size={16} />}
                    {open && (dark ? 'حالت روشن' : 'حالت تاریک')}
                </Button>
            </div>
        </aside>
    );
}
