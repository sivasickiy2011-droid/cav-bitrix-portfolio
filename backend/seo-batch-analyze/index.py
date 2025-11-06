import json
import os
from typing import Dict, Any, List
from pydantic import BaseModel, Field
import openai
import asyncio
import psycopg2
import base64

_secret_cache = {}

def get_secret(key: str) -> str:
    '''Reads secret from database with caching'''
    if key in _secret_cache:
        return _secret_cache[key]
    
    try:
        dsn = os.environ.get('DATABASE_URL')
        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        cur.execute("SELECT encrypted_value FROM secure_settings WHERE key = %s", (key,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        
        if row:
            value = base64.b64decode(row[0].encode()).decode()
            _secret_cache[key] = value
            return value
    except Exception as e:
        print(f'DB secret read error for {key}: {str(e)}')
    
    env_value = os.environ.get(key, '')
    _secret_cache[key] = env_value
    return env_value

class PageData(BaseModel):
    url: str
    content: str
    current_title: str = ""
    current_description: str = ""

class BatchSeoRequest(BaseModel):
    pages: List[PageData]

class PageSeoResult(BaseModel):
    url: str
    title: str
    description: str
    h1_suggestions: List[str]
    keywords: List[str]
    improvements: List[str]

def analyze_single_page(page: PageData, api_key: str, api_base: str, model: str) -> Dict[str, Any]:
    '''Analyze single page with OpenAI'''
    openai.api_key = api_key
    openai.api_base = api_base
    
    prompt = f"""Analyze this webpage content and provide SEO optimization suggestions in Russian.

URL: {page.url}
Current Title: {page.current_title or 'Not set'}
Current Description: {page.current_description or 'Not set'}

Page Content:
{page.content[:2000]}

Provide:
1. Optimized title (max 60 characters)
2. Optimized meta description (max 160 characters)
3. 3 H1 heading suggestions
4. 5 relevant keywords
5. 3 specific improvement recommendations

Respond ONLY with valid JSON in this exact format:
{{
    "title": "optimized title here",
    "description": "optimized description here",
    "h1_suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
    "improvements": ["improvement 1", "improvement 2", "improvement 3"]
}}"""
    
    try:
        response = openai.ChatCompletion.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are an expert SEO consultant. Always respond with valid JSON only, no additional text."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=800
        )
        
        ai_response = response['choices'][0]['message']['content'].strip()
        
        if ai_response.startswith('```json'):
            ai_response = ai_response[7:]
        if ai_response.startswith('```'):
            ai_response = ai_response[3:]
        if ai_response.endswith('```'):
            ai_response = ai_response[:-3]
        ai_response = ai_response.strip()
        
        suggestions = json.loads(ai_response)
        
        return {
            'url': page.url,
            'title': suggestions.get('title', ''),
            'description': suggestions.get('description', ''),
            'h1_suggestions': suggestions.get('h1_suggestions', []),
            'keywords': suggestions.get('keywords', []),
            'improvements': suggestions.get('improvements', []),
            'status': 'success'
        }
    except Exception as e:
        return {
            'url': page.url,
            'status': 'error',
            'error': str(e)
        }

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Batch analyze multiple pages for SEO optimization
    Args: event with httpMethod, body containing array of pages with url, content
          context with request_id
    Returns: Array of SEO suggestions for each page
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    api_key = get_secret('OPENAI_API_KEY')
    if not api_key:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'OpenAI API key not configured'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    request_data = BatchSeoRequest(**body_data)
    
    # Настраиваем endpoint и модель
    api_base = get_secret('OPENAI_API_BASE') or 'https://api.openai.com/v1'
    is_openrouter = 'openrouter' in api_base.lower()
    model = 'openai/gpt-4o-mini' if is_openrouter else os.environ.get('OPENAI_MODEL', 'gpt-4o-mini')
    
    results = []
    for page in request_data.pages[:10]:
        result = analyze_single_page(page, api_key, api_base, model)
        results.append(result)
    
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'results': results,
            'total_analyzed': len(results),
            'request_id': context.request_id
        }),
        'isBase64Encoded': False
    }