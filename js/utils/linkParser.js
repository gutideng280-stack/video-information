// 视频链接解析工具
// 支持解析 YouTube 和 Bilibili 的视频链接

const LinkParser = {
    // YouTube 链接正则表达式
    youtubePatterns: [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ],

    // Bilibili 链接正则表达式
    bilibiliPatterns: [
        /bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/,
        /bilibili\.com\/video\/(av\d+)/,
        /b23\.tv\/([a-zA-Z0-9]+)/
    ],

    // Twitter 链接正则表达式
    twitterPatterns: [
        /x\.com\/\w+\/status\/(\d+)/,
        /twitter\.com\/\w+\/status\/(\d+)/,
        /x\.com\/\w+\/status\/[a-zA-Z0-9]+/
    ],

    /**
     * 解析 YouTube 视频链接
     * @param {string} url - YouTube 视频链接
     * @returns {object} - { videoId: string, isValid: boolean }
     */
    parseYouTube(url) {
        for (const pattern of this.youtubePatterns) {
            const match = url.match(pattern);
            if (match) {
                return {
                    videoId: match[1],
                    isValid: true
                };
            }
        }
        return {
            videoId: null,
            isValid: false
        };
    },

    /**
     * 解析 Bilibili 视频链接
     * @param {string} url - Bilibili 视频链接
     * @returns {object} - { videoId: string, isValid: boolean, type: 'bv' | 'av' | 'short' }
     */
    parseBilibili(url) {
        // 优先匹配 BV 号
        const bvMatch = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
        if (bvMatch) {
            return {
                videoId: bvMatch[1],
                type: 'bv',
                isValid: true
            };
        }

        // 匹配 AV 号
        const avMatch = url.match(/bilibili\.com\/video\/(av\d+)/);
        if (avMatch) {
            return {
                videoId: avMatch[1],
                type: 'av',
                isValid: true
            };
        }

        // 匹配短链接 b23.tv
        const shortMatch = url.match(/b23\.tv\/([a-zA-Z0-9]+)/);
        if (shortMatch) {
            return {
                videoId: shortMatch[1],
                type: 'short',
                isValid: true
            };
        }

        return {
            videoId: null,
            type: null,
            isValid: false
        };
    },

    /**
     * 解析 Twitter/X 链接
     * @param {string} url - Twitter 链接
     * @returns {object} - { videoId: string, isValid: boolean }
     */
    parseTwitter(url) {
        // 匹配 x.com 或 twitter.com 的状态链接
        const match = url.match(/x\.com\/\w+\/status\/(\d+)/);
        if (match) {
            return {
                videoId: match[1],
                isValid: true
            };
        }

        // 也匹配 /status/ 后的 tweet ID (可能是一串数字或字母数字混合)
        const altMatch = url.match(/(?:x|twitter)\.com\/\w+\/status\/([a-zA-Z0-9_]+)/);
        if (altMatch) {
            return {
                videoId: altMatch[1],
                isValid: true
            };
        }

        return {
            videoId: null,
            isValid: false
        };
    },

    /**
     * 通用解析函数 - 自动识别平台
     * @param {string} url - 视频链接
     * @param {string} platform - 平台名称 ('youtube' | 'bilibili')
     * @returns {object} - 解析结果
     */
    parse(url, platform) {
        if (!url || typeof url !== 'string') {
            return {
                platform,
                videoId: null,
                isValid: false,
                error: '链接格式无效'
            };
        }

        url = url.trim();

        if (platform === 'youtube') {
            const result = this.parseYouTube(url);
            return {
                platform,
                ...result,
                error: result.isValid ? null : '无法识别的 YouTube 链接格式'
            };
        }

        if (platform === 'bilibili') {
            const result = this.parseBilibili(url);
            return {
                platform,
                ...result,
                error: result.isValid ? null : '无法识别的 Bilibili 链接格式'
            };
        }

        if (platform === 'twitter') {
            const result = this.parseTwitter(url);
            return {
                platform,
                ...result,
                error: result.isValid ? null : '无法识别的 Twitter 链接格式'
            };
        }

        return {
            platform,
            videoId: null,
            isValid: false,
            error: '不支持的视频平台'
        };
    },

    /**
     * 批量解析多个链接
     * @param {array} entries - [{url, platform}] 格式的数组
     * @returns {array} - 解析结果数组
     */
    parseBatch(entries) {
        return entries.map(entry => this.parse(entry.url, entry.platform));
    },

    /**
     * 验证链接格式（基础验证）
     * @param {string} url - 待验证的链接
     * @returns {boolean} - 是否是有效的 URL 格式
     */
    isValidUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        try {
            new URL(url);
            return true;
        } catch {
            // 如果不是标准 URL，检查是否是短链接格式
            return /^(BV|av|b23\.tv|youtu\.be|x\.com\/|twitter\.com\/)/.test(url.trim());
        }
    },

    /**
     * 获取视频链接（用于在表格中点击跳转）
     * @param {string} platform - 平台名称
     * @param {string} videoId - 视频 ID
     * @returns {string} - 完整的视频链接
     */
    getVideoUrl(platform, videoId) {
        if (platform === 'youtube') {
            return `https://www.youtube.com/watch?v=${videoId}`;
        }
        if (platform === 'bilibili') {
            return `https://www.bilibili.com/video/${videoId}`;
        }
        if (platform === 'twitter') {
            return `https://x.com/i/status/${videoId}`;
        }
        return '#';
    }
};

// 导出到全局
if (typeof window !== 'undefined') {
    window.LinkParser = LinkParser;
}
