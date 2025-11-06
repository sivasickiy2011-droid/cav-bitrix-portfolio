'''
Business: API для управления зашифрованными настройками и секретами
Args: event с httpMethod (GET/POST/PUT/DELETE), body с данными настроек
Returns: JSON с настройками или результатом операции
'''

import json
import os
from typing import Dict, Any, Optional
from cryptography.fernet import Fernet
from dataclasses import dataclass
import psycopg2
from psycopg2.extras import RealDictCursor

@dataclass
class SecureSetting:
    key: str
    value: str
    category: str
    description: Optional[str] = None

# Генерация ключа шифрования из переменной окружения
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', Fernet.generate_key().decode())
cipher = Fernet(ENCRYPTION_KEY.encode())

def get_db_connection():
    '''Создает подключение к БД'''
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn)

def encrypt_value(value: str) -> str:
    '''Шифрует значение'''
    return cipher.encrypt(value.encode()).decode()

def decrypt_value(encrypted: str) -> str:
    '''Расшифровывает значение'''
    return cipher.decrypt(encrypted.encode()).decode()

def get_all_settings(category: Optional[str] = None) -> list:
    '''Получает все настройки из БД'''
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    if category:
        cur.execute(
            "SELECT id, key, encrypted_value, category, description, created_at, updated_at FROM secure_settings WHERE category = %s ORDER BY key",
            (category,)
        )
    else:
        cur.execute("SELECT id, key, encrypted_value, category, description, created_at, updated_at FROM secure_settings ORDER BY category, key")
    
    rows = cur.fetchall()
    cur.close()
    conn.close()
    
    result = []
    for row in rows:
        result.append({
            'id': row['id'],
            'key': row['key'],
            'value': decrypt_value(row['encrypted_value']),
            'category': row['category'],
            'description': row['description'],
            'created_at': row['created_at'].isoformat() if row['created_at'] else None,
            'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None
        })
    
    return result

def get_setting(key: str) -> Optional[Dict[str, Any]]:
    '''Получает одну настройку по ключу'''
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute(
        "SELECT id, key, encrypted_value, category, description, created_at, updated_at FROM secure_settings WHERE key = %s",
        (key,)
    )
    
    row = cur.fetchone()
    cur.close()
    conn.close()
    
    if not row:
        return None
    
    return {
        'id': row['id'],
        'key': row['key'],
        'value': decrypt_value(row['encrypted_value']),
        'category': row['category'],
        'description': row['description'],
        'created_at': row['created_at'].isoformat() if row['created_at'] else None,
        'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None
    }

def create_or_update_setting(setting: SecureSetting) -> Dict[str, Any]:
    '''Создает или обновляет настройку'''
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    encrypted = encrypt_value(setting.value)
    
    cur.execute(
        """
        INSERT INTO secure_settings (key, encrypted_value, category, description, updated_at)
        VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET
            encrypted_value = EXCLUDED.encrypted_value,
            category = EXCLUDED.category,
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id, key, category, description, created_at, updated_at
        """,
        (setting.key, encrypted, setting.category, setting.description)
    )
    
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    
    return {
        'id': row['id'],
        'key': row['key'],
        'value': setting.value,
        'category': row['category'],
        'description': row['description'],
        'created_at': row['created_at'].isoformat() if row['created_at'] else None,
        'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None
    }

def delete_setting(key: str) -> bool:
    '''Удаляет настройку'''
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("DELETE FROM secure_settings WHERE key = %s", (key,))
    deleted = cur.rowcount > 0
    
    conn.commit()
    cur.close()
    conn.close()
    
    return deleted

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method = event.get('httpMethod', 'GET')
    
    # CORS OPTIONS
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    # Проверка токена администратора
    headers = event.get('headers', {})
    admin_token = headers.get('x-admin-token') or headers.get('X-Admin-Token')
    expected_token = os.environ.get('ADMIN_PASSWORD_HASH')
    
    if not admin_token or admin_token != expected_token:
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Unauthorized'})
        }
    
    # GET - получить все настройки или одну по ключу
    if method == 'GET':
        query_params = event.get('queryStringParameters') or {}
        key = query_params.get('key')
        category = query_params.get('category')
        
        if key:
            setting = get_setting(key)
            if not setting:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Setting not found'})
                }
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps(setting)
            }
        else:
            settings = get_all_settings(category)
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'settings': settings})
            }
    
    # POST/PUT - создать или обновить настройку
    if method in ['POST', 'PUT']:
        body_data = json.loads(event.get('body', '{}'))
        
        setting = SecureSetting(
            key=body_data.get('key'),
            value=body_data.get('value'),
            category=body_data.get('category', 'general'),
            description=body_data.get('description')
        )
        
        result = create_or_update_setting(setting)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result)
        }
    
    # DELETE - удалить настройку
    if method == 'DELETE':
        query_params = event.get('queryStringParameters') or {}
        key = query_params.get('key')
        
        if not key:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Key parameter required'})
            }
        
        deleted = delete_setting(key)
        
        if deleted:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'message': 'Setting deleted'})
            }
        else:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Setting not found'})
            }
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': 'Method not allowed'})
    }
