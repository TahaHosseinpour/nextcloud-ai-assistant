/** Tool metadata shared by the server (approval list) and the UI (labels/icons). */

export type ToolIcon = 'folder' | 'file' | 'search' | 'edit' | 'calendar' | 'clock' | 'video' | 'message' | 'share' | 'notes';

export type ToolMeta = {
    label: string;
    icon: ToolIcon;
    /** Writes to Nextcloud → needs user approval before running. */
    needsApproval: boolean;
};

export const TOOL_META: Record<string, ToolMeta> = {
    list_files: { label: 'مرور پوشه', icon: 'folder', needsApproval: false },
    search_files: { label: 'جست‌وجوی فایل', icon: 'search', needsApproval: false },
    read_file: { label: 'خواندن فایل', icon: 'file', needsApproval: false },
    write_file: { label: 'نوشتن فایل', icon: 'edit', needsApproval: true },
    edit_file: { label: 'ویرایش فایل', icon: 'edit', needsApproval: true },
    move_file: { label: 'جابه‌جایی / تغییر نام', icon: 'folder', needsApproval: true },
    create_meeting_minutes: { label: 'ساخت صورت‌جلسه', icon: 'notes', needsApproval: true },
    share_file: { label: 'ساخت لینک اشتراک', icon: 'share', needsApproval: true },
    list_calendars: { label: 'فهرست تقویم‌ها', icon: 'calendar', needsApproval: false },
    list_events: { label: 'مشاهده جلسات', icon: 'calendar', needsApproval: false },
    find_free_slots: { label: 'یافتن زمان آزاد', icon: 'clock', needsApproval: false },
    create_event: { label: 'رزرو جلسه', icon: 'calendar', needsApproval: true },
    delete_event: { label: 'حذف جلسه', icon: 'calendar', needsApproval: true },
    create_talk_room: { label: 'ساخت اتاق میت (Talk)', icon: 'video', needsApproval: true },
    list_talk_rooms: { label: 'فهرست گفتگوهای Talk', icon: 'message', needsApproval: false },
    send_talk_message: { label: 'ارسال پیام در Talk', icon: 'message', needsApproval: true },
};

export const ARG_LABELS: Record<string, string> = {
    path: 'مسیر',
    from: 'از',
    to: 'به',
    query: 'عبارت',
    content: 'محتوا',
    old_text: 'متن فعلی',
    new_text: 'متن جدید',
    title: 'عنوان',
    start: 'شروع',
    end: 'پایان',
    date: 'تاریخ',
    attendees: 'شرکت‌کنندگان',
    participants: 'شرکت‌کنندگان',
    location: 'مکان',
    description: 'توضیحات',
    with_online_meeting: 'لینک میت',
    calendar_id: 'تقویم',
    name: 'نام',
    token: 'گفتگو',
    message: 'پیام',
    duration_minutes: 'مدت (دقیقه)',
    days: 'روز',
    agenda: 'دستور جلسه',
    decisions: 'تصمیم‌ها',
    action_items: 'اقدامات',
    notes: 'یادداشت‌ها',
    uid: 'شناسه',
};
