const { generatePDF, downloadAndOpenPDF } = require('./pdfUtils');
const { TOAST_DURATION } = require('../config/constants');
const privacyUtils = require('./privacyUtils');

const DEBOUNCE_INTERVAL = 1000;

const BaseFormPage = {
  data: {
    currentStep: 0,
    maxReachedStep: 0,
    totalSteps: 5,
    finalInputStep: 3,
    headerHeight: 88,
    totalHeaderHeight: 120,
    paddingBottom: 0,
    showSignatureModal: false,
    isGeneratingPDF: false,
    generatedPdfFileID: null,
    generatedText: '',
    documentId: null,
    showDisclaimerModal: false,
    disclaimerAccepted: false,
    hasAgreedToDisclaimer: false,
    isGenerating: false,
    isExporting: false,
    showPrivacyModal: false,
    consentIdCard: null,
    privacyConfig: null
  },

  _lastSaveTime: 0,
  _isSaving: false,

  onInputFocus(e) {
    const height = e.detail.height;
    const { id } = e.currentTarget;

    this.setData({ paddingBottom: height });

    if (!id) return;

    setTimeout(() => {
      this.createSelectorQuery().select('#' + id).boundingClientRect(rect => {
        if (rect) {
          const windowInfo = wx.getWindowInfo();
          const windowHeight = windowInfo.windowHeight;
          const keyboardTop = windowHeight - height;

          if (rect.bottom > keyboardTop - 20) {
            const scrollDistance = rect.bottom - keyboardTop + 20;

            this.createSelectorQuery().selectViewport().scrollOffset(res => {
              if (res) {
                wx.pageScrollTo({
                  scrollTop: res.scrollTop + scrollDistance,
                  duration: 300
                });
              }
            }).exec();
          }
        }
      }).exec();
    }, 100);
  },

  onInputBlur() {
    setTimeout(() => {
      this.setData({ paddingBottom: 0 });
    }, 200);
  },

  onLoad(options) {
    const { statusBarHeight, navBarHeight } = getApp().globalData;
    const headerHeight = (statusBarHeight || 20) + (navBarHeight || 44);
    this.setData({ headerHeight });
    this.measureHeader();
    this._hasContentChanges = false;

    this.initPrivacy();

    if (options.fromDraft) {
      this.loadDocumentData();
    }
  },

  initPrivacy() {
    const documentType = this.getDocumentType();
    const config = privacyUtils.getPrivacyConfig(documentType);

    if (!privacyUtils.needsIdCardConsent(documentType)) {
      this.setData({
        consentIdCard: false,
        privacyConfig: config
      });
      return;
    }

    const cached = privacyUtils.getPrivacyConsent(documentType);

    // 如果用户已同意提供身份证号，不再弹窗
    if (cached && cached.consentIdCard === true) {
      this.setData({
        consentIdCard: true,
        privacyConfig: config
      });
      return;
    }

    // 用户未同意或拒绝过，每次进入都弹窗
    this.setData({
      showPrivacyModal: true,
      privacyConfig: config
    });
  },

  onPrivacyConsent(e) {
    const { consentIdCard } = e.detail;
    const documentType = this.getDocumentType();

    privacyUtils.savePrivacyConsent(documentType, consentIdCard);

    const updates = {
      showPrivacyModal: false,
      consentIdCard
    };

    // 当用户选择"暂不提供"时，清空身份证号数据
    if (consentIdCard === false) {
      const idCardFields = this.getIdCardFields();
      const { formData } = this.data;
      for (const field of idCardFields) {
        if (formData[field]) {
          updates[`formData.${field}.idCard`] = '';
          // 确保性别和出生日期有默认值
          if (!formData[field].gender) {
            updates[`formData.${field}.gender`] = '男';
          }
          if (!formData[field].birthDate) {
            updates[`formData.${field}.birthDate`] = '';
          }
        }
      }
    }

    this.setData(updates);
  },

  onPrivacyShowChange(e) {
    const { show } = e.detail;
    this.setData({ 
      pageScrollDisabled: show 
    });
  },

  getIdCardFields() {
    return [];
  },

  validateIdCardWithConsent(idCard, fieldName = '身份证') {
    if (this.data.consentIdCard === false) {
      return { valid: true };
    }
    
    if (this.data.consentIdCard === true) {
      if (!idCard) {
        return { valid: false, message: `请输入${fieldName}号码` };
      }
      const { checkIdCard } = require('./documentUtils');
      if (!checkIdCard(idCard)) {
        return { valid: false, message: `${fieldName}号码格式不正确` };
      }
    }
    
    return { valid: true };
  },

  async sanitizeFormDataForStorage(formData) {
    const result = JSON.parse(JSON.stringify(formData));
    
    if (this.data.consentIdCard === true) {
      const idCardFields = this.getIdCardFields();
      for (const field of idCardFields) {
        if (result[field] && result[field].idCard) {
          result[field] = await privacyUtils.encryptObjectFields(
            result[field], 
            ['idCard']
          );
        }
      }
    } else {
      const idCardFields = this.getIdCardFields();
      for (const field of idCardFields) {
        if (result[field]) {
          result[field].idCard = '';
        }
      }
    }
    
    return result;
  },

  onShow() {
    if (this.data.documentId && this.hasGenerated && !this._hasLocalChanges) {
      this.loadLatestContent();
    }
  },

  onHide() {
    this._saveOnExit();
  },

  onUnload() {
    this._saveOnExit();
  },

  _saveOnExit() {
    if (this._isExiting) return;
    this._isExiting = true;
    
    if (!this._hasContentChanges) return;
    
    const savePromise = this.saveDraftToCloud();
    if (savePromise) {
      const app = getApp();
      app.globalData.needRefreshDocuments = true;
      app.globalData.savePromise = savePromise;
    }
  },

  _debouncedSave() {
    this._hasContentChanges = true;
    
    const now = Date.now();
    if (this._isSaving || (now - this._lastSaveTime) < DEBOUNCE_INTERVAL) {
      return;
    }
    this._isSaving = true;
    this._lastSaveTime = now;
    
    this.saveDraftToCloud().finally(() => {
      this._isSaving = false;
    });
  },

  onShareAppMessage() {
    return {
      title: this.getShareTitle(),
      path: this.getSharePath()
    };
  },

  measureHeader() {
    const { statusBarHeight, navBarHeight } = getApp().globalData;
    const stepsHeaderHeight = 50;
    const totalHeight = (statusBarHeight || 20) + (navBarHeight || 44) + stepsHeaderHeight;
    this.setData({ totalHeaderHeight: totalHeight });
  },

  markContentChanged() {
    this._hasContentChanges = true;
  },

  async loadLatestContent() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('documents').doc(this.data.documentId).get();
      if (res.data && res.data.generatedContent) {
        this.setData({ generatedText: res.data.generatedContent });
      }
    } catch (err) {
      console.error('加载最新内容失败:', err);
      wx.showToast({
        title: '加载最新内容失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  hasFirstStepCompleted() {
    return false;
  },

  async createInitialDraft() {
    if (this.data.documentId) {
      return { _id: this.data.documentId };
    }

    if (!this.hasFirstStepCompleted()) {
      console.log('第一页未填写完成，不创建草稿');
      return null;
    }

    const db = wx.cloud.database();
    const documentData = await this._buildDocumentPayload(false, true);
    documentData.status = 'draft';
    documentData.generatedContent = '';
    documentData.createdAt = db.serverDate();

    try {
      const res = await db.collection('documents').add({
        data: documentData
      });
      this.setData({ documentId: res._id });
      return res;
    } catch (err) {
      console.error('创建初始草稿失败:', err);
      throw err;
    }
  },

  async saveDraftToCloud() {
    if (!this.data.documentId) {
      await this.createInitialDraft();
    }
    if (this.data.documentId) {
      return this.doSaveDraftToCloud();
    }
    return null;
  },

  async _buildDocumentPayload(includeGeneratedContent = false, isDraft = false) {
    const db = wx.cloud.database();
    const { formData } = this.data;
    const title = this.generateDocumentTitle();
    const simplifiedFormData = await this.sanitizeFormDataForStorage(JSON.parse(JSON.stringify(formData)));
    const newStatus = this.hasGenerated ? 'generated' : 'draft';

    const documentData = {
      type: this.getDocumentType(),
      status: newStatus,
      title: title,
      formData: simplifiedFormData,
      updatedAt: db.serverDate()
    };

    const extraData = isDraft ? this.getExtraDraftData() : this.getExtraDocumentData();
    Object.assign(documentData, extraData);

    if (isDraft) {
      documentData.lastStep = this.data.currentStep;
    }

    if (includeGeneratedContent && this.data.generatedText) {
      documentData.generatedContent = this.data.generatedText;
    }

    return documentData;
  },

  getExtraDocumentData() {
    return {};
  },

  getExtraDraftData() {
    return this.getExtraDocumentData();
  },

  async doSaveDraftToCloud() {
    const db = wx.cloud.database();
    const documentData = await this._buildDocumentPayload(true, true);

    const app = getApp();
    app.globalData.needRefreshDocuments = true;

    const savePromise = db.collection('documents').doc(this.data.documentId).update({
      data: documentData
    }).then(() => {
      this._draftSaveFailCount = 0;
    }).catch(err => {
      console.error('保存草稿到云端失败:', err);
      this._draftSaveFailCount = (this._draftSaveFailCount || 0) + 1;
      if (this._draftSaveFailCount >= 3) {
        wx.showToast({
          title: '草稿保存失败，请检查网络',
          icon: 'none',
          duration: 3000
        });
      }
    });

    app.globalData.savePromise = savePromise;
    return savePromise;
  },

  async onGenerateSuccess() {
    this.hasGenerated = true;
    const documentId = this.data.documentId;
    const isUpdate = !!documentId;
    const app = getApp();
    app.globalData.needRefreshDocuments = true;

    try {
      const res = await this.saveDocumentToCloud(isUpdate, documentId);
      if (!isUpdate && res && res._id) {
        this.setData({ documentId: res._id });
      }
      wx.showToast({
        title: '文书已保存',
        icon: 'success'
      });
    } catch (err) {
      console.error('保存文书失败:', err);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    }
  },

  async saveDocumentToCloud(isUpdate = false, documentId = null) {
    const db = wx.cloud.database();
    const finalDocumentId = documentId || this.data.documentId;
    const finalIsUpdate = isUpdate || !!finalDocumentId;

    const documentData = await this._buildDocumentPayload(true, false);

    const app = getApp();
    app.globalData.needRefreshDocuments = true;

    let savePromise;
    if (finalIsUpdate && finalDocumentId) {
      documentData.completedAt = db.serverDate();
      savePromise = db.collection('documents').doc(finalDocumentId).update({
        data: documentData
      });
    } else {
      documentData.createdAt = db.serverDate();
      documentData.completedAt = db.serverDate();
      savePromise = db.collection('documents').add({
        data: documentData
      });
    }

    app.globalData.savePromise = savePromise;
    return await savePromise;
  },

  async regenerateDocument() {
    const db = wx.cloud.database();
    const documentId = this.data.documentId;
    
    if (!documentId) return;

    const app = getApp();
    app.globalData.needRefreshDocuments = true;

    const savePromise = db.collection('documents').doc(documentId).update({
      data: {
        generatedContent: this.data.generatedText,
        isPolished: false,
        updatedAt: db.serverDate()
      }
    }).then(() => {
      console.log('文书已重新生成并保存');
    }).catch(err => {
      console.error('重新生成文书失败:', err);
    });

    app.globalData.savePromise = savePromise;
    return savePromise;
  },

  exportPDF() {
    if (!this.data.generatedText) {
      this.showError('请先生成文书');
      return;
    }
    
    this.setData({ 
      isGeneratingPDF: true,
      generatedPdfFileID: null,
      showSignatureModal: true
    });
    
    generatePDF({
      content: this.data.generatedText,
      title: this.getPDFTitle()
    }).then((result) => {
      this.setData({ 
        isGeneratingPDF: false,
        generatedPdfFileID: result.fileID
      });
    }).catch(err => {
      console.error('导出PDF失败:', err);
      this.setData({ 
        isGeneratingPDF: false,
        showSignatureModal: false
      });
      this.showError(err.message || '导出PDF失败');
    });
  },

  openGeneratedPDF() {
    if (this.data.generatedPdfFileID) {
      downloadAndOpenPDF(this.data.generatedPdfFileID).catch(err => {
        console.error('Open PDF Error:', err);
        wx.showToast({ title: '打开PDF失败', icon: 'none' });
      });
    }
    this.hideSignatureModal();
  },

  showSignatureModal() {
    this.setData({ showSignatureModal: true });
  },

  hideSignatureModal() {
    this.setData({ showSignatureModal: false });
  },

  showEvidenceModal() {
    this.setData({ showEvidenceModal: true });
  },

  hideEvidenceModal() {
    this.setData({ showEvidenceModal: false });
  },

  closeDisclaimerModal() {
    this.setData({ showDisclaimerModal: false });
  },

  toggleDisclaimerCheckbox() {
    this.setData({ disclaimerAccepted: !this.data.disclaimerAccepted });
  },

  confirmDisclaimer() {
    if (!this.data.disclaimerAccepted) return;
    
    this.setData({
      hasAgreedToDisclaimer: true,
      showDisclaimerModal: false
    });
    
    this.generate();
    
    const nextStepIndex = this.data.currentStep + 1;
    const newMax = Math.max(this.data.maxReachedStep, nextStepIndex);
    
    this.setData({
      currentStep: nextStepIndex,
      maxReachedStep: newMax
    });
  },

  nextStep() {
    if (!this.validateStep(this.data.currentStep)) {
      return;
    }
    
    const fromStep = this.data.currentStep;
    
    if (this.data.currentStep === this.data.finalInputStep) {
      if (!this.data.hasAgreedToDisclaimer) {
        this.setData({ showDisclaimerModal: true });
        return;
      }
      this.generate();
    }
    
    const nextStepIndex = this.data.currentStep + 1;
    const newMax = Math.max(this.data.maxReachedStep, nextStepIndex);
    
    this.setData({
      currentStep: nextStepIndex,
      maxReachedStep: newMax
    }, () => {
      this.onStepChange(fromStep, nextStepIndex);
      wx.pageScrollTo({
        scrollTop: 0,
        duration: 300
      });
    });
  },

  onStepChange(fromStep, toStep) {},

  prevStep() {
    if (this.data.currentStep > 0) {
      this.setData({
        currentStep: this.data.currentStep - 1
      }, () => {
        wx.pageScrollTo({
          scrollTop: 0,
          duration: 300
        });
      });
    }
  },

  jumpToStep(e) {
    const step = parseInt(e.currentTarget.dataset.step);
    
    if (step <= this.data.maxReachedStep) {
      if (step === this.data.totalSteps - 1) {
        this.generate();
      }
      
      this.setData({ currentStep: step }, () => {
        wx.pageScrollTo({
          scrollTop: 0,
          duration: 300
        });
      });
    }
  },

  showError(msg) {
    wx.showToast({
      title: msg,
      icon: 'none',
      duration: 2000
    });
    return false;
  },

  copyText() {
    if (!this.data.generatedText) {
      this.showError('请先生成文书');
      return;
    }
    
    wx.setClipboardData({
      data: this.data.generatedText,
      success: () => {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' });
      }
    });
  },

  getDocumentType() {
    throw new Error('子类必须实现 getDocumentType 方法');
  },

  generateDocumentTitle() {
    throw new Error('子类必须实现 generateDocumentTitle 方法');
  },

  getPDFTitle() {
    throw new Error('子类必须实现 getPDFTitle 方法');
  },

  getShareTitle() {
    return '文书生成';
  },

  getSharePath() {
    return '/pages/index/index';
  },

  validateStep(step) {
    return true;
  },

  generate() {
    throw new Error('子类必须实现 generate 方法');
  },

  loadDocumentData() {
    const app = getApp();
    const draft = app.globalData.draftData;
    if (!draft || !draft.formData) return;

    const formData = JSON.parse(JSON.stringify(draft.formData));

    // 恢复隐私同意状态
    const documentType = this.getDocumentType();
    const cached = privacyUtils.getPrivacyConsent(documentType);
    const consentIdCard = cached ? cached.consentIdCard : false;

    this.setData({
      formData,
      currentStep: draft.lastStep || 0,
      maxReachedStep: draft.lastStep || 0,
      consentIdCard,
      ...(draft.generatedContent ? { generatedText: draft.generatedContent } : {}),
      ...(draft.documentId ? { documentId: draft.documentId } : {})
    });
    this.hasGenerated = draft.status === 'generated';
    app.globalData.draftData = null;

    if (draft.documentId) {
      this.loadLatestDraftFromCloud(draft.documentId);
    }

    this.onDraftLoaded(draft);
  },

  async loadLatestDraftFromCloud(documentId) {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('documents').doc(documentId).get();
      if (res.data) {
        const doc = res.data;
        if (doc.formData) {
          const formData = JSON.parse(JSON.stringify(doc.formData));
          this.setData({
            formData,
            ...(doc.generatedContent ? { generatedText: doc.generatedContent } : {}),
          });
        }
      }
    } catch (err) {
      console.error('从云端加载最新草稿失败:', err);
    }
  },

  onDraftLoaded(draft) {},

  validateRequired(value, fieldName) {
    if (value === null || value === undefined || 
        (typeof value === 'string' && !value.trim()) ||
        (Array.isArray(value) && value.length === 0)) {
      this.showError(`请${fieldName}`);
      return false;
    }
    return true;
  },

  validateIdCard(idCard, fieldName = '身份证') {
    const { checkIdCard } = require('./documentUtils');
    if (!idCard || !idCard.trim()) {
      this.showError(`请输入${fieldName}`);
      return false;
    }
    if (!checkIdCard(idCard)) {
      this.showError(`${fieldName}格式不正确`);
      return false;
    }
    return true;
  },

  validatePhone(phone, fieldName = '电话') {
    if (!phone || !phone.trim()) {
      this.showError(`请输入${fieldName}`);
      return false;
    }
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(phone.trim())) {
      this.showError(`${fieldName}格式不正确`);
      return false;
    }
    return true;
  },

  validatePerson(person, prefix = '', options = {}) {
    const { requireIdCard = true, requirePhone = true, requireAddress = true } = options;
    
    if (!person) {
      this.showError(`请填写${prefix}信息`);
      return false;
    }
    
    if (!this.validateRequired(person.name, `输入${prefix}姓名`)) return false;
    
    if (requireIdCard && person.idCard !== undefined) {
      if (!this.validateIdCard(person.idCard, `${prefix}身份证`)) return false;
    }
    
    if (requirePhone && person.phone !== undefined) {
      if (!this.validateRequired(person.phone, `输入${prefix}电话`)) return false;
    }
    
    if (requireAddress && person.region !== undefined) {
      if (!this.validateRequired(person.region, `选择${prefix}省市区`)) return false;
      if (!this.validateRequired(person.detailAddress, `输入${prefix}详细地址`)) return false;
    }
    
    return true;
  },

  validateOrganization(org, prefix = '') {
    if (!org) {
      this.showError(`请填写${prefix}组织信息`);
      return false;
    }
    
    if (!this.validateRequired(org.name, `输入${prefix}组织名称`)) return false;
    if (!this.validateRequired(org.principal, `输入${prefix}负责人`)) return false;
    if (!this.validateRequired(org.region, `选择${prefix}省市区`)) return false;
    if (!this.validateRequired(org.detailAddress, `输入${prefix}详细地址`)) return false;
    if (!this.validateRequired(org.phone, `输入${prefix}电话`)) return false;
    
    return true;
  }
};

module.exports = BaseFormPage;
