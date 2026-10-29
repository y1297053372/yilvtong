const app = getApp()

Component({
  options: {
    styleIsolation: 'apply-shared'
  },

  properties: {
    title: {
      type: String,
      value: ''
    },
    background: {
      type: String,
      value: 'var(--nav-bg, #ffffff)'
    },
    showPlaceholder: {
      type: Boolean,
      value: true
    }
  },

  data: {
    navBarHeight: 0,
    statusBarHeight: 0,
    contentHeight: 0
  },

  lifetimes: {
    attached: function () {
      this.setData({
        navBarHeight: app.globalData.navBarHeight,
        statusBarHeight: app.globalData.statusBarHeight,
        contentHeight: app.globalData.navBarHeight - app.globalData.statusBarHeight
      })
    }
  },

  methods: {
    onBackTap() {
      wx.navigateBack({
        delta: 1
      });
    }
  }
})