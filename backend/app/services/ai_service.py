import os
import json
from typing import Dict, List, Any, Optional
import asyncio
import time

class AIService:
    """AI 服务封装：支持 Mock 模式和真实 API"""

    def __init__(self, use_mock: bool = True, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.use_mock = use_mock
        self.api_key = api_key
        self.base_url = base_url

    async def chat(self, messages: List[Dict], model: Optional[str] = None) -> Dict[str, Any]:
        """AI 聊天接口"""
        if self.use_mock or not self.api_key or self.api_key == "mock":
            return await self._mock_response(messages)
        return await self._real_request(messages, model)

    async def _mock_response(self, messages: List[Dict]) -> Dict[str, Any]:
        """模拟 AI 响应"""
        last_message = ""
        for msg in messages:
            if msg.get("role") == "user":
                last_message = msg.get("content", "")

        # 模拟延迟
        await asyncio.sleep(0.3)

        return {
            "content": self._generate_mock_content(last_message),
            "model": "mock-model",
            "usage": {
                "prompt_tokens": 100,
                "completion_tokens": 200,
                "total_tokens": 300
            }
        }

    def _generate_mock_content(self, message: str) -> str:
        """根据消息内容生成合理的 Mock 响应"""
        message_lower = message.lower()

        if "分析" in message or "需求" in message:
            return self._mock_analyze_response()
        elif "代码" in message or "生成" in message:
            return self._mock_code_response()
        elif "审查" in message or "review" in message_lower:
            return self._mock_review_response()
        elif "修复" in message or "fix" in message_lower:
            return self._mock_fix_response()
        elif "文章" in message or "内容" in message:
            return self._mock_article_response()
        elif "翻译" in message or "translate" in message_lower:
            return self._mock_translation_response()
        elif "测试" in message or "test" in message_lower:
            return self._mock_test_response()
        else:
            return "Mock 响应：任务执行完成。\n\n这是模拟的输出内容，展示了 AI 处理的结果。在实际运行时，这里会显示真实 AI 模型的输出。"

    def _mock_analyze_response(self) -> str:
        return """# 需求分析结果

## 功能需求
1. 用户认证功能（注册、登录、登出）
2. 数据管理功能（增删改查）
3. 权限管理功能（角色、权限分配）

## 技术选型建议
- 后端框架：Python Flask
- 数据库：SQLite（开发）/ PostgreSQL（生产）
- 认证：JWT Token
- API 风格：RESTful

## 数据库设计
### users 表
- id: INTEGER PRIMARY KEY
- username: VARCHAR(50) UNIQUE
- email: VARCHAR(100) UNIQUE
- password_hash: VARCHAR(255)
- created_at: DATETIME

## API 端点设计
- POST /api/register - 用户注册
- POST /api/login - 用户登录
- GET /api/profile - 获取用户信息
- PUT /api/profile - 更新用户信息
"""

    def _mock_code_response(self) -> str:
        return """# 生成的代码

```python
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400

    password_hash = generate_password_hash(password)
    user = User(username=username, email=email, password_hash=password_hash)
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'User created successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(days=1)
    }, app.config['SECRET_KEY'])

    return jsonify({'token': token}), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
```

## 说明
- 使用 Flask + SQLAlchemy 实现用户认证
- 密码使用 werkzeug 进行哈希存储
- 使用 JWT 进行身份验证
- 包含注册和登录两个核心接口
"""

    def _mock_review_response(self) -> str:
        return """# 代码审查报告

## 发现的问题

### 1. 安全问题（严重）
- ❌ 硬编码的 SECRET_KEY：`'your-secret-key'`
- ❌ 密码哈希使用 `werkzeug` 而不是专门的密码哈希库
- ❌ JWT token 没有使用 HTTPS 传输保护

### 2. 代码规范问题
- ⚠️ 缺少输入验证和错误处理
- ⚠️ 没有 API 速率限制
- ⚠️ 数据库操作缺少事务管理

### 3. 改进建议
- ✅ 使用环境变量存储 SECRET_KEY
- ✅ 添加输入验证（用户名长度、邮箱格式、密码强度）
- ✅ 添加错误处理中间件
- ✅ 添加 API 速率限制
- ✅ 使用 `flask-bcrypt` 替代 `werkzeug` 进行密码哈希

## 修复优先级
1. 安全问题（必须修复）
2. 错误处理（建议修复）
3. 代码规范（可选修复）
"""

    def _mock_fix_response(self) -> str:
        return """# 修复后的代码

```python
import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
import jwt
from datetime import datetime, timedelta
from functools import wraps
import re

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(24))
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

def validate_input(data):
    """输入验证"""
    username = data.get('username', '')
    email = data.get('email', '')
    password = data.get('password', '')

    if not re.match(r'^[a-zA-Z0-9_]{3,50}$', username):
        return False, 'Invalid username format'
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return False, 'Invalid email format'
    if len(password) < 8:
        return False, 'Password must be at least 8 characters'
    return True, None

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()

    is_valid, error = validate_input(data)
    if not is_valid:
        return jsonify({'error': error}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400

    password_hash = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    user = User(username=data['username'], email=data['email'], password_hash=password_hash)
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'User created successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()

    user = User.query.filter_by(username=data.get('username')).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, data.get('password')):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(days=1)
    }, app.config['SECRET_KEY'])

    return jsonify({'token': token}), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
```

## 修复说明
- ✅ 使用 `python-dotenv` 和环境变量管理敏感信息
- ✅ 使用 `flask-bcrypt` 进行密码哈希
- ✅ 添加输入验证（用户名、邮箱、密码格式）
- ✅ 添加错误处理
- ✅ 代码结构更清晰
"""

    def _mock_article_response(self) -> str:
        return """# AI 发展的现状与未来展望

## 引言

人工智能（AI）在过去的十年中经历了前所未有的发展。从深度学习的技术突破到大规模语言模型的广泛应用，AI 正在重塑我们的工作方式、生活习惯和社会结构。本文将探讨 AI 发展的现状、主要应用场景以及未来的发展趋势。

## AI 发展的现状

### 1. 大语言模型的崛起

2020 年以来，以 GPT、Claude、MiMo 等为代表的大语言模型（LLM）取得了突破性进展。这些模型展现出了惊人的能力：

- **文本理解与生成**：能够理解复杂的自然语言指令，并生成高质量的文本
- **推理能力**：能够进行逻辑推理、数学计算和代码生成
- **多模态能力**：部分模型已经能够理解图像、音频等多种模态的输入

### 2. AI 在各行业的应用

- **医疗健康**：AI 辅助诊断、药物研发、医学影像分析
- **教育培训**：个性化学习、智能辅导、自动评分
- **金融服务**：风险评估、欺诈检测、智能投顾
- **制造业**：质量检测、预测性维护、供应链优化

## 主要挑战

尽管 AI 发展迅速，但仍面临诸多挑战：

1. **数据隐私与安全**：如何在使用数据的同时保护用户隐私
2. **算法偏见**：如何确保 AI 决策的公平性和透明度
3. **能源消耗**：大模型的训练和推理需要大量计算资源
4. **就业影响**：AI 自动化可能替代部分传统工作岗位

## 未来展望

### 1. 通用人工智能（AGI）的探索

当前的 AI 系统大多是"窄领域"的，即擅长特定任务。未来的研究方向是实现通用人工智能，即能够像人类一样灵活适应各种任务的 AI 系统。

### 2. 人机协作的新模式

AI 不会完全替代人类，而是与人类形成更紧密的协作关系。未来的工作模式将是"人类 + AI"的协同模式。

### 3. AI 伦理与治理

随着 AI 的影响越来越大，建立健全的 AI 伦理规范和治理体系变得尤为重要。这包括：

- 制定 AI 开发和使用的国际标准
- 建立 AI 系统的审计和问责机制
- 促进 AI 技术的公平和普惠

## 结语

AI 的发展正处于一个关键的历史节点。我们既要看到 AI 带来的巨大机遇，也要正视其带来的挑战。通过技术创新、政策引导和公众参与，我们有望构建一个人类与 AI 和谐共处的美好未来。

---

*本文由 AI 辅助创作，展示了 AI 在内容生成领域的应用潜力。*
"""

    def _mock_translation_response(self) -> str:
        return """# 翻译结果

## 原文（中文）
人工智能是计算机科学的一个分支，它试图理解智能的本质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。

## 译文（英文）
Artificial Intelligence is a branch of computer science that attempts to understand the essence of intelligence and produce a new kind of intelligent machine that can respond in ways similar to human intelligence.

## 译文（日文）
人工知能は計算機科学の一分野であり、知能の本質を理解し、人間の知能と似た方法で反応できる新しい種類の知能機械を生み出そうとするものである。

## 译文（法文）
L'intelligence artificielle est une branche de l'informatique qui tente de comprendre la nature de l'intelligence et de produire un nouveau type de machine intelligente capable de réagir d'une manière similaire à l'intelligence humaine.

## 翻译质量评估
- ✅ 准确性：高
- ✅ 流畅度：高
- ✅ 文化适应性：良好
"""

    def _mock_test_response(self) -> str:
        return """# 测试用例生成结果

## 测试目标
用户认证模块（注册、登录）

## 生成的测试用例

### 1. 用户注册测试

| 用例 ID | 测试场景 | 输入 | 预期结果 |
|---------|---------|------|----------|
| TC-001 | 正常注册 | 用户名：testuser，邮箱：test@example.com，密码：Test@123456 | 注册成功，返回 201 |
| TC-002 | 用户名已存在 | 用户名：existing（已注册），其他信息有效 | 注册失败，返回 400 |
| TC-003 | 邮箱格式无效 | 邮箱：invalid-email | 注册失败，返回 400 |
| TC-004 | 密码强度不足 | 密码：123 | 注册失败，返回 400 |
| TC-005 | 缺少必填字段 | 不提供用户名 | 注册失败，返回 400 |

### 2. 用户登录测试

| 用例 ID | 测试场景 | 输入 | 预期结果 |
|---------|---------|------|----------|
| TC-006 | 正常登录 | 用户名：testuser，密码：Test@123456 | 登录成功，返回 token |
| TC-007 | 密码错误 | 用户名：testuser，密码：wrongpassword | 登录失败，返回 401 |
| TC-008 | 用户不存在 | 用户名：nonexistent | 登录失败，返回 401 |

## 自动化测试脚本

```python
import unittest
import json
from app import app

class TestAuth(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_register_success(self):
        response = self.app.post('/api/register',
            data=json.dumps({
                'username': 'testuser',
                'email': 'test@example.com',
                'password': 'Test@123456'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)

    def test_login_success(self):
        # 先注册
        self.app.post('/api/register', ...)

        # 再登录
        response = self.app.post('/api/login', ...)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('token', data)

if __name__ == '__main__':
    unittest.main()
```

## 测试覆盖率
- 注册功能：95%
- 登录功能：90%
- 输入验证：100%
"""

    async def _real_request(self, messages: List[Dict], model: Optional[str]) -> Dict[str, Any]:
        """真实 API 请求（预留）"""
        # TODO: 实现真实的 OpenAI 兼容 API 调用
        # 现在返回 mock 数据
        return await self._mock_response(messages)
