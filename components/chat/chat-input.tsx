'use client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { IconArrowUp, IconCalendarEvent, IconFolder, IconPlayerStopFilled } from '@tabler/icons-react';
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';

export type ChatInputHandle = { insert: (text: string) => void; focus: () => void };

export const ChatInput = forwardRef<
    ChatInputHandle,
    {
        busy: boolean;
        onSend: (text: string) => void;
        onStop: () => void;
        onOpenPanel: (tab: 'files' | 'calendar') => void;
    }
>(({ busy, onSend, onStop, onOpenPanel }, ref) => {
    const [value, setValue] = useState('');
    const textarea = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
        insert: text => {
            setValue(v => (v ? `${v} ${text}` : text));
            textarea.current?.focus();
        },
        focus: () => textarea.current?.focus(),
    }));

    useLayoutEffect(() => {
        const el = textarea.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 220) + 'px';
    }, [value]);

    const submit = () => {
        if (!value.trim() || busy) return;
        onSend(value);
        setValue('');
    };

    return (
        <div className="bg-background border-hard/50 shadow-subtle-sm w-full overflow-hidden rounded-xl border">
            <textarea
                ref={textarea}
                value={value}
                rows={1}
                autoFocus
                placeholder="هر کاری در Nextcloud دارید بپرسید… مثلاً «فردا ساعت ۱۰ جلسه با لینک میت بگذار»"
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        submit();
                    }
                }}
                className="placeholder:text-muted-foreground/60 block max-h-[220px] min-h-[52px] w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-base outline-none"
            />
            <div className="border-border flex items-center gap-1 border-t border-dashed px-2 py-2">
                <Button variant="ghost" size="xs" onClick={() => onOpenPanel('files')}>
                    <IconFolder size={14} />
                    فایل‌ها
                </Button>
                <Button variant="ghost" size="xs" onClick={() => onOpenPanel('calendar')}>
                    <IconCalendarEvent size={14} />
                    تقویم
                </Button>
                <span className="flex-1" />
                <span className="text-muted-foreground/60 hidden text-xs sm:inline">Shift+Enter برای خط جدید</span>
                {busy ? (
                    <Button variant="default" size="icon-sm" tooltip="توقف" onClick={onStop}>
                        <IconPlayerStopFilled size={14} />
                    </Button>
                ) : (
                    <Button
                        variant={value.trim() ? 'default' : 'secondary'}
                        size="icon-sm"
                        tooltip="ارسال"
                        disabled={!value.trim()}
                        onClick={submit}
                        className={cn('rounded-full')}
                    >
                        <IconArrowUp size={16} strokeWidth={2.5} />
                    </Button>
                )}
            </div>
        </div>
    );
});
ChatInput.displayName = 'ChatInput';
