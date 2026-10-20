import 'server-only';
import { MemorySaver } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent, dynamicSystemPromptMiddleware, humanInTheLoopMiddleware } from 'langchain';
import { env } from '../env';
import { formatFa, toLocalIso } from '../nextcloud/time';
import { TOOL_META } from '../tool-meta';
import { tools } from './tools';

function systemPrompt() {
    const now = new Date();
    return `تو «دستیار نکست‌کلاد» هستی؛ یک دستیار هوش مصنوعی فارسی‌زبان که به فضای Nextcloud کاربر دسترسی دارد.

اکنون: ${formatFa(now, env.timezone)} — یعنی ${toLocalIso(now, env.timezone)} (منطقه زمانی ${env.timezone}).
پوشه صورت‌جلسه‌ها: /${env.meetingsFolder}

توانایی‌ها: مرور/جست‌وجو/خواندن/نوشتن/ویرایش فایل‌ها، ساخت صورت‌جلسه، مشاهده تقویم، یافتن زمان آزاد، رزرو جلسه با لینک میت (Talk)، ساخت اتاق Talk و ارسال پیام، ساخت لینک اشتراک.

قواعد:
- همیشه فارسی، کوتاه و دقیق جواب بده. زمان‌ها را برای کاربر به فارسی بگو، ولی در ابزارها از فرمت YYYY-MM-DDTHH:mm استفاده کن.
- عبارت‌های نسبی مثل «فردا» یا «شنبه آینده» را بر اساس تاریخ امروز به تاریخ میلادی دقیق تبدیل کن.
- اگر مدت جلسه گفته نشد، ۶۰ دقیقه در نظر بگیر. قبل از رزرو، اگر لازم است با find_free_slots یا list_events تداخل را بررسی کن.
- قبل از ویرایش فایل، آن را با read_file بخوان. برای تغییر جزئی edit_file و برای فایل جدید write_file.
- کارهایی که چیزی را تغییر می‌دهند قبل از اجرا توسط کاربر تأیید می‌شوند؛ پس بدون پرسیدن اضافه، ابزار مناسب را صدا بزن. اگر کاربر رد کرد، دلیلش را بپرس.
- اگر اطلاعات حیاتی (مثل موضوع جلسه) نیست، یک سؤال کوتاه بپرس.
- بعد از انجام کار، نتیجه و لینک‌ها (مسیر فایل، لینک میت) را خلاصه بگو.`;
}

function build() {
    const model = new ChatOpenAI({
        model: env.llmModel,
        apiKey: env.llmApiKey,
        configuration: { baseURL: env.llmBaseUrl },
        temperature: 0.2,
        streaming: true,
        modelKwargs: env.llmExtraBody,
    });

    const interruptOn = Object.fromEntries(
        Object.entries(TOOL_META)
            .filter(([, meta]) => meta.needsApproval)
            .map(([name, meta]) => [name, { allowedDecisions: ['approve', 'reject'] as ('approve' | 'reject')[], description: meta.label }])
    );

    return createAgent({
        model,
        tools,
        checkpointer: new MemorySaver(),
        middleware: [
            dynamicSystemPromptMiddleware(() => systemPrompt()),
            humanInTheLoopMiddleware({ interruptOn }),
        ],
    });
}

// Keep one agent (and its in-memory conversation store) across dev hot reloads.
const globalForAgent = globalThis as unknown as { __ncAgent?: ReturnType<typeof build> };

export function getAgent() {
    return (globalForAgent.__ncAgent ??= build());
}
