// Bilibili 数据获取服务
// 优先使用官方 API，备用页面爬取（当 CORS 限制时）
// API: https://api.bilibili.com/x/web-interface/view?bvid=BVxxxxx
//
// 注意：Bilibili API 有 CORS 限制（仅允许 bilibili.com 域名）。
// 需要通过 CORS 代理访问。请先部署 proxy/worker/index.js 作为代理。

const BilibiliService = {
    // CORS 代理地址（请部署 proxy/worker/index.js 后填入）
    // 示例: 'https://your-worker.workers.dev'
    PROXY_BASE: '',

    // Bilibili API 基础地址（通过代理访问）
    get API_BASE() {
        return this.PROXY_BASE
            ? `${this.PROXY_BASE}/api.bilibili.com/x/web-interface/view`
            : 'https://api.bilibili.com/x/web-interface/view';
    },

    // 每个请求的超时时间（毫秒）
    timeout: 15000,

    /**
     * 获取 Bilibili 视频数据（主入口）
     * @param {string} videoId - Bilibili 视频 ID (BV号 / av号 / 短链接ID)
     * @param {string} type - ID 类型 ('bv' | 'av' | 'short')
     * @returns {Promise<object>} - 视频数据对象
     */
    async fetchVideoData(videoId, type = 'bv') {
        try {
            let bvid = videoId;

            // AV号 → BV号 转换（API 只接受 BV 号）
            if (type === 'av') {
                const aid = parseInt(videoId.replace('av', ''));
                bvid = await this.avToBv(aid);
                if (!bvid) {
                    return this._errorResult(videoId, 'AV号转BV号失败');
                }
            }

            // 短链接 → 先解析出 BV号
            if (type === 'short') {
                bvid = await this.resolveShortUrl(videoId);
                if (!bvid) {
                    return this._errorResult(videoId, '短链接解析失败');
                }
            }

            // 使用 API 获取数据
            const realData = await this.fetchFromAPI(bvid);
            if (realData) {
                return {
                    platform: 'bilibili',
                    videoId: realData.bvid || bvid,
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

            return this._errorResult(videoId, 'Bilibili 数据获取失败，请稍后重试');
        } catch (error) {
            return this._errorResult(videoId, error.message || '获取数据失败');
        }
    },

    /**
     * 使用官方 API 获取视频数据（通过 CORS 代理）
     */
    async fetchFromAPI(bvid) {
        const url = `${this.API_BASE}?bvid=${bvid}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Referer': 'https://www.bilibili.com/',
                    'Origin': 'https://www.bilibili.com',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`API 请求失败: HTTP ${response.status}`);
                return null;
            }

            const json = await response.json();

            // 代理模式：检查响应是否是代理包装
            if (json._proxy) {
                // 代理返回了真实响应
                if (json.ok && json.data) {
                    return this.parseAPIResponse(json.data);
                }
                console.warn('代理返回错误:', json.error);
                return null;
            }

            // 直接 API 响应
            if (json.code !== 0 || !json.data) {
                console.warn(`API 返回错误: code=${json.code}, message=${json.message}`);
                return null;
            }

            return this.parseAPIResponse(json.data);
        } catch (error) {
            console.warn('API 获取失败:', error.message);
            return null;
        }
    },

    /**
     * 解析官方 API 返回的数据
     */
    parseAPIResponse(apiData) {
        const videoData = apiData;
        const stat = videoData.stat || {};

        return {
            bvid: videoData.bvid || '',
            title: videoData.title || '',
            author: videoData.owner?.name || videoData.author || '',
            thumbnail: videoData.pic
                ? (videoData.pic.startsWith('http') ? videoData.pic : `https:${videoData.pic}`)
                : '',
            publishTime: videoData.pubdate ? this.formatTimestamp(videoData.pubdate) : '',
            viewCount: stat.view || 0,
            likeCount: stat.like || 0,
            commentCount: stat.reply || 0,
            shareCount: stat.share || 0,
            favoriteCount: stat.favorite || 0,
            coinCount: stat.coin || 0
        };
    },

    /**
     * AV号转BV号（使用 Bilibili API）
     */
    async avToBv(aid) {
        const url = this.API_BASE.includes('/proxy/')
            ? `${this.API_BASE.replace('/x/web-interface/view', '')}/api.bilibili.com/x/web-interface/view?aid=${aid}`
            : `https://api.bilibili.com/x/web-interface/view?aid=${aid}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(url, {
                headers: {
                    'Referer': 'https://www.bilibili.com/',
                    'Origin': 'https://www.bilibili.com',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) return null;

            const json = await response.json();

            // 代理包装
            if (json._proxy && json.ok) json = json.data;

            return json.data?.bvid || null;
        } catch (error) {
            console.warn('AV转BV失败:', error.message);
            return null;
        }
    },

    /**
     * 解析 b23.tv 短链接，获取真实 BV号
     */
    async resolveShortUrl(shortId) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`https://b23.tv/${shortId}`, {
                method: 'GET',
                redirect: 'follow',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // 从最终 URL 中提取 BV号
            const finalUrl = response.url;
            const bvMatch = finalUrl.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
            if (bvMatch) return bvMatch[1];

            // 备用：从 location header
            const locationMatch = response.headers.get('location') || '';
            const bvFromHeader = locationMatch.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
            if (bvFromHeader) return bvFromHeader[1];

            return null;
        } catch (error) {
            console.warn('短链接解析失败:', error.message);
            return null;
        }
    },

    /**
     * 统一返回错误结果
     */
    _errorResult(videoId, message) {
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
            errorMessage: message
        };
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
