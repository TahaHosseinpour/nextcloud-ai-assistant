'use client';
import { Button } from '@/components/ui/button';
import { cn, formatSize } from '@/lib/utils';
import {
    IconArrowRight,
    IconChevronLeft,
    IconDeviceFloppy,
    IconExternalLink,
    IconFile,
    IconFileText,
    IconFolderFilled,
    IconHome,
    IconMessagePlus,
    IconRefresh,
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';

type Entry = { name: string; path: string; isFolder: boolean; size: number; modified?: string };
type OpenFile = { path: string; content: string; etag?: string; link?: string; draft: string };

const TEXT_EXT = /\.(md|markdown|txt|csv|json|ya?ml|xml|html?|ics|log|ini|conf)$/i;

export function FilesTab({ version, onAsk }: { version: number; onAsk: (text: string) => void }) {
    const [path, setPath] = useState('/');
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<OpenFile | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async (target: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/files?path=${encodeURIComponent(target)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setEntries(data.entries);
        } catch (err: any) {
            setError(err.message);
            setEntries([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load(path);
    }, [path, version, load]);

    const openFile = async (entry: Entry) => {
        if (!TEXT_EXT.test(entry.name)) {
            onAsk(`فایل «${entry.path}»`);
            return;
        }
        setError(null);
        const res = await fetch(`/api/files?file=${encodeURIComponent(entry.path)}`);
        const data = await res.json();
        if (!res.ok) return setError(data.error);
        setFile({ ...data, draft: data.content });
    };

    const save = async () => {
        if (!file) return;
        setSaving(true);
        try {
            const res = await fetch('/api/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: file.path, content: file.draft, etag: file.etag }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setFile({ ...file, content: file.draft, etag: data.etag });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (file) {
        const dirty = file.draft !== file.content;
        return (
            <div className="flex h-full flex-col">
                <div className="border-border flex items-center gap-1 border-b px-2 py-1.5">
                    <Button variant="ghost" size="icon-xs" tooltip="بازگشت" onClick={() => setFile(null)}>
                        <IconArrowRight size={14} />
                    </Button>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium" dir="ltr" style={{ textAlign: 'right' }}>
                        {file.path}
                    </span>
                    <Button variant="ghost" size="icon-xs" tooltip="از دستیار بپرس" onClick={() => onAsk(`فایل «${file.path}» را `)}>
                        <IconMessagePlus size={14} />
                    </Button>
                    {file.link && (
                        <a href={file.link} target="_blank" rel="noreferrer" title="باز کردن در Nextcloud">
                            <Button variant="ghost" size="icon-xs">
                                <IconExternalLink size={14} />
                            </Button>
                        </a>
                    )}
                    <Button variant={dirty ? 'brand' : 'secondary'} size="xs" disabled={!dirty || saving} onClick={save}>
                        <IconDeviceFloppy size={14} />
                        {saving ? 'در حال ذخیره…' : 'ذخیره'}
                    </Button>
                </div>
                {error && <p className="text-destructive px-3 py-2 text-xs">{error}</p>}
                <textarea
                    value={file.draft}
                    onChange={e => setFile({ ...file, draft: e.target.value })}
                    dir="auto"
                    spellCheck={false}
                    className="flex-1 resize-none bg-transparent p-3 font-mono text-[13px] leading-6 outline-none"
                />
            </div>
        );
    }

    const crumbs = path.split('/').filter(Boolean);

    return (
        <div className="flex h-full flex-col">
            <div className="border-border flex items-center gap-1 border-b px-2 py-1.5 text-xs">
                <Button variant="ghost" size="icon-xs" tooltip="ریشه" onClick={() => setPath('/')}>
                    <IconHome size={14} />
                </Button>
                <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
                    {crumbs.map((c, i) => (
                        <span key={i} className="flex items-center gap-0.5">
                            <IconChevronLeft size={12} className="text-muted-foreground shrink-0" />
                            <button
                                className="hover:text-foreground text-muted-foreground whitespace-nowrap"
                                onClick={() => setPath('/' + crumbs.slice(0, i + 1).join('/'))}
                            >
                                {c}
                            </button>
                        </span>
                    ))}
                </div>
                <Button variant="ghost" size="icon-xs" tooltip="بارگذاری دوباره" onClick={() => load(path)}>
                    <IconRefresh size={14} className={cn(loading && 'animate-spin')} />
                </Button>
            </div>

            <div className="no-scrollbar flex-1 overflow-y-auto p-1.5">
                {error && <p className="text-destructive p-2 text-xs">{error}</p>}
                {!error && !loading && entries.length === 0 && (
                    <p className="text-muted-foreground p-3 text-center text-xs">این پوشه خالی است.</p>
                )}
                {entries.map(e => (
                    <button
                        key={e.path}
                        onClick={() => (e.isFolder ? setPath(e.path) : openFile(e))}
                        className="hover:bg-tertiary group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-right text-sm"
                    >
                        {e.isFolder ? (
                            <IconFolderFilled size={16} className="text-brand/80 shrink-0" />
                        ) : TEXT_EXT.test(e.name) ? (
                            <IconFileText size={16} className="text-muted-foreground shrink-0" />
                        ) : (
                            <IconFile size={16} className="text-muted-foreground shrink-0" />
                        )}
                        <span className="min-w-0 flex-1 truncate" dir="auto">
                            {e.name}
                        </span>
                        {!e.isFolder && <span className="text-muted-foreground/70 text-xs">{formatSize(e.size)}</span>}
                    </button>
                ))}
            </div>
        </div>
    );
}
