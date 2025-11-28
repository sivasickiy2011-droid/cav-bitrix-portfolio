import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Icon from '@/components/ui/icon';

export default function EmergencyReset() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ hash?: string; error?: string } | null>(null);

  const handleReset = async () => {
    if (password.length < 8) {
      setResult({ error: 'Пароль должен быть минимум 8 символов' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('https://functions.poehali.dev/b4c0998b-86b6-442b-a6a2-dc10bb677c4d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password: password })
      });

      const data = await response.json();

      if (data.success) {
        setResult({ hash: data.new_hash });
      } else {
        setResult({ error: data.error || 'Ошибка генерации хеша' });
      }
    } catch (error) {
      setResult({ error: 'Ошибка подключения к серверу' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result?.hash) {
      navigator.clipboard.writeText(result.hash);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="ShieldAlert" className="text-red-600" size={24} />
            Экстренный сброс пароля
          </CardTitle>
          <CardDescription>
            Создание нового хеша пароля администратора
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Новый пароль</label>
            <Input
              type="password"
              placeholder="Минимум 8 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReset()}
            />
          </div>

          <Button 
            onClick={handleReset} 
            disabled={loading || password.length < 8}
            className="w-full"
          >
            {loading ? 'Генерация...' : 'Сгенерировать хеш'}
          </Button>

          {result?.error && (
            <Alert variant="destructive">
              <Icon name="AlertCircle" size={16} />
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>
          )}

          {result?.hash && (
            <div className="space-y-3">
              <Alert>
                <Icon name="CheckCircle" className="text-green-600" size={16} />
                <AlertDescription>Хеш успешно создан!</AlertDescription>
              </Alert>

              <div className="space-y-2">
                <label className="text-sm font-medium">Новый хеш пароля:</label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={result.hash}
                    className="font-mono text-xs"
                  />
                  <Button 
                    onClick={copyToClipboard}
                    variant="outline"
                    size="icon"
                  >
                    <Icon name="Copy" size={16} />
                  </Button>
                </div>
              </div>

              <Alert>
                <Icon name="Info" size={16} />
                <AlertDescription className="text-xs">
                  <strong>Следующий шаг:</strong> Скопируйте этот хеш и обновите секрет <code className="bg-muted px-1 rounded">ADMIN_PASSWORD_HASH</code> в настройках проекта
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
