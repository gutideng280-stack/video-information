#!/usr/bin/env python3
import sys
print(f"Python version: {sys.version}")
print(f"Python executable: {sys.executable}")

# 尝试导入 requests 库
try:
    import requests
    print("✓ requests module found")
except ImportError as e:
    print(f"✗ requests module not found: {e}")

# 检查环境变量
import os
print("\nEnvironment variables:")
for key in sorted(os.environ.keys()):
    if 'GITHUB' in key.upper() or 'GH_' in key.upper() or 'TOKEN' in key.upper():
        print(f"  {key}: {'***' if len(os.environ[key]) > 10 else os.environ[key]}")

# 检查当前目录
print("\nCurrent directory:")
import os
print(f"  {os.getcwd()}")
print("  Files:")
for f in os.listdir('.'):
    print(f"    {f}")
