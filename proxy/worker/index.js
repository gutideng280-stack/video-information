/**
 * Bilibili CORS Proxy - Cloudflare Worker
 *
 * 部署方法：
 * 1. 登录 https://dash.cloudflare.com
 * 2. Workers & Pages → 创建应用程序 → 创建 Worker
 * 3. 粘贴本代码，部署
 * 4. 复制 Worker URL（例如 https://bilibili-proxy.你的名字.workers.dev）
 * 5. 打开 index.html，将 PROXY_BASE 填入
 *
 * Cloudflare 免费计划：每天 10 万次请求，足够个人使用
 */

export default {
    async fetch(request) {
        const url = new URL(request.url);

        // 如果请求根路径，返回使用说明
        if (url.pathname === '/' || url.pathname === '') {
            return new Response(JSON.stringify({
                ok: true,
                message: 'Bilibili CORS Proxy 运行中',
                usage: '将请求 URL 改为: https://<your-worker>.workers.dev/https://api.bilibili.com/x/web-interface/view?bvid=BVxxxxx'
            }, null, 2), {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Referer, Origin, User-Agent, Content-Type'
                }
            });
        }

        // 提取目标 URL（支持两种格式）
        // 格式1: /proxy?url=https://api.bilibili.com/...
        // 格式2: /https://api.bilibili.com/...
        let targetUrl;

        if (url.searchParams.has('url')) {
            targetUrl = url.searchParams.get('url');
        } else if (url.pathname.startsWith('/https://')) {
            targetUrl = url.pathname.slice(1); // 去掉前导 /
        } else {
            return new Response(JSON.stringify({
                ok: false,
                error: '无效的请求格式。请使用 /?url=https://... 或 /https://...'
            }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // 安全性：只允许代理 bilibili.com 相关域名
        try {
            const target = new URL(targetUrl);
            const allowed = ['api.bilibili.com', 'www.bilibili.com', 'b23.tv'];
            if (!allowed.includes(target.hostname)) {
                return new Response(JSON.stringify({
                    ok: false,
                    error: '不允许代理此域名'
                }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
                });
            }
        } catch (e) {
            return new Response(JSON.stringify({ ok: false, error: '无效的 URL' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        try {
            // 转发请求，添加完整的浏览器请求头以绕过风控
            const headers = new Headers();
            headers.set('Referer', 'https://www.bilibili.com/');
            headers.set('Origin', 'https://www.bilibili.com');
            headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            headers.set('Accept', 'application/json, text/plain, */*');
            headers.set('Accept-Language', 'zh-CN,zh;q=0.9,en;q=0.8');
            headers.set('Accept-Encoding', 'gzip, deflate, br');
            headers.set('Connection', 'keep-alive');
            headers.set('Sec-Fetch-Dest', 'empty');
            headers.set('Sec-Fetch-Mode', 'cors');
            headers.set('Sec-Fetch-Site', 'same-site');
            headers.set('DNT', '1');

            const response = await fetch(targetUrl, {
                method: request.method,
                headers,
                body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined,
                signal: AbortSignal.timeout(15000)
            });

            // 获取响应内容
            const contentType = response.headers.get('Content-Type') || '';
            const isJson = contentType.includes('application/json');
            let body;

            if (isJson) {
                const text = await response.text();
                try {
                    body = JSON.parse(text);
                    // 包装结果，标识来自代理
                    body._proxy = true;
                    body._proxyUrl = targetUrl;
                    body.ok = response.ok;
                } catch {
                    body = { _proxy: true, ok: false, raw: text, error: 'JSON 解析失败' };
                }
            } else {
                body = { _proxy: true, ok: response.ok, contentType, error: '非 JSON 响应' };
            }

            return new Response(JSON.stringify(body), {
                status: response.status,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Referer, Origin, User-Agent, Content-Type, Accept',
                    'Cache-Control': 'no-cache'
                }
            });

        } catch (error) {
            return new Response(JSON.stringify({
                ok: false,
                error: error.message || '代理请求失败',
                _proxy: true
            }), {
                status: 502,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
    }
};
