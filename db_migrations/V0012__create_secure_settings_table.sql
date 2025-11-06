-- Таблица для хранения зашифрованных настроек и секретов
CREATE TABLE IF NOT EXISTS secure_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    encrypted_value TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX idx_secure_settings_category ON secure_settings(category);
CREATE INDEX idx_secure_settings_key ON secure_settings(key);

-- Комментарии
COMMENT ON TABLE secure_settings IS 'Хранилище зашифрованных настроек и секретов';
COMMENT ON COLUMN secure_settings.key IS 'Уникальный ключ настройки';
COMMENT ON COLUMN secure_settings.encrypted_value IS 'Зашифрованное значение';
COMMENT ON COLUMN secure_settings.category IS 'Категория: webhooks, analytics, integrations, etc';