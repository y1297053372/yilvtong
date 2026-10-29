// components/custom-header/custom-header.js
const app = getApp()

Component({
  properties: {
    title: {
      type: String,
      value: '衣律通'
    },
    pageName: {
      type: String,
      value: ''
    },
    transparent: {
      type: Boolean,
      value: false
    },
    noPlaceholder: {
      type: Boolean,
      value: false
    }
  },

  data: {
    navBarHeight: 0,
    statusBarHeight: 0,
    contentHeight: 0
  },

  lifetimes: {
    attached: function () {
      const windowInfo = wx.getWindowInfo();
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
      
      let navHeight = (menuButtonInfo.top - windowInfo.statusBarHeight) * 2 + menuButtonInfo.height + windowInfo.statusBarHeight;
      
      const extraHeight = 8; 
      
      this.setData({
        navBarHeight: navHeight + extraHeight,
        statusBarHeight: windowInfo.statusBarHeight,
        contentHeight: (navHeight + extraHeight) - windowInfo.statusBarHeight
      })
    }
  }
})
