'use client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { IconCalendarEvent, IconFolder, IconX } from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { CalendarTab } from './calendar-tab';
import { FilesTab } from './files-tab';

export type WorkspaceTab = 'files' | 'calendar';

/** Side drawer at the end (left in RTL) of the main container — same treatment as llmchat's SideDrawer. */
export function WorkspacePanel({
    tab,
    onTab,
    onClose,
    version,
    onAsk,
}: {
    tab: WorkspaceTab;
    onTab: (tab: WorkspaceTab) => void;
    onClose: () => void;
    version: number;
    onAsk: (text: string) => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-0 z-50 flex shrink-0 flex-col p-1.5 md:static md:w-[420px] md:ps-0.5"
        >
            <div className="bg-background border-border shadow-subtle-xs flex h-full w-full flex-col overflow-hidden rounded-lg border">
                <div className="border-border flex items-center gap-1 border-b py-1.5 ps-2 pe-2">
                    {(
                        [
                            { id: 'files', label: 'فایل‌ها', icon: IconFolder },
                            { id: 'calendar', label: 'تقویم', icon: IconCalendarEvent },
                        ] as const
                    ).map(t => (
                        <button
                            key={t.id}
                            onClick={() => onTab(t.id)}
                            className={cn(
                                'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors',
                                tab === t.id ? 'bg-tertiary text-foreground' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <t.icon size={14} />
                            {t.label}
                        </button>
                    ))}
                    <span className="flex-1" />
                    <Button variant="secondary" size="icon-xs" tooltip="بستن" onClick={onClose}>
                        <IconX size={14} />
                    </Button>
                </div>
                <div className="min-h-0 flex-1">
                    {tab === 'files' ? (
                        <FilesTab version={version} onAsk={onAsk} />
                    ) : (
                        <CalendarTab version={version} onAsk={onAsk} />
                    )}
                </div>
            </div>
        </motion.div>
    );
}
