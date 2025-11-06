interface AnalyticsSettings {
  google_analytics_id?: string;
  yandex_metrika_id?: string;
  yandex_metrika_token?: string;
  yandex_webmaster_user_id?: string;
  ai_seo_enabled?: boolean;
}

interface BitrixSettings {
  webhook_url?: string;
}

export async function migrateSettingsToVault() {
  const adminToken = localStorage.getItem('admin_auth');
  if (!adminToken) {
    console.error('No admin token found');
    return { success: false, error: 'Not authenticated' };
  }

  const migratedSettings: Array<{key: string; value: string; category: string; description: string}> = [];

  // Миграция настроек аналитики
  const analyticsSettings = localStorage.getItem('analytics_settings');
  if (analyticsSettings) {
    const parsed: AnalyticsSettings = JSON.parse(analyticsSettings);
    
    if (parsed.yandex_metrika_id) {
      migratedSettings.push({
        key: 'yandex_metrika_id',
        value: parsed.yandex_metrika_id,
        category: 'analytics',
        description: 'ID счётчика Яндекс.Метрики'
      });
    }
    
    if (parsed.yandex_metrika_token) {
      migratedSettings.push({
        key: 'yandex_metrika_token',
        value: parsed.yandex_metrika_token,
        category: 'analytics',
        description: 'OAuth токен для Яндекс.Метрики API'
      });
    }
    
    if (parsed.yandex_webmaster_user_id) {
      migratedSettings.push({
        key: 'yandex_webmaster_user_id',
        value: parsed.yandex_webmaster_user_id,
        category: 'analytics',
        description: 'User ID для Яндекс.Вебмастера'
      });
    }
    
    if (parsed.google_analytics_id) {
      migratedSettings.push({
        key: 'google_analytics_id',
        value: parsed.google_analytics_id,
        category: 'analytics',
        description: 'ID счётчика Google Analytics'
      });
    }
  }

  // Миграция вебхука Bitrix24
  const bitrixSettings = localStorage.getItem('bitrix24_settings');
  if (bitrixSettings) {
    const parsed: BitrixSettings = JSON.parse(bitrixSettings);
    
    if (parsed.webhook_url) {
      migratedSettings.push({
        key: 'bitrix24_webhook_url',
        value: parsed.webhook_url,
        category: 'webhooks',
        description: 'Webhook URL для интеграции с Bitrix24 CRM'
      });
    }
  }

  // Миграция токенов Telegram
  const telegramToken = localStorage.getItem('telegram_bot_token');
  if (telegramToken) {
    migratedSettings.push({
      key: 'telegram_bot_token',
      value: telegramToken,
      category: 'integrations',
      description: 'Токен Telegram бота для уведомлений'
    });
  }

  const telegramChatId = localStorage.getItem('telegram_chat_id');
  if (telegramChatId) {
    migratedSettings.push({
      key: 'telegram_chat_id',
      value: telegramChatId,
      category: 'integrations',
      description: 'ID чата Telegram для получения уведомлений'
    });
  }

  if (migratedSettings.length === 0) {
    return { success: true, migrated: 0, message: 'Нет настроек для миграции' };
  }

  // Отправка настроек в хранилище
  const results = await Promise.allSettled(
    migratedSettings.map(setting =>
      fetch('https://functions.poehali.dev/fa56bf24-1e0b-4d49-8511-6befcd962d6f', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': adminToken
        },
        body: JSON.stringify(setting)
      })
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  
  return {
    success: true,
    migrated: successful,
    total: migratedSettings.length,
    message: `Перенесено ${successful} из ${migratedSettings.length} настроек`
  };
}

export function hasUnmigratedSettings(): boolean {
  const analytics = localStorage.getItem('analytics_settings');
  const bitrix = localStorage.getItem('bitrix24_settings');
  const telegram = localStorage.getItem('telegram_bot_token') || localStorage.getItem('telegram_chat_id');
  
  return !!(analytics || bitrix || telegram);
}
