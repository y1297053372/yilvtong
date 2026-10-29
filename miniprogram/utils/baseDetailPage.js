const { textToHtml, htmlToText } = require('./documentUtils');
const { generateAndOpenPDF } = require('./pdfUtils');

const BaseDetailPage = {
  data: {
    documentId: '',
    mainContent: '',
    mainContentHtml: '',
    dateStr: '',
    isExporting: false,
    document: null,
    isEditing: false,
    formData: {}
  },

  editorCtx: null,
  _originalMainContent: '',
  _hasContentChanges: false,

  getSignatureMarker() {
    throw new Error('子类必须实现 getSignatureMarker 方法');
  },

  getPDFTitle() {
    throw new Error('子类必须实现 getPDFTitle 方法');
  },

  getFormUrl() {
    throw new Error('子类必须实现 getFormUrl 方法');
  },

  getDocumentType() {
    throw new Error('子类必须实现 getDocumentType 方法');
  },

  onLoad(options) {
    this._hasContentChanges = false;
    if (options.id) {
      this.setData({ documentId: options.id });
      this.loadDocument(options.id);
    }
  },

  onShow() {
    if (this.data.documentId && !this.data.isEditing) {
      this.loadDocument(this.data.documentId);
    }
  },

  onHide() {
    if (this._hasContentChanges && this.data.mainContent) {
      this.saveToCloud();
    }
  },

  onUnload() {
    if (this._hasContentChanges && this.data.mainContent) {
      this.saveToCloud();
    }
  },

  onUnload() {
    if (this._hasContentChanges && this.data.mainContent) {
      this.saveToCloud();
    }
  },

  loadDocument(id) {
    const db = wx.cloud.database();
    db.collection('documents').doc(id).get()
      .then(res => {
        if (res.data) {
          const doc = res.data;
          const rawContent = doc.generatedContent || doc.content || '';
          const fullContent = typeof rawContent === 'string' ? rawContent : String(rawContent);
          const signatureMarker = this.getSignatureMarker();
          const signatureIndex = fullContent.indexOf(signatureMarker);

          if (signatureIndex > 0) {
            const mainContent = fullContent.substring(0, signatureIndex).trim();
            const dateMatch = fullContent.match(/(\d{4}年\d{1,2}月\d{1,2}日)/);
            const dateStr = dateMatch ? dateMatch[1] : '';

            const mainContentHtml = textToHtml(mainContent);
            this._originalMainContent = mainContent;
            this._hasContentChanges = false;
            this.setData({
              mainContent: mainContent,
              mainContentHtml: mainContentHtml,
              dateStr: dateStr,
              document: doc
            });
          } else {
            const mainContentHtml = textToHtml(fullContent);
            this._originalMainContent = fullContent;
            this._hasContentChanges = false;
            this.setData({
              mainContent: fullContent,
              mainContentHtml: mainContentHtml,
              document: doc
            });
          }
        }
      })
      .catch(err => {
        console.error('加载文档失败:', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  startEditing() {
    this.setData({ isEditing: true });
  },

  stopEditing() {
    this.setData({ isEditing: false });
  },

  async saveEditing() {
    if (this.editorCtx) {
      this.editorCtx.getContents({
        success: async (res) => {
          const text = res.text;
          if (text !== this._originalMainContent) {
            this._hasContentChanges = true;
          }
          const dateMatch = text.match(/(\d{4}年\d{1,2}月\d{1,2}日)/);
          const dateStr = dateMatch ? dateMatch[1] : this.data.dateStr;
          
          this.setData({
            mainContent: text,
            mainContentHtml: textToHtml(text),
            dateStr: dateStr,
            isEditing: false
          });
          if (this._hasContentChanges) {
            await this.saveToCloud();
          }
        }
      });
    }
  },

  onEditorReady() {
    const that = this;
    wx.createSelectorQuery().in(this).select('#editor').context(function(res) {
      that.editorCtx = res.context;
      if (that.data.mainContent) {
        that.editorCtx.setContents({
          html: that.data.mainContentHtml || textToHtml(that.data.mainContent)
        });
      }
    }).exec();
  },

  onEditorInput(e) {
    const text = htmlToText(e.detail.html);
    if (text !== this._originalMainContent) {
      this._hasContentChanges = true;
    }
    this.setData({ mainContent: text });
  },

  async saveToCloud() {
    if (!this.data.documentId) return;

    const db = wx.cloud.database();
    const app = getApp();
    app.globalData.needRefreshDocuments = true;

    const savePromise = db.collection('documents').doc(this.data.documentId).update({
      data: {
        generatedContent: this.getFullContent(),
        updatedAt: db.serverDate()
      }
    }).catch(err => {
      console.error('保存失败:', err);
    });

    app.globalData.savePromise = savePromise;
    return savePromise;
  },

  getFullContent() {
    return this.data.mainContent + '\n\n' + this.getSignatureMarker() + '___________\n' + this.data.dateStr;
  },

  continueEditing() {
    const app = getApp();
    const doc = this.data.document;
    if (!doc) return;

    const draft = {
      type: this.getDocumentType(),
      formData: doc.formData || {},
      lastStep: doc.lastStep || 0,
      documentId: doc._id,
      status: doc.status
    };

    app.globalData.draftData = draft;

    wx.navigateTo({
      url: this.getFormUrl()
    });
  },

  copyText() {
    const fullContent = this.getFullContent();
    if (!this.data.mainContent) {
      wx.showToast({ title: '没有可复制的内容', icon: 'none' });
      return;
    }

    wx.setClipboardData({
      data: fullContent,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  exportPDF() {
    if (!this.data.mainContent) {
      wx.showToast({ title: '没有可导出的内容', icon: 'none' });
      return;
    }

    const fullContent = this.getFullContent();

    this.setData({ isExporting: true });
    
    generateAndOpenPDF({
      content: fullContent,
      title: this.getPDFTitle()
    }).then(() => {
      this.setData({ isExporting: false });
    }).catch(err => {
      console.error('导出PDF失败:', err);
      this.setData({ isExporting: false });
      wx.showToast({ title: err.message || '导出PDF失败', icon: 'none' });
    });
  }
};

module.exports = BaseDetailPage;
