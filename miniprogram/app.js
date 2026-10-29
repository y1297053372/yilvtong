App({
  globalData: {
    currentTabIndex: 0,
    draftData: null,
    needRefreshDocuments: false,
    needRefreshProfile: false,
    userInfo: null,
    navBarHeight: 0,
    menuRight: 0,
    menuBottom: 0,
    menuHeight: 0,
    statusBarHeight: 0,
    isHarmonyOS: false,
    imagesPreloaded: false,
    pagesPreloaded: false,
    savePromise: null
  },

  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-3ghkaqpp214e4fc4',
        traceUser: true,
      })
    }

    // 从本地存储读取用户信息
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.globalData.userInfo = userInfo
    }

    const deviceInfo = wx.getDeviceInfo()
    const windowInfo = wx.getWindowInfo()
    const isHarmonyOS = deviceInfo.platform === 'ohos' || (deviceInfo.system && deviceInfo.system.includes('HarmonyOS'))
    this.globalData.isHarmonyOS = isHarmonyOS

    if (isHarmonyOS) {
      console.log('当前运行环境：HarmonyOS，部分特性可能暂不支持。')
    }

    const menuButtonInfo = wx.getMenuButtonBoundingClientRect()
    this.globalData.navBarHeight = (menuButtonInfo.top - windowInfo.statusBarHeight) * 2 + menuButtonInfo.height + windowInfo.statusBarHeight
    this.globalData.menuRight = windowInfo.screenWidth - menuButtonInfo.right
    this.globalData.menuBottom = menuButtonInfo.top - windowInfo.statusBarHeight
    this.globalData.menuHeight = menuButtonInfo.height
    this.globalData.statusBarHeight = windowInfo.statusBarHeight

    if (wx.onThemeChange && !isHarmonyOS) {
      wx.onThemeChange((res) => {
        console.log('Theme changed:', res.theme)
      })
    }

    this.preloadImages()
    this.preloadTabBarPages()
  },

  async preloadImages() {
    const imagePreloader = require('./utils/imagePreloader');
    try {
      await imagePreloader.initPreload();
      this.globalData.imagesPreloaded = true;
    } catch (err) {
      console.error('图片预加载失败:', err);
    }
  },

  preloadTabBarPages() {
    if (typeof wx.preloadPages !== 'function') {
      console.log('当前基础库不支持 wx.preloadPages');
      return;
    }
    
    setTimeout(() => {
      try {
        wx.preloadPages({
          pages: [
            '/pages/document/document',
            '/pages/profile/profile'
          ]
        });
        this.globalData.pagesPreloaded = true;
        console.log('TabBar页面预加载完成');
      } catch (err) {
        console.error('TabBar页面预加载失败:', err);
      }
    }, 1000);
  }
})
