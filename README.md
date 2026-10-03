# Kinex

Сервис приёма платежей (SBP/RUB через платёжный шлюз Genesis Pay) с сетью
менеджеров-операторов. Переписан с Django + aiogram + Docker на чистый
Next.js — без Python, без Docker/docker-compose.

## Стек

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **PostgreSQL** через **Prisma 7** (`@prisma/adapter-pg`)
- **grammY** — Telegram-бот в режиме webhook (без long-polling и без
  отдельного процесса); состояние FSM-диалогов хранится в таблице
  `BotDialogState`, а не в памяти процесса
- Сессия админ-панели — JWT (`jose`) в httpOnly-куке, без внешних auth-библиотек

## Разделы приложения

- `/` — дашборд (KPI, почасовой график платежей, прогресс лимита накоплений)
- `/managers`, `/payments`, `/withdrawals`, `/profile-requests`, `/settings` —
  CRUD-разделы админки
- `/api/payments/callback` — webhook платёжного шлюза Genesis Pay (HMAC-SHA1)
- `/api/bot/webhook` — webhook Telegram-бота

## Локальная разработка

```bash
npm install   # postinstall сам выполнит `prisma generate`
cp .env.example .env
# заполните SESSION_SECRET (openssl rand -base64 32) и DATABASE_URL
```

### База данных

Вариант без установки Postgres — встроенный dev-сервер Prisma:

```bash
npx prisma dev -n kinex
# выведет postgres://... — вставьте в DATABASE_URL в .env
# также добавьте DATABASE_POOL_MAX="1" — см. комментарий в .env.example:
# у этого эфемерного демона низкий лимит параллельных подключений
```

Либо укажите в `DATABASE_URL` любой настоящий Postgres (локальная установка,
Neon, Supabase, VDS) — в этом случае `DATABASE_POOL_MAX` не нужен.

Применить схему:

```bash
npx prisma migrate dev
```

### Администратор панели

Если в `.env` заданы `ADMIN_USERNAME`/`ADMIN_PASSWORD`, админ создаётся
(или обновляется — например, при смене пароля) **автоматически при каждом
старте сервера** (`src/instrumentation.ts`, аналог `entrypoint.sh` из
оригинала). Это удобно для деплоя — задайте переменные один раз в окружении
хостинга, и admin-пользователь появится сам.

