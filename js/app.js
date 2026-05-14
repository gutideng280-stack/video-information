// 视频互动数据统计工具 - 主应用程序
// 整合所有组件，管理应用状态和处理查询逻辑

class VideoStatsApp {
    constructor() {
        this.linkInput = null;
        this.queryButton = null;
        this.dataTable = null;
        this.resultsSection = null;
        this.loadingOverlay = null;
        this.isLoading = false;
        
        this.init();
    }

    init() {
        // 等待 DOM 加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        try {
            console.log('🚀 开始初始化...');
            
            // 检查所有必要的类是否存在
            console.log('检查组件类...');
            const requiredClasses = ['LinkInput', 'QueryButton', 'DataTable', 'LinkParser', 'YouTubeService', 'BilibiliService', 'TwitterService'];
            const missingClasses = [];
            
            requiredClasses.forEach(className => {
                if (typeof window[className] === 'undefined') {
                    missingClasses.push(className);
                    console.error('❌ 缺少:', className);
                } else {
                    console.log('✅', className);
                }
            });
            
            if (missingClasses.length > 0) {
                throw new Error('缺少必要的组件: ' + missingClasses.join(', '));
            }
            
            // 检查 DOM 元素
            console.log('检查 DOM 元素...');
            const elements = [
                'link-inputs-container',
                'query-btn', 
                'data-table-container', 
                'results-section', 
                'loading-overlay',
                'demo-btn',
                'add-entry-btn'
            ];
            
            elements.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    console.log('✅ #' + id);
                } else {
                    console.error('❌ #' + id);
                }
            });

            // 初始化链接输入组件
            console.log('初始化 LinkInput...');
            this.linkInput = new LinkInput('link-inputs-container', {
                maxItems: 10,
                minItems: 4,
                onChange: (values) => this.onInputChange(values)
            });
            console.log('✅ LinkInput 已初始化');

            // 初始化查询按钮
            console.log('初始化 QueryButton...');
            this.queryButton = new QueryButton('query-btn', {
                text: '确认查询',
                loadingText: '查询中...',
                onClick: () => this.handleQuery()
            });
            console.log('✅ QueryButton 已初始化');

            // 初始化数据表格
            console.log('初始化 DataTable...');
            this.dataTable = new DataTable('data-table-container');
            console.log('✅ DataTable 已初始化');

            // 获取结果区域和加载覆盖层
            this.resultsSection = document.getElementById('results-section');
            this.loadingOverlay = document.getElementById('loading-overlay');

            // 绑定添加按钮事件
            this.bindAddButton();

            // 绑定演示按钮事件
            this.bindDemoButton();

            // 自动填充演示数据
            this.fillDemoData();

            console.log('✅ 视频互动数据统计工具初始化完成');
            this.showDiagnostic('✅ 初始化成功！');
        } catch (error) {
            console.error('❌ 初始化失败:', error);
            console.error('错误堆栈:', error.stack);
            this.showDiagnostic('❌ 初始化失败: ' + error.message + '\n请查看控制台(F12)获取详细信息');
            alert('应用程序初始化失败: ' + error.message + '\n\n请刷新页面重试，并打开控制台(F12)查看详细错误');
        }
    }
    
    showDiagnostic(message) {
        const diagContent = document.getElementById('diagnostic-content');
        if (diagContent) {
            diagContent.innerHTML = message.replace(/\n/g, '<br>');
        }
    }

    bindAddButton() {
        const addBtn = document.getElementById('add-entry-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                console.log('点击了添加按钮');
                if (this.linkInput.items.length < 10) {
                    this.linkInput.addItem();
                } else {
                    alert('最多只能添加 10 个链接');
                }
            });
        }
    }

    bindDemoButton() {
        const demoBtn = document.getElementById('demo-btn');
        if (demoBtn) {
            demoBtn.addEventListener('click', () => {
                console.log('点击了演示按钮');
                this.fillDemoData();
            });
        }
    }

    fillDemoData() {
        console.log('填充演示数据...');
        try {
            // 先重置
            this.linkInput.items = [];
            this.linkInput.nextId = 1;
            
            // 前3个默认为YouTube平台，第4个默认为Bilibili平台
            this.linkInput.addItem('', 'youtube');
            this.linkInput.addItem('', 'youtube');
            this.linkInput.addItem('', 'youtube');
            this.linkInput.addItem('', 'bilibili');
            
            // 清空结果
            this.dataTable.clearData();
            this.resultsSection.style.display = 'none';
            
            console.log('✅ 演示数据已填充（4个输入框，3个YouTube + 1个Bilibili）');
        } catch (error) {
            console.error('填充演示数据失败:', error);
        }
    }

    onInputChange(values) {
        console.log('输入内容更新:', values);
    }

    async handleQuery() {
        console.log('🚀 开始查询...');
        try {
            // 验证输入
            const validation = this.linkInput.validate();
            console.log('验证结果:', validation);
            
            if (!validation.valid) {
                alert(validation.message);
                return;
            }

            // 获取输入的链接
            const entries = this.linkInput.getValues();
            console.log('准备查询:', entries);

            // 显示加载状态
            this.setLoading(true);

            try {
                // 批量获取数据
                const results = await this.batchFetchData(entries);
                
                // 显示结果
                this.displayResults(results);
            } catch (error) {
                console.error('查询失败:', error);
                alert('查询过程中发生错误: ' + error.message);
            } finally {
                // 隐藏加载状态
                this.setLoading(false);
            }
        } catch (error) {
            console.error('查询处理失败:', error);
            alert('查询处理失败: ' + error.message);
        }
    }

    async batchFetchData(entries) {
        const results = [];

        // 逐个解析链接并获取数据
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            console.log(`处理 ${i+1}/${entries.length}:`, entry);
            
            const parseResult = LinkParser.parse(entry.url, entry.platform);
            console.log('解析结果:', parseResult);
            
            if (!parseResult.isValid) {
                results.push({
                    platform: entry.platform,
                    videoId: entry.url,
                    title: '',
                    author: '',
                    thumbnail: '',
                    publishTime: '',
                    viewCount: 0,
                    likeCount: 0,
                    commentCount: 0,
                    shareCount: null,
                    status: 'error',
                    errorMessage: parseResult.error || '链接格式无效'
                });
                continue;
            }

            // 根据平台获取数据
            try {
                if (parseResult.platform === 'youtube') {
                    const data = await YouTubeService.fetchVideoData(parseResult.videoId);
                    results.push(data);
                } else if (parseResult.platform === 'bilibili') {
                    const data = await BilibiliService.fetchVideoData(
                        parseResult.videoId, 
                        parseResult.type
                    );
                    results.push(data);
                } else if (parseResult.platform === 'twitter') {
                    const data = await TwitterService.fetchVideoData(parseResult.videoId);
                    results.push(data);
                }
            } catch (fetchError) {
                console.error('获取数据失败:', fetchError);
                results.push({
                    platform: entry.platform,
                    videoId: parseResult.videoId,
                    title: '',
                    author: '',
                    thumbnail: '',
                    publishTime: '',
                    viewCount: 0,
                    likeCount: 0,
                    commentCount: 0,
                    shareCount: null,
                    status: 'error',
                    errorMessage: fetchError.message || '获取数据失败'
                });
            }

            // 添加延迟，避免请求过快
            if (i < entries.length - 1) {
                await this.delay(500);
            }
        }

        return results;
    }

    displayResults(results) {
        console.log('显示结果:', results);
        // 设置表格数据
        this.dataTable.setData(results);
        
        // 显示结果区域
        this.resultsSection.style.display = 'block';
        
        // 滚动到结果区域
        this.resultsSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });

        // 统计成功和失败的数量
        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;
        
        console.log(`✅ 查询完成: 成功 ${successCount} 条, 失败 ${errorCount} 条`);
    }

    setLoading(loading) {
        this.isLoading = loading;
        
        if (loading) {
            this.loadingOverlay.style.display = 'flex';
            this.queryButton.setLoading(true);
        } else {
            this.loadingOverlay.style.display = 'none';
            this.queryButton.setLoading(false);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 导出数据为 CSV
    exportToCSV() {
        if (this.dataTable.data.length === 0) {
            alert('没有可导出的数据');
            return;
        }

        const headers = ['平台', '视频ID', '标题', '发布时间', '点赞数', '评论数', '转发数', '播放数'];
        const rows = this.dataTable.data.map(item => [
            item.platform === 'youtube' ? 'YouTube' : (item.platform === 'bilibili' ? 'Bilibili' : 'Twitter'),
            item.videoId,
            item.title,
            item.publishTime ? new Date(item.publishTime).toLocaleString('zh-CN') : '',
            item.likeCount || 0,
            item.commentCount || 0,
            item.shareCount || '-',
            item.viewCount || 0
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // 创建下载链接
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `视频数据_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 重置应用状态
    reset() {
        this.linkInput.reset();
        this.dataTable.clearData();
        this.resultsSection.style.display = 'none';
        console.log('应用已重置');
    }
}

// 创建全局应用实例
let app;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 加载完成，创建应用实例...');
    try {
        app = new VideoStatsApp();
        
        // 将应用实例暴露到全局，方便调试
        window.videoStatsApp = app;
        
        console.log('✅ 应用实例创建成功:', app);
    } catch (error) {
        console.error('❌ 创建应用实例失败:', error);
        alert('创建应用失败: ' + error.message);
    }
});
