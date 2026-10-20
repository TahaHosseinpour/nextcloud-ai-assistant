import { Command } from '@langchain/langgraph';
import { AIMessage, AIMessageChunk, ToolMessage } from '@langchain/core/messages';
import { getAgent } from '@/lib/agent/agent';
import type { Decision, StreamEvent } from '@/lib/chat/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = { threadId: string; message?: string; decisions?: Decision[] };

function textOf(content: unknown): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content.map(part => (typeof part === 'string' ? part : part?.type === 'text' ? part.text : '')).join('');
    }
    return '';
}

export async function POST(req: Request) {
    const body = (await req.json()) as Body;
    if (!body.threadId || (!body.message && !body.decisions)) {
        return Response.json({ error: 'threadId و message یا decisions لازم است.' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: StreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
            try {
                const agent = getAgent();
                const input = body.decisions
                    ? new Command({ resume: { decisions: body.decisions } })
                    : { messages: [{ role: 'user', content: body.message! }] };

                const events = await agent.stream(input as any, {
                    configurable: { thread_id: body.threadId },
                    streamMode: ['updates', 'messages'],
                    recursionLimit: 40,
                    signal: req.signal,
                });

                for await (const [mode, chunk] of events as AsyncIterable<[string, any]>) {
                    if (mode === 'messages') {
                        const [msg] = chunk;
                        if (AIMessageChunk.isInstance(msg)) {
                            const text = textOf(msg.content);
                            if (text) send({ type: 'token', text });
                        }
                        continue;
                    }
                    // mode === 'updates': { [node]: stateUpdate }
                    for (const [node, update] of Object.entries<any>(chunk)) {
                        if (node === '__interrupt__') {
                            for (const intr of update ?? []) {
                                send({ type: 'interrupt', actionRequests: intr.value?.actionRequests ?? [] });
                            }
                            continue;
                        }
                        for (const msg of update?.messages ?? []) {
                            if (AIMessage.isInstance(msg) && msg.tool_calls?.length) {
                                for (const call of msg.tool_calls) {
                                    send({ type: 'tool_call', id: call.id ?? call.name, name: call.name, args: call.args });
                                }
                            } else if (ToolMessage.isInstance(msg)) {
                                send({
                                    type: 'tool_result',
                                    id: msg.tool_call_id,
                                    name: msg.name ?? '',
                                    content: textOf(msg.content),
                                });
                            }
                        }
                    }
                }
                send({ type: 'done' });
            } catch (err: any) {
                if (!req.signal.aborted) send({ type: 'error', message: err?.message ?? String(err) });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
}
