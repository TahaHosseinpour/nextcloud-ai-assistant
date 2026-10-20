'use client';
import { TOOL_META } from '@/lib/tool-meta';
import { tryParseJson } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatItem, Decision, StreamEvent, Thread } from './types';

const STORAGE_KEY = 'nc-assistant-threads';
const uid = () => crypto.randomUUID();

function loadThreads(): Thread[] {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

export function useChat() {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    /** Bumped whenever the agent changed something in Nextcloud → panels refetch. */
    const [workspaceVersion, setWorkspaceVersion] = useState(0);
    const abortRef = useRef<AbortController | null>(null);
    const loaded = useRef(false);

    useEffect(() => {
        setThreads(loadThreads());
        loaded.current = true;
    }, []);

    useEffect(() => {
        if (!loaded.current) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
        } catch {
            /* storage full or blocked — chat still works in memory */
        }
    }, [threads]);

    const updateItems = useCallback((threadId: string, fn: (items: ChatItem[]) => ChatItem[]) => {
        setThreads(prev => prev.map(t => (t.id === threadId ? { ...t, items: fn(t.items) } : t)));
    }, []);

    const applyEvent = useCallback(
        (threadId: string, event: StreamEvent) => {
            switch (event.type) {
                case 'token':
                    updateItems(threadId, items => {
                        const last = items[items.length - 1];
                        if (last?.kind === 'assistant') {
                            return [...items.slice(0, -1), { ...last, text: last.text + event.text }];
                        }
                        return [...items, { kind: 'assistant', id: uid(), text: event.text }];
                    });
                    break;
                case 'tool_call':
                    updateItems(threadId, items =>
                        items.some(i => i.kind === 'tool' && i.id === event.id)
                            ? items
                            : [...items, { kind: 'tool', id: event.id, name: event.name, args: event.args, status: 'running' }]
                    );
                    break;
                case 'tool_result': {
                    const parsed = tryParseJson(event.content);
                    const ok = parsed ? parsed.ok !== false : false;
                    updateItems(threadId, items =>
                        items.map(i =>
                            i.kind === 'tool' && i.id === event.id
                                ? { ...i, status: ok ? 'done' : 'error', result: parsed ?? event.content }
                                : i
                        )
                    );
                    if (ok && TOOL_META[event.name]?.needsApproval) setWorkspaceVersion(v => v + 1);
                    break;
                }
                case 'interrupt':
                    updateItems(threadId, items => [
                        ...items,
                        { kind: 'approval', id: uid(), requests: event.actionRequests, status: 'pending' },
                    ]);
                    break;
                case 'error':
                    updateItems(threadId, items => [...items, { kind: 'error', id: uid(), text: event.message }]);
                    break;
            }
        },
        [updateItems]
    );

    const runStream = useCallback(
        async (threadId: string, body: { message?: string; decisions?: Decision[] }) => {
            const controller = new AbortController();
            abortRef.current = controller;
            setBusy(true);
            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ threadId, ...body }),
                    signal: controller.signal,
                });
                if (!res.ok || !res.body) throw new Error((await res.text()) || `خطای سرور (${res.status})`);
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';
                    for (const line of lines) {
                        const event = line.trim() && tryParseJson(line);
                        if (event) applyEvent(threadId, event);
                    }
                }
            } catch (err: any) {
                if (err?.name !== 'AbortError') applyEvent(threadId, { type: 'error', message: err.message });
            } finally {
                // Tools left "running" (stream cut or waiting on approval) should not spin forever.
                updateItems(threadId, items =>
                    items.map(i =>
                        i.kind === 'tool' && i.status === 'running' && !TOOL_META[i.name]?.needsApproval
                            ? { ...i, status: 'error', result: 'متوقف شد' }
                            : i
                    )
                );
                setBusy(false);
                abortRef.current = null;
            }
        },
        [applyEvent, updateItems]
    );

    const send = useCallback(
        (text: string) => {
            const message = text.trim();
            if (!message || busy) return;
            let threadId = activeId;
            if (!threadId) {
                threadId = uid();
                const thread: Thread = { id: threadId, title: message.slice(0, 48), createdAt: Date.now(), items: [] };
                setThreads(prev => [thread, ...prev]);
                setActiveId(threadId);
            }
            updateItems(threadId, items => [...items, { kind: 'user', id: uid(), text: message }]);
            void runStream(threadId, { message });
        },
        [activeId, busy, runStream, updateItems]
    );

    const decide = useCallback(
        (approvalId: string, decision: Decision) => {
            if (!activeId || busy) return;
            const thread = threads.find(t => t.id === activeId);
            const approval = thread?.items.find(i => i.id === approvalId);
            if (!approval || approval.kind !== 'approval') return;
            updateItems(activeId, items =>
                items.map(i =>
                    i.id === approvalId && i.kind === 'approval'
                        ? { ...i, status: decision.type === 'approve' ? 'approved' : 'rejected' }
                        : i
                )
            );
            void runStream(activeId, { decisions: approval.requests.map(() => decision) });
        },
        [activeId, busy, runStream, threads, updateItems]
    );

    return {
        threads,
        activeThread: threads.find(t => t.id === activeId) ?? null,
        activeId,
        busy,
        workspaceVersion,
        send,
        decide,
        stop: () => abortRef.current?.abort(),
        selectThread: (id: string | null) => !busy && setActiveId(id),
        deleteThread: (id: string) => {
            setThreads(prev => prev.filter(t => t.id !== id));
            if (id === activeId) setActiveId(null);
        },
        togglePin: (id: string) => setThreads(prev => prev.map(t => (t.id === id ? { ...t, pinned: !t.pinned } : t))),
    };
}
