'''
Business: Копирует секреты из environment variables в зашифрованное хранилище БД
Args: event с admin токеном в headers
Returns: JSON с результатом копирования
'''

import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
import base64
import bcrypt

def get_db_connection():
    '''Создает подключение к БД'''
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def encrypt_value(value: str) -> str:
    '''Шифрует значение через base64'''
    return base64.b64encode(value.encode()).decode()

def copy_secret_to_db(key: str, category: str, description: str):
    '''Копирует секрет из env в БД'''
    value = os.environ.get(key)
    if not value:
        return None
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    encrypted = encrypt_value(value)
    
    cur.execute(
        """
        INSERT INTO secure_settings (key, encrypted_value, category, description, updated_at)
        VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET
            encrypted_value = EXCLUDED.encrypted_value,
            category = EXCLUDED.category,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP
        """,
        (key, encrypted, category, description)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return key

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method = event.get('httpMethod', 'GET')
    
    # CORS OPTIONS
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    # Проверка токена администратора
    headers = event.get('headers', {})
    admin_token = headers.get('x-admin-token') or headers.get('X-Admin-Token')
    
    if not admin_token:
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Unauthorized'}),
            'isBase64Encoded': False
        }
    
    admin_password_hash = os.environ.get('ADMIN_PASSWORD_HASH')
    if not admin_password_hash:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Admin password not configured'}),
            'isBase64Encoded': False
        }
    
    password_bytes = admin_token.encode('utf-8')
    hash_str = admin_password_hash.strip()
    
    if hash_str.startswith('$2a$'):
        hash_str = '$2b$' + hash_str[4:]
    
    hash_bytes = hash_str.encode('utf-8')
    
    is_valid = False
    try:
        is_valid = bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        pass
    
    if not is_valid:
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Invalid token'}),
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    # Копируем секреты
    secrets_to_copy = [
        ('OPENAI_API_KEY', 'api_keys', 'API ключ для OpenAI (скопирован из проектных секретов)'),
        ('OPENAI_API_BASE', 'api_keys', 'Базовый URL для OpenAI API (скопирован из проектных секретов)'),
        ('BITRIX24_WEBHOOK_URL', 'webhooks', 'Webhook URL для Bitrix24 CRM (скопирован из проектных секретов)'),
        ('TELEGRAM_BOT_TOKEN', 'integrations', 'Токен Telegram бота (скопирован из проектных секретов)'),
        ('TELEGRAM_CHAT_ID', 'integrations', 'ID чата Telegram (скопирован из проектных секретов)')
    ]
    
    copied = []
    skipped = []
    
    for key, category, description in secrets_to_copy:
        result = copy_secret_to_db(key, category, description)
        if result:
            copied.append(key)
        else:
            skipped.append(key)
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'success': True,
            'copied': copied,
            'skipped': skipped,
            'message': f'Скопировано {len(copied)} ключей в хранилище'
        }),
        'isBase64Encoded': False
    }
