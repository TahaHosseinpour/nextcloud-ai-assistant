import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const faNum = (n: number) => n.toLocaleString('fa-IR');

export function formatSize(bytes: number) {
    if (!bytes) return '';
    const units = ['بایت', 'KB', 'MB', 'GB'];
    let i = 0;
    let v = bytes;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return `${faNum(Math.round(v * 10) / 10)} ${units[i]}`;
}

export function tryParseJson(text: string): any {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}
