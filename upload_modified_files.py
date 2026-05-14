import os
import base64
import requests
from pathlib import Path

# 使用环境变量中的GitHub Token（Trae应该会自动提供）
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
REPO_OWNER = 'gutideng280-stack'
REPO_NAME = 'video-information'
BRANCH = 'main'
COMMIT_MESSAGE = 'Adjust default settings to 4 input boxes (3 YouTube + 1 Bilibili)'

if not GITHUB_TOKEN:
    print("错误：未找到 GitHub Token")
    print("请设置 GITHUB_TOKEN 环境变量")
    exit(1)

BASE_URL = f'https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}'
HEADERS = {
    'Authorization': f'token {GITHUB_TOKEN}',
    'Accept': 'application/vnd.github.v3+json'
}

def get_file_sha(path):
    url = f'{BASE_URL}/contents/{path}'
    response = requests.get(url, headers=HEADERS)
    if response.status_code == 200:
        return response.json().get('sha')
    return None

def upload_file(local_path, repo_path, commit_message=COMMIT_MESSAGE):
    with open(local_path, 'rb') as f:
        content = base64.b64encode(f.read()).decode('utf-8')
    
    sha = get_file_sha(repo_path)
    
    data = {
        'message': commit_message,
        'content': content,
        'branch': BRANCH
    }
    if sha:
        data['sha'] = sha
    
    url = f'{BASE_URL}/contents/{repo_path}'
    response = requests.put(url, json=data, headers=HEADERS)
    
    if response.status_code in [200, 201]:
        print(f'✅ {repo_path}')
        return True
    else:
        print(f'❌ {repo_path}: {response.status_code} - {response.text}')
        return False

# 主程序
print('=' * 50)
print('Upload Modified Files')
print('=' * 50)
print()

# 需要上传的文件列表
files_to_upload = [
    ('js/app.js', 'js/app.js'),
    ('js/components/LinkInput.js', 'js/components/LinkInput.js')
]

# 上传所有文件
print('开始上传修改过的文件...')
print()
success_count = 0
fail_count = 0

for local_path, repo_path in files_to_upload:
    file_path = Path(local_path)
    if file_path.exists():
        if upload_file(local_path, repo_path):
            success_count += 1
        else:
            fail_count += 1
    else:
        print(f'⚠️ 文件不存在: {local_path}')
        fail_count += 1

print()
print('=' * 50)
print(f'上传完成! 成功: {success_count}, 失败: {fail_count}')
print('=' * 50)
print()
print(f'您的项目: https://github.com/{REPO_OWNER}/{REPO_NAME}')
