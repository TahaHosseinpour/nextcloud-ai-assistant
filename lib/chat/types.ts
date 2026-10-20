/** Wire format of /api/chat (newline-delimited JSON) and the client-side thread model. */

export type ActionRequest = { name: string; args: Record<string, any>; description?: string };

export type StreamEvent =
    | { type: 'token'; text: string }
    | { type: 'tool_call'; id: string; name: string; args: Record<string, any> }
    | { type: 'tool_result'; id: string; name: string; content: string }
    | { type: 'interrupt'; actionRequests: ActionRequest[] }
    | { type: 'error'; message: string }
    | { type: 'done' };

export type Decision = { type: 'approve' } | { type: 'reject'; message?: string };

export type ChatItem =
    | { kind: 'user'; id: string; text: string }
    | { kind: 'assistant'; id: string; text: string }
    | {
          kind: 'tool';
          id: string;
          name: string;
          args: Record<string, any>;
          status: 'running' | 'done' | 'error';
          result?: any;
      }
    | {
          kind: 'approval';
          id: string;
          requests: ActionRequest[];
          status: 'pending' | 'approved' | 'rejected';
      }
    | { kind: 'error'; id: string; text: string };

export type Thread = {
    id: string;
    title: string;
    createdAt: number;
    pinned?: boolean;
    items: ChatItem[];
};
