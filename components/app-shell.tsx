'use client';
import { ChatInput, type ChatInputHandle } from '@/components/chat/chat-input';
import { EmptyState, ThreadView } from '@/components/chat/thread-view';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { WorkspacePanel, type WorkspaceTab } from '@/components/workspace/workspace-panel';
import { useChat } from '@/lib/chat/use-chat';
import { IconLayoutSidebarLeftExpand, IconMenu2 } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';

export function AppShell() {
    const chat = useChat();
    const input = useRef<ChatInputHandle>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileSidebar, setMobileSidebar] = useState(false);
    const [panel, setPanel] = useState<WorkspaceTab | null>(null);

    const sidebar = (
        <Sidebar
            threads={chat.threads}
            activeId={chat.activeId}
            open={sidebarOpen || mobileSidebar}
            onToggle={() => (mobileSidebar ? setMobileSidebar(false) : setSidebarOpen(o => !o))}
            onSelect={id => {
                chat.selectThread(id);
                setMobileSidebar(false);
            }}
            onNew={() => {
                chat.selectThread(null);
                setMobileSidebar(false);
                input.current?.focus();
            }}
            onDelete={chat.deleteThread}
            onTogglePin={chat.togglePin}
        />
    );

    return (
        <div className="bg-tertiary flex h-[100dvh] w-full flex-row overflow-hidden">
            {/* Desktop sidebar (right side in RTL) */}
            <div className="hidden lg:flex">{sidebar}</div>

            {/* Mobile sidebar */}
            <AnimatePresence>
                {mobileSidebar && (
                    <>
                        <motion.div
                            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileSidebar(false)}
                        />
                        <motion.div
                            className="bg-tertiary fixed inset-y-0 right-0 z-40 lg:hidden"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        >
                            {sidebar}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main container */}
            <div className="flex flex-1 overflow-hidden lg:py-1 lg:pe-1">
                <div className="border-border bg-secondary relative flex h-full w-full flex-row overflow-hidden border shadow-sm lg:rounded-sm">
                    <div className="relative flex h-full w-0 flex-1 flex-col">
                        {/* top bar */}
                        <div className="from-secondary via-secondary/70 to-secondary/0 absolute inset-x-0 top-0 z-20 flex items-center gap-1 bg-gradient-to-b p-2 pb-8">
                            <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileSidebar(true)}>
                                <IconMenu2 size={18} />
                            </Button>
                            <span className="text-muted-foreground truncate px-2 text-sm font-medium">
                                {chat.activeThread?.title}
                            </span>
                            <span className="flex-1" />
                            {!panel && (
                                <Button variant="ghost" size="icon-sm" tooltip="فایل‌ها و تقویم" onClick={() => setPanel('files')}>
                                    <IconLayoutSidebarLeftExpand size={18} />
                                </Button>
                            )}
                        </div>

                        <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto">
                            {chat.activeThread && chat.activeThread.items.length > 0 ? (
                                <ThreadView thread={chat.activeThread} busy={chat.busy} onDecide={chat.decide} />
                            ) : (
                                <EmptyState onPick={text => chat.send(text)} />
                            )}
                        </div>

                        <div className="mx-auto w-full max-w-3xl px-3 pb-3">
                            <ChatInput
                                ref={input}
                                busy={chat.busy}
                                onSend={chat.send}
                                onStop={chat.stop}
                                onOpenPanel={setPanel}
                            />
                            <p className="text-muted-foreground/60 mt-1.5 text-center text-xs">
                                کارهایی که چیزی را در Nextcloud تغییر می‌دهند، پیش از اجرا از شما تأیید گرفته می‌شوند.
                            </p>
                        </div>
                    </div>

                    <AnimatePresence>
                        {panel && (
                            <WorkspacePanel
                                tab={panel}
                                onTab={setPanel}
                                onClose={() => setPanel(null)}
                                version={chat.workspaceVersion}
                                onAsk={text => input.current?.insert(text)}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
