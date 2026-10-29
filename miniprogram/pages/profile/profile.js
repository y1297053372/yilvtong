const app = getApp();
const db = wx.cloud.database();
const userService = require('../../services/userService');
const documentService = require('../../services/documentService');
const imagePreloader = require('../../utils/imagePreloader');

const REFRESH_INTERVAL = 30 * 1000;

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

Page({
  data: {
    navBarHeight: 88,
    userInfo: {
      avatarUrl: '',
      nickName: ''
    },
    hasUserInfo: false,
    favoritesCount: 0,
    documentsCount: 0,
    contactItem: {
      id: 'contact',
      title: '联系客服',
      url: '/pages/contact/contact'
    },
    menuItems: [
      {
        id: 'favorites',
        title: '我的收藏',
        icon: '/images/icons/topic.svg',
        url: '/pages/list/list?type=favorites' 
      },
      {
        id: 'history',
        title: '浏览足迹',
        icon: '/images/icons/search.svg',
        url: '/pages/list/list?type=history'
      },
      {
        id: 'documents',
        title: '我的文书',
        icon: '/images/icons/evidence.svg',
        url: '/pages/my-documents/my-documents'
      },
      {
        id: 'agency',
        title: '维权代理',
        icon: '/images/icons/law.svg',
        url: '/pages/agency/agency' 
      },
      {
        id: 'guide',
        title: '用户须知',
        icon: '/images/icons/channel.svg',
        url: '/pages/document-article/document-article?source=user_notice'
      }
    ],
    
    maskAnimation: null,
    maskHidden: true,
    isDarkMode: false
  },

  _lastFetchTime: 0,

  onLoad() {
    const appBaseInfo = wx.getAppBaseInfo();
    const isDarkMode = appBaseInfo.theme === 'dark';
    
    this.setData({
      navBarHeight: app.globalData.navBarHeight,
      isDarkMode: isDarkMode,
      maskHidden: false
    });
    
    this.playMaskFadeOutAnimation();

    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      const preloadedAvatar = imagePreloader.getPreloadedAvatar();
      if (preloadedAvatar && userInfo.avatarUrl) {
        userInfo.avatarUrl = preloadedAvatar;
      }
      
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true
      });
      app.globalData.userInfo = userInfo;
    }
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

  onShow() {
    this.showMaskForTransition();
    
    const now = Date.now();
    const needRefresh = app.globalData.needRefreshProfile || 
                        (now - this._lastFetchTime) > REFRESH_INTERVAL;
    
    if (needRefresh) {
      this.fetchUserProfile();
      this._lastFetchTime = now;
      app.globalData.needRefreshProfile = false;
    }

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },

  async fetchUserProfile() {
    try {
      const user = await userService.getCurrentUser();
      if (user) {
        const localUser = this.data.userInfo;
        const newUserInfo = Object.assign({}, localUser, user);

        if (newUserInfo.avatarUrl && newUserInfo.avatarUrl.startsWith('cloud://')) {
          imagePreloader.preloadProfileAvatar(newUserInfo.avatarUrl);
        }

        this.setData({
          userInfo: newUserInfo,
          hasUserInfo: !!(newUserInfo.nickName || newUserInfo.avatarUrl),
          favoritesCount: (user.favorites && user.favorites.length) || 0
        });

        wx.setStorageSync('userInfo', newUserInfo);
        app.globalData.userInfo = newUserInfo;
      }
    } catch (err) {
      console.error('获取用户信息失败', err);
      wx.showToast({
        title: '获取用户信息失败',
        icon: 'none',
        duration: 2000
      });
    }

    this.fetchDocumentsCount();
  },

  async fetchDocumentsCount() {
    try {
      const count = await documentService.countDocuments();
      this.setData({ documentsCount: count });
    } catch (err) {
      console.error('获取文书数量失败', err);
    }
  },

  async onChooseAvatar(e) {
    if (!e.detail || !e.detail.avatarUrl) {
      return;
    }

    const { avatarUrl } = e.detail;
    const cloudPath = 'avatar/' + generateUUID() + '.jpg';

    wx.showLoading({ title: '上传中...' });

    try {
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: avatarUrl
      });

      this.setData({
        'userInfo.avatarUrl': uploadRes.fileID,
        hasUserInfo: true
      });

      imagePreloader.preloadProfileAvatar(uploadRes.fileID);

      await this.updateUserToCloud({ avatarUrl: uploadRes.fileID });
      wx.hideLoading();
    } catch (err) {
      console.error('上传失败', err);
      wx.hideLoading();
      wx.showToast({ title: '头像上传失败', icon: 'none' });
    }
  },

  async onNicknameChange(e) {
    const nickName = e.detail.value;
    if (!nickName) return;

    wx.showLoading({ title: '检测中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'contentCheck',
        data: {
          type: 'text',
          payload: { content: nickName }
        }
      });

      wx.hideLoading();

      if (res.result.code === 0) {
        this.setData({ 'userInfo.nickName': nickName });
        await this.updateUserToCloud({ nickName });
      } else {
        wx.showToast({ title: '昵称包含违规内容', icon: 'none' });
        this.setData({ 'userInfo.nickName': this.data.userInfo.nickName || '' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('检测失败', err);
      wx.showToast({ title: '检测服务异常', icon: 'none' });
    }
  },

  async updateUserToCloud(dataToUpdate) {
    const user = await userService.getCurrentUser();

    if (!user) {
      const userId = await userService.createUser(dataToUpdate);
      if (userId) {
        this.saveUserInfo();
      }
    } else {
      const success = await userService.updateCurrentUser({
        ...dataToUpdate,
        updateTime: db.serverDate()
      });
      if (success) {
        this.saveUserInfo();
      }
    }
  },

  onNicknameInput(e) {
    this.setData({ 'userInfo.nickName': e.detail.value });
  },

  saveUserInfo() {
    const userInfo = this.data.userInfo;
    wx.setStorageSync('userInfo', userInfo);
    app.globalData.userInfo = userInfo;
  },

  handleMenuClick(e) {
    const item = e.currentTarget.dataset.item;

    if (item && item.url) {
      if (item.url.includes('pages/document/document')) {
        wx.switchTab({ url: '/pages/document/document' });
      } else {
        wx.navigateTo({
          url: item.url,
          fail: (err) => {
            console.error('Navigation failed', err);
            wx.showToast({ title: '功能开发中', icon: 'none' });
          }
        });
      }
    }
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          this.setData({
            userInfo: { avatarUrl: '', nickName: '' },
            hasUserInfo: false,
            favoritesCount: 0,
            documentsCount: 0
          });
          app.globalData.userInfo = null;
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  }
});
