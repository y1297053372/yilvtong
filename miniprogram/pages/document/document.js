const { BANNER_IMAGES, DOCUMENT_ARTICLE_SOURCES } = require('../../config/constants');
const imagePreloader = require('../../utils/imagePreloader');

Page({
  data: {
    banners: [
      { id: 1, image: '', source: DOCUMENT_ARTICLE_SOURCES.COMPLAINT_BANNER },
      { id: 2, image: '', source: DOCUMENT_ARTICLE_SOURCES.REPORT_BANNER },
      { id: 3, image: '', source: DOCUMENT_ARTICLE_SOURCES.NEGOTIATION_BANNER }
    ],
    currentSwiperIndex: 0,
    bannerHeight: 200,
    windowWidth: 375,
    
    maskAnimation: null,
    maskHidden: true,
    isDarkMode: false
  },
  
  onLoad: function (options) {
    const windowInfo = wx.getWindowInfo();
    const appBaseInfo = wx.getAppBaseInfo();
    const isDarkMode = appBaseInfo.theme === 'dark';
    
    this.setData({
      windowWidth: windowInfo.windowWidth,
      isDarkMode: isDarkMode,
      maskHidden: false
    });
    
    this.playMaskFadeOutAnimation();
    this.loadBannerImages();
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

  loadBannerImages: function() {
    const preloadedBanners = imagePreloader.getPreloadedBanners();
    this.setData({
      banners: [
        { id: 1, image: preloadedBanners.COMPLAINT || BANNER_IMAGES.COMPLAINT, source: DOCUMENT_ARTICLE_SOURCES.COMPLAINT_BANNER },
        { id: 2, image: preloadedBanners.REPORT || BANNER_IMAGES.REPORT, source: DOCUMENT_ARTICLE_SOURCES.REPORT_BANNER },
        { id: 3, image: preloadedBanners.NEGOTIATION || BANNER_IMAGES.NEGOTIATION, source: DOCUMENT_ARTICLE_SOURCES.NEGOTIATION_BANNER }
      ]
    });
  },

  onShow() {
    this.showMaskForTransition();
    
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }
  },

  navigateToComplaint() {
    wx.navigateTo({
      url: '/pages/complaint-form/complaint-form'
    })
  },

  navigateToReport() {
    wx.navigateTo({
      url: '/pages/report-form/report-form'
    })
  },

  navigateToNegotiation() {
    wx.navigateTo({
      url: '/pages/negotiation-form/negotiation-form'
    })
  },

  onSwiperChange(e) {
    this.setData({
      currentSwiperIndex: e.detail.current
    })
  },

  onBannerTap(e) {
    const index = e.currentTarget.dataset.index;
    const sources = [
      DOCUMENT_ARTICLE_SOURCES.COMPLAINT_BANNER,
      DOCUMENT_ARTICLE_SOURCES.REPORT_BANNER,
      DOCUMENT_ARTICLE_SOURCES.NEGOTIATION_BANNER
    ];
    wx.navigateTo({
      url: `/pages/document-article/document-article?source=${sources[index]}`
    });
  },

  showComingSoon() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  }
})
