Page({
  data: {
    bodyText: '',
    formData: {},
    scenarioOptions: [],
    scenarioQuestions: [],
    todayDate: '',
    generatedText: '',
    isPolished: false
  },

  onLoad(options) {
    const eventChannel = this.getOpenerEventChannel();
    if (eventChannel && eventChannel.on) {
      eventChannel.on('acceptDataFromOpenerPage', (data) => {
        this.setData({
          bodyText: data.bodyText || '',
          formData: data.formData || {},
          scenarioOptions: data.scenarioOptions || [],
          scenarioQuestions: data.scenarioQuestions || {},
          todayDate: data.todayDate || '',
          generatedText: data.generatedText || '',
          isPolished: data.isPolished || false
        });
      });
    }
  },

  onTextInput(e) {
    this.setData({ bodyText: e.detail.value });
  },

  goBack() {
    wx.navigateBack();
  },

  saveAndBack() {
    const eventChannel = this.getOpenerEventChannel();
    if (eventChannel) {
      eventChannel.emit('acceptDataFromOpenedPage', {
        bodyText: this.data.bodyText
      });
    }
    wx.navigateBack();
  }
})
