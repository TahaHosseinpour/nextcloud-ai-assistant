<div dir="rtl">

# دستیار نکست‌کلاد

دستیار هوش مصنوعی فارسی برای [Nextcloud](https://nextcloud.com): رزرو جلسه با لینک میت، نوشتن صورت‌جلسه، مرور و ویرایش فایل‌ها و ارسال پیام در Talk — با رابط کاربری RTL به سبک llmchat.

## قابلیت‌ها

| بخش | ابزارهای ایجنت |
|---|---|
| فایل‌ها (WebDAV) | مرور پوشه، جست‌وجو، خواندن، ساخت/بازنویسی، ویرایش بخشی از فایل، جابه‌جایی، لینک اشتراک |
| صورت‌جلسه | ساخت فایل Markdown با قالب استاندارد در پوشه `Meetings` |
| تقویم (CalDAV) | فهرست تقویم‌ها و جلسات، یافتن زمان آزاد، رزرو و حذف جلسه با دعوت شرکت‌کنندگان |
| Talk | ساخت اتاق میت، فهرست گفتگوها، ارسال پیام |

- هر کاری که چیزی را در Nextcloud تغییر دهد، **پیش از اجرا از کاربر تأیید می‌گیرد** (Human-in-the-loop).
- پنل کناری فایل‌ها و تقویم، با امکان ویرایش مستقیم فایل‌های متنی.
- حالت تاریک، تاریخچه گفتگو با پین، کاملاً فارسی و راست‌به‌چپ.

## پشته فنی

Next.js 16 (App Router) · LangChain.js 1.x (`createAgent` + `humanInTheLoopMiddleware`) · Tailwind CSS 4 · هر مدل سازگار با OpenAI API

## راه‌اندازی

```bash
npm install
cp .env.example .env   # مقادیر را پر کنید
npm run dev            # http://localhost:3000
```

### متغیرهای محیطی

| متغیر | توضیح |
|---|---|
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | هر API سازگار با OpenAI (OpenAI، OpenRouter، متیس، Ollama، …) |
| `LLM_EXTRA_BODY` | اختیاری؛ JSON اضافه برای بدنه درخواست. برای DeepSeek: `{"thinking":{"type":"disabled"}}` |
| `NEXTCLOUD_URL` | آدرس سرور، بدون `/` انتهایی |
| `NEXTCLOUD_USER` / `NEXTCLOUD_APP_PASSWORD` | کاربر ایجنت و App Password آن (Settings → Security → Devices & sessions) |
| `NEXTCLOUD_CALENDAR` | تقویم پیش‌فرض (معمولاً `personal`) |
| `NEXTCLOUD_MEETINGS_FOLDER` | پوشه صورت‌جلسه‌ها |
| `APP_TIMEZONE` | منطقه زمانی، مثلاً `Asia/Tehran` |

### Nextcloud محلی با Docker

یک فایل `nextcloud.docker.env` با مقادیر `NC_ADMIN_USER`، `NC_ADMIN_PASSWORD`، `MYSQL_PASSWORD` و `MYSQL_ROOT_PASSWORD` بسازید، سپس:

```bash
docker compose --env-file nextcloud.docker.env up -d     # http://localhost:8080
docker compose exec -u www-data app php occ app:install calendar
docker compose exec -u www-data app php occ app:install spreed
docker compose exec -u www-data app php occ user:add ai-assistant
docker compose exec -u www-data app php occ user:auth-tokens:add ai-assistant   # App Password
```

## ساختار

```
app/api/chat      استریم ایجنت (NDJSON) + ادامه پس از تأیید
app/api/files     مرور/خواندن/ذخیره فایل برای پنل
app/api/calendar  جلسات پیش‌رو
lib/nextcloud     کلاینت WebDAV، CalDAV، Talk و اشتراک‌گذاری
lib/agent         ابزارها و ساخت ایجنت LangChain
components        رابط کاربری (سایدبار، چت، کارت ابزار و تأیید، پنل فایل/تقویم)
```

## فونت

پیش‌فرض فونت آزاد [Vazirmatn](https://github.com/rastikerdar/vazirmatn) است. اگر لایسنس IRANYekanX را دارید، فایل‌های `IRANYekanXFaNum-*.woff2` را در `public/fonts` بگذارید تا خودکار استفاده شود (این فایل‌ها در گیت نادیده گرفته می‌شوند).

## محدودیت‌ها

- حافظه گفتگوی ایجنت در RAM سرور است (`MemorySaver`)؛ با ری‌استارت پاک می‌شود. برای محیط عملیاتی از یک checkpointer پایدار (مثلاً Postgres) استفاده کنید.
- تاریخچه گفتگوها در `localStorage` مرورگر ذخیره می‌شود.
- فقط فایل‌های متنی (md, txt, csv, json, …) خوانده و ویرایش می‌شوند.

</div>
