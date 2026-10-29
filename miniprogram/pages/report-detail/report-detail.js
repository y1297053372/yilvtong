const BaseDetailPage = require('../../utils/baseDetailPage');

Page({
  ...BaseDetailPage,

  data: {
    ...BaseDetailPage.data
  },

  getSignatureMarker() {
    return '举报人：';
  },

  getPDFTitle() {
    return '举报信';
  },

  getFormUrl() {
    return '/pages/report-form/report-form?fromDraft=true';
  },

  getDocumentType() {
    return 'report_letter';
  },

  getFullContent() {
    const doc = this.data.document;
    const isOnline = doc && doc.formData && doc.formData.documentType === 'online';
    
    if (isOnline) {
      return this.data.mainContent;
    }
    
    return this.data.mainContent + '\n\n举报人：___________\n' + this.data.dateStr;
  },

  exportPDF() {
    if (!this.data.mainContent) {
      wx.showToast({ title: '没有可导出的内容', icon: 'none' });
      return;
    }

    const doc = this.data.document;
    const isOnline = doc && doc.formData && doc.formData.documentType === 'online';
    
    if (isOnline) {
      this.copyText();
      return;
    }

    const fullContent = this.getFullContent();

    this.setData({ isExporting: true });
    
    const { generateAndOpenPDF } = require('../../utils/pdfUtils');
    generateAndOpenPDF({
      content: fullContent,
      title: '举报信'
    }).then(() => {
      this.setData({ isExporting: false });
    }).catch(err => {
      console.error('导出PDF失败:', err);
      this.setData({ isExporting: false });
      wx.showToast({ title: err.message || '导出PDF失败', icon: 'none' });
    });
  }
});
