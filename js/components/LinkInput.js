// 链接输入组件
// 支持动态添加和删除链接输入框，每个输入框可选择平台

class LinkInput {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            maxItems: options.maxItems || 10,
            minItems: options.minItems || 3,
            onChange: options.onChange || (() => {})
        };
        
        this.items = [];
        this.nextId = 1;
        
        this.init();
    }

    init() {
        // 初始化默认的输入框
        // 前3个默认为YouTube平台，第4个默认为Bilibili平台
        if (this.options.minItems >= 1) {
            this.addItem('', 'youtube');
        }
        if (this.options.minItems >= 2) {
            this.addItem('', 'youtube');
        }
        if (this.options.minItems >= 3) {
            this.addItem('', 'youtube');
        }
        if (this.options.minItems >= 4) {
            this.addItem('', 'bilibili');
        }
        for (let i = 4; i < this.options.minItems; i++) {
            this.addItem();
        }
        this.render();
    }

    addItem(url = '', platform = 'youtube') {
        if (this.items.length >= this.options.maxItems) {
            alert(`最多只能添加 ${this.options.maxItems} 个链接`);
            return;
        }

        const item = {
            id: this.nextId++,
            url: url,
            platform: platform
        };

        this.items.push(item);
        this.render();
        this.options.onChange(this.getValues());
    }

    removeItem(id) {
        if (this.items.length <= 1) {
            alert('至少需要保留一个输入框');
            return;
        }

        this.items = this.items.filter(item => item.id !== id);
        this.render();
        this.options.onChange(this.getValues());
    }

    updateItem(id, data) {
        const item = this.items.find(item => item.id === id);
        if (item) {
            if (data.url !== undefined) {
                item.url = data.url;
            }
            if (data.platform !== undefined) {
                item.platform = data.platform;
            }
            this.options.onChange(this.getValues());
        }
    }

    getValues() {
        return this.items.map(item => ({
            id: item.id,
            platform: item.platform,
            url: item.url.trim()
        })).filter(item => item.url.length > 0);
    }

    getAllValues() {
        return this.items.map(item => ({
            id: item.id,
            platform: item.platform,
            url: item.url.trim()
        }));
    }

    render() {
        const html = `
            <div class="link-inputs-container">
                ${this.items.map((item, index) => this.renderInputItem(item, index)).join('')}
            </div>
        `;

        this.container.innerHTML = html;
        this.bindEvents();
    }

    renderInputItem(item, index) {
        return `
            <div class="link-input-item" data-id="${item.id}">
                <span class="input-number">${index + 1}</span>
                <select class="platform-select" data-id="${item.id}">
                    <option value="youtube" ${item.platform === 'youtube' ? 'selected' : ''}>
                        ▶ YouTube
                    </option>
                    <option value="bilibili" ${item.platform === 'bilibili' ? 'selected' : ''}>
                        📺 Bilibili
                    </option>
                    <option value="twitter" ${item.platform === 'twitter' ? 'selected' : ''}>
                        🐦 Twitter
                    </option>
                </select>
                <input 
                    type="url" 
                    class="link-input" 
                    placeholder="${this.getPlaceholder(item.platform)}"
                    value="${item.url}"
                    aria-label="视频链接 ${index + 1}"
                />
                ${this.items.length > 1 ? `
                    <button class="remove-btn" aria-label="删除">
                        <span>×</span>
                    </button>
                ` : ''}
            </div>
        `;
    }

    getPlaceholder(platform) {
        if (platform === 'youtube') {
            return 'https://www.youtube.com/watch?v=xxxx';
        } else if (platform === 'bilibili') {
            return 'https://www.bilibili.com/video/BV1xx';
        } else if (platform === 'twitter') {
            return 'https://x.com/user/status/xxxx';
        }
        return '输入视频链接';
    }

    bindEvents() {
        const inputs = this.container.querySelectorAll('.link-input');
        const selects = this.container.querySelectorAll('.platform-select');
        const removeButtons = this.container.querySelectorAll('.remove-btn');

        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const itemId = parseInt(e.target.closest('.link-input-item').dataset.id);
                this.updateItem(itemId, { url: e.target.value });
            });
        });

        selects.forEach(select => {
            select.addEventListener('change', (e) => {
                const itemId = parseInt(e.target.dataset.id);
                this.updateItem(itemId, { platform: e.target.value });
                // 更新对应的 placeholder
                const input = e.target.closest('.link-input-item').querySelector('.link-input');
                input.placeholder = this.getPlaceholder(e.target.value);
            });
        });

        removeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = parseInt(e.target.closest('.link-input-item').dataset.id);
                this.removeItem(itemId);
            });
        });
    }

    validate() {
        const values = this.getValues();
        
        if (values.length === 0) {
            return {
                valid: false,
                message: '请至少输入一个有效的视频链接'
            };
        }

        if (values.length > this.options.maxItems) {
            return {
                valid: false,
                message: `最多只能查询 ${this.options.maxItems} 个视频`
            };
        }

        // 检查链接格式
        for (const item of values) {
            if (!LinkParser.isValidUrl(item.url)) {
                return {
                    valid: false,
                    message: '存在无效的链接格式，请检查输入'
                };
            }
        }

        return {
            valid: true,
            count: values.length
        };
    }

    getInvalidItems() {
        const values = this.getAllValues();
        return values.filter(item => !LinkParser.isValidUrl(item.url));
    }

    reset() {
        this.items = [];
        this.nextId = 1;
        // 前3个默认为YouTube平台，第4个默认为Bilibili平台
        if (this.options.minItems >= 1) {
            this.addItem('', 'youtube');
        }
        if (this.options.minItems >= 2) {
            this.addItem('', 'youtube');
        }
        if (this.options.minItems >= 3) {
            this.addItem('', 'youtube');
        }
        if (this.options.minItems >= 4) {
            this.addItem('', 'bilibili');
        }
        for (let i = 4; i < this.options.minItems; i++) {
            this.addItem();
        }
        this.render();
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.LinkInput = LinkInput;
}
