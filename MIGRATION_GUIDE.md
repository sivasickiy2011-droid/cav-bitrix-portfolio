# Миграция проекта на собственный сервер

## Что нужно для самостоятельного хостинга

### 1. Требования к серверу
- **VPS/Dedicated сервер** (минимум 2GB RAM, 20GB SSD)
- **Ubuntu 22.04 LTS** или аналог
- **Доступ по SSH** с root правами
- **Домен** с возможностью настройки DNS

### 2. Установка необходимого ПО

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 14
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# PM2 (менеджер процессов)
sudo npm install -g pm2

# Certbot (SSL сертификаты)
sudo apt install -y certbot python3-certbot-nginx
```

### 3. Настройка PostgreSQL

```bash
# Создать пользователя и базу данных
sudo -u postgres psql

CREATE USER pixel_user WITH PASSWORD 'ваш_сильный_пароль';
CREATE DATABASE pixel_db OWNER pixel_user;
GRANT ALL PRIVILEGES ON DATABASE pixel_db TO pixel_user;
\q
```

**Экспортировать данные из poehali.dev:**
1. В poehali.dev выполните SQL дамп через админку или SQL клиент
2. Перенесите дамп на свой сервер
3. Импортируйте: `psql -U pixel_user -d pixel_db < dump.sql`

### 4. Структура backend API

Создайте Express.js сервер для замены cloud functions:

```
server/
├── api/
│   ├── auth.js          # auth-admin, partner-auth
│   ├── portfolio.js     # portfolio, admin управление
│   ├── partners.js      # partners, logos
│   ├── contact.js       # contact-form
│   ├── orders.js        # submit-order
│   ├── seo.js           # seo-analyze, seo-apply
│   ├── analytics.js     # yandex-metrika, webmaster
│   ├── settings.js      # secure-settings
│   └── bot.js           # bot-logger, bot-stats
├── middleware/
│   ├── auth.js          # Проверка токенов
│   └── cors.js          # CORS настройки
├── config/
│   ├── database.js      # PostgreSQL подключение
│   └── secrets.js       # Переменные окружения
├── server.js            # Главный файл
└── package.json
```

**Пример server.js:**
```javascript
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  host: 'localhost',
  database: 'pixel_db',
  user: 'pixel_user',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', require('./api/auth'));
app.use('/api/portfolio', require('./api/portfolio'));
app.use('/api/partners', require('./api/partners'));
app.use('/api/contact', require('./api/contact'));
// ... остальные роуты

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
```

### 5. Frontend изменения

**Заменить все URL функций на ваш API:**

Создайте `.env.production`:
```
VITE_API_URL=https://api.pixel59.ru
VITE_CDN_URL=https://cdn.pixel59.ru
```

В коде замените:
```typescript
// Было:
fetch('https://functions.poehali.dev/003b9991-...')

// Станет:
fetch(`${import.meta.env.VITE_API_URL}/api/contact`)
```

### 6. Настройка Nginx

**/etc/nginx/sites-available/pixel59.ru:**
```nginx
# Frontend (статика)
server {
    listen 80;
    server_name pixel59.ru www.pixel59.ru;
    
    location / {
        root /var/www/pixel59.ru/dist;
        try_files $uri $uri/ /index.html;
    }
}

# Backend API
server {
    listen 80;
    server_name api.pixel59.ru;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Включить SSL:**
```bash
sudo certbot --nginx -d pixel59.ru -d www.pixel59.ru -d api.pixel59.ru
```

### 7. Хранилище файлов (S3)

**Вариант А: Yandex Object Storage (платно)**
- Создайте бакет в Yandex Cloud
- Получите access_key и secret_key
- Настройте в backend: `aws-sdk` с Yandex endpoints

**Вариант Б: MinIO (бесплатно, на своём сервере)**
```bash
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# Запуск
mkdir -p /mnt/minio-data
minio server /mnt/minio-data --console-address ":9001"
```

### 8. Запуск проекта

```bash
# Backend
cd server
npm install
pm2 start server.js --name pixel-api
pm2 save
pm2 startup

# Frontend (билд)
cd ../
npm install
npm run build

# Копируйте dist в /var/www/pixel59.ru/
sudo cp -r dist/* /var/www/pixel59.ru/
```

### 9. Переменные окружения

**server/.env:**
```env
PORT=3001
DB_HOST=localhost
DB_USER=pixel_user
DB_PASSWORD=ваш_пароль
DB_NAME=pixel_db

# S3 (MinIO или Yandex)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=pixel-files

# Secrets из вашего проекта
TELEGRAM_BOT_TOKEN=...
YANDEX_METRIKA_TOKEN=...
ADMIN_PASSWORD_HASH=...
```

### 10. Миграция данных

1. **База данных:** Экспорт SQL → Импорт в PostgreSQL
2. **Файлы/изображения:** Скачать из CDN → Загрузить в MinIO/Yandex
3. **Секреты:** Скопировать из админки poehali.dev

---

## Альтернативный вариант (проще)

Если не хотите поднимать всю инфраструктуру:

### Гибридный подход:
- **Frontend:** Свой сервер (Nginx + статика)
- **Backend + DB:** Остаются на poehali.dev (бесплатно)
- **Изменения:** Только убрали скрипты poehali.dev из HTML

В этом случае:
- Билдите frontend: `npm run build`
- Загружаете `dist/` на свой сервер
- Настраиваете Nginx только для статики
- Backend функции остаются на functions.poehali.dev

---

## Выбор стратегии

| Критерий | Полный перенос | Гибрид | Остаться на poehali |
|----------|---------------|---------|---------------------|
| Контроль | ✅ Полный | ⚠️ Частичный | ❌ Минимальный |
| Стоимость VPS | 💰 500-2000₽/мес | 💰 300-800₽/мес | ✅ Бесплатно |
| Сложность | 🔴 Высокая | 🟡 Средняя | 🟢 Простая |
| Время миграции | 2-3 дня | 4-6 часов | 0 часов |
| Поддержка | На вас | Частично на вас | На платформе |

## Рекомендация

Для вашего проекта рекомендую **гибридный подход**:
1. Frontend на вашем сервере (pixel59.ru)
2. Backend остаётся на poehali.dev (работает бесплатно)
3. Можете мигрировать backend позже по частям

Это даст вам:
- ✅ Полный контроль над доменом
- ✅ Минимальные затраты
- ✅ Быстрый запуск (уже работает)
- ✅ Возможность постепенной миграции
