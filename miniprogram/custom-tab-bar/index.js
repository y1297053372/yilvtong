// 获取全局应用实例
const app = getApp()

Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        iconPath: '/images/tabbar/home.svg',
        selectedIconPath: '/images/tabbar/home-active.svg'
      },
      {
        pagePath: '/pages/document/document',
        text: '文书生成',
        iconPath: '/images/tabbar/document.svg',
        selectedIconPath: '/images/tabbar/document-active.svg'
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        iconPath: '/images/tabbar/profile.svg',
        selectedIconPath: '/images/tabbar/profile-active.svg'
      }
    ]
  },

  lifetimes: {
    attached() {
      const pages = getCurrentPages()
      if (!pages.length) return
      
      const currentPage = pages[pages.length - 1]
      const route = currentPage?.route
      
      if (!route) return
      
      const currentPath = '/' + route
      const index = this.data.list.findIndex(item => item.pagePath === currentPath)
      
      if (index !== -1 && index !== this.data.selected) {
        this.setData({ selected: index })
        app.globalData.currentTabIndex = index
      }
    }
  },

  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const index = data.index
      const path = data.path
      
      if (index === this.data.selected) return
      
      app.globalData.currentTabIndex = index
      wx.switchTab({ url: path })
    }
  }
})
