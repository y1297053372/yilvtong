const app = getApp();
const { NON_CUSTOM_INFRINGEMENT_OPTIONS, CUSTOM_INFRINGEMENT_OPTIONS, REPORT_CLAIM_OPTIONS, REPORT_CLAIM_LABEL_MAP } = require('../../config/constants');
const { formatDate, generateReportClaimText, generateDocumentTitle } = require('../../utils/documentUtils');
const { generateAndOpenPDF, generatePDF } = require('../../utils/pdfUtils');
const BaseFormPage = require('../../utils/baseFormPage');

Page({
  ...BaseFormPage,

  data: {
    ...BaseFormPage.data,
    currentStep: 0,
    steps: [
      { title: '类型' },
      { title: '交易' },
      { title: '事实' },
      { title: '诉求' },
      { title: '生成' }
    ],
    maxReachedStep: 0,
    showEvidenceModal: false,
    formData: {
      documentType: 'letter',
      productType: 'non_custom',
      identityType: 'consumer',
      reporter: {
        name: '',
        phone: '',
        address: ''
      },
      merchant: {
        shopName: '',
        operatorName: '',
        registrationNo: '',
        creditCode: '',
        address: ''
      },
      transaction: {
        productName: '',
        orderId: '',
        amount: '',
        orderDate: '',
        shipDate: '',
        receiveDate: ''
      },
      infringement: {
        items: [],
        description: ''
      },
      communication: {
        date: '',
        response: ''
      },
      loss: {
        directLoss: '',
        hasIndirectLoss: false,
        indirectLossAmount: '',
        indirectLossDesc: ''
      },
      claims: [],
      claimInputs: {},
      evidence: {
        selected: [],
        hasOtherEvidence: false,
        otherEvidence: ''
      }
    },
    nonCustomInfringementOptions: NON_CUSTOM_INFRINGEMENT_OPTIONS,
    customInfringementOptions: CUSTOM_INFRINGEMENT_OPTIONS,
    reportClaimOptions: REPORT_CLAIM_OPTIONS
  },

  hasFirstStepCompleted() {
    const { formData } = this.data;
    if (formData.documentType === 'online') {
      return true;
    }
    const hasReporter = !!(formData.reporter && formData.reporter.name && formData.reporter.name.trim());
    const hasMerchant = !!(formData.merchant && formData.merchant.shopName && formData.merchant.shopName.trim());
    return hasReporter && hasMerchant;
  },

  getDocumentType() {
    return 'report_letter';
  },

  getIdCardFields() {
    return [];
  },

  generateDocumentTitle() {
    const { formData } = this.data;
    let title = '举报信';
    if (formData.merchant && formData.merchant.shopName) {
      title = `举报信 - ${formData.merchant.shopName}`;
    }
    return title;
  },

  getPDFTitle() {
    return '举报信';
  },

  getShareTitle() {
    return '举报文书生成';
  },

  getSharePath() {
    return '/pages/report-form/report-form';
  },

  handleInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [`formData.${field}`]: value });
    this.markContentChanged();
  },

  onDateChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [`formData.${field}`]: value });
    this.markContentChanged();
  },

  onDocumentTypeChange(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ 'formData.documentType': value });
    this.markContentChanged();
  },

  onProductTypeChange(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ 
      'formData.productType': value,
      'formData.infringement.items': []
    });
    this.markContentChanged();
  },

  onIdentityTypeChange(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ 'formData.identityType': value });
    this.markContentChanged();
  },

  onInfringementItemTap(e) {
    const id = e.currentTarget.dataset.id;
    const items = [...this.data.formData.infringement.items];
    const index = items.indexOf(id);
    
    if (index > -1) {
      items.splice(index, 1);
    } else {
      items.push(id);
    }
    
    this.setData({ 'formData.infringement.items': items });
    this.markContentChanged();
  },

  onClaimItemTap(e) {
    const id = e.currentTarget.dataset.id;
    const claims = [...this.data.formData.claims];
    const index = claims.indexOf(id);
    
    if (index > -1) {
      claims.splice(index, 1);
    } else {
      claims.push(id);
    }
    
    this.setData({ 'formData.claims': claims });
    this.markContentChanged();
  },

  onClaimInput(e) {
    const id = e.currentTarget.dataset.id;
    const value = e.detail.value;
    this.setData({ [`formData.claimInputs.${id}_1`]: value });
    this.markContentChanged();
  },

  onHasIndirectLossChange(e) {
    const value = e.currentTarget.dataset.value === 'true';
    this.setData({ 'formData.loss.hasIndirectLoss': value });
    this.markContentChanged();
  },

  onEvidenceItemTap(e) {
    const id = e.currentTarget.dataset.id;
    const selected = [...this.data.formData.evidence.selected];
    const index = selected.indexOf(id);

    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(id);
    }

    this.setData({ 'formData.evidence.selected': selected });
  },

  onOtherEvidenceToggle() {
    const newValue = !this.data.formData.evidence.hasOtherEvidence;
    this.setData({ 'formData.evidence.hasOtherEvidence': newValue });
  },

  validateStep(step) {
    const { formData } = this.data;
    
    if (step === 0) {
      if (formData.documentType === 'online') {
        return true;
      }
      if (!this.validateRequired(formData.reporter.name, '输入您的姓名')) return false;
      if (!this.validateRequired(formData.reporter.phone, '输入联系电话')) return false;
      if (!this.validateRequired(formData.merchant.shopName, '输入店铺名称')) return false;
      if (!this.validateRequired(formData.merchant.address, '输入店铺地址')) return false;
    }
    
    if (step === 1) {
      if (!this.validateRequired(formData.transaction.productName, '输入商品名称')) return false;
      if (!this.validateRequired(formData.transaction.orderId, '输入订单编号')) return false;
      if (!this.validateRequired(formData.transaction.amount, '输入支付金额')) return false;
      if (!this.validateRequired(formData.transaction.orderDate, '选择下单日期')) return false;
      if (!this.validateRequired(formData.transaction.shipDate, '选择发货日期')) return false;
      if (!this.validateRequired(formData.transaction.receiveDate, '选择签收日期')) return false;
      if (!this.validateRequired(formData.loss.directLoss, '输入直接损失金额')) return false;
    }
    
    if (step === 2) {
      if (!this.validateRequired(formData.infringement.items, '选择侵权问题') || formData.infringement.items.length === 0) {
        this.showError('请至少选择一项侵权问题');
        return false;
      }
      if (!this.validateRequired(formData.infringement.description, '描述具体问题')) return false;
      if (!this.validateRequired(formData.communication.date, '选择维权沟通日期')) return false;
      if (!this.validateRequired(formData.communication.response, '描述商家回应')) return false;
    }
    
    if (step === 3) {
      if (formData.claims.length === 0) {
        this.showError('请至少选择一项诉求');
        return false;
      }
      
      for (const claimId of formData.claims) {
        const claim = this.data.reportClaimOptions.find(c => c.id === claimId);
        if (claim && claim.hasInput) {
          const inputValue = formData.claimInputs[`${claimId}_1`];
          if (!inputValue || !inputValue.trim()) {
            this.showError(`请填写"${claim.label}"的相关金额`);
            return false;
          }
        }
      }
    }
    
    return true;
  },

  generate() {
    this.setData({ isGenerating: true });
    
    const text = this.generateText();
    
    this.setData({
      generatedText: text,
      isGenerating: false
    });
    
    if (!this.hasGenerated) {
      this.onGenerateSuccess();
    } else {
      this.regenerateDocument();
    }
  },

  generateText() {
    const { formData } = this.data;
    let text = '';
    
    const isCustom = formData.productType === 'custom';
    const productWord = isCustom ? '定制' : '购买';
    const identityWord = formData.identityType === 'consumer' ? '一位被侵犯合法权益的消费者' : '一位被侵犯合法权益的商家';
    
    const infringementOptions = isCustom ? this.data.customInfringementOptions : this.data.nonCustomInfringementOptions;
    const infringementLabels = formData.infringement.items.map(id => {
      const option = infringementOptions.find(o => o.id === id);
      return option ? option.label : '';
    }).filter(Boolean).join('、');
    
    const claimTexts = formData.claims.map(id => generateReportClaimText(id, formData.claimInputs)).join('、');
    
    const shipDate = formatDate(formData.transaction.shipDate).replace(/\s/g, '');
    const receiveDate = formatDate(formData.transaction.receiveDate).replace(/\s/g, '');
    const commDate = formatDate(formData.communication.date).replace(/\s/g, '');
    const orderDate = formData.transaction.orderDate ? formatDate(formData.transaction.orderDate).replace(/\s/g, '') : '';
    
    let lossText = `直接经济损失${formData.loss.directLoss}元`;
    if (formData.loss.hasIndirectLoss && formData.loss.indirectLossAmount) {
      lossText += `，间接损失${formData.loss.indirectLossDesc || '其他损失'}${formData.loss.indirectLossAmount}元`;
    }
    
    if (formData.documentType === 'letter') {
      text += `尊敬的市场监督局的领导：\n`;
      text += `    您好！\n`;
      text += `    我叫${formData.reporter.name}，系${identityWord}。现就本人在网购服装过程中遭遇商家违法违规行为，向贵部门实名举报，请求依法调查处理。\n\n`;
      
      text += `一、被举报人基本情况\n`;
      text += `    店铺名称：${formData.merchant.shopName}\n`;
      if (formData.merchant.operatorName) {
        text += `    经营者/法人代表姓名：${formData.merchant.operatorName}\n`;
      }
      if (formData.merchant.registrationNo) {
        text += `    企业注册号：${formData.merchant.registrationNo}\n`;
      }
      if (formData.merchant.creditCode) {
        text += `    统一社会信用代码：${formData.merchant.creditCode}\n`;
      }
      text += `    店铺注册地址/住所：${formData.merchant.address}\n\n`;
      
      text += `二、举报内容及事实依据\n`;
      if (orderDate) {
        text += `    本人于${orderDate}通过平台下单${productWord}${formData.transaction.productName}，订单编号：${formData.transaction.orderId}，支付金额${formData.transaction.amount}元，商家于${shipDate}发货，本人于${receiveDate}收货。收货后本人发现商品存在${infringementLabels}问题，具体为：${formData.infringement.description}\n`;
      } else {
        text += `    本人通过平台下单${productWord}${formData.transaction.productName}，订单编号：${formData.transaction.orderId}，支付金额${formData.transaction.amount}元，商家于${shipDate}发货，本人于${receiveDate}收货。收货后本人发现商品存在${infringementLabels}问题，具体为：${formData.infringement.description}\n`;
      }
      text += `    本人于${commDate}就上述问题与商家沟通，商家回应为${formData.communication.response}，双方未达成一致，商家无合理解决意愿。经统计，本人${lossText}。\n\n`;
      
      text += `三、请求事项\n`;
      text += `    本人要求贵方立即${claimTexts}。\n`;
      text += `    要求贵方将处理结果于7个工作日内书面/电话告知本人。\n\n`;
      
      text += `四、联系方式\n`;
      text += `    为便于贵部门进一步了解情况或需要我提供更多信息，请通过以下方式与我联系：\n`;
      text += `    电话：${formData.reporter.phone}\n`;
      if (formData.reporter.address) {
        text += `    通信地址：${formData.reporter.address}\n`;
      }
      text += `\n`;
      text += `    最后，我保证以上举报内容均基于事实，愿意配合贵部门开展的一切调查工作，并对所提供信息的真实性负责。同时，我也深知举报工作的严肃性和重要性，希望贵部门能够保密我的个人信息，确保举报过程的安全与公正。\n\n`;
      text += `    感谢您在百忙之中审阅我的举报信，期待您的回复与处理结果。\n\n`;
      text += `    此致\n`;
      text += `敬礼！\n\n\n\n`;
      text += `举报人：___________\n`;
      text += `${formatDate(new Date())}`;
    } else {
      text += `一、交易及侵权事实\n`;
      if (orderDate) {
        text += `    本人于${orderDate}通过平台下单${productWord}${formData.transaction.productName}，订单编号：${formData.transaction.orderId}，支付金额${formData.transaction.amount}元，商家于${shipDate}发货，本人于${receiveDate}收货。收货后本人发现商品存在${infringementLabels}问题，具体为：${formData.infringement.description}\n`;
      } else {
        text += `    本人通过平台下单${productWord}${formData.transaction.productName}，订单编号：${formData.transaction.orderId}，支付金额${formData.transaction.amount}元，商家于${shipDate}发货，本人于${receiveDate}收货。收货后本人发现商品存在${infringementLabels}问题，具体为：${formData.infringement.description}\n`;
      }
      text += `    本人于${commDate}就上述问题与商家沟通，商家回应为${formData.communication.response}，双方未达成一致，商家无合理解决意愿。经统计，本人${lossText}。\n\n`;
      
      text += `二、举报诉求\n`;
      text += `    要求贵方立即${claimTexts}。`;
    }

    return text;
  },

  viewFullDocument() {
    if (!this.data.generatedText) return;
    
    wx.navigateTo({
      url: `/pages/report-detail/report-detail?id=${this.data.documentId || ''}`,
      fail: () => {
        wx.showModal({
          title: '举报文书全文',
          content: this.data.generatedText,
          showCancel: false,
          confirmText: '复制文本',
          success: (res) => {
            if (res.confirm) {
              wx.setClipboardData({
                data: this.data.generatedText,
                success: () => {
                  wx.showToast({ title: '已复制', icon: 'success' });
                }
              });
            }
          }
        });
      }
    });
  },

  exportPDF() {
    if (this.data.formData.documentType === 'online') {
      this.copyText();
      return;
    }
    BaseFormPage.exportPDF.call(this);
  }
});
