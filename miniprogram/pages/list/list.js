const articleService = require('../../services/articleService');
const userService = require('../../services/userService');

Page({
  data: {
    type: '',
    title: '',
    list: [],
    loading: true
  },

  onLoad(options) {
    const { type, title } = options;
    let pageTitle = title || '列表';
    
    if (!title) {
        if (type === 'favorites') pageTitle = '我的收藏';
        if (type === 'history') pageTitle = '浏览足迹';
    }

    this.setData({ type, title: pageTitle });
    wx.setNavigationBarTitle({ title: pageTitle });
    
    this.loadData(type, true);
  },
  
  onShow() {
      if (this.data.type === 'favorites' || this.data.type === 'history') {
          this.loadData(this.data.type);
      }
  },

  async loadData(type, force = false) {
    if (this.data.loading && !force) return;
    this.setData({ loading: true });

    try {
        if (type === 'favorites' || type === 'history') {
            await this.loadUserCollection(type);
        } else {
             const categoryMap = {
               'evidence': '1',
               'channel': '2',
               'law': '3',
               'topic': '4'
             };
             
             const categoryId = categoryMap[type];
             
             if (categoryId) {
               const res = await articleService.getArticles({
                 category: categoryId,
                 page: 1,
                 pageSize: 20
               });
               
               this.setData({
                 list: res.list
               });
             } else {
               this.setData({ list: [] });
             }
        }
    } catch (err) {
        console.error('加载列表失败', err);
        wx.showToast({
            title: '加载失败',
            icon: 'none'
        });
    } finally {
        this.setData({ loading: false });
    }
  },

  async loadUserCollection(type) {
      let ids;
      if (type === 'favorites') {
        ids = await userService.getUserFavorites();
      } else {
        ids = await userService.getUserHistory();
      }
      
      if (ids.length === 0) {
          this.setData({ list: [] });
          return;
      }
      
      if (type === 'history') {
          ids = [...new Set([...ids].reverse())];
      } else {
          ids = [...ids].reverse();
      }

      const articles = await articleService.getArticlesByIds(ids);
      
      const sortedArticles = ids.map(id => articles.find(a => a.id === id)).filter(item => item);

      this.setData({ list: sortedArticles });
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/article/article?id=${id}`
    });
  },

  onLongPress(e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    if (!id) return;

    const isFavorites = this.data.type === 'favorites';
    const title = isFavorites ? '取消收藏' : '删除记录';
    const content = isFavorites 
      ? '确定要取消收藏这篇文章吗？' 
      : '确定要删除这条浏览记录吗？';

    wx.showModal({
      title: title,
      content: content,
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          this.removeItem(id, index);
        }
      }
    });
  },

  async removeItem(id, index) {
    wx.showLoading({ title: '删除中...' });
    
    let success = false;
    if (this.data.type === 'favorites') {
      success = await userService.removeFromFavorites(id);
    } else if (this.data.type === 'history') {
      success = await userService.removeFromHistory(id);
    }
    
    if (success) {
      const list = this.data.list;
      list.splice(index, 1);
      this.setData({ list });
      
      wx.hideLoading();
      wx.showToast({
        title: '已删除',
        icon: 'success'
      });
    } else {
      wx.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  }
});
