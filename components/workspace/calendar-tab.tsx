'use client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { IconExternalLink, IconMapPin, IconRefresh, IconUsers, IconVideo } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';

type Event = {
    uid: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    location?: string;
    attendees: string[];
};

const RANGES = [
    { days: 1, label: 'امروز' },
    { days: 7, label: '۷ روز' },
    { days: 30, label: '۳۰ روز' },
];

export function CalendarTab({ version, onAsk }: { version: number; onAsk: (text: string) => void }) {
    const [days, setDays] = useState(7);
    const [events, setEvents] = useState<Event[]>([]);
    const [tz, setTz] = useState<string>();
    const [link, setLink] = useState<string>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/calendar?days=${days}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setEvents(data.events);
            setTz(data.timezone);
            setLink(data.link);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        void load();
    }, [load, version]);

    const dayKey = (iso: string) =>
        new Intl.DateTimeFormat('fa-IR', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
    const time = (iso: string) =>
        new Intl.DateTimeFormat('fa-IR', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

    const groups = events.reduce<Record<string, Event[]>>((acc, e) => {
        (acc[dayKey(e.start)] ??= []).push(e);
        return acc;
    }, {});

    return (
        <div className="flex h-full flex-col">
            <div className="border-border flex items-center gap-1 border-b px-2 py-1.5">
                {RANGES.map(r => (
                    <Button
                        key={r.days}
                        size="xs"
                        variant={days === r.days ? 'bordered' : 'ghost'}
                        onClick={() => setDays(r.days)}
                    >
                        {r.label}
                    </Button>
                ))}
                <span className="flex-1" />
                {link && (
                    <a href={link} target="_blank" rel="noreferrer" title="باز کردن تقویم Nextcloud">
                        <Button variant="ghost" size="icon-xs">
                            <IconExternalLink size={14} />
                        </Button>
                    </a>
                )}
                <Button variant="ghost" size="icon-xs" tooltip="بارگذاری دوباره" onClick={load}>
                    <IconRefresh size={14} className={cn(loading && 'animate-spin')} />
                </Button>
            </div>

            <div className="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto p-3">
                {error && <p className="text-destructive text-xs">{error}</p>}
                {!error && !loading && events.length === 0 && (
                    <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-xs">
                        جلسه‌ای در این بازه ندارید.
                        <Button variant="bordered" size="xs" onClick={() => onAsk('یک جلسه برای ')}>
                            رزرو جلسه با دستیار
                        </Button>
                    </div>
                )}
                {Object.entries(groups).map(([day, list]) => (
                    <div key={day} className="flex flex-col gap-1.5">
                        <div className="text-muted-foreground text-xs font-medium">{day}</div>
                        {list.map(e => {
                            const isOnline = e.location?.includes('/call/');
                            return (
                                <div
                                    key={e.uid + e.start}
                                    className="bg-background shadow-subtle-xs flex gap-3 rounded-lg p-2.5 text-sm"
                                >
                                    <div className="bg-brand w-1 shrink-0 rounded-full" />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-medium" dir="auto">
                                            {e.title}
                                        </div>
                                        <div className="text-muted-foreground text-xs">
                                            {e.allDay ? 'تمام روز' : `${time(e.start)} تا ${time(e.end)}`}
                                        </div>
                                        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                            {e.location &&
                                                (isOnline ? (
                                                    <a
                                                        href={e.location}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-brand inline-flex items-center gap-1 hover:underline"
                                                    >
                                                        <IconVideo size={12} />
                                                        ورود به میت
                                                    </a>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1" dir="auto">
                                                        <IconMapPin size={12} />
                                                        {e.location}
                                                    </span>
                                                ))}
                                            {e.attendees.length > 0 && (
                                                <span className="inline-flex items-center gap-1">
                                                    <IconUsers size={12} />
                                                    {e.attendees.length.toLocaleString('fa-IR')} نفر
                                                </span>
                                            )}
                                            <button
                                                className="hover:text-foreground"
                                                onClick={() => onAsk(`برای جلسه «${e.title}» (${day} ${time(e.start)}) صورت‌جلسه بساز`)}
                                            >
                                                صورت‌جلسه
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
