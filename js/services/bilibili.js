// Bilibili 数据获取服务
// 使用哔哩哔哩公开 API + CORS 代理获取视频统计数据

const BilibiliService = {
    // CORS 代理列表（Bilibili API 不支持 CORS，必须用代理）
    corsProxies: [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
        'https://thingproxy.freeboard.io/fetch/'
    ],

    // 每个代理的超时时间（毫秒）
    proxyTimeout: 8000,

    /**
     * 获取 Bilibili 视频数据
     * @param {string} videoId - Bilibili 视频 ID (BV号)
     * @param {string} type - ID 类型 ('bv' | 'av' | 'short')
     * @returns {Promise<object>} - 视频数据对象
     */
    async fetchVideoData(videoId, type = 'bv') {
        try {
            const realData = await this.fetchRealData(videoId, type);
            if (realData) {
                return {
                    platform: 'bilibili',
                    videoId: realData.bvid || videoId,
                    title: realData.title,
                    author: realData.author,
                    thumbnail: realData.thumbnail,
                    publishTime: realData.publishTime,
                    viewCount: realData.viewCount,
                    likeCount: realData.likeCount,
                    commentCount: realData.commentCount,
                    shareCount: realData.shareCount,
                    favoriteCount: realData.favoriteCount,
                    coinCount: realData.coinCount,
                    dataSource: 'api',
                    status: 'success'
                };
            }

            return {
                platform: 'bilibili',
                videoId,
                title: '',
                author: '',
                thumbnail: '',
                publishTime: '',
                viewCount: 0,
                likeCount: 0,
                commentCount: 0,
                shareCount: 0,
                favoriteCount: 0,
                coinCount: 0,
                dataSource: 'failed',
                status: 'error',
                errorMessage: 'Bilibili API 暂不可用，请稍后重试'
            };
        } catch (error) {
            return {
                platform: 'bilibili',
                videoId,
                title: '',
                author: '',
                thumbnail: '',
                publishTime: '',
                viewCount: 0,
                likeCount: 0,
                commentCount: 0,
                shareCount: 0,
                favoriteCount: 0,
                coinCount: 0,
                dataSource: 'error',
                status: 'error',
                errorMessage: error.message || '获取数据失败'
            };
        }
    },

    /**
     * 尝试获取真实数据（通过代理）
     */
    async fetchRealData(videoId, type) {
        if (type === 'short') {
            throw new Error('短链接解析暂不可用');
        }

        let apiUrl;
        if (type === 'av') {
            const aid = parseInt(videoId.replace('av', ''));
            apiUrl = `https://api.bilibili.com/x/web-interface/view?aid=${aid}`;
        } else {
            apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${videoId}`;
        }

        for (let i = 0; i < this.corsProxies.length; i++) {
            try {
                const proxyUrl = this.corsProxies[i] + encodeURIComponent(apiUrl);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.proxyTimeout);

                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const result = await response.json();

                if (result.code === -404 || result.code === 62002) {
                    throw new Error('视频不存在或已被删除');
                }
                if (result.code === -412) {
                    throw new Error('请求被B站限制，请稍后重试');
                }
                if (result.code !== 0 || !result.data) {
                    throw new Error(result.message || 'API 返回错误');
                }

                const videoInfo = result.data;
                return {
                    bvid: videoInfo.bvid,
                    title: videoInfo.title || '未知标题',
                    author: videoInfo.owner?.name || '未知UP主',
                    thumbnail: videoInfo.pic ? `https:${videoInfo.pic}` : '',
                    publishTime: this.formatTimestamp(videoInfo.pubdate),
                    viewCount: videoInfo.stat?.view || 0,
                    likeCount: videoInfo.stat?.like || 0,
                    commentCount: videoInfo.stat?.reply || 0,
                    shareCount: videoInfo.stat?.share || 0,
                    favoriteCount: videoInfo.stat?.favorite || 0,
                    coinCount: videoInfo.stat?.coin || 0,
                    duration: videoInfo.duration || 0,
                    description: videoInfo.desc || ''
                };
            } catch (error) {
                console.warn(`代理 ${i + 1} 失败: ${error.message}`);
                continue;
            }
        }

        throw new Error('Bilibili API 暂不可用');
    },

    /**
     * 格式化时间戳
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return new Date().toISOString();
        return new Date(timestamp * 1000).toISOString();
    },

    /**
     * 格式化数字（添加千分位）
     */
    formatNumber(num) {
        if (num === null || num === undefined) return '-';
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    /**
     * 格式化日期
     */
    formatDate(isoDate) {
        if (!isoDate) return '-';
        try {
            const date = new Date(isoDate);
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '-';
        }
    }
};

// 导出到全局
if (typeof window !== 'undefined') {
    window.BilibiliService = BilibiliService;
}