Для разового создания без постоянных переменных окружения — ручной скрипт:

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=ваш_пароль npm run admin:create
```

Запустите dev-сервер:

```bash
npm run dev
```

Откройте http://localhost:3000 — редирект на `/login`.

## Деплой без Docker

Собрать и запустить как обычное Node-приложение (Vercel, VDS с pm2/systemd,
Timeweb Apps, любой Node-хостинг):

```bash
npm run build
npm run start
```

`npm run start` = `prisma migrate deploy && next start` — миграции
применяются автоматически при каждом старте, вручную их гонять не нужно.
`next start` сам слушает `$PORT` (по умолчанию 3000) и биндится на `0.0.0.0`.

При старте (`src/instrumentation.ts`) также автоматически, если заданы
соответствующие переменные окружения:
- создаётся/обновляется администратор панели (`ADMIN_USERNAME`/`ADMIN_PASSWORD`);
- регистрируется webhook Telegram-бота (`APP_URL` → Telegram `setWebhook`
  на `${APP_URL}/api/bot/webhook`). Токен бота берётся из `Settings.botToken`
  (задаётся через админку после первого входа) или из `BOT_TOKEN`. Если токен
  ещё не задан на момент первого деплоя — в логе появится ошибка, это не
  критично, при следующем деплое (после того как токен будет сохранён в
  Settings) регистрация пройдёт успешно.

Повторная/ручная регистрация вебхука, если нужно, без передеплоя:

```bash
APP_URL="https://your-domain.ru" npm run bot:set-webhook
```

На VDS: обратный проксирующий Nginx/Caddy перед `next start` + TLS
(Let's Encrypt силами самого Caddy/certbot) — без контейнеров. На Vercel —
деплой «из коробки», TLS и прокси берёт на себя платформа.

### Деплой из GitHub через Timeweb Apps

[Timeweb Apps/App Platform](https://timeweb.cloud/docs/apps) умеет автодеплой
по `git push` при подключённом репозитории — каждый деплой запускает
**новый контейнер** (без сохранения данных предыдущего), поэтому вся
persistence должна быть во внешней БД (Postgres), что уже так и сделано.

1. В панели Timeweb Apps создайте приложение → [подключите GitHub-репозиторий](https://timeweb.cloud/docs/apps/connecting-repositories)
   (авторизация OAuth, выбор репозитория и ветки).
2. Включите автодеплой при push (переключатель в настройках приложения).
3. Укажите (Node.js-приложение, но Next.js требует сборку — задайте команды
   явно, автоопределение Timeweb рассчитано на простые Express-приложения
   без build-шага):
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Port**: `3000` (или тот, что укажете — приложение само читает `$PORT`)
4. Добавьте переменные окружения в панели приложения (см. `.env.example`):
   `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`,
   `BOT_TOKEN` (или задайте токен позже через Settings в самой панели),
   `APP_URL` (публичный домен, который выдаст/привяжет Timeweb),
   `TELEGRAM_WEBHOOK_SECRET`, `PAYMENT_API_URL`, `PAYMENT_MERCHANT`,
   `PAYMENT_API_KEY`, `PAYMENT_CALLBACK_URL`. `DATABASE_POOL_MAX` не нужен —
   это только для локального `prisma dev`.
5. Для `DATABASE_URL` — managed Postgres Timeweb Cloud (отдельная услуга) или
   любой внешний Postgres (Neon/Supabase), доступный по сети из App Platform.
6. Запустите деплой (или просто `git push` при включённом автодеплое) —
   миграции, admin и webhook бота применятся сами при старте контейнера,
   без дополнительных ручных шагов.

Источники: [App Platform — обзор](https://timeweb.cloud/docs/apps),
[принципы работы (автодеплой, новый контейнер на каждый деплой)](https://timeweb.cloud/docs/apps/how-it-works),
[подключение репозиториев](https://timeweb.cloud/docs/apps/connecting-repositories),
[деплой backend-приложений](https://timeweb.cloud/docs/apps/deploying-backend-applications),
[требование слушать `0.0.0.0`](https://timeweb.cloud/docs/apps/deploying-backend-applications/express).

## Архитектурные решения при переносе с Django/aiogram

- **Бот**: long-polling (aiogram) → webhook (grammY) в `/api/bot/webhook`;
  FSM-состояние диалога — в БД (`BotDialogState`), а не в памяти процесса.
  Это убирает необходимость в отдельном долгоживущем процессе бота.
- **БД**: Django ORM → Prisma. Транзакционная блокировка при создании заявки
  на вывод (защита от гонки, `select_for_update` в оригинале) — через
  `prisma.$transaction` с `SELECT ... FOR UPDATE` (см. `src/lib/payments/balance.ts`).
- **Курс USDT**: TTL-кэш (15 мин) теперь хранится в БД (`Settings.lastUsdtRate`
  + `lastUsdtRateAt`), а не в памяти процесса — корректно работает в
  serverless/многоинстансовом окружении.
- **Уникальность Manager.telegramId/telegramUsername** — проверяется на
  уровне приложения (как и в оригинале через Django `clean()`), не как
  DB-constraint: оба поля могут быть пустыми одновременно у разных менеджеров.
- **ProfileChangeRequest** — пометка заявки "Выполнена" не применяет новое
  значение к Manager автоматически; это сознательно воспроизведённое
  поведение оригинала (ручной процесс, админ сам редактирует карточку
  менеджера).
- **Withdrawal** — при первом переводе заявки в статус "Выполнен" авто-
  рассчитывается `usdtAmount`/`usdtRate` по текущему курсу (как в
  оригинальном `save_model`); повторный пересчёт не происходит.

## Переменные окружения

См. `.env.example` — там перечислены все переменные с комментариями.
