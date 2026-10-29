const { getPrivacyConfig } = require('../../utils/privacyUtils');

Component({
  properties: {
    documentType: {
      type: String,
      value: 'civil_complaint'
    },
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    config: null,
    agreed: false
  },

  observers: {
    'documentType': function(type) {
      this.setData({ config: getPrivacyConfig(type) });
    },
    'show': function(show) {
      if (show) {
        this.setData({ agreed: false });
      }
      wx.nextTick(() => {
        this.triggerEvent('showChange', { show });
      });
    }
  },

  methods: {
    preventTouchMove() {
      return false;
    },

    onAgreeChange(e) {
      this.setData({ agreed: e.detail.value.length > 0 });
    },

    onConsentIdCard() {
      if (!this.data.agreed) {
        wx.showToast({ title: '请先同意隐私保护指引', icon: 'none' });
        return;
      }
      this.triggerEvent('consent', { consentIdCard: true });
    },

    onDeclineIdCard() {
      this.triggerEvent('consent', { consentIdCard: false });
    },

    onOpenPrivacyPolicy() {
      if (wx.openPrivacyContract) {
        wx.openPrivacyContract({
          success: () => {
            console.log('打开隐私保护指引成功');
          },
          fail: (err) => {
            console.error('打开隐私保护指引失败:', err);
            wx.navigateTo({ url: '/pages/guide/guide?type=privacy' });
          }
        });
      } else {
        wx.navigateTo({ url: '/pages/guide/guide?type=privacy' });
      }
    }
  }
});
