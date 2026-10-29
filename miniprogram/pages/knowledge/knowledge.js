const { CATEGORY_MAP, CACHE_CONFIG } = require('../../config/constants');
const articleService = require('../../services/articleService');

const CACHE_MAX_SIZE = CACHE_CONFIG.MAX_SIZE;
const CACHE_TTL = CACHE_CONFIG.TTL_MS;

class ArticleCache {
  constructor(maxSize, ttl) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.misses++;
      return null;
    }
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    this.cache.delete(key);
    this.cache.set(key, item);
    this.hits++;
    return item.data;
  }

  set(key, data) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  getHitRate() {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : (this.hits / total * 100).toFixed(1);
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

const globalArticleCache = new ArticleCache(CACHE_MAX_SIZE, CACHE_TTL);

Page({
  data: {
    navBarHeight: 0,
    currentTab: 'evidence',
    currentSubTab: 'all',
    currentChildTab: 'all',
    sidebarIndicatorTop: 30,
    
    currentTabIndex: 0,
    level1IndicatorColor: '#2563eb',
    level1IndicatorShadow: 'rgba(37, 99, 235, 0.4)',
    
    showBackTop: false,
    scrollTop: 0,
    loading: false,
    
    categories: [
      { 
        id: 'evidence', 
        name: '证据搜集', 
        icon: '/images/icons/evidence-new.svg', 
        bgColor: '#eff6ff', 
        darkBgColor: '#1e3a5f',
        activeColor: '#2563eb',
        shadowColor: 'rgba(37, 99, 235, 0.4)'
      },
      { 
        id: 'channel', 
        name: '维权途径', 
        icon: '/images/icons/channel-new.svg', 
        bgColor: '#ecfdf5',
        darkBgColor: '#1a4d3a',
        activeColor: '#059669',
        shadowColor: 'rgba(5, 150, 105, 0.4)'
      },
      { 
        id: 'law', 
        name: '法条详解', 
        icon: '/images/icons/law-new.svg', 
        bgColor: '#fffbeb',
        darkBgColor: '#5c3d1e',
        activeColor: '#d97706',
        shadowColor: 'rgba(217, 119, 6, 0.4)'
      },
      { 
        id: 'topic', 
        name: '维权专题', 
        icon: '/images/icons/topic-new.svg', 
        bgColor: '#f5f3ff',
        darkBgColor: '#3d2066',
        activeColor: '#7c3aed',
        shadowColor: 'rgba(124, 58, 237, 0.4)'
      }
    ],
    
    // Sub-categories (Level 2) with Children (Level 3)
    subCategories: {
      evidence: [
        { id: 'all', name: '全部', icon: '/images/knowledge/all.svg' },
        { 
          id: 'general', 
          name: '一般证据', 
          icon: '/images/knowledge/general.svg',
          children: [
            { id: 'identity', name: '主体身份证据' },
            { id: 'contract', name: '交易契约证据' },
            { id: 'status', name: '问题现状证据' },
            { id: 'communication', name: '沟通协商证据' }
          ] 
        },
        { id: 'special', name: '特殊证据', icon: '/images/knowledge/special.svg' }
      ],
      channel: [
        { id: 'all', name: '全部', icon: '/images/knowledge/all.svg' },
        { id: 'negotiate', name: '协商维权', icon: '/images/knowledge/negotiate.svg' },
        { id: 'mediate', name: '调解组织', icon: '/images/knowledge/mediate.svg' },
        { id: 'justice', name: '司法手段', icon: '/images/knowledge/justice.svg' }
      ],
      law: [
        { id: 'all', name: '全部', icon: '/images/knowledge/all.svg' },
        { id: 'civil', name: '民法典', icon: '/images/knowledge/civil.svg' },
        { id: 'consumer', name: '消保法', icon: '/images/knowledge/consumer.svg' },
        { id: 'platform', name: '平台规定', icon: '/images/knowledge/platform.svg' },
        { id: 'other_law', name: '其他法规', icon: '/images/knowledge/other_law.svg' }
      ],
      topic: [
        { id: 'all', name: '全部', icon: '/images/knowledge/all.svg' }
      ]
    },

    // Mock Articles
    articles: []
  },

  onLoad: function (options) {
    const app = getApp();
    const windowInfo = wx.getWindowInfo();
    
    const windowWidth = windowInfo.windowWidth;
    let iconSize = Math.floor(windowWidth * 0.18);
    if (iconSize > 56) iconSize = 56;
    
    this.setData({
      navBarHeight: app.globalData.navBarHeight,
      iconBoxSize: iconSize,
      isDarkMode: windowInfo.theme === 'dark'
    });
    
    this._themeHandler = (res) => {
      this.setData({ isDarkMode: res.theme === 'dark' });
    };
    wx.onThemeChange(this._themeHandler);
    
    if (options.category) {
      const targetCategory = this.data.categories.find(c => c.id === options.category);
      const index = this.data.categories.findIndex(c => c.id === options.category);
      
      if (targetCategory && index !== -1) {
        this.setData({
          currentTab: options.category,
          currentTabIndex: index,
          level1IndicatorColor: targetCategory.activeColor,
          level1IndicatorShadow: targetCategory.shadowColor,
          sidebarIndicatorTop: 30
        });
      }
    }
    
    this.loadArticles();
  },

  onScroll: function(e) {
    const scrollTop = e.detail.scrollTop;
    if (scrollTop > 100) {
      if (!this.data.showBackTop) {
        this.setData({ showBackTop: true });
      }
    } else {
      if (this.data.showBackTop) {
        this.setData({ showBackTop: false });
      }
    }
  },

  onBackToTop: function() {
    this.setData({
      scrollTop: 0
    });
  },

  onTabTap(e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    const color = e.currentTarget.dataset.color;
    const shadow = e.currentTarget.dataset.shadow;
    
    // Find default sub-category (first one, usually 'all')
    const defaultSubCategory = this.data.subCategories[id][0];

    this.setData({ 
      currentTab: id,
      currentSubTab: 'all', // Reset sub-category
      currentSubCategory: defaultSubCategory, // Reset to default sub-category object
      currentChildTab: 'all', // Reset child category
      // Reset indicator to center of first item: (84px / 2) - (24px / 2) = 42 - 12 = 30
      sidebarIndicatorTop: 30,
      
      // Update L1 Indicator
      currentTabIndex: index,
      level1IndicatorColor: color,
      level1IndicatorShadow: shadow,
      
      // Clear articles immediately to trigger loading spinner
      articles: [],
      loading: true
    });
    this.loadArticles();
  },

  onSubTabTap(e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    // Calculate top position for the bar: 
    // index * itemHeight + (itemHeight - barHeight)/2
    // index * 84 + (84 - 24)/2 = index * 84 + 30
    const top = index * 84 + 30;

    // Find the current sub-category object to check for children
    const currentSubCategory = this.data.subCategories[this.data.currentTab].find(item => item.id === id);

    this.setData({ 
      currentSubTab: id,
      currentSubCategory: currentSubCategory, // Update current sub-category object
      currentChildTab: 'all', // Reset child category when switching sub-category
      sidebarIndicatorTop: top
    });
    this.loadArticles();
  },

  onChildTabTap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ currentChildTab: id });
    this.loadArticles();
  },

  async loadArticles() {
    const { currentTab, currentSubTab, currentChildTab } = this.data;
    
    const cacheKey = `${currentTab}_${currentSubTab}_${currentChildTab}`;
    
    const cachedData = globalArticleCache.get(cacheKey);
    if (cachedData) {
      this.setData({
        articles: cachedData,
        loading: false
      });
      return;
    }

    const l1Map = {
      'evidence': '1',
      'channel': '2',
      'law': '3',
      'topic': '4'
    };

    const l2Map = {
      'general': '1',
      'special': '2',
      'negotiate': '3',
      'mediate': '4',
      'justice': '6',
      'civil': '7',
      'consumer': '8',
      'platform': '9',
      'other_law': '10'
    };

    const l3Map = {
      'identity': '1',
      'contract': '2',
      'status': '3',
      'communication': '4'
    };
    
    this.setData({ 
      loading: true,
      articles: [] 
    });
    
    try {
      const category_l1 = l1Map[currentTab];
      const category_l2 = currentSubTab !== 'all' ? l2Map[currentSubTab] : null;
      const category_l3 = currentChildTab !== 'all' ? l3Map[currentChildTab] : null;

      const articles = await articleService.getArticlesByCategory({
        category_l1,
        category_l2,
        category_l3,
        limit: 100
      });

      const processedArticles = articles.map(item => ({
        ...item,
        category: this.getCategoryName(category_l1)
      }));

      globalArticleCache.set(cacheKey, processedArticles);

      this.setData({ 
        articles: processedArticles,
        loading: false
      });
    } catch (err) {
      console.error('Failed to load articles', err);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  getCategoryName(l1_id) {
    return CATEGORY_MAP[l1_id] || '其他';
  },

  onArticleTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/article/article?id=${id}`
    });
  },

  onUnload() {
    if (this._themeHandler) {
      wx.offThemeChange(this._themeHandler);
    }
  }
});
