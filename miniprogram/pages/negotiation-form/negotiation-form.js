const app = getApp();
const { LEGAL_BASIS_MAP, INFRINGEMENT_OPTIONS, CLAIM_OPTIONS, CONTACT_OPTIONS, CLAIM_LABEL_MAP } = require('../../config/constants');
const { formatDate, generateClaimText, generateDocumentTitle, calculateFinalDate, checkIdCard, extractIdCardInfo } = require('../../utils/documentUtils');
const { generateAndOpenPDF, generatePDF } = require('../../utils/pdfUtils');
const BaseFormPage = require('../../utils/baseFormPage');

Page({
  ...BaseFormPage,

  data: {
    ...BaseFormPage.data,
    currentStep: 0,
    steps: [
      { title: '收发方' },
      { title: '交易' },
      { title: '事实' },
      { title: '诉求' },
      { title: '生成' }
    ],
    maxReachedStep: 0,
    formData: {
      sender: {
        name: '',
        gender: '男',
        birthDate: '',
        phone: '',
        idCard: '',
        orderId: '',
        amount: '',
        contact: ''
      },
      receiver: {
        platform: '',
        shopName: '',
        isCustom: false
      },
      transaction: {
        orderDate: '',
        productType: '',
        orderId: '',
        price: '',
        shipDate: '',
        receiveDate: ''
      },
      infringement: {
        type: '',
        description: ''
      },
      claims: [],
      claimInputs: {},
      deadline: {
        days: '7',
        finalDate: '',
        contactMethod: '平台私信'
      },
      evidence: {
        selected: [],
        hasOtherEvidence: false,
        otherEvidence: '',
        pageCount: ''
      }
    },
    evidenceOptions: [
      { id: '1', label: '1.平台订单截图、支付凭证' },
      { id: '2', label: '2.贵店商品宣传/定制约定沟通记录截图' },
      { id: '3', label: '3.商品实物问题照片/视频' },
      { id: '4', label: '4.我方与贵店的维权沟通记录' },
      { id: '5', label: '5.其他相关证据', hasInput: true }
    ],
    infringementOptions: INFRINGEMENT_OPTIONS,
    claimOptions: CLAIM_OPTIONS,
    contactOptions: CONTACT_OPTIONS,
    legalBasisMap: LEGAL_BASIS_MAP,
    legalBasisText: '',
    genderOptions: ['男', '女'],
    evidenceList: {
      scenarios: []
    }
  },

  onLoad(options) {
    BaseFormPage.onLoad.call(this, options);
    this.setDefaultDeadlineDate();
  },

  onShow() {
    BaseFormPage.onShow.call(this);
    if (this.data.currentStep === 4 && this.data.generatedText) {
      this.setData({
        'formData.deadline.contactMethod': this.data.formData.deadline.contactMethod || '平台私信'
      });
    }
  },

  setDefaultDeadlineDate() {
    const finalDate = calculateFinalDate(10);
    this.setData({
      'formData.deadline.finalDate': finalDate
    });
  },

  onDraftLoaded(draft) {
    const formData = this.data.formData;
    if (formData.infringement && formData.infringement.type) {
      this.setData({
        legalBasisText: this.data.legalBasisMap[formData.infringement.type]
      });
    }
    if (draft.generatedContent || draft.formData?.generatedText) {
      this.setData({
        evidenceList: draft.formData?.evidenceList || []
      });
    }
  },

  hasFirstStepCompleted() {
    const { formData } = this.data;
    
    const hasSender = !!(formData.sender && formData.sender.name && formData.sender.name.trim());
    
    const hasReceiver = !!(formData.receiver && (
      (formData.receiver.platform && formData.receiver.platform.trim()) ||
      (formData.receiver.shopName && formData.receiver.shopName.trim())
    ));
    
    return hasSender && hasReceiver;
  },

  getDocumentType() {
    return 'negotiation_letter';
  },

  getIdCardFields() {
    return ['sender'];
  },

  generateDocumentTitle() {
    const { formData } = this.data;
    let title = '协商函';
    if (formData.receiver && formData.receiver.shopName) {
      title = `协商函 - ${formData.receiver.shopName}`;
    }
    return title;
  },

  getPDFTitle() {
    return '协商函';
  },

  getShareTitle() {
    return '协商函生成';
  },

  getSharePath() {
    return '/pages/negotiation-form/negotiation-form';
  },

  handleInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;

    this.setData({
      [`formData.${field}`]: value
    });
    this.markContentChanged();

    if (field === 'sender.orderId') {
      this.setData({
        'formData.transaction.orderId': value
      });
    }
    if (field === 'sender.amount') {
      this.setData({
        'formData.transaction.price': value
      });
    }

    if (field === 'deadline.days' && value) {
      const days = parseInt(value);
      if (!isNaN(days) && days > 0) {
        const finalDate = calculateFinalDate(days);
        this.setData({
          'formData.deadline.finalDate': finalDate
        });
      }
    }
  },

  onIdCardInput(e) {
    const value = e.detail.value;
    this.setData({
      'formData.sender.idCard': value
    });
    this.markContentChanged();

    // 当身份证号输入完整时，自动提取性别和出生日期
    if (value.length === 18) {
      const info = extractIdCardInfo(value);
      if (info) {
        this.setData({
          'formData.sender.birthDate': info.birthDate,
          'formData.sender.gender': info.gender
        });
      }
    }
  },

  onGenderChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: this.data.genderOptions[e.detail.value]
    });
    this.markContentChanged();
  },

  onBirthDateChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
    this.markContentChanged();
  },

  onDateChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    this.setData({
      [`formData.${field}`]: value
    });
    this.markContentChanged();
  },

  onIsCustomChange(e) {
    const value = e.currentTarget.dataset.value === 'true';
    this.setData({
      'formData.receiver.isCustom': value
    });
    this.markContentChanged();
  },

  onInfringementTypeChange(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'formData.infringement.type': value,
      legalBasisText: this.data.legalBasisMap[value]
    });
    this.markContentChanged();
  },

  onDeadlineDateChange(e) {
    this.setData({
      'formData.deadline.finalDate': e.detail.value
    });
    this.markContentChanged();
  },

  onContactMethodChange(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'formData.deadline.contactMethod': value
    });
    this.markContentChanged();
  },

  onSenderContactTypeChange(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({
      'formData.sender.contactType': value
    });
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
    
    this.setData({
      'formData.claims': claims
    });
    this.markContentChanged();
  },

  onClaimInput(e) {
    const id = e.currentTarget.dataset.id;
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    this.setData({
      [`formData.claimInputs.${id}_${field}`]: value
    });
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

    this.setData({
      'formData.evidence.selected': selected
    });
    this.markContentChanged();
  },

  onOtherEvidenceToggle() {
    const newValue = !this.data.formData.evidence.hasOtherEvidence;
    this.setData({
      'formData.evidence.hasOtherEvidence': newValue
    });
    this.markContentChanged();
  },

  onClaimDateChange(e) {
    const id = e.currentTarget.dataset.id;
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    this.setData({
      [`formData.claimInputs.${id}_${field}`]: value
    });
    this.markContentChanged();
  },

  validateStep(step) {
    const { formData, consentIdCard } = this.data;
    
    if (step === 0) {
      if (!this.validateRequired(formData.sender.name, '输入您的姓名')) return false;
      if (!this.validateRequired(formData.sender.contact, '输入联系方式')) return false;
      const idCardResult = this.validateIdCardWithConsent(formData.sender.idCard, '身份证号码');
      if (!idCardResult.valid) {
        this.showError(idCardResult.message);
        return false;
      }
      if (consentIdCard === false) {
        if (!formData.sender.gender) {
          this.showError('请选择性别');
          return false;
        }
        if (!formData.sender.birthDate) {
          this.showError('请选择出生日期');
          return false;
        }
      }

      if (!this.validateRequired(formData.receiver.platform, '输入电商平台名称')) return false;
      if (!this.validateRequired(formData.receiver.shopName, '输入店铺名称')) return false;
    }
    
    if (step === 1) {
      if (!this.validateRequired(formData.transaction.orderDate, '选择下单日期')) return false;
      if (!this.validateRequired(formData.transaction.productType, '输入服装品类及款式')) return false;
      if (!this.validateRequired(formData.transaction.orderId, '输入订单编号')) return false;
      if (!this.validateRequired(formData.transaction.price, '输入支付金额')) return false;
      if (!this.validateRequired(formData.transaction.shipDate, '选择发货日期')) return false;
      if (!this.validateRequired(formData.transaction.receiveDate, '选择签收日期')) return false;
    }
    
    if (step === 2) {
      if (!this.validateRequired(formData.infringement.type, '选择问题类型')) return false;
      if (!this.validateRequired(formData.infringement.description, '描述具体问题')) return false;
    }
    
    if (step === 3) {
      if (!this.validateRequired(formData.claims, '选择诉求') || formData.claims.length === 0) {
        this.showError('请至少选择一项诉求');
        return false;
      }
      
      for (const claimId of formData.claims) {
        const claim = this.data.claimOptions.find(c => c.id === claimId);
        if (claim && claim.hasInput) {
          const inputValue = formData.claimInputs[`${claimId}_1`];
          if (!inputValue || !inputValue.trim()) {
            this.showError(`请填写"${claim.label}"的相关信息`);
            return false;
          }
        }
        if (claim && claim.hasInput2) {
          const inputValue = formData.claimInputs[`${claimId}_2`];
          if (!inputValue || !inputValue.trim()) {
            this.showError(`请填写"${claim.input2Label}"`);
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
    const evidenceList = this.getEvidenceList();
    
    this.setData({
      generatedText: text,
      evidenceList: evidenceList,
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
    
    text += `致：${formData.receiver.platform} ${formData.receiver.shopName} 经营者/负责人\n\n`;
    
    const isCustom = formData.receiver.isCustom;
    const clothingType = isCustom ? '定制服装' : '服装';
    const purchaseWord = isCustom ? '定制' : '购买';
    const paymentLabel = isCustom ? '定制付款金额' : '购衣付款金额';
    
    const contactInfo = formData.sender.contact || '___________';
    text += `发函方（以下称"我方"）：\n`;
    text += `    姓名：${formData.sender.name}\n`;
    text += `    联系方式：${contactInfo}\n`;
    if (this.data.consentIdCard === true && formData.sender.idCard) {
      text += `    身份证号：${formData.sender.idCard}\n`;
    } else if (this.data.consentIdCard === false) {
      text += `    身份证号：\n`;
    }
    text += `    订单编号：${formData.transaction.orderId}\n`;
    text += `    ${paymentLabel}：${formData.transaction.price}元\n\n`;
    
    const orderDate = formatDate(formData.transaction.orderDate).replace(/\s/g, '');
    const shipDate = formatDate(formData.transaction.shipDate).replace(/\s/g, '');
    const receiveDate = formatDate(formData.transaction.receiveDate).replace(/\s/g, '');
    const finalDate = formatDate(formData.deadline.finalDate).replace(/\s/g, '');
    
    text += `    我方就${orderDate}在贵店${purchaseWord}${clothingType}产生的纠纷，特向贵店发此协商函，望贵店本着诚实信用、合法经营的原则，及时妥善解决问题。\n\n`;
    
    text += `一、交易背景\n`;
    text += `    我方于${orderDate}在贵店下单${formData.transaction.productType}，订单编号${formData.transaction.orderId}，支付金额${formData.transaction.price}元，贵店于${shipDate}发货，我方于${receiveDate}签收。\n\n`;
    
    text += `二、侵权事实及法律依据\n`;
    const infringementLabel = this.data.infringementOptions.find(o => o.value === formData.infringement.type)?.label || '';
    text += `    侵权事实：我方收货后验收发现，该商品存在${infringementLabel}问题，具体为：${formData.infringement.description}\n`;
    text += `    ${this.data.legalBasisMap[formData.infringement.type]}\n\n`;
    
    text += `三、我方协商诉求\n`;
    text += `    基于上述事实，我方现向贵店提出以下维权要求，望贵店予以满足：\n`;
    formData.claims.forEach(claimId => {
      const claimText = generateClaimText(claimId, formData.claimInputs);
      if (claimText) {
        text += `    ${claimText}\n`;
      }
    });
    text += `\n`;
    
    text += `四、限期答复要求\n`;
    text += `    我方要求贵店在收到本协商函之日起${formData.deadline.days}个工作日内（最迟不晚于${finalDate}）明确答复是否同意上述协商诉求，并落实具体解决方案。\n`;
    text += `    若贵店在上述期限内未予答复、拒不协商或无理拒绝我方合法诉求，我方将视为贵店无解决问题的诚意，届时我方将依法向市场监督管理部门举报投诉、向电商平台投诉，必要时将通过向人民法院提起诉讼等法律途径维护自身合法权益，由此产生的全部法律责任（包括但不限于诉讼费、律师费、交通费等）均由贵店承担，同时我方将保留向媒体曝光贵店侵权行为的权利。\n\n`;

    text += `\n\n\n\n`;
    text += `发函方签字/盖章：___________\n`;
    text += formatDate(new Date());

    return text;
  },

  getEvidenceList() {
    const scenarios = [];
    const { claims } = this.data.formData;
    
    if (claims.includes('1')) {
      scenarios.push({
        title: '退货退款相关证据',
        items: ['商品问题照片或视频', '商品与描述不符的对比截图', '与商家的沟通记录']
      });
    }
    
    if (claims.includes('2')) {
      scenarios.push({
        title: '更换商品相关证据',
        items: ['商品描述截图', '实物对比照片', '商品质量检测报告（如有）']
      });
    }
    
    if (claims.includes('3')) {
      scenarios.push({
        title: '重新制作相关证据',
        items: ['定制确认单或聊天记录', '成品与约定对比照片', '定制要求详细说明']
      });
    }
    
    if (claims.includes('4')) {
      scenarios.push({
        title: '损失赔偿相关证据',
        items: ['医疗票据（如有）', '误工证明或收入证明', '其他损失凭证']
      });
    }
    
    if (claims.includes('5')) {
      scenarios.push({
        title: '违约金相关证据',
        items: ['合同条款截图', '违约事实证明材料', '违约金计算依据']
      });
    }
    
    if (claims.includes('6')) {
      scenarios.push({
        title: '定金返还相关证据',
        items: ['定金支付凭证', '定金约定截图', '商家违约证明材料']
      });
    }
    
    if (claims.includes('7')) {
      scenarios.push({
        title: '停止侵害相关证据',
        items: ['侵权内容截图', '侵权事实证明材料', '要求停止侵害的沟通记录']
      });
    }
    
    return { scenarios };
  },

  viewFullDocument() {
    if (!this.data.generatedText) return;
    
    wx.navigateTo({
      url: `/pages/negotiation-detail/negotiation-detail?id=${this.data.documentId || ''}`,
      fail: () => {
        wx.showModal({
          title: '协商函全文',
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
  }
});
