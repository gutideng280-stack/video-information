import os
import base64
import requests
from pathlib import Path

GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN', '')
REPO_OWNER = 'gutideng280-stack'
REPO_NAME = 'video-information'
BRANCH = 'main'

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

def upload_file(local_path, repo_path):
    with open(local_path, 'rb') as f:
        content = base64.b64encode(f.read()).decode('utf-8')
    
    sha = get_file_sha(repo_path)
    
    data = {
        'message': f'Upload {repo_path}',
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

def upload_directory(local_dir, repo_prefix=''):
    success_count = 0
    fail_count = 0
    
    for root, dirs, files in os.walk(local_dir):
        # 跳过 .trae 目录
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        for file in files:
            # 跳过 .bat 文件
            if file.endswith('.bat'):
                continue
            
            local_path = os.path.join(root, file)
            relative_path = os.path.relpath(local_path, local_dir)
            
            if repo_prefix:
                repo_path = f'{repo_prefix}/{relative_path}'.replace('\\', '/')
            else:
                repo_path = relative_path.replace('\\', '/')
            
            if upload_file(local_path, repo_path):
                success_count += 1
            else:
                fail_count += 1
    
    return success_count, fail_count

# 主程序
print('=' * 50)
print('GitHub Upload Script')
print('=' * 50)
print()

# 上传根目录文件
root_files = ['index.html', 'README.md', '.gitignore']
print('[1/3] 上传根目录文件...')
for file in root_files:
    file_path = Path(file)
    if file_path.exists():
        upload_file(file, file)

print()

# 上传 css 目录
print('[2/3] 上传 css 目录...')
css_files = list(Path('css').glob('*.css'))
for file in css_files:
    upload_file(file, f'css/{file.name}')

print()

# 上传 js 目录
print('[3/3] 上传 js 目录...')
js_dir = Path('js')
for subdir in ['components', 'services', 'utils']:
    subdir_path = js_dir / subdir
    if subdir_path.exists():
        for file in subdir_path.glob('*.js'):
            upload_file(file, f'js/{subdir}/{file.name}')

print()
print('=' * 50)
print('Upload Complete!')
print('=' * 50)
print()
print('Your project: https://github.com/gutideng280-stack/video-information')
