const BaseDetailPage = require('../../utils/baseDetailPage');

Page({
  ...BaseDetailPage,

  data: {
    ...BaseDetailPage.data
  },

  getSignatureMarker() {
    return '发函方签字/盖章：';
  },

  getPDFTitle() {
    return '协商函';
  },

  getFormUrl() {
    return '/pages/negotiation-form/negotiation-form?fromDraft=true';
  },

  getDocumentType() {
    return 'negotiation_letter';
  },

  getFullContent() {
    return this.data.mainContent + '\n\n发函方签字/盖章：___________\n' + this.data.dateStr;
  }
});
