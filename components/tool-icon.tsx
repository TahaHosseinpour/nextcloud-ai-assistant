import type { ToolIcon as ToolIconName } from '@/lib/tool-meta';
import {
    IconCalendarEvent,
    IconClockSearch,
    IconEdit,
    IconFile,
    IconFileText,
    IconFolder,
    IconMessageCircle,
    IconSearch,
    IconShare,
    IconTool,
    IconVideo,
} from '@tabler/icons-react';

const MAP = {
    folder: IconFolder,
    file: IconFile,
    search: IconSearch,
    edit: IconEdit,
    calendar: IconCalendarEvent,
    clock: IconClockSearch,
    video: IconVideo,
    message: IconMessageCircle,
    share: IconShare,
    notes: IconFileText,
} as const;

export function ToolIcon({ name, size = 14 }: { name?: ToolIconName; size?: number }) {
    const Icon = name ? MAP[name] : IconTool;
    return <Icon size={size} strokeWidth={2} />;
}
