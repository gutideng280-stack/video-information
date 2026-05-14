// YouTube 数据获取服务
// 使用 YouTube Data API v3 获取视频统计数据

const YouTubeService = {
    // YouTube Data API Key
    API_KEY: 'AIzaSyBwKk0TAx6zkMlCF1T0WzhRSylfvmXBh00',

    // CORS 代理列表（用于绕过跨域限制）
    corsProxies: [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://proxy.cors.sh/'
    ],

    // 每个代理的超时时间（毫秒）
    proxyTimeout: 5000,

    /**
     * 获取 YouTube 视频数据
     * @param {string} videoId - YouTube 视频 ID
     * @returns {Promise<object>} - 视频数据对象
     */
    async fetchVideoData(videoId) {
        try {
            console.log(`🎬 开始获取 YouTube 视频: ${videoId}`);

            // 使用 YouTube Data API v3
            const apiData = await this.fetchFromYouTubeAPI(videoId);

            if (apiData) {
                console.log(`✅ 获取 YouTube 数据成功: ${videoId}`);
                return {
                    platform: 'youtube',
                    videoId,
                    title: apiData.title,
                    author: apiData.author,
                    thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                    publishTime: apiData.publishTime,
                    viewCount: apiData.viewCount,
                    likeCount: apiData.likeCount,
                    commentCount: apiData.commentCount,
                    shareCount: apiData.shareCount, // YouTube API 可能提供
                    dataSource: 'api',
                    status: 'success'
                };
            }

            // API 失败时尝试备用方法
            console.warn(`⚠️ YouTube API 获取失败，尝试备用方法...`);
            const backupData = await this.fetchBackupMethod(videoId);

            if (backupData) {
                return backupData;
            }

            // 全部失败
            console.error(`❌ 无法获取 YouTube 视频数据: ${videoId}`);
            return {
                platform: 'youtube',
                videoId,
                title: '',
                author: '',
                thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                publishTime: '',
                viewCount: 0,
                likeCount: 0,
                commentCount: 0,
                shareCount: null,
                dataSource: 'failed',
                status: 'error',
                errorMessage: 'YouTube API 暂不可用，请稍后重试'
            };

        } catch (error) {
            console.error(`❌ 获取 YouTube 视频 ${videoId} 数据失败:`, error);
            return {
                platform: 'youtube',
                videoId,
                title: '',
                author: '',
                thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                publishTime: '',
                viewCount: 0,
                likeCount: 0,
                commentCount: 0,
                shareCount: null,
                dataSource: 'error',
                status: 'error',
                errorMessage: error.message || '获取数据失败'
            };
        }
    },

    /**
     * 使用 YouTube Data API v3 获取数据
     */
    async fetchFromYouTubeAPI(videoId) {
        const url = `https://www.googleapis.com/youtube/v3/videos?` +
            `part=snippet,statistics,contentDetails` +
            `&id=${videoId}` +
            `&key=${this.API_KEY}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`YouTube API 错误: ${response.status} - ${errorText}`);
                if (response.status === 403) {
                    throw new Error('YouTube API 配额已用尽，请稍后重试');
                }
                if (response.status === 404) {
                    throw new Error('视频不存在或已被删除');
                }
                return null;
            }

            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                console.warn('YouTube API 返回空数据');
                return null;
            }

            const video = data.items[0];
            const snippet = video.snippet;
            const statistics = video.statistics;
            const contentDetails = video.contentDetails;

            // 解析时长
            const duration = this.parseDuration(contentDetails?.duration);

            return {
                title: snippet.title || '未知标题',
                author: snippet.channelTitle || '未知作者',
                publishTime: snippet.publishedAt || '',
                viewCount: parseInt(statistics?.viewCount) || 0,
                likeCount: parseInt(statistics?.likeCount) || 0,
                commentCount: parseInt(statistics?.commentCount) || 0,
                shareCount: 0, // YouTube API 不提供转发数
                duration: duration
            };
        } catch (error) {
            console.error('YouTube API 请求失败:', error);
            return null;
        }
    },

    /**
     * 备用方法：从页面提取数据
     */
    async fetchBackupMethod(videoId) {
        const url = `https://www.youtube.com/watch?v=${videoId}`;

        for (let i = 0; i < this.corsProxies.length; i++) {
            try {
                const proxyUrl = this.corsProxies[i] + encodeURIComponent(url);
                const response = await this.fetchWithTimeout(proxyUrl);

                if (response.ok) {
                    const html = await response.text();
                    const data = this.parseYouTubePage(html, videoId);

                    if (data && (data.viewCount > 0 || data.likeCount > 0)) {
                        console.log(`📄 从页面提取数据成功`);
                        return {
                            platform: 'youtube',
                            videoId,
                            title: data.title || '未知标题',
                            author: data.author || '未知作者',
                            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
                            publishTime: data.publishTime || '',
                            viewCount: data.viewCount,
                            likeCount: data.likeCount,
                            commentCount: data.commentCount,
                            shareCount: data.shareCount || 0,
                            dataSource: 'page',
                            status: 'success'
                        };
                    }
                }
            } catch (e) {
                console.warn(`代理 ${i + 1} 失败`);
                continue;
            }
        }

        return null;
    },

    /**
     * 解析 YouTube 页面 HTML
     */
    parseYouTubePage(html, videoId) {
        try {
            const stats = {
                title: '',
                author: '',
                viewCount: 0,
                likeCount: 0,
                commentCount: 0,
                shareCount: 0,
                publishTime: ''
            };

            // 提取标题
            const titleMatch = html.match(/"title":"([^"]+)"/);
            if (titleMatch) {
                stats.title = this.decodeHtmlEntities(titleMatch[1]);
            }

            // 提取作者
            const authorMatch = html.match(/"ownerChannelName":"([^"]+)"/);
            if (authorMatch) {
                stats.author = this.decodeHtmlEntities(authorMatch[1]);
            }

            // 提取观看次数
            const viewPatterns = [
                /"viewCountText"[^}]*"simpleText":"([\d,\.]+[KMB]?)\s*观看"/,
                /"viewCountText"[^"]*"([^"]+)"/,
            ];

            for (const pattern of viewPatterns) {
                const match = html.match(pattern);
                if (match) {
                    stats.viewCount = this.parseCountString(match[1]);
                    if (stats.viewCount > 0) break;
                }
            }

            // 提取点赞数
            const likeMatch = html.match(/"defaultBadgeTooltipText"[^}]*"simpleText":"([\d,]+)"/);
            if (likeMatch) {
                stats.likeCount = parseInt(likeMatch[1].replace(/,/g, ''));
            }

            // 提取评论数
            const commentMatch = html.match(/"commentCount"[:\s]+(\d+)/);
            if (commentMatch) {
                stats.commentCount = parseInt(commentMatch[1]);
            }

            return stats;
        } catch (e) {
            console.error('解析页面失败:', e);
            return null;
        }
    },

    /**
     * 解析 ISO 8601 时长格式
     */
    parseDuration(isoDuration) {
        if (!isoDuration) return 0;

        const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;

        const hours = parseInt(match[1]) || 0;
        const minutes = parseInt(match[2]) || 0;
        const seconds = parseInt(match[3]) || 0;

        return hours * 3600 + minutes * 60 + seconds;
    },

    /**
     * 解析带单位的数字字符串
     */
    parseCountString(str) {
        if (!str) return 0;

        str = str.replace(/,/g, '').trim();
        const match = str.match(/([\d.]+)\s*([KMB])?/i);

        if (!match) return parseInt(str) || 0;

        const num = parseFloat(match[1]);
        const unit = match[2]?.toUpperCase();

        if (unit === 'K') return Math.round(num * 1000);
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
            '\\u0026': '&',
            '\\u0027': "'"
        };

        for (const [entity, char] of Object.entries(entities)) {
            str = str.replace(new RegExp(entity, 'g'), char);
        }

        return str;
    },

    /**
     * 带超时的 fetch
     */
    async fetchWithTimeout(url, timeout = null) {
        const actualTimeout = timeout || this.proxyTimeout || 5000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), actualTimeout);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/html',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
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
    window.YouTubeService = YouTubeService;
}
