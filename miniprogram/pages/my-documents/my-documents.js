const app = getApp();
const { INFRINGEMENT_OPTIONS, CLAIM_LABEL_MAP, NON_CUSTOM_INFRINGEMENT_OPTIONS, CUSTOM_INFRINGEMENT_OPTIONS, REPORT_CLAIM_LABEL_MAP, COMPLAINT_CLAIM_LABEL_MAP, CAUSE_LABEL_MAP, CACHE_CONFIG } = require('../../config/constants');
const { formatRelativeTime } = require('../../utils/documentUtils');
const documentService = require('../../services/documentService');

const REFRESH_INTERVAL = CACHE_CONFIG.DOCUMENT_LIST_THROTTLE_MS;

Page({
  data: {
    isLoading: true,
    currentTab: 'civil_complaint',

    civilComplaints: [],
    reportLetters: [],
    negotiationLetters: [],

    civilComplaintCount: 0,
    reportLetterCount: 0,
    negotiationLetterCount: 0,

    totalCount: 0
  },

  _lastFetchTime: 0,

  onLoad: function (options) {
    this.loadData();
  },

  onShow: function () {
    const now = Date.now();
    const needRefresh = app.globalData.needRefreshDocuments || 
                        (now - this._lastFetchTime) > REFRESH_INTERVAL;
    
    if (needRefresh) {
      if (app.globalData.savePromise) {
        this.loadDataWithSaveCheck();
      } else {
        this.loadData();
      }
      this._lastFetchTime = now;
    }
    app.globalData.needRefreshDocuments = false;
  },

  async loadDataWithSaveCheck() {
    const savePromise = app.globalData.savePromise;
    app.globalData.savePromise = null;
    
    wx.showLoading({ title: '正在保存...', mask: true });
    try {
      await savePromise;
      wx.hideLoading();
      setTimeout(() => {
        wx.showToast({ title: '保存成功', icon: 'success', duration: 1500 });
      }, 100);
    } catch (err) {
      wx.hideLoading();
      console.error('等待保存完成失败:', err);
      setTimeout(() => {
        wx.showToast({ title: '保存失败', icon: 'none', duration: 2000 });
      }, 100);
    }
    this.loadData();
  },

  // 加载所有数据
  loadData() {
    this.setData({ isLoading: true });
    // 只加载云端数据（所有草稿和已完成文书都在云端）
    this.fetchDocuments();
  },

  // 从云端获取所有文书
  async fetchDocuments() {
    try {
      const documents = await documentService.getDocuments({ limit: 100 });

      const civilComplaints = [];
      const reportLetters = [];
      const negotiationLetters = [];

      documents.forEach(doc => {
        const time = doc.updatedAt || doc.createdAt;
        const formattedTime = formatRelativeTime(new Date(time));

        const cardInfo = this.extractCardInfo(doc);

        const item = {
          ...doc,
          formattedTime,
          id: doc._id,
          ...cardInfo
        };

        switch (doc.type) {
          case 'civil_complaint':
            civilComplaints.push(item);
            break;
          case 'report_letter':
            reportLetters.push(item);
            break;
          case 'negotiation_letter':
            negotiationLetters.push(item);
            break;
        }
      });

      this.setData({
        civilComplaints: civilComplaints,
        reportLetters: reportLetters,
        negotiationLetters: negotiationLetters,
        civilComplaintCount: civilComplaints.length,
        reportLetterCount: reportLetters.length,
        negotiationLetterCount: negotiationLetters.length,
        totalCount: civilComplaints.length + reportLetters.length + negotiationLetters.length,
        isLoading: false
      });
    } catch (err) {
      console.error('获取文书列表失败:', err);
      this.setData({
        isLoading: false
      });
    }
  },

  // 提取卡片显示信息
  extractCardInfo(doc) {
    const info = {
      defendantName: '',
      caseReason: '',
      claimsSummary: '',
      hasContent: false
    };

    if (!doc.formData) return info;

    const { formData } = doc;
    const docType = doc.type || '';

    if (docType === 'report_letter') {
      if (formData.merchant) {
        info.defendantName = formData.merchant.shopName || formData.merchantName || '';
      }
      if (formData.infringement && formData.infringement.items && formData.infringement.items.length > 0) {
        const options = formData.productType === 'custom'
          ? CUSTOM_INFRINGEMENT_OPTIONS
          : NON_CUSTOM_INFRINGEMENT_OPTIONS;
        const types = formData.infringement.items.map(id => {
          const option = options.find(o => o.id === id);
          return option ? option.label : '';
        }).filter(Boolean);
        info.caseReason = types.join('、');
      }
      if (formData.claims && formData.claims.length > 0) {
        const claimLabels = formData.claims.map(id => REPORT_CLAIM_LABEL_MAP[id]).filter(Boolean);
        if (claimLabels.length > 0) {
          info.claimsSummary = claimLabels.join('、');
        }
      }
    } else if (docType === 'negotiation_letter') {
      if (formData.receiver) {
        info.defendantName = formData.receiver.shopName || '';
      }
      if (formData.infringement && formData.infringement.type) {
        const option = INFRINGEMENT_OPTIONS.find(o => o.value === formData.infringement.type);
        info.caseReason = option ? option.label : '';
      }
      if (formData.claims && formData.claims.length > 0) {
        const claimLabels = formData.claims.map(id => CLAIM_LABEL_MAP[id]).filter(Boolean);
        if (claimLabels.length > 0) {
          info.claimsSummary = claimLabels.join('、');
        }
      }
    } else {
      if (formData.defendantType === 'individual' && formData.defendant) {
        info.defendantName = formData.defendant.name || '';
      } else if (formData.defendantType === 'organization' && formData.orgDefendant) {
        info.defendantName = formData.orgDefendant.name || '';
      }
      if (formData.cause) {
        info.caseReason = CAUSE_LABEL_MAP[formData.cause] || formData.cause;
      }
      if (formData.claims && formData.claims.length > 0) {
        const claimLabels = formData.claims.map(id => COMPLAINT_CLAIM_LABEL_MAP[id]).filter(Boolean);
        if (claimLabels.length > 0) {
          info.claimsSummary = claimLabels.join('、');
        }
      }
    }

    info.hasContent = !!(info.defendantName || info.caseReason);

    return info;
  },

  onTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab !== this.data.currentTab) {
      this.setData({
        currentTab: tab
      });
    }
  },

  // 查看文书详情
  viewDocument(e) {
    const item = e.currentTarget.dataset.item;

    if (!item) return;

    // 根据文档类型确定跳转路径
    const docType = item.type || '';
    const documentId = item._id || item.id;

    // 构建草稿数据，包含 documentId 用于更新
    const draft = {
      type: item.type,
      formData: item.formData,
      lastStep: item.lastStep || 0,
      savedAt: item.savedAt,
      isFromDocument: item.isFromDocument || false,
      documentId: documentId,
      status: item.status,
      generatedContent: item.generatedContent || ''
    };

    // 已生成的文书，跳转到生成结果页（Step 4）
    if (item.status === 'generated') {
      draft.lastStep = 4;
    }

    // 使用全局数据传递
    app.globalData.draftData = JSON.parse(JSON.stringify(draft));

    // 根据类型跳转到不同的表单页面
    let formUrl = '/pages/complaint-form/complaint-form?fromDraft=true';
    if (docType === 'report_letter') {
      formUrl = '/pages/report-form/report-form?fromDraft=true';
    } else if (docType === 'negotiation_letter') {
      formUrl = '/pages/negotiation-form/negotiation-form?fromDraft=true';
    }

    wx.navigateTo({ url: formUrl });
  },

  // 跳转到生成页面
  navigateToGenerate() {
    wx.switchTab({
      url: '/pages/document/document'
    });
  },

  // 跳转到民事起诉状生成页面
  navigateToCivilComplaint() {
    wx.navigateTo({
      url: '/pages/complaint-form/complaint-form'
    });
  },

  // 跳转到举报文书生成页面
  navigateToReport() {
    wx.navigateTo({
      url: '/pages/report-form/report-form'
    });
  },

  // 跳转到协商函生成页面
  navigateToNegotiation() {
    wx.navigateTo({
      url: '/pages/negotiation-form/negotiation-form'
    });
  },

  // 功能开发中提示
  showComingSoon() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 长按删除
  onLongPress(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;

    const isDraft = item.status === 'draft';
    const title = isDraft ? '删除草稿' : '删除文书';
    const content = isDraft 
      ? '确定要删除这个草稿吗？删除后将无法恢复。' 
      : '确定要删除这个已生成的文书吗？删除后将无法恢复。';

    wx.showModal({
      title: title,
      content: content,
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          // 所有删除都使用 deleteDocument（云端删除）
          this.deleteDocument(item);
        }
      }
    });
  },

  // 删除已完成文书
  async deleteDocument(item) {
    wx.showLoading({ title: '删除中...' });
    
    const success = await documentService.deleteDocument(item.id);
    
    if (success) {
      const listName = this.getCurrentListName();
      const list = this.data[listName];
      const newList = list.filter(i => i.id !== item.id);

      const countNameMap = {
        'civilComplaints': 'civilComplaintCount',
        'reportLetters': 'reportLetterCount',
        'negotiationLetters': 'negotiationLetterCount'
      };
      const countName = countNameMap[listName];
      
      this.setData({
        [listName]: newList,
        [countName]: newList.length,
        totalCount: newList.length + this.getOtherListsCount(listName)
      });

      wx.hideLoading();
      wx.showToast({
        title: '已删除',
        icon: 'success'
      });
    } else {
      wx.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  // 获取当前列表名称
  getCurrentListName() {
    switch (this.data.currentTab) {
      case 'civil_complaint':
        return 'civilComplaints';
      case 'report_letter':
        return 'reportLetters';
      case 'negotiation_letter':
        return 'negotiationLetters';
      default:
        return 'civilComplaints';
    }
  },

  // 获取其他列表的总数
  getOtherListsCount(excludeListName) {
    let count = 0;
    if (excludeListName !== 'civilComplaints') {
      count += this.data.civilComplaints.length;
    }
    if (excludeListName !== 'reportLetters') {
      count += this.data.reportLetters.length;
    }
    if (excludeListName !== 'negotiationLetters') {
      count += this.data.negotiationLetters.length;
    }
    return count;
  }
});