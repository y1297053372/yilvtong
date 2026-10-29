const scrollBehavior = {
  data: {
    showBackTop: false,
    scrollTop: 0
  },

  onPageScroll(e) {
    const scrollTop = e.detail ? e.detail.scrollTop : e.scrollTop;
    const threshold = this.data.scrollThreshold || 300;
    
    if (scrollTop > threshold) {
      if (!this.data.showBackTop) {
        this.setData({ showBackTop: true });
      }
    } else {
      if (this.data.showBackTop) {
        this.setData({ showBackTop: false });
      }
    }
  },

  onBackToTop() {
    if (this.data.useScrollView) {
      this.setData({ scrollTop: 0 });
    } else {
      wx.pageScrollTo({
        scrollTop: 0,
        duration: 300
      });
    }
  }
};

module.exports = scrollBehavior;
