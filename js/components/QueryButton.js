// 查询按钮组件
// 处理查询操作和加载状态

class QueryButton {
    constructor(buttonId, options = {}) {
        this.button = document.getElementById(buttonId);
        this.options = {
            text: options.text || '确认查询',
            loadingText: options.loadingText || '查询中...',
            onClick: options.onClick || (() => {})
        };
        this.isLoading = false;
        this.render();
    }

    render() {
        if (!this.button) return;

        this.button.className = 'btn btn-primary btn-large';
        this.button.innerHTML = `
            <span class="btn-icon">🔍</span>
            <span class="btn-text">${this.options.text}</span>
        `;
        this.button.disabled = false;

        this.button.addEventListener('click', () => {
            if (!this.isLoading) {
                this.options.onClick();
            }
        });
    }

    setLoading(loading) {
        this.isLoading = loading;

        if (loading) {
            this.button.disabled = true;
            this.button.classList.add('loading');
            this.button.querySelector('.btn-text').textContent = this.options.loadingText;
            this.button.querySelector('.btn-icon').textContent = '⏳';
        } else {
            this.button.disabled = false;
            this.button.classList.remove('loading');
            this.button.querySelector('.btn-text').textContent = this.options.text;
            this.button.querySelector('.btn-icon').textContent = '🔍';
        }
    }

    setDisabled(disabled) {
        this.button.disabled = disabled;
    }

    getLoadingState() {
        return this.isLoading;
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.QueryButton = QueryButton;
}
