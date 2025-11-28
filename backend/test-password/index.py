import json
import os
import bcrypt
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Test password against stored hash for debugging
    Args: event with httpMethod, body containing password
    Returns: HTTP response with hash comparison details
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
            'body': '',
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
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        password = body_data.get('password', '')
        
        if not password:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Password required'}),
                'isBase64Encoded': False
            }
        
        admin_password_hash = os.environ.get('ADMIN_PASSWORD_HASH', '')
        
        if not admin_password_hash:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'ADMIN_PASSWORD_HASH not set'}),
                'isBase64Encoded': False
            }
        
        password_bytes = password.encode('utf-8')
        hash_str = admin_password_hash.strip()
        
        # Convert $2a$ to $2b$ if needed
        original_hash = hash_str
        if hash_str.startswith('$2a$'):
            hash_str = '$2b$' + hash_str[4:]
        
        hash_bytes = hash_str.encode('utf-8')
        
        is_valid = False
        error_msg = None
        try:
            is_valid = bcrypt.checkpw(password_bytes, hash_bytes)
        except Exception as e:
            error_msg = str(e)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'password_length': len(password),
                'hash_prefix': original_hash[:15] if len(original_hash) >= 15 else original_hash,
                'hash_length': len(original_hash),
                'hash_converted': original_hash != hash_str,
                'password_matches': is_valid,
                'error': error_msg,
                'hash_format_valid': original_hash.startswith('$2a$') or original_hash.startswith('$2b$')
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
