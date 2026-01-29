import requests

url = 'https://uwkcraqyssbfbaeoricm.supabase.co/functions/v1/auto_apply_tags/classify'
headers = {
    'Authorization': 'Bearer sb_publishable_IVyzip1ImnxBK5Ms86tO2g_j-J9pb2D',
    'Content-Type': 'application/json'
}
data = {
    'article_id': 'cmkwt6baq0001jw0516ay9si6',
    'apply': True
}

print(f"Testing {url}...")
try:
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
