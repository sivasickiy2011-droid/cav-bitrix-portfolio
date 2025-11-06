import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { migrateSettingsToVault, hasUnmigratedSettings } from '@/utils/migrateSettings';

interface SecureSetting {
  id: number;
  key: string;
  value: string;
  category: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface SecretsVaultProps {
  isEmbedded?: boolean;
}

const SecretsVault = ({ isEmbedded = false }: SecretsVaultProps) => {
  const [settings, setSettings] = useState<SecureSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMigrationAlert, setShowMigrationAlert] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [copyingSecrets, setCopyingSecrets] = useState(false);
  
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    category: 'webhooks',
    description: ''
  });

  const categories = [
    { value: 'all', label: 'Все категории' },
    { value: 'webhooks', label: 'Вебхуки' },
    { value: 'analytics', label: 'Аналитика' },
    { value: 'integrations', label: 'Интеграции' },
    { value: 'api_keys', label: 'API ключи' },
    { value: 'general', label: 'Общие' }
  ];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      webhooks: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      analytics: 'bg-green-500/20 text-green-300 border-green-500/30',
      integrations: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      api_keys: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      general: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    };
    return colors[category] || colors.general;
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_auth');
      const url = selectedCategory === 'all' 
        ? 'https://functions.poehali.dev/fa56bf24-1e0b-4d49-8511-6befcd962d6f'
        : `https://functions.poehali.dev/fa56bf24-1e0b-4d49-8511-6befcd962d6f?category=${selectedCategory}`;
      
      const response = await fetch(url, {
        headers: {
          'X-Admin-Token': token || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || []);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [selectedCategory]);

  useEffect(() => {
    setShowMigrationAlert(hasUnmigratedSettings());
  }, []);

  const handleMigration = async () => {
    setMigrating(true);
    const result = await migrateSettingsToVault();
    setMigrating(false);
    
    if (result.success) {
      setShowMigrationAlert(false);
      await loadSettings();
      alert(result.message);
    } else {
      alert('Ошибка миграции: ' + result.error);
    }
  };

  const handleCopyProjectSecrets = async () => {
    if (!confirm('Скопировать секреты из проектных переменных в хранилище базы данных? Это позволит редактировать их через админ-панель.')) {
      return;
    }

    setCopyingSecrets(true);
    try {
      const token = localStorage.getItem('admin_auth');
      const response = await fetch('https://functions.poehali.dev/961bcfd3-a4a3-4d7e-b238-7d19be6f98e1', {
        method: 'POST',
        headers: {
          'X-Admin-Token': token || ''
        }
      });

      if (response.ok) {
        const result = await response.json();
        await loadSettings();
        alert(`✅ ${result.message}\n\nСкопировано: ${result.copied.join(', ')}\n${result.skipped.length > 0 ? `Пропущено: ${result.skipped.join(', ')}` : ''}`);
      } else {
        const error = await response.text();
        alert('Ошибка копирования: ' + error);
      }
    } catch (error) {
      console.error('Failed to copy secrets:', error);
      alert('Ошибка копирования секретов');
    } finally {
      setCopyingSecrets(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_auth');
      const response = await fetch('https://functions.poehali.dev/fa56bf24-1e0b-4d49-8511-6befcd962d6f', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Token': token || ''
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setFormData({ key: '', value: '', category: 'webhooks', description: '' });
        setShowAddForm(false);
        setEditingId(null);
        await loadSettings();
      }
    } catch (error) {
      console.error('Failed to save setting:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm('Удалить эту настройку?')) return;

    try {
      const token = localStorage.getItem('admin_auth');
      const response = await fetch(`https://functions.poehali.dev/fa56bf24-1e0b-4d49-8511-6befcd962d6f?key=${key}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Token': token || ''
        }
      });

      if (response.ok) {
        await loadSettings();
      }
    } catch (error) {
      console.error('Failed to delete setting:', error);
    }
  };

  const handleEdit = (setting: SecureSetting) => {
    setFormData({
      key: setting.key,
      value: setting.value,
      category: setting.category,
      description: setting.description || ''
    });
    setEditingId(setting.id);
    setShowAddForm(true);
  };

  const content = (
    <div className="space-y-6">
      {showMigrationAlert && (
        <Alert className="bg-blue-900/30 border-blue-500/50">
          <Icon name="AlertCircle" className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-200">
            Обнаружены настройки в старом формате (localStorage). 
            <Button
              onClick={handleMigration}
              disabled={migrating}
              size="sm"
              className="ml-3 bg-blue-600 hover:bg-blue-700"
            >
              {migrating ? 'Переношу...' : 'Перенести в защищённое хранилище'}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px] bg-gray-800/50 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-400">
            {settings.length} {settings.length === 1 ? 'настройка' : 'настроек'}
          </span>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleCopyProjectSecrets}
            disabled={copyingSecrets}
            variant="outline"
            className="border-purple-600 text-purple-400 hover:bg-purple-950/30"
          >
            <Icon name="Download" className="h-4 w-4 mr-2" />
            {copyingSecrets ? 'Копирую...' : 'Импорт из секретов'}
          </Button>
          <Button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingId(null);
              setFormData({ key: '', value: '', category: 'webhooks', description: '' });
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Icon name="Plus" className="h-4 w-4 mr-2" />
            Добавить
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              {editingId ? 'Редактировать настройку' : 'Новая настройка'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Ключ</Label>
                <Input
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="telegram_bot_token"
                  className="bg-gray-900/50 border-gray-600 text-white"
                  disabled={!!editingId}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Категория</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="bg-gray-900/50 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.value !== 'all').map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Значение</Label>
              <Input
                type="password"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="Введите значение"
                className="bg-gray-900/50 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Описание (опционально)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Для чего используется эта настройка"
                className="bg-gray-900/50 border-gray-600 text-white"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || !formData.key || !formData.value}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Icon name="Save" className="h-4 w-4 mr-2" />
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
              <Button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                  setFormData({ key: '', value: '', category: 'webhooks', description: '' });
                }}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <Icon name="Loader2" className="h-8 w-8 animate-spin mx-auto mb-4" />
          Загрузка настроек...
        </div>
      ) : settings.length === 0 ? (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="py-12 text-center">
            <Icon name="Lock" className="h-12 w-12 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">Нет сохранённых настроек</p>
            <p className="text-sm text-gray-500 mt-2">
              Добавьте первую настройку для безопасного хранения
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {settings.map((setting) => (
            <Card key={setting.id} className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <code className="text-lg font-mono text-blue-400 bg-gray-900/50 px-3 py-1 rounded">
                        {setting.key}
                      </code>
                      <Badge className={getCategoryColor(setting.category)}>
                        {categories.find(c => c.value === setting.category)?.label || setting.category}
                      </Badge>
                    </div>
                    
                    {setting.description && (
                      <p className="text-sm text-gray-400">{setting.description}</p>
                    )}
                    
                    <div className="flex gap-6 text-xs text-gray-500">
                      <span>Создано: {new Date(setting.created_at).toLocaleString('ru-RU')}</span>
                      <span>Обновлено: {new Date(setting.updated_at).toLocaleString('ru-RU')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleEdit(setting)}
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                      <Icon name="Pencil" className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(setting.key)}
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                    >
                      <Icon name="Trash2" className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Icon name="Lock" className="h-6 w-6" />
          Хранилище секретов
        </CardTitle>
        <CardDescription className="text-gray-400">
          Безопасное хранение вебхуков, API ключей и других конфиденциальных данных с шифрованием
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};

export default SecretsVault;