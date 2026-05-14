// Bilibili 数据获取服务
// 方案1: JSONP 方式（优先，无需代理，绕过 CORS）
// 方案2: 官方 API + CORS 代理（备用）
//
// JSONP 说明：Bilibili API 支持 callback 参数，返回 JSONP 格式，浏览器可正常加载

const BilibiliService = {
    // CORS 代理地址（已部署 Cloudflare Worker）
    PROXY_BASE: 'https://bilibili-proxy.gutideng280.workers.dev',

    // Bilibili API 基础地址（JSONP 方式，无需代理）
    get API_BASE() {
        return 'https://api.bilibili.com/x/web-interface/view';
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

            // 方案1: 优先使用 JSONP 方式获取（无需代理）
            console.log('🔍 尝试 JSONP 方案:', bvid);
            const jsonpData = await this.fetchFromJSONP(bvid);
            if (jsonpData) {
                console.log('✅ JSONP 成功:', jsonpData.title);
                return {
                    platform: 'bilibili',
                    videoId: bvid,
                    title: jsonpData.title,
                    author: jsonpData.author,
                    thumbnail: jsonpData.thumbnail,
                    publishTime: jsonpData.publishTime,
                    viewCount: jsonpData.viewCount,
                    likeCount: jsonpData.likeCount,
                    commentCount: jsonpData.commentCount,
                    shareCount: jsonpData.shareCount,
                    favoriteCount: jsonpData.favoriteCount,
                    coinCount: jsonpData.coinCount,
                    danmakuCount: jsonpData.danmakuCount,
                    dataSource: 'jsonp',
                    status: 'success'
                };
            }
            console.warn('⚠️ JSONP 失败，尝试备用方案...');

            // 方案2: 备用页面爬取（无需代理，但可能被 CORS 阻止）
            const pageData = await this.fetchFromPage(bvid);
            if (pageData) {
                return {
                    platform: 'bilibili',
                    videoId: bvid,
                    title: pageData.title,
                    author: pageData.author,
                    thumbnail: pageData.thumbnail,
                    publishTime: pageData.publishTime,
                    viewCount: pageData.viewCount,
                    likeCount: pageData.likeCount,
                    commentCount: pageData.commentCount,
                    shareCount: pageData.shareCount,
                    favoriteCount: pageData.favoriteCount,
                    coinCount: pageData.coinCount,
                    danmakuCount: pageData.danmakuCount,
                    dataSource: 'page',
                    status: 'success'
                };
            }

            // 方案3: 备用官方 API + 代理（需要部署 Worker）
            if (this.PROXY_BASE) {
                const apiData = await this.fetchFromAPI(bvid);
                if (apiData) {
                    return {
                        platform: 'bilibili',
                        videoId: bvid,
                        title: apiData.title,
                        author: apiData.author,
                        thumbnail: apiData.thumbnail,
                        publishTime: apiData.publishTime,
                        viewCount: apiData.viewCount,
                        likeCount: apiData.likeCount,
                        commentCount: apiData.commentCount,
                        shareCount: apiData.shareCount,
                        favoriteCount: apiData.favoriteCount,
                        coinCount: apiData.coinCount,
                        dataSource: 'api',
                        status: 'success'
                    };
                }
            }

            return this._errorResult(videoId, 'Bilibili 数据获取失败，请稍后重试');
        } catch (error) {
            return this._errorResult(videoId, error.message || '获取数据失败');
        }
    },

    /**
     * 使用 JSONP 方式获取视频数据（主方案，无需代理，绕过 CORS）
     */
    fetchFromJSONP(bvid) {
        return new Promise((resolve, reject) => {
            const callbackName = `bilibiliCallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const timeout = this.timeout;

            // 设置超时
            const timeoutId = setTimeout(() => {
                cleanup();
                resolve(null);
            }, timeout);

            // 清理函数
            const cleanup = () => {
                clearTimeout(timeoutId);
                delete window[callbackName];
                const script = document.getElementById(callbackName);
                if (script) script.remove();
            };

            // 创建回调函数
            window[callbackName] = (response) => {
                cleanup();
                console.log('📦 JSONP 回调收到:', response);
                if (response && response.code === 0 && response.data) {
                    console.log('✅ JSONP 数据有效');
                    resolve(this.parseAPIResponse(response.data));
                } else {
                    console.warn('⚠️ JSONP 响应错误:', response?.message || '未知错误');
                    resolve(null);
                }
            };

            // 创建 script 标签
            const script = document.createElement('script');
            script.id = callbackName;
            // Bilibili JSONP API 格式：只需要 callback 参数
            const jsonpUrl = `${this.API_BASE}?bvid=${bvid}&callback=${callbackName}`;
            console.log('📡 加载 JSONP:', jsonpUrl);
            script.src = jsonpUrl;
            script.onerror = (e) => {
                console.error('❌ JSONP script 加载失败:', e);
                cleanup();
                resolve(null);
            };

            // 添加到页面
            document.body.appendChild(script);
        });
    },

    /**
     * 使用官方 API + CORS 代理获取视频数据
     */
    async fetchFromAPI(bvid) {
        console.log('🔄 尝试 API + 代理方案:', bvid);
        // Worker URL 格式：/proxy?url=https://...
        const targetUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
        const url = `${this.PROXY_BASE}/proxy?url=${encodeURIComponent(targetUrl)}`;
        console.log('📡 API 代理请求:', url);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
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
            console.log('📦 API 响应:', json);

            if (json.code === 0 && json.data) {
                return this.parseAPIResponse(json.data);
            } else {
                console.warn('API 返回错误:', json.message);
                return null;
            }
        } catch (error) {
            console.warn('API 请求失败:', error.message);
            return null;
        }
    },

    /**
     * 使用页面爬取获取视频数据（备用方案，无需代理）
     */
    async fetchFromPage(bvid) {
        const url = `https://www.bilibili.com/video/${bvid}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`页面请求失败: HTTP ${response.status}`);
                return null;
            }

            const html = await response.text();
            return this.parsePage(html, bvid);
        } catch (error) {
            console.warn('页面爬取失败:', error.message);
            return null;
        }
    },

    /**
     * 解析页面 HTML，提取视频数据
     */
    parsePage(html, bvid) {
        try {
            // 提取标题
            const titleMatch = html.match(/<title>([^<]+)_哔哩哔哩/);
            const title = titleMatch ? titleMatch[1] : '';

            // 提取 UP 主
            const authorMatch = html.match(/"author":"([^"]+)"/) || html.match(/class="username">([^<]+)</);
            const author = authorMatch ? authorMatch[1] : '';

            // 提取发布时间
            const pubdateMatch = html.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
            const publishTime = pubdateMatch ? new Date(pubdateMatch[1]).toISOString() : '';

            // 提取封面图
            const thumbnailMatch = html.match(/"thumbnailUrl":"([^"]+)"/) || html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
            const thumbnail = thumbnailMatch ? thumbnailMatch[1].replace(/\\u002F/g, '/') : '';

            // 提取播放量
            const viewMatch = html.match(/(\d+\.?\d*[万亿]?)万/)?.[0] || html.match(/"view":(\d+)/)?.[1];
            let viewCount = 0;

            // 播放量：匹配页面显示格式如 "9922.1万" 或纯数字
            const viewStrMatch = html.match(/(\d+\.?\d*)(万|亿)?/);
            if (viewStrMatch) {
                const num = parseFloat(viewStrMatch[1]);
                const unit = viewStrMatch[2];
                if (unit === '亿') viewCount = Math.round(num * 100000000);
                else if (unit === '万') viewCount = Math.round(num * 10000);
                else viewCount = num;
            }

            // 提取点赞数
            const likeMatch = html.match(/(\d+\.?\d*[万]?)万/)?.[0];
            let likeCount = 0;
            const likeStrMatch = html.match(/(\d+\.?\d*)(万)?/);
            if (likeStrMatch) {
                likeCount = likeStrMatch[2] === '万' ? Math.round(parseFloat(likeStrMatch[1]) * 10000) : parseInt(likeStrMatch[1]);
            }

            // 提取评论数（从页面统计区域）
            const replyMatch = html.match(/评论\s*([\d,，.]+[万]?)/) || html.match(/"reply":(\d+)/);
            let commentCount = 0;
            if (replyMatch) {
                const replyStr = replyMatch[1] || replyMatch[0];
                const numMatch = replyStr.match(/([\d,.]+)/);
                if (numMatch) {
                    commentCount = Math.round(parseFloat(numMatch[1].replace(/,/g, '')));
                }
            }

            // 提取投币数
            const coinMatch = html.match(/投币\s*([\d,，.]+[万]?)/) || html.match(/"coin":(\d+)/);
            let coinCount = 0;
            if (coinMatch) {
                const str = coinMatch[1] || '';
                const numMatch = str.match(/([\d,.]+)/);
                if (numMatch) {
                    coinCount = numMatch[0].includes('万') ? Math.round(parseFloat(numMatch[1]) * 10000) : parseInt(numMatch[1]);
                }
            }

            // 提取收藏数
            const favMatch = html.match(/收藏\s*([\d,，.]+[万]?)/) || html.match(/"favorite":(\d+)/);
            let favoriteCount = 0;
            if (favMatch) {
                const str = favMatch[1] || '';
                const numMatch = str.match(/([\d,.]+)/);
                if (numMatch) {
                    favoriteCount = numMatch[0].includes('万') ? Math.round(parseFloat(numMatch[1]) * 10000) : parseInt(numMatch[1]);
                }
            }

            // 提取分享数
            const shareMatch = html.match(/分享\s*([\d,，.]+[万]?)/) || html.match(/"share":(\d+)/);
            let shareCount = 0;
            if (shareMatch) {
                const str = shareMatch[1] || '';
                const numMatch = str.match(/([\d,.]+)/);
                if (numMatch) {
                    shareCount = numMatch[0].includes('万') ? Math.round(parseFloat(numMatch[1]) * 10000) : parseInt(numMatch[1]);
                }
            }

            // 提取弹幕数
            const danmakuMatch = html.match(/弹幕\s*([\d,，.]+[万]?)/) || html.match(/"danmaku":(\d+)/);
            let danmakuCount = 0;
            if (danmakuMatch) {
                const str = danmakuMatch[1] || '';
                const numMatch = str.match(/([\d,.]+)/);
                if (numMatch) {
                    danmakuCount = numMatch[0].includes('万') ? Math.round(parseFloat(numMatch[1]) * 10000) : parseInt(numMatch[1]);
                }
            }

            // 如果统计字段为空，尝试从 __INITIAL_STATE__ 中提取
            if (viewCount === 0 || likeCount === 0) {
                const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.*?\});/s);
                if (stateMatch) {
                    try {
                        const state = JSON.parse(stateMatch[1]);
                        const videoData = state?.videoData || state?.cardData || {};
                        const stat = videoData.stat || state.videoData?.stat || {};

                        if (viewCount === 0 && stat.view) viewCount = parseInt(stat.view);
                        if (likeCount === 0 && stat.like) likeCount = parseInt(stat.like);
                        if (commentCount === 0 && stat.reply) commentCount = parseInt(stat.reply);
                        if (coinCount === 0 && stat.coin) coinCount = parseInt(stat.coin);
                        if (favoriteCount === 0 && stat.favorite) favoriteCount = parseInt(stat.favorite);
                        if (shareCount === 0 && stat.share) shareCount = parseInt(stat.share);
                        if (danmakuCount === 0 && stat.danmaku) danmakuCount = parseInt(stat.danmaku);

                        if (!title && videoData.title) {
                            return {
                                ...this.parseAPIResponse(videoData),
                                dataSource: 'page',
                                publishTime: videoData.pubdate ? new Date(videoData.pubdate * 1000).toISOString() : ''
                            };
                        }
                    } catch (e) {
                        console.warn('解析 __INITIAL_STATE__ 失败:', e.message);
                    }
                }
            }

            // 如果所有数据都为空，返回错误
            if (viewCount === 0 && likeCount === 0 && commentCount === 0) {
                console.warn('页面解析失败：无法提取视频数据');
                return null;
            }

            return {
                title,
                author,
                thumbnail,
                publishTime,
                viewCount,
                likeCount,
                commentCount,
                shareCount,
                favoriteCount,
                coinCount,
                danmakuCount
            };
        } catch (error) {
            console.warn('页面解析失败:', error.message);
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
            coinCount: stat.coin || 0,
            danmakuCount: stat.danmaku || 0
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
            danmakuCount: 0,
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
