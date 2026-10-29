const db = wx.cloud.database();
const _ = db.command;
const { CACHE_CONFIG } = require('../config/constants');

class UserService {
  constructor() {
    this._userCache = null;
    this._cacheTime = 0;
    this._cacheTTL = CACHE_CONFIG.USER_CACHE_TTL_MS;
  }

  _isCacheValid() {
    return this._userCache && (Date.now() - this._cacheTime) < this._cacheTTL;
  }

  invalidateCache() {
    this._userCache = null;
    this._cacheTime = 0;
  }

  async getCurrentUser(useCache = true) {
    if (useCache && this._isCacheValid()) {
      return this._userCache;
    }

    try {
      const res = await db.collection('user')
        .where({ _openid: '{openid}' })
        .get();
      
      const user = res.data.length > 0 ? res.data[0] : null;
      if (user) {
        this._userCache = user;
        this._cacheTime = Date.now();
      }
      return user;
    } catch (err) {
      console.error('获取用户信息失败:', err);
      return null;
    }
  }

  async createUser(data) {
    try {
      const res = await db.collection('user').add({
        data: {
          ...data,
          favorites: [],
          history: [],
          createTime: db.serverDate()
        }
      });
      this.invalidateCache();
      return res._id;
    } catch (err) {
      console.error('创建用户失败:', err);
      return null;
    }
  }

  async getUserById(userId) {
    try {
      const res = await db.collection('user').doc(userId).get();
      return res.data;
    } catch (err) {
      console.error('获取用户信息失败:', err);
      return null;
    }
  }

  async updateUser(userId, data) {
    try {
      await db.collection('user').doc(userId).update({
        data: data
      });
      this.invalidateCache();
      return true;
    } catch (err) {
      console.error('更新用户信息失败:', err);
      return false;
    }
  }

  async updateCurrentUser(data) {
    const user = await this.getCurrentUser(false);
    if (!user) return false;
    return this.updateUser(user._id, data);
  }

  async addToFavorites(articleId) {
    try {
      return await this.updateCurrentUser({
        favorites: _.addToSet(articleId)
      });
    } catch (err) {
      console.error('添加收藏失败:', err);
      return false;
    }
  }

  async removeFromFavorites(articleId) {
    try {
      return await this.updateCurrentUser({
        favorites: _.pull(articleId)
      });
    } catch (err) {
      console.error('取消收藏失败:', err);
      return false;
    }
  }

  async removeFromHistory(articleId) {
    try {
      return await this.updateCurrentUser({
        history: _.pull(articleId)
      });
    } catch (err) {
      console.error('删除浏览记录失败:', err);
      return false;
    }
  }

  async addToHistory(articleId) {
    try {
      return await this.updateCurrentUser({
        history: _.addToSet(articleId)
      });
    } catch (err) {
      console.error('添加浏览记录失败:', err);
      return false;
    }
  }

  async checkInFavorites(articleId) {
    const user = await this.getCurrentUser();
    if (!user) return false;
    const favorites = user.favorites || [];
    return favorites.includes(articleId);
  }

  async getUserFavorites() {
    const user = await this.getCurrentUser();
    return user ? (user.favorites || []) : [];
  }

  async getUserHistory() {
    const user = await this.getCurrentUser();
    return user ? (user.history || []) : [];
  }

  async updateProfile(data) {
    return this.updateCurrentUser(data);
  }

  async getDocumentsCount() {
    try {
      const res = await db.collection('documents')
        .where({ _openid: '{openid}' })
        .count();
      return res.total || 0;
    } catch (err) {
      console.error('获取文书数量失败:', err);
      return 0;
    }
  }
}

module.exports = new UserService();
