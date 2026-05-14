// Bilibili 数据获取服务
// 使用页面爬取方式获取视频统计数据（Bilibili API 不支持 CORS）

const BilibiliService = {
    // CORS 代理列表
    corsProxies: [
        'https://corsproxy.io/?url=',
        'https://api.allorigins.win/raw?url=',
        'https://thingproxy.freeboard.io/fetch/'
    ],

    // 每个代理的超时时间（毫秒）
    proxyTimeout: 10000,

    /**
     * 获取 Bilibili 视频数据
     * @param {string} videoId - Bilibili 视频 ID (BV号)
     * @param {string} type - ID 类型 ('bv' | 'av' | 'short')
     * @returns {Promise<object>} - 视频数据对象
     */
    async fetchVideoData(videoId, type = 'bv') {
        try {
            const realData = await this.fetchFromPage(videoId, type);
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
                    dataSource: 'page',
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
     * 从 Bilibili 页面爬取数据
     */
    async fetchFromPage(videoId, type) {
        let pageUrl;
        if (type === 'av') {
            pageUrl = `https://www.bilibili.com/video/av${videoId.replace('av', '')}`;
        } else if (type === 'short') {
            throw new Error('短链接解析暂不可用');
        } else {
            pageUrl = `https://www.bilibili.com/video/${videoId}`;
        }

        for (let i = 0; i < this.corsProxies.length; i++) {
            try {
                const proxyUrl = this.corsProxies[i] + encodeURIComponent(pageUrl);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.proxyTimeout);

                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const html = await response.text();
                const data = this.parseBilibiliPage(html);

                if (data && data.bvid) {
                    return data;
                }
            } catch (error) {
                console.warn(`代理 ${i + 1} 失败: ${error.message}`);
                continue;
            }
        }

        return null;
    },

    /**
     * 解析 Bilibili 页面 HTML，提取视频数据
     */
    parseBilibiliPage(html) {
        try {
            const data = {
                bvid: '',
                title: '',
                author: '',
                thumbnail: '',
                publishTime: '',
                viewCount: 0,
                likeCount: 0,
                commentCount: 0,
                shareCount: 0,
                favoriteCount: 0,
                coinCount: 0
            };

            // 提取 __playinfo__ 数据（视频播放信息）
            const playInfoMatch = html.match(/window\.__playinfo__\s*=\s*({[\s\S]*?})\s*<(?:\/script|script)/);
            if (playInfoMatch) {
                try {
                    const playInfo = JSON.parse(playInfoMatch[1]);
                    data.viewCount = parseInt(playInfo.data?.view_durations?.[0]?.view) || 0;
                } catch (e) { }
            }

            // 提取 __INITIAL_STATE__ 数据（页面初始状态）
            const initialStateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script/);
            if (initialStateMatch) {
                try {
                    const state = JSON.parse(initialStateMatch[1]);
                    const videoData = state?.videoData || state?.video_info || {};

                    if (videoData.bvid) data.bvid = videoData.bvid;
                    if (videoData.title) data.title = this.decodeHtmlEntities(videoData.title);
                    if (videoData.owner?.name) data.author = videoData.owner.name;
                    if (videoData.pic) data.thumbnail = `https:${videoData.pic}`;
                    if (videoData.pubdate) data.publishTime = this.formatTimestamp(videoData.pubdate);

                    const stat = videoData.stat || videoData.statistics || {};
                    data.viewCount = stat.view || data.viewCount;
                    data.likeCount = stat.like || 0;
                    data.commentCount = stat.reply || 0;
                    data.shareCount = stat.share || 0;
                    data.favoriteCount = stat.favorite || 0;
                    data.coinCount = stat.coin || 0;
                } catch (e) { }
            }

            // 备用：从 meta 标签提取
            if (!data.title) {
                const titleMatch = html.match(/<title>([^<]+)<\/title>/);
                if (titleMatch) {
                    data.title = this.decodeHtmlEntities(titleMatch[1].replace('_哔哩哔哩 (゜-゜)つロ 干杯~-bilibili', '').trim());
                }
            }

            // 备用：从 og:image 提取缩略图
            if (!data.thumbnail) {
                const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
                if (ogImageMatch) {
                    data.thumbnail = ogImageMatch[1];
                }
            }

            // 备用：从 view count 标签提取播放量
            if (data.viewCount === 0) {
                const viewMatch = html.match(/"viewCountText"[^"]*"[^"]*"simpleText":"([^"]+)"/);
                if (viewMatch) {
                    data.viewCount = this.parseCountString(viewMatch[1]);
                }
            }

            return data;
        } catch (error) {
            console.error('解析 Bilibili 页面失败:', error);
            return null;
        }
    },

    /**
     * 解析带单位的数字字符串
     */
    parseCountString(str) {
        if (!str) return 0;
        str = str.replace(/,/g, '').trim();
        const match = str.match(/([\d.]+)\s*([KMB万])?/i);
        if (!match) return parseInt(str) || 0;
        const num = parseFloat(match[1]);
        const unit = match[2]?.toUpperCase();
        if (unit === 'K' || unit === '万') return Math.round(num * 10000);
        if (unit === 'M') return Math.round(num * 1000000);
        if (unit === 'B') return Math.round(num * 1000000000);
        return Math.round(num);
    },

    /**
     * 解码 HTML 实体
     */
    decodeHtmlEntities(str) {
        const entities = {
            '&amp;': '&',
            '&quot;': '"',
            '&#39;': "'",
            '&lt;': '<',
            '&gt;': '>',
            '&#x27;': "'",
            '&#x2F;': '/',
            '&nbsp;': ' '
        };
        for (const [entity, char] of Object.entries(entities)) {
            str = str.replace(new RegExp(entity, 'g'), char);
        }
        return str;
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
