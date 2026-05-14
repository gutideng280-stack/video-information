// Bilibili 数据获取服务
// 使用哔哩哔哩公开 API 获取视频统计数据

const BilibiliService = {
    // CORS 代理列表
    corsProxies: [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?'
    ],

    /**
     * 获取 Bilibili 视频数据
     * @param {string} videoId - Bilibili 视频 ID (BV号)
     * @param {string} type - ID 类型 ('bv' | 'av' | 'short')
     * @returns {Promise<object>} - 视频数据对象
     */
    async fetchVideoData(videoId, type = 'bv') {
        try {
            // 1. 尝试获取真实数据
            const realData = await this.fetchRealData(videoId, type);
            if (realData) {
                console.log(`✅ 获取 Bilibili 真实数据成功: ${videoId}`);
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
                    dataSource: 'real',
                    status: 'success'
                };
            }

            // 2. 如果获取失败，返回错误
            console.warn(`⚠️ 无法获取 Bilibili 视频数据: ${videoId}`);
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
                errorMessage: '无法获取数据（可能视频不存在或网络问题）'
            };
        } catch (error) {
            console.error(`❌ 获取 Bilibili 视频 ${videoId} 数据失败:`, error);
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
     * 尝试获取真实数据
     */
    async fetchRealData(videoId, type) {
        // 处理短链接
        if (type === 'short') {
            const resolved = await this.resolveShortUrl(videoId);
            if (resolved) {
                videoId = resolved.bvid;
                type = 'bv';
            } else {
                throw new Error('短链接解析失败');
            }
        }

        // 构建 API URL
        let apiUrl;
        if (type === 'av') {
            const aid = parseInt(videoId.replace('av', ''));
            apiUrl = `https://api.bilibili.com/x/web-interface/view?aid=${aid}`;
        } else {
            apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${videoId}`;
        }

        // 尝试通过多个代理获取
        for (let i = 0; i < this.corsProxies.length; i++) {
            try {
                const data = await this.fetchApi(apiUrl, i);
                
                if (data.code === 0 && data.data) {
                    const videoInfo = data.data;
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
                } else {
                    console.warn(`API 返回错误: ${data.message}`);
                }
            } catch (e) {
                console.warn(`代理 ${i + 1} 获取数据失败:`, e.message);
                continue;
            }
        }

        return null;
    },

    /**
     * 通过代理获取 API 数据
     */
    async fetchApi(url, proxyIndex = 0) {
        const proxyUrl = this.corsProxies[proxyIndex] + encodeURIComponent(url);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        try {
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

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    },

    /**
     * 解析短链接
     */
    async resolveShortUrl(shortCode) {
        for (let i = 0; i < this.corsProxies.length; i++) {
            try {
                const url = `https://b23.tv/${shortCode}`;
                const proxyUrl = this.corsProxies[i] + encodeURIComponent(url);
                
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    redirect: 'follow'
                });

                const finalUrl = response.url;
                const bvMatch = finalUrl.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
                if (bvMatch) {
                    return { bvid: bvMatch[1], url: finalUrl };
                }
            } catch (e) {
                console.warn(`代理 ${i + 1} 解析短链接失败`);
                continue;
            }
        }
        return null;
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
