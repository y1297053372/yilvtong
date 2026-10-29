const { CATEGORY_MAP } = require('../../config/constants');
const userService = require('../../services/userService');
const articleService = require('../../services/articleService');
const scrollBehavior = require('../../behaviors/scrollBehavior');
const { formatDateCN, formatRelativeTime, processHtmlContent } = require('../../utils/documentUtils');

Page({
  ...scrollBehavior,

  data: {
    ...scrollBehavior.data,
    id: null,
    article: null,
    isDarkMode: false,
    tagStyle: {
      p: 'margin-bottom: 0.5em; line-height: 1.8; text-align: justify;',
      img: 'max-width: 100%; height: auto; display: block; margin: 10px 0;',
      blockquote: 'margin: 10px 0; padding: 10px 15px; background-color: #eff6ff; border-left: 4px solid #1152d4; color: #666; line-height: 1.6;',
      h1: 'font-size: 1.5em; font-weight: bold; margin: 0.8em 0;',
      h2: 'font-size: 1.4em; font-weight: bold; margin: 0.8em 0;',
      h3: 'font-size: 1.3em; font-weight: bold; margin: 0.8em 0;',
      a: 'color: #1152d4; text-decoration: none;'
    },
    isCollected: false
  },

  onLoad(options) {
    const { id } = options;
    const appBaseInfo = wx.getAppBaseInfo();
    const isDarkMode = appBaseInfo.theme === 'dark';
    
    this.setData({
      id,
      isDarkMode
    });
    
    this.updateTagStyle(isDarkMode);
    
    this.loadArticle(id);
    this.checkCollectionStatus(id);
    this.addToHistory(id);
    
    this._themeHandler = (res) => {
      const isDark = res.theme === 'dark';
      this.setData({ isDarkMode: isDark });
      this.updateTagStyle(isDark);
      // 重新处理文章内容以应用深色模式样式
      if (this.data.article && this.data.article.content) {
        const { processHtmlContent } = require('../../utils/documentUtils');
        const newContent = processHtmlContent(this.data.article.rawContent || this.data.article.content, isDark);
        this.setData({
          'article.content': newContent
        });
      }
    };
    wx.onThemeChange(this._themeHandler);
  },
  
  updateTagStyle(isDarkMode) {
    const blockquoteBg = isDarkMode ? '#1e293b' : '#eff6ff';
    const blockquoteColor = isDarkMode ? '#94a3b8' : '#666';
    const blockquoteBorder = isDarkMode ? '#3b82f6' : '#1152d4';
    const textColor = isDarkMode ? '#e2e8f0' : '#333';
    const linkColor = isDarkMode ? '#60a5fa' : '#1152d4';
    
    this.setData({
      tagStyle: {
        p: `margin-bottom: 0.5em; line-height: 1.8; text-align: justify; color: ${textColor};`,
        img: 'max-width: 100%; height: auto; display: block; margin: 10px 0;',
        blockquote: `margin: 10px 0; padding: 10px 15px; background-color: ${blockquoteBg}; border-left: 4px solid ${blockquoteBorder}; color: ${blockquoteColor}; line-height: 1.6;`,
        h1: `font-size: 1.5em; font-weight: bold; margin: 0.8em 0; color: ${textColor};`,
        h2: `font-size: 1.4em; font-weight: bold; margin: 0.8em 0; color: ${textColor};`,
        h3: `font-size: 1.3em; font-weight: bold; margin: 0.8em 0; color: ${textColor};`,
        a: `color: ${linkColor}; text-decoration: none;`
      }
    });
  },

  onUnload() {
    if (this._themeHandler) {
      wx.offThemeChange(this._themeHandler);
    }
  },

  // 监听 scroll-view 滚动事件
  onScroll(e) {
    const scrollTop = e.detail.scrollTop;
    const threshold = 300;
    
    if (scrollTop > threshold) {
      if (!this.data.showBackTop) {
        this.setData({ showBackTop: true });
      }
    } else {
      if (this.data.showBackTop) {
        this.setData({ showBackTop: false });
      }
    }
  },

  // 检查收藏状态

  checkCollectionStatus(articleId) {
    userService.checkInFavorites(articleId).then(isCollected => {
      this.setData({ isCollected });
    });
  },

  // 添加浏览足迹
  addToHistory(articleId) {
    userService.addToHistory(articleId);
  },

  async onCollectTap() {
    const articleId = this.data.id;
    const isCollected = this.data.isCollected;

    this.setData({
      isCollected: !isCollected,
      'article.collects': (this.data.article.collects || 0) + (isCollected ? -1 : 1)
    });

    let userOpSuccess = false;
    let articleOpSuccess = false;

    if (isCollected) {
      userOpSuccess = await userService.removeFromFavorites(articleId);
      articleOpSuccess = await articleService.updateCollectCount(articleId, -1);
    } else {
      userOpSuccess = await userService.addToFavorites(articleId);
      articleOpSuccess = await articleService.updateCollectCount(articleId, 1);
    }

    if (!userOpSuccess || !articleOpSuccess) {
      this.setData({
        isCollected: isCollected,
        'article.collects': (this.data.article.collects || 0) + (isCollected ? 1 : -1)
      });
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
      return;
    }

    wx.showToast({
      title: !isCollected ? '收藏成功' : '已取消收藏',
      icon: 'none'
    });
  },

  onShareAppMessage() {
    return {
      title: this.data.article ? this.data.article.title : '衣律通',
      path: `/pages/article/article?id=${this.data.id}`
    };
  },

  // --- mp-html 交互方法 ---
  
  getCategoryName(l1_id) {
    return CATEGORY_MAP[l1_id] || '其他';
  },

  getCategoryClass(l1_id) {
    const map = {
      '1': 'blue',    // 证据搜集 - 蓝色
      '2': 'green',   // 维权途径 - 绿色
      '3': 'orange',  // 法条详解 - 橙色
      '4': 'pink'     // 维权专题 - 粉色
    };
    return map[l1_id] || 'default';
  },

  async loadArticle(id) {
    if (!id) return;
    
    wx.showLoading({
      title: '加载中...',
    });

    try {
      const data = await articleService.getArticleById(id);
      if (!data) {
        throw new Error('文章不存在');
      }
      
      const rawContent = data.content || '';
      const content = processHtmlContent(rawContent, this.data.isDarkMode);

      const article = {
        title: data.title,
        date: formatDateCN(data.date),
        views: data.view || 0,
        collects: data.collect || 0,
        category: this.getCategoryName(data.category_l1),
        categoryClass: this.getCategoryClass(data.category_l1),
        content: content,
        rawContent: rawContent
      };
      
      this.setData({ article });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({
        title: '文章不存在或已删除',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  }
});
