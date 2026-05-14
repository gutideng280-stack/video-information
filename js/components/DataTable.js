// 数据表格组件
// 展示视频查询结果，支持排序和响应式显示

class DataTable {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            onSort: options.onSort || (() => {})
        };
        this.data = [];
        this.sortColumn = null;
        this.sortDirection = 'desc';
        this.render();
    }

    setData(data) {
        this.data = data;
        this.render();
    }

    addData(newData) {
        this.data = [...this.data, ...newData];
        this.render();
    }

    clearData() {
        this.data = [];
        this.render();
    }

    sortBy(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'desc';
        }

        // 排序数据
        this.data.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // 处理空值
            if (aVal === null || aVal === undefined) aVal = 0;
            if (bVal === null || bVal === undefined) bVal = 0;

            // 数字排序
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }

            // 字符串排序
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.render();
        this.options.onSort(this.sortColumn, this.sortDirection);
    }

    render() {
        if (!this.container) return;

        if (this.data.length === 0) {
            this.renderEmpty();
            return;
        }

        const html = `
            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 50px;">#</th>
                            <th>平台</th>
                            <th>标题</th>
                            <th class="sortable" data-column="publishTime">
                                发布时间 ${this.getSortIcon('publishTime')}
                            </th>
                            <th class="sortable" data-column="likeCount">
                                点赞数 ${this.getSortIcon('likeCount')}
                            </th>
                            <th class="sortable" data-column="commentCount">
                                评论数 ${this.getSortIcon('commentCount')}
                            </th>
                            <th class="sortable" data-column="shareCount">
                                转发数 ${this.getSortIcon('shareCount')}
                            </th>
                            <th class="sortable" data-column="viewCount">
                                播放数 ${this.getSortIcon('viewCount')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.data.map((item, index) => this.renderRow(item, index)).join('')}
                    </tbody>
                </table>
            </div>
            <div class="table-summary">
                <p>共 ${this.data.length} 条数据 | 成功: ${this.data.filter(r => r.status === 'success').length} | 失败: ${this.data.filter(r => r.status === 'error').length}</p>
                <p class="data-source-note">💡 提示：YouTube 不提供转发数，Bilibili 转发数由 API 直接提供，Twitter 使用模拟数据测试</p>
            </div>
        `;

        this.container.innerHTML = html;
        this.bindEvents();
    }

    renderRow(item, index) {
        if (item.status === 'error') {
            return `
                <tr class="error-row">
                    <td>${index + 1}</td>
                    <td>${this.renderPlatformBadge(item.platform)}</td>
                    <td colspan="6">
                        <div class="error-message">
                            <span>❌</span>
                            <span>${item.errorMessage || '获取数据失败'}</span>
                            <span style="margin-left: 1rem; color: var(--text-muted); font-size: 0.85rem;">
                                (${item.videoId})
                            </span>
                        </div>
                    </td>
                </tr>
            `;
        }

        const dataSourceLabel = this.getDataSourceLabel(item.dataSource);
        
        return `
            <tr>
                <td>${index + 1}</td>
                <td>
                    ${this.renderPlatformBadge(item.platform)}
                    ${dataSourceLabel ? `<span class="data-source-tag">${dataSourceLabel}</span>` : ''}
                </td>
                <td>
                    <div class="video-title" title="${this.escapeHtml(item.title)}">
                        <a href="${LinkParser.getVideoUrl(item.platform, item.videoId)}" 
                           target="_blank" 
                           class="video-link">
                            ${this.escapeHtml(item.title)}
                        </a>
                    </div>
                </td>
                <td>${this.formatDate(item.publishTime)}</td>
                <td>
                    <span class="stat-value">${this.formatNumber(item.likeCount)}</span>
                </td>
                <td>
                    <span class="stat-value">${this.formatNumber(item.commentCount)}</span>
                </td>
                <td>
                    <span class="stat-value">${item.shareCount !== null ? this.formatNumber(item.shareCount) : '-'}</span>
                </td>
                <td>
                    <span class="stat-value">${this.formatNumber(item.viewCount)}</span>
                </td>
            </tr>
        `;
    }
    
    getDataSourceLabel(dataSource) {
        if (dataSource === 'mock') {
            return '📋 模拟';
        } else if (dataSource === 'page') {
            return '📄 页面';
        } else if (dataSource === 'api') {
            return '🔌 API';
        }
        return '';
    }

    renderPlatformBadge(platform) {
        const platformNames = {
            'youtube': 'YouTube',
            'bilibili': '哔哩哔哩',
            'twitter': 'Twitter'
        };
        const platformName = platformNames[platform] || platform;
        return `<span class="platform-badge ${platform}">${platformName}</span>`;
    }

    renderEmpty() {
        this.container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <p class="empty-state-text">暂无数据，请点击"确认查询"获取视频数据</p>
            </div>
        `;
    }

    getSortIcon(column) {
        if (this.sortColumn !== column) {
            return '⇅';
        }
        return this.sortDirection === 'asc' ? '↑' : '↓';
    }

    bindEvents() {
        const headers = this.container.querySelectorAll('th.sortable');
        
        headers.forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.column;
                this.sortBy(column);
            });
        });
    }

    formatNumber(num) {
        if (num === null || num === undefined || num === 0) return '-';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    formatDate(isoDate) {
        if (!isoDate) return '-';
        try {
            const date = new Date(isoDate);
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch {
            return '-';
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.DataTable = DataTable;
}
