import json
import os
import urllib.request
from typing import Dict, Any


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Обработка контактной формы и отправка в Битрикс24 + Telegram
    Args: event с httpMethod, body (JSON с полями: name, phone, type)
          context с request_id
    Returns: HTTP response с результатом отправки
    '''
    method: str = event.get('httpMethod', 'POST')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    body_data = json.loads(event.get('body', '{}'))
    
    name: str = body_data.get('name', 'Не указано')
    phone: str = body_data.get('phone', 'Не указано')
    form_type: str = body_data.get('type', 'contact_form')
    timestamp: str = body_data.get('timestamp', '')
    
    # Битрикс24
    bitrix_webhook = os.environ.get('BITRIX24_WEBHOOK_URL', '')
    
    bitrix_success = False
    if bitrix_webhook:
        try:
            bitrix_data = {
                'TITLE': f'Обратная связь: {name}',
                'NAME': name,
                'PHONE': [{'VALUE': phone, 'VALUE_TYPE': 'WORK'}],
                'COMMENTS': f'📝 Форма: {form_type}\n🕐 Время: {timestamp}',
                'SOURCE_ID': 'WEB'
            }
            
            bitrix_url = f'{bitrix_webhook}crm.lead.add.json'
            bitrix_request = urllib.request.Request(
                bitrix_url,
                data=json.dumps({'fields': bitrix_data}).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(bitrix_request, timeout=10) as response:
                bitrix_result = json.loads(response.read().decode('utf-8'))
                bitrix_success = bitrix_result.get('result', False)
        except Exception as e:
            print(f'Bitrix24 error: {str(e)}')
    
    # Telegram
    telegram_success = False
    telegram_bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    telegram_chat_id = os.environ.get('TELEGRAM_CHAT_ID', '')
    
    if telegram_bot_token and telegram_chat_id:
        try:
            telegram_message = f'''
🆕 Новая заявка с сайта

👤 Имя: {name}
📞 Телефон: {phone}

📝 Тип формы: {form_type}
🕐 Время: {timestamp}
'''
            
            telegram_url = f'https://api.telegram.org/bot{telegram_bot_token}/sendMessage'
            telegram_data = {
                'chat_id': telegram_chat_id,
                'text': telegram_message
            }
            
            telegram_request = urllib.request.Request(
                telegram_url,
                data=json.dumps(telegram_data).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(telegram_request, timeout=10) as response:
                telegram_result = json.loads(response.read().decode('utf-8'))
                telegram_success = telegram_result.get('ok', False)
        except Exception as e:
            print(f'Telegram error: {str(e)}')
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps({
            'success': True,
            'bitrix24': bitrix_success,
            'telegram': telegram_success,
            'message': 'Заявка отправлена'
        })
    }
