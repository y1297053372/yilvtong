const articleService = require('../../services/articleService');
const scrollBehavior = require('../../behaviors/scrollBehavior');

Page({
  ...scrollBehavior,

  data: {
    ...scrollBehavior.data,
    keyword: '',
    searchResults: [],
    currentSort: 'comprehensive',
    showLimitedTip: false,
    limitHint: null
  },

  onLoad(options) {
    const app = getApp();
    this.setData({
      navBarHeight: app.globalData.navBarHeight
    });
    const { keyword } = options;
    if (keyword) {
      this.setData({ keyword: decodeURIComponent(keyword) });
      this.performSearch();
    }
  },

  onSortTap(e) {
    const sort = e.currentTarget.dataset.sort;
    if (sort === this.data.currentSort) return;
    
    this.setData({ currentSort: sort, showLimitedTip: false });
    this.performSearch();
  },

  performSearch() {
    const keyword = this.data.keyword;
    
    if (!keyword) {
      this.setData({ searchResults: [], loading: false, showLimitedTip: false, limitHint: null });
      return;
    }

    this.setData({ 
      loading: true,
      searchResults: [],
      showLimitedTip: false,
      limitHint: null
    });

    articleService.getArticles({
      keyword: keyword,
      page: 1,
      pageSize: 20,
      orderBy: this.data.currentSort
    }).then(res => {
      this.setData({
        searchResults: res.list,
        loading: false,
        showLimitedTip: res.isLimited || false,
        limitHint: res.limitHint || null
      });
    }).catch(err => {
      console.error('Search failed', err);
      this.setData({
        searchResults: [],
        loading: false,
        showLimitedTip: false,
        limitHint: null
      });
      wx.showToast({
        title: '搜索失败',
        icon: 'none'
      });
    });
  },

  onResultTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/article/article?id=${id}`
    });
  }
});
