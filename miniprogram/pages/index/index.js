
const articleService = require('../../services/articleService');
const scrollBehavior = require('../../behaviors/scrollBehavior');
const imagePreloader = require('../../utils/imagePreloader');

Page({
  ...scrollBehavior,

  data: {
    ...scrollBehavior.data,
    navBarHeight: 0,
    banners: [],
    categories: [],
    articles: [],
    useScrollView: true,
    
    isSearchActive: false,
    isSearchFocus: false,
    keyword: '',
    history: [],
    hotKeys: ['消费维权', '劳动合同', '退货退款', '交通事故'],
    currentSwiperIndex: 0,
    isHarmony: false,
    bannerHeight: 200,
    windowWidth: 375,
    
    maskAnimation: null,
    maskHidden: true,
    isDarkMode: false
  },

  onLoad: function (options) {
    const app = getApp();
    const deviceInfo = wx.getDeviceInfo();
    const windowInfo = wx.getWindowInfo();
    const isHarmony = (deviceInfo.system && deviceInfo.system.includes('HarmonyOS')) || (deviceInfo.platform && deviceInfo.platform === 'ohos');
    
    const appBaseInfo = wx.getAppBaseInfo();
    const isDarkMode = appBaseInfo.theme === 'dark';
    
    this.setData({
      currentSwiperIndex: 0,
      navBarHeight: app.globalData.navBarHeight,
      statusBarHeight: app.globalData.statusBarHeight,
      menuHeight: app.globalData.menuHeight,
      menuBottom: app.globalData.menuBottom,
      isHarmony: isHarmony,
      windowWidth: windowInfo.windowWidth,
      isDarkMode: isDarkMode,
      maskHidden: false
    });
    
    this.playMaskFadeOutAnimation();
    this.loadData();
    this.loadHistory();
  },

  playMaskFadeOutAnimation() {
    const animation = wx.createAnimation({
      duration: 400,
      timingFunction: 'ease-out',
    });
    animation.opacity(0).step();
    this.setData({
      maskAnimation: animation.export()
    });
    
    setTimeout(() => {
      this.setData({ maskHidden: true });
    }, 400);
  },

  showMaskForTransition() {
    this.setData({
      maskHidden: false,
      maskAnimation: null
    });
    
    setTimeout(() => {
      this.playMaskFadeOutAnimation();
    }, 50);
  },

  onBannerLoad: function(e) {
    const { width, height } = e.detail;
    const windowWidth = this.data.windowWidth;
    const bannerHeight = (height / width) * (windowWidth - 40);
    if (bannerHeight > 0 && Math.abs(bannerHeight - this.data.bannerHeight) > 1) {
      this.setData({ bannerHeight });
    }
  },

  onShow() {
    this.showMaskForTransition();
    
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
  },

  async loadData() {
    const categories = [
      {
        id: 'evidence',
        name: '证据搜集',
        desc: '全方位取证',
        icon: '/images/icons/evidence-new.svg',
        bgColor: 'linear-gradient(135deg, #60a5fa 0%, #1e40af 100%)',
        shadowColor: 'rgba(37, 99, 235, 0.5)',
      },
      {
        id: 'channel',
        name: '维权途径',
        desc: '专业渠道',
        icon: '/images/icons/channel-new.svg',
        bgColor: 'linear-gradient(135deg, #34d399 0%, #047857 100%)',
        shadowColor: 'rgba(16, 185, 129, 0.5)',
      },
      {
        id: 'law',
        name: '法条详解',
        desc: '法律文库',
        icon: '/images/icons/law-new.svg',
        bgColor: 'linear-gradient(135deg, #fbbf24 0%, #c2410c 100%)',
        shadowColor: 'rgba(217, 119, 6, 0.5)',
      },
      {
        id: 'topic',
        name: '维权专题',
        desc: '深度解析',
        icon: '/images/icons/topic-new.svg',
        bgColor: 'linear-gradient(135deg, #a78bfa 0%, #6d28d9 100%)',
        shadowColor: 'rgba(124, 58, 237, 0.5)',
      }
    ];
    this.setData({ categories });

    const preloadedData = imagePreloader.getPreloadedIndexData();
    if (preloadedData && preloadedData.banners && preloadedData.hotArticles) {
      this.setData({ 
        banners: preloadedData.banners, 
        articles: preloadedData.hotArticles
      });
      return;
    }

    try {
      const [banners, hotArticles] = await Promise.all([
        articleService.getBanners(),
        articleService.getHotArticles()
      ]);

      this.setData({ 
        banners: banners, 
        articles: hotArticles
      });

    } catch (err) {
      console.error('首页数据获取失败', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // Search Logic
  onSearchTap() {
    this.setData({
      isSearchActive: true,
      isSearchFocus: true
    });
  },

  onSearchCancel() {
    this.setData({
      isSearchActive: false,
      isSearchFocus: false,
      keyword: ''
    });
    // Blur input
    wx.hideKeyboard();
  },

  onSearchInput(e) {
    this.setData({
      keyword: e.detail.value
    });
  },

  onClearInput() {
    this.setData({
      keyword: '',
      isSearchFocus: true
    });
  },

  onSearchConfirm() {
    const keyword = this.data.keyword.trim();
    if (!keyword) return;

    this.saveHistory(keyword);
    
    // Navigate to results page
    wx.navigateTo({
      url: `/pages/search/search?keyword=${encodeURIComponent(keyword)}`
    });
    
    // Reset state after navigation
    this.setData({
      isSearchActive: false,
      isSearchFocus: false,
      keyword: ''
    });
  },

  onTagTap(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ keyword }, () => {
      this.onSearchConfirm();
    });
  },

  loadHistory() {
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({ history });
  },

  saveHistory(keyword) {
    let history = this.data.history;
    const index = history.indexOf(keyword);
    if (index > -1) {
      history.splice(index, 1);
    }
    history.unshift(keyword);
    if (history.length > 10) {
      history.pop();
    }
    this.setData({ history });
    wx.setStorageSync('searchHistory', history);
  },

  onClearHistory() {
    this.setData({ history: [] });
    wx.removeStorageSync('searchHistory');
  },

  onCategoryTap: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/knowledge/knowledge?category=${id}`
    });
  },

  onViewAll: function() {
    wx.navigateTo({
      url: '/pages/knowledge/knowledge'
    });
  },

  onArticleTap: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/article/article?id=${id}`
    });
  },

  onSwiperChange: function(e) {
    this.setData({
      currentSwiperIndex: e.detail.current
    });
  }
})
