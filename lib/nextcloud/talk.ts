import 'server-only';
import { env } from '../env';
import { normalizePath, ocs } from './client';

const TALK = '/ocs/v2.php/apps/spreed/api/v4';

export type TalkRoom = { token: string; name: string; link: string };

/** Create a public Talk conversation (works as a meeting link for guests too). */
export async function createTalkRoom(name: string, participants: string[] = []): Promise<TalkRoom> {
    const room = await ocs<{ token: string; displayName?: string; name?: string }>(`${TALK}/room`, 'POST', {
        roomType: 3, // public
        roomName: name,
    });
    for (const p of participants) {
        const isEmail = p.includes('@');
        await ocs(`${TALK}/room/${room.token}/participants`, 'POST', {
            newParticipant: p,
            source: isEmail ? 'emails' : 'users',
        }).catch(() => undefined); // a missing user should not fail the whole meeting
    }
    return { token: room.token, name: room.displayName || room.name || name, link: `${env.ncUrl}/call/${room.token}` };
}

export async function listTalkRooms(): Promise<TalkRoom[]> {
    const rooms = await ocs<any[]>(`${TALK}/room`);
    return (rooms ?? []).map(r => ({
        token: r.token,
        name: r.displayName || r.name,
        link: `${env.ncUrl}/call/${r.token}`,
    }));
}

export async function sendTalkMessage(token: string, message: string): Promise<void> {
    await ocs(`/ocs/v2.php/apps/spreed/api/v1/chat/${encodeURIComponent(token)}`, 'POST', { message });
}

/** Public share link for a file or folder (read-only). */
export async function createShareLink(path: string): Promise<{ url: string }> {
    const share = await ocs<{ url: string }>('/ocs/v2.php/apps/files_sharing/api/v1/shares', 'POST', {
        path: normalizePath(path),
        shareType: 3,
        permissions: 1,
    });
    return { url: share.url };
}
