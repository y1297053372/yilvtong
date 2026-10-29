const { generateAndOpenPDF, generatePDF } = require('../../utils/pdfUtils');
const { buildComplaintAIPrompt, generateWithAI, cleanAIText, handleAIError } = require('../../utils/aiService');
const { checkIdCard, extractIdCardInfo, formatDate } = require('../../utils/documentUtils');
const BaseFormPage = require('../../utils/baseFormPage');

Page({
  ...BaseFormPage,

  data: {
    ...BaseFormPage.data,
    steps: [
      { title: '当事人' },
      { title: '法院' },
      { title: '请求' },
      { title: '事实' },
      { title: '生成' }
    ],
    formData: {
      hasAgent: false,
      plaintiffType: 'individual',
      defendantType: 'individual',
      
      plaintiff: {
        name: '',
        gender: '男',
        ethnicity: '',
        birthDate: '',
        idCard: '',
        region: [],
        detailAddress: '',
        address: '',
        phone: ''
      },
      defendant: {
        name: '',
        gender: '男',
        ethnicity: '',
        birthDate: '',
        idCard: '',
        region: [],
        detailAddress: '',
        address: '',
        phone: ''
      },
      agent: {
        name: '',
        gender: '男',
        ethnicity: '',
        birthDate: '',
        idCard: '',
        phone: '',
        region: [],
        detailAddress: '',
        address: ''
      },
      orgPlaintiff: {
        name: '',
        code: '',
        principal: '',
        region: [],
        detailAddress: '',
        address: '',
        phone: ''
      },
      orgDefendant: {
        name: '',
        code: '',
        principal: '',
        region: [],
        detailAddress: '',
        address: '',
        phone: ''
      },
      
      region: [],
      courtName: '',

      cause: '',
      claims: [],
      claimInputs: {},
      isFraud: false,

      purchaseInfo: {
        date: '',
        platform: '',
        product: '',
        price: '',
        orderId: ''
      },
      scenario: '',
      scenarios: [],
      scenarioData: {},
      negotiation: {
        date: '',
        method: '',
        result: ''
      },
      aiFacts: '',
      isGeneratingAI: false,
      
      showDisclaimerModal: false,
      disclaimerAccepted: false,
      hasAgreedToDisclaimer: false
    },

    evidenceList: null,
    showEvidenceModal: false,
    
    showSignatureModal: false,
    
    courtOptions: [],
    isManualCourt: false,
    isSearchingCourts: false,

    totalHeaderHeight: 120,
    paddingBottom: 0,
    genderOptions: ['男', '女'],
    ethnicityOptions: [
      '汉族', '蒙古族', '回族', '藏族', '维吾尔族', '苗族', '彝族', '壮族', '布依族', '朝鲜族', '满族', '侗族', '瑶族', '白族', '土家族',
      '哈尼族', '哈萨克族', '傣族', '黎族', '傈僳族', '佤族', '畲族', '高山族', '拉祜族', '水族', '东乡族', '纳西族', '景颇族', '柯尔克孜族',
      '土族', '达斡尔族', '仫佬族', '羌族', '布朗族', '撒拉族', '毛南族', '仡佬族', '锡伯族', '阿昌族', '普米族', '塔吉克族', '怒族', '乌孜别克族',
      '俄罗斯族', '鄂温克族', '德昂族', '保安族', '裕固族', '京族', '塔塔尔族', '独龙族', '鄂伦春族', '赫哲族', '门巴族', '珞巴族', '基诺族', '其他'
    ],
    causeOptions: [
      { value: 'sale', label: '买卖合同纠纷', desc: '与商家之间的纠纷' },
      { value: 'transport', label: '交通运输合同纠纷', desc: '与物流公司之间的纠纷' },
      { value: 'injury', label: '人身损害赔偿纠纷', desc: '产品造成人身损害的纠纷' }
    ],
    claimOptions: [
      { id: '1', label: '退货退款', hasInput: true, hasInput2: true,
        input1Label: '货物名称', input1Placeholder: '请输入商品名称，如：iPhone 15',
        input2Label: '退款金额 (元)', input2Placeholder: '请输入退款金额' },
      { id: '2', label: '发货', hasInput: true,
        input1Label: '货物信息', input1Placeholder: '请填写补发商品件数、规格和具体名称' },
      { id: '3', label: '赔偿损失', hasInput: true, hasInput2: true,
        input1Label: '损失金额 (元)', input1Placeholder: '请输入损失金额',
        input2Label: '维权费用 (元)', input2Placeholder: '请输入维权费用' },
      { id: '4', label: '下架产品', hasInput: true,
        input1Label: '产品信息', input1Placeholder: '请输入商品具体名称、规格' },
      { id: '5', label: '开发票', hasInput: true, hasInput2: false, hasSelect: true,
        input1Label: '商品名称', input1Placeholder: '请输入商品名称',
        selectLabel: '发票类型', selectOptions: ['增值税专用发票', '增值税普通发票'] },
      { id: '6', label: '支付违约金', hasInput: true, hasInput2: false,
        input1Label: '违约金 (元)', input1Placeholder: '请输入违约金金额' },
      { id: '7', label: '返还定金', hasInput: true, hasInput2: false,
        input1Label: '定金金额 (元)', input1Placeholder: '请输入定金金额' },
      { id: '8', label: '维修', hasInput: true,
        input1Label: '维修内容', input1Placeholder: '请输入商品名称，如：衬衫' },
      { id: '9', label: '诉讼费用', hasInput: false, labelFull: '判令被告承担本案的诉讼费用' },
      { id: '10', label: '赔礼道歉', hasInput: true, hasInput2: false,
        input1Label: '发布平台', input1Placeholder: '请输入平台名称，如：新浪微博、抖音' },
      { id: '11', label: '精神损害抚慰金', hasInput: true, hasInput2: false,
        input1Label: '金额 (元)', input1Placeholder: '请输入精神损害抚慰金金额' }
    ],
    scenarioOptions: [
      { id: '1', label: '商品描述与实物严重不符' },
      { id: '2', label: '虚假促销' },
      { id: '3', label: '虚假宣传' },
      { id: '4', label: '发货错误' },
      { id: '5', label: '产品存在安全隐患' },
      { id: '6', label: '定制类货不对板' },
      { id: '7', label: '拒绝履行七日内无理由退货款义务' },
      { id: '8', label: '霸王条款' },
      { id: '9', label: '侵犯知识产权' },
      { id: '10', label: '不正当竞争' }
    ],

    scenarioQuestions: {
      '1': [
        { id: 'q1', label: '被告宣传承诺的内容', placeholder: '如：商家宣传称"100%纯牛皮"' },
        { id: 'q2', label: '实际收到的商品情况', placeholder: '如：经查验实物为人造革' }
      ],
      '2': [
        { id: 'q1', label: '被告标示的优惠表述', placeholder: '如：原价1000元，现价500元' },
        { id: 'q2', label: '促销前七日内是否以该"原价"成交过？', type: 'switch', options: ['是', '否'] },
        { id: 'q3', label: '前七日实际最低成交价(元)', type: 'number', showIf: { field: 'q2', value: '否' } }
      ],
      '3': [
        { id: 'q1', label: '宣传渠道', placeholder: '如：微信公众号推文、直播间' },
        { id: 'q2', label: '虚假宣传的具体内容', placeholder: '如：承诺"7天见效，无效退款"' },
        { id: 'q3', label: '实际不符的情况', placeholder: '如：使用28天无任何效果' }
      ],
      '4': [
        { id: 'q1', label: '实际收到时间', type: 'date' },
        { id: 'q2', label: '应当收到的正确商品', placeholder: '如：iPhone 15 Pro Max 256G' },
        { id: 'q3', label: '实际收到的错误商品', placeholder: '如：iPhone 15 128G' }
      ],
      '5': [
        { id: 'q1', label: '隐患及事故详情', placeholder: '如：使用过程中发生自燃，释放大量甲醛' },
        { id: 'q2', label: '发现后的措施', placeholder: '如：立即停止使用并开窗通风' }
      ],
      '6': [
        { id: 'q1', label: '确定定制内容的方式', placeholder: '如：微信确认图纸' },
        { id: 'q2', label: '实际不符之处', placeholder: '如：尺寸偏差超过5cm' },
        { id: 'q3', label: '被告是否存在欺诈行为？', type: 'switch', options: ['是', '否'] }
      ],
      '7': [
        { id: 'q1', label: '退换货原因', placeholder: '如：商品存在质量问题' },
        { id: 'q2', label: '提出申请的时间和方式', placeholder: '如：收到货当天通过淘宝平台申请' },
        { id: 'q3', label: '被告拒绝的理由', placeholder: '如：被告称"拆封不退"' }
      ],
      '8': [
        { id: 'q1', label: '霸王条款内容', placeholder: '如："特价商品概不退换"' }
      ],
      '9': [
        { id: 'q1', label: '侵权商品/服务名称', placeholder: '如：某品牌仿冒商品' },
        { id: 'q2', label: '知识产权类型', type: 'grid', options: ['商标权', '著作权', '专利权', '其他'] },
        { id: 'q3', label: '侵权行为描述', placeholder: '如：销售假冒注册商标商品' },
        { id: 'q4', label: '造成的损失', placeholder: '如：经济损失XX元' }
      ],
      '10': [
        { id: 'q1', label: '不正当竞争行为类型', placeholder: '如：虚假宣传、商业诋毁、恶意刷差评' },
        { id: 'q2', label: '具体行为描述', placeholder: '详细描述不正当竞争行为' },
        { id: 'q3', label: '造成的损害', placeholder: '如：商誉受损、经济损失' }
      ]
    }
  },

  onLoad(options) {
    BaseFormPage.onLoad.call(this, options);
    if (!options.fromDraft) {
      const today = new Date().toISOString().split('T')[0];
      this.setData({
        'formData.purchaseInfo.date': today,
        'formData.negotiation.date': today
      });
    }
  },

  measureHeader() {
    const { statusBarHeight, navBarHeight } = getApp().globalData;
    const stepsHeaderHeight = 50;
    const totalHeight = (statusBarHeight || 20) + (navBarHeight || 44) + stepsHeaderHeight;
    
    const windowInfo = wx.getWindowInfo();
    const windowHeight = windowInfo.windowHeight;
    const bottomAreaHeight = 320; 
    const bottomPx = bottomAreaHeight * (windowInfo.windowWidth / 750);
    
    const previewHeight = windowHeight - totalHeight - bottomPx - 20;
    
    this.setData({
      totalHeaderHeight: totalHeight,
      previewBoxHeight: previewHeight
    });
  },

  hasFirstStepCompleted() {
    const { formData } = this.data;
    
    const hasPlaintiff = formData.plaintiffType === 'individual' 
      ? !!(formData.plaintiff && formData.plaintiff.name && formData.plaintiff.name.trim())
      : !!(formData.orgPlaintiff && formData.orgPlaintiff.name && formData.orgPlaintiff.name.trim());
    
    const hasDefendant = formData.defendantType === 'individual'
      ? !!(formData.defendant && formData.defendant.name && formData.defendant.name.trim())
      : !!(formData.orgDefendant && formData.orgDefendant.name && formData.orgDefendant.name.trim());
    
    return hasPlaintiff && hasDefendant;
  },

  onDraftLoaded(draft) {
    if (draft.formData.evidenceList) {
      this.setData({
        evidenceList: draft.formData.evidenceList
      });
    }
    if (draft.scenarioOptions) {
      this.setData({ scenarioOptions: draft.scenarioOptions });
    }
    if (draft.scenarioQuestions) {
      this.setData({ scenarioQuestions: draft.scenarioQuestions });
    }
  },

  getDocumentType() {
    return 'civil_complaint';
  },

  getIdCardFields() {
    const fields = ['plaintiff', 'defendant'];
    if (this.data.formData.hasAgent) {
      fields.push('agent');
    }
    return fields;
  },

  generateDocumentTitle() {
    let title = '民事起诉状';
    const { formData } = this.data;
    if (formData.defendant) {
      if (formData.defendant.name) {
        title = `民事起诉状 - ${formData.defendant.name}`;
      } else if (formData.defendantType === 'organization' && formData.orgDefendant?.name) {
        title = `民事起诉状 - ${formData.orgDefendant.name}`;
      }
    }
    return title;
  },

  getPDFTitle() {
    return '民事起诉状';
  },

  getShareTitle() {
    return '民事起诉状生成';
  },

  getSharePath() {
    return '/pages/complaint-form/complaint-form';
  },

  updateCourtOptions(region) {
    if (!region || region.length < 3) return;
    const [province, city, district] = region;

    this.setData({ 
      courtOptions: ['正在搜索附近法院...'],
      'formData.courtName': '',
      isManualCourt: false,
      isSearchingCourts: true
    });

    wx.showNavigationBarLoading();
    
    wx.cloud.callFunction({
      name: 'searchCourts',
      data: { province, city, district }
    }).then(res => {
      wx.hideNavigationBarLoading();
      
      const { data, error } = res.result || {};
      let options = [];

      if (data && Array.isArray(data) && data.length > 0) {
        options = data;
      } else {
        options = [
          `${district}人民法院`,
          `${city}中级人民法院`
        ];
        if (city === '北京市' || city === '杭州市' || city === '广州市') {
          options.push(`${city}互联网法院`);
        }
      }

      options.push('其他（手动输入）');

      this.setData({
        courtOptions: options,
        'formData.courtName': '',
        isSearchingCourts: false
      });

    }).catch(err => {
      wx.hideNavigationBarLoading();
      console.error('云函数调用失败:', err);
      
      const fallbackOptions = [
        `${district}人民法院`,
        `${city}中级人民法院`,
        '其他（手动输入）'
      ];
      this.setData({
        courtOptions: fallbackOptions,
        isSearchingCourts: false
      });
    });
  },

  jumpToStep(e) {
    const targetStep = e.currentTarget.dataset.step;
    const currentStep = this.data.currentStep;
    const maxReachedStep = this.data.maxReachedStep;

    if (targetStep === currentStep) return;

    if (targetStep <= maxReachedStep) {
      if (targetStep === 4 && currentStep === 3) {
         this.generate();
      } else if (targetStep === 4) {
         if (this.validateStep(0) && this.validateStep(1) && this.validateStep(2) && this.validateStep(3)) {
             this.generate();
         }
      }

      this.setData({ currentStep: targetStep }, () => {
        wx.pageScrollTo({ scrollTop: 0, duration: 300 });
      });
      return;
    }

    if (targetStep > maxReachedStep) {
       if (targetStep === currentStep + 1) {
           if (this.validateStep(currentStep)) {
               if (targetStep === 4) {
                   this.generate();
               }
               
               const newMax = Math.max(this.data.maxReachedStep, targetStep);
               
               this.setData({ 
                   currentStep: targetStep,
                   maxReachedStep: newMax
               }, () => {
                   wx.pageScrollTo({ scrollTop: 0, duration: 300 });
               });
           }
       } else {
           wx.showToast({ title: '请按顺序填写', icon: 'none' });
       }
    }
  },

  onStepChange(fromStep, toStep) {
    if (fromStep === 0 && toStep === 1) {
      const { plaintiff, region } = this.data.formData;
      if ((!region || region.length === 0) && plaintiff.region && plaintiff.region.length > 0) {
        this.setData({
          'formData.region': plaintiff.region
        });
        this.updateCourtOptions(plaintiff.region);
      }
    }
  },

  validateStep(step) {
    const { formData, consentIdCard } = this.data;
    
    if (step === 0) {
      if (formData.plaintiffType === 'individual') {
        if (!formData.plaintiff.name) return this.showError('请输入原告姓名');
        if (!formData.plaintiff.ethnicity) return this.showError('请选择原告民族');
        const idCardResult = this.validateIdCardWithConsent(formData.plaintiff.idCard, '原告身份证');
        if (!idCardResult.valid) return this.showError(idCardResult.message);
        if (consentIdCard === false) {
          if (!formData.plaintiff.gender) return this.showError('请选择原告性别');
          if (!formData.plaintiff.birthDate) return this.showError('请选择原告出生日期');
        }
        if (!formData.plaintiff.phone) return this.showError('请输入原告电话');
        if (!formData.plaintiff.region || formData.plaintiff.region.length === 0) return this.showError('请选择原告省市区');
        if (!formData.plaintiff.detailAddress) return this.showError('请输入原告详细地址');
      } else {
        if (!formData.orgPlaintiff.name) return this.showError('请输入原告组织名称');
        if (!formData.orgPlaintiff.code) return this.showError('请输入原告信用代码');
        if (!formData.orgPlaintiff.principal) return this.showError('请输入原告负责人');
        if (!formData.orgPlaintiff.region || formData.orgPlaintiff.region.length === 0) return this.showError('请选择原告组织省市区');
        if (!formData.orgPlaintiff.detailAddress) return this.showError('请输入原告组织详细地址');
        if (!formData.orgPlaintiff.phone) return this.showError('请输入原告组织电话');
      }

      if (formData.hasAgent) {
        if (!formData.agent.name) return this.showError('请输入代理人姓名');
        if (!formData.agent.ethnicity) return this.showError('请选择代理人民族');
        const agentIdCardResult = this.validateIdCardWithConsent(formData.agent.idCard, '代理人身份证');
        if (!agentIdCardResult.valid) return this.showError(agentIdCardResult.message);
        if (consentIdCard === false) {
          if (!formData.agent.gender) return this.showError('请选择代理人性别');
          if (!formData.agent.birthDate) return this.showError('请选择代理人出生日期');
        }
        if (!formData.agent.phone) return this.showError('请输入代理人电话');
        if (!formData.agent.region || formData.agent.region.length === 0) return this.showError('请选择代理人省市区');
        if (!formData.agent.detailAddress) return this.showError('请输入代理人详细地址');
      }

      if (formData.defendantType === 'individual') {
        if (!formData.defendant.name) return this.showError('请输入被告姓名');
        if (!formData.defendant.ethnicity) return this.showError('请选择被告民族');
        const defendantIdCardResult = this.validateIdCardWithConsent(formData.defendant.idCard, '被告身份证');
        if (!defendantIdCardResult.valid) return this.showError(defendantIdCardResult.message);
        if (consentIdCard === false) {
          if (!formData.defendant.gender) return this.showError('请选择被告性别');
          if (!formData.defendant.birthDate) return this.showError('请选择被告出生日期');
        }
        if (!formData.defendant.phone) return this.showError('请输入被告电话');
        if (!formData.defendant.region || formData.defendant.region.length === 0) return this.showError('请选择被告省市区');
        if (!formData.defendant.detailAddress) return this.showError('请输入被告详细地址');
      } else {
        if (!formData.orgDefendant.name) return this.showError('请输入被告组织名称');
        if (!formData.orgDefendant.principal) return this.showError('请输入被告负责人');
        if (!formData.orgDefendant.region || formData.orgDefendant.region.length === 0) return this.showError('请选择被告组织省市区');
        if (!formData.orgDefendant.detailAddress) return this.showError('请输入被告组织详细地址');
        if (!formData.orgDefendant.phone) return this.showError('请输入被告组织电话');
      }
    }
    
    if (step === 1) {
      if (!formData.region || formData.region.length === 0) return this.showError('请选择管辖地区');
      if (!formData.courtName) return this.showError('请输入法院名称');
    }

    if (step === 2) {
      if (!formData.cause) return this.showError('请选择案由');
      if (formData.claims.length === 0) return this.showError('请至少选择一项诉讼请求');
      
      const claimOptions = this.data.claimOptions;
      for (const claimId of formData.claims) {
        const claim = claimOptions.find(c => c.id === claimId);
        if (claim && claim.hasInput) {
          const input1Value = formData.claimInputs[`${claimId}_1`];
          if (!input1Value || input1Value.trim() === '') {
            return this.showError(`请填写"${claim.label}"的${claim.input1Label || '相关内容'}`);
          }
          if (claim.hasInput2) {
            const input2Value = formData.claimInputs[`${claimId}_2`];
            if (!input2Value || input2Value.trim() === '') {
              return this.showError(`请填写"${claim.label}"的${claim.input2Label || '相关内容'}`);
            }
          }
        }
      }
    }

    if (step === 3) {
      if (formData.cause !== 'reputation') {
        if (!formData.purchaseInfo.product) return this.showError('请输入商品名称');
        if (!formData.purchaseInfo.price) return this.showError('请输入商品总价');
      }
      if (!formData.scenarios || formData.scenarios.length === 0) return this.showError('请至少选择一个具体情形');
      
      const scenarioQuestions = this.data.scenarioQuestions;
      for (const scenId of formData.scenarios) {
        const questions = scenarioQuestions[scenId] || [];
        for (const q of questions) {
          if (q.showIf) {
            const parentValue = formData.scenarioData[`${scenId}_${q.showIf.field}`];
            if (parentValue !== q.showIf.value) continue;
          }
          
          const answer = formData.scenarioData[`${scenId}_${q.id}`];
          if (!answer || (typeof answer === 'string' && answer.trim() === '')) {
            const scenarioLabel = this.data.scenarioOptions.find(s => s.id === scenId)?.label || '';
            return this.showError(`请填写"${scenarioLabel}"的"${q.label}"`);
          }
        }
      }
    }

    return true; 
  },

  handleInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
    this.markContentChanged();
  },

  onIdCardInput(e) {
    const value = e.detail.value;
    const field = e.currentTarget.dataset.field;

    this.setData({
      [`formData.${field}`]: value
    });
    this.markContentChanged();

    if (value.length === 18) {
      const info = extractIdCardInfo(value);
      if (info) {
        const baseField = field.substring(0, field.lastIndexOf('.'));
        if (!baseField) return;

        this.setData({
            [`formData.${baseField}.birthDate`]: info.birthDate,
            [`formData.${baseField}.gender`]: info.gender
        });
      } else {
        wx.showToast({
            title: '身份证格式不正确',
            icon: 'none'
        });
      }
    }
  },

  onAddressRegionChange(e) {
    const value = e.detail.value;
    const target = e.currentTarget.dataset.target || 'plaintiff';
    
    const rootData = this.data.formData[target];
    const detailAddress = rootData ? rootData.detailAddress || '' : '';
    
    this.setData({
      [`formData.${target}.region`]: value,
      [`formData.${target}.address`]: `${value.join('')}${detailAddress}`
    });
    this.markContentChanged();
  },

  onAddressDetailInput(e) {
    const value = e.detail.value;
    const target = e.currentTarget.dataset.target || 'plaintiff';

    const rootData = this.data.formData[target];
    const region = rootData ? rootData.region || [] : [];

    this.setData({
      [`formData.${target}.detailAddress`]: value,
      [`formData.${target}.address`]: `${region.join('')}${value}`
    });
    this.markContentChanged();
  },

  onHasAgentChange(e) {
    const value = e.currentTarget.dataset.value !== undefined ? e.currentTarget.dataset.value : e.detail.value;
    this.setData({ 'formData.hasAgent': value === 'true' || value === true });
    this.markContentChanged();
  },

  onPlaintiffTypeChange(e) {
    const value = e.currentTarget.dataset.value || e.detail.value;
    this.setData({ 'formData.plaintiffType': value });
    this.markContentChanged();
  },

  onDefendantTypeChange(e) {
    const value = e.currentTarget.dataset.value || e.detail.value;
    this.setData({ 'formData.defendantType': value });
    this.markContentChanged();
  },

  onGenderChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`formData.${field}`]: this.data.genderOptions[e.detail.value] });
    this.markContentChanged();
  },

  onEthnicityChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`formData.${field}`]: this.data.ethnicityOptions[e.detail.value] });
    this.markContentChanged();
  },

  onGenderChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`formData.${field}`]: this.data.genderOptions[e.detail.value] });
    this.markContentChanged();
  },

  onBirthDateChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`formData.${field}`]: e.detail.value });
    this.markContentChanged();
  },
  
  onDateChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`formData.${field}`]: e.detail.value });
    this.markContentChanged();
  },

  onRegionChange(e) {
    const value = e.detail.value;
    this.setData({ 'formData.region': value });
    this.updateCourtOptions(value);
    this.markContentChanged();
  },

  onCourtChange(e) {
      const index = parseInt(e.detail.value);
      const selected = this.data.courtOptions[index];

      if (selected === '其他（手动输入）') {
          this.setData({
              isManualCourt: true,
              'formData.courtName': ''
          });
      } else if (selected) {
          this.setData({
              'formData.courtName': selected,
              isManualCourt: false
          });
      }
      this.markContentChanged();
  },

  resetCourtSelection() {
      this.setData({ 
          isManualCourt: false,
          'formData.courtName': ''
      });
      
      const { region } = this.data.formData;
      if (region && region.length > 0) {
          if (this.data.courtOptions.length <= 1) {
              this.updateCourtOptions(region);
          }
      }
  },

  onCauseChange(e) {
    const cause = e.currentTarget.dataset.value || e.detail.value;
    this.setData({
      'formData.cause': cause,
      'formData.scenario': cause === 'reputation' ? '9' : '',
      'formData.scenarioData': {}
    });
    this.markContentChanged();
  },

  checkFraudClaim(claimId, isSelected) {
    if (claimId === '3' && isSelected && !this.data.formData.isFraud) {
      wx.showModal({
        title: '提示',
        content: '商家行为是否涉及消费欺诈（仅限个人生活消费场景）？\r\n若涉及，则适用"假一赔三"，赔偿损失价款可为商品原价三倍。',
        success: (res) => {
          if (res.confirm) {
            this.setData({ 'formData.isFraud': true });
          }
        }
      });
    }
  },

  onClaimInput(e) {
    const { id, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`formData.claimInputs.${id}_${field}`]: value
    });
    this.markContentChanged();
  },

  onClaimSelectChange(e) {
    const { id } = e.currentTarget.dataset;
    const value = e.detail.value;
    const option = this.data.claimOptions.find(c => c.id === id);
    if (option && option.selectOptions) {
      const selectedText = option.selectOptions[value];
      this.setData({
        [`formData.claimInputs.${id}_select`]: selectedText
      });
      this.markContentChanged();
    }
  },

  onClaimItemTap(e) {
    const id = e.currentTarget.dataset.id;
    const currentClaims = this.data.formData.claims;
    const isCurrentlySelected = currentClaims.includes(id);
    let newClaims;
    
    if (isCurrentlySelected) {
      newClaims = currentClaims.filter(item => item !== id);
    } else {
      newClaims = [...currentClaims, id];
    }
    
    this.setData({ 'formData.claims': newClaims });
    this.markContentChanged();
    this.checkFraudClaim(id, !isCurrentlySelected);
  },

  onScenariosChange(e) {
      this.setData({ 
        'formData.scenarios': e.detail.value 
      });
      this.markContentChanged();
  },

  onScenarioItemTap(e) {
    const id = e.currentTarget.dataset.id;
    const currentScenarios = this.data.formData.scenarios;
    let newScenarios;
    let updates = {};
    
    if (currentScenarios.includes(id)) {
      newScenarios = currentScenarios.filter(item => item !== id);
    } else {
      newScenarios = [...currentScenarios, id];
      
      const questions = this.data.scenarioQuestions[id];
      if (questions) {
        questions.forEach(q => {
          if (q.type === 'switch') {
            const key = `formData.scenarioData.${id}_${q.id}`;
            if (!this.data.formData.scenarioData[`${id}_${q.id}`]) {
              updates[key] = '否';
            }
          }
        });
      }
    }
    
    updates['formData.scenarios'] = newScenarios;
    this.setData(updates);
    this.markContentChanged();
  },

  onScenarioInput(e) {
    const { id, scenario } = e.currentTarget.dataset;
    const value = e.detail.value;
    const key = `${scenario}_${id}`;
    this.setData({
      [`formData.scenarioData.${key}`]: value
    });
    this.markContentChanged();
  },

  onScenarioDateChange(e) {
    this.onScenarioInput(e);
  },

  onScenarioRadioChange(e) {
    const { id, scenario } = e.currentTarget.dataset;
    const value = e.detail.value;
    const key = `${scenario}_${id}`;
    
    if (scenario === '2' && id === 'q2' && value === '是') {
       wx.showModal({
         title: '提示',
         content: '被告不符合虚假促销的情形，请重新选择侵权情形。',
         showCancel: false
       });
       this.setData({ [`formData.scenarioData.${key}`]: '' });
       return;
    }

    this.setData({
      [`formData.scenarioData.${key}`]: value
    });
    this.markContentChanged();
  },

  onScenarioRadioTap(e) {
    const { scenario, id, value } = e.currentTarget.dataset;
    const key = `${scenario}_${id}`;

    if (scenario === '2' && id === 'q2' && value === '是') {
       this.setData({ [`formData.scenarioData.${key}`]: '是' });
       wx.showModal({
         title: '提示',
         content: '被告不符合虚假促销的情形，请重新选择侵权情形。',
         showCancel: false,
         success: () => {
           this.setData({ [`formData.scenarioData.${key}`]: '否' });
         }
       });
       return;
    }

    this.setData({
      [`formData.scenarioData.${key}`]: value
    });
    this.markContentChanged();
  },

  generate() {
    try {
        const text = this.generateText();
        const evidence = this.getEvidenceList();

        this.setData({
          generatedText: text,
          evidenceList: evidence
        });
        
        if (!this.hasGenerated) {
          this.onGenerateSuccess();
        } else {
          this.regenerateDocument();
        }
    } catch (e) {
        console.error('generate error:', e);
        wx.showToast({ title: '生成失败', icon: 'none' });
        throw e;
    }
  },

  onGeneratedTextInput(e) {
      this.setData({
          generatedText: e.detail.value
      });
      this._hasLocalChanges = true;
  },

  generateText(aiFactsOverride) {
    const { formData } = this.data;
    if (!formData) {
      console.error('generateText: formData is null or undefined');
      return '';
    }

    const plaintiff = formData.plaintiff || {};
    const orgPlaintiff = formData.orgPlaintiff || {};
    const defendant = formData.defendant || {};
    const orgDefendant = formData.orgDefendant || {};
    const agent = formData.agent || {};
    const purchaseInfo = formData.purchaseInfo || {};
    const negotiation = formData.negotiation || {};
    const scenarioData = formData.scenarioData || {};
    const scenarios = formData.scenarios || [];
    const claims = formData.claims || [];
    const claimInputs = formData.claimInputs || {};

    const safeFormatDate = (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return '____年__月__日';
        try {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const [y, m, d] = parts;
                return `${y}年${m}月${d}日`;
            }
            return dateStr;
        } catch (e) {
            return '____年__月__日';
        }
    };

    let text = '';
     try {
       text = '民事起诉状\n\n';
    
      const getPartyLine = (role, p) => {
        if (!p) return `${role}：\n`;
        let lines = `${role}：${p.name || '______'}\n`;
        lines += `    性别：${p.gender || '______'}\n`;
        lines += `    民族：${p.ethnicity || '汉族'}\n`;
        lines += `    出生日期：${safeFormatDate(p.birthDate)}\n`;
        if (this.data.consentIdCard === true && p.idCard) {
          lines += `    身份证号码：${p.idCard}\n`;
        } else if (this.data.consentIdCard === false) {
          lines += `    身份证号码：\n`;
        }
        lines += `    住址：${p.address || '______'}\n`;
        lines += `    联系电话：${p.phone || '______'}`;
        return lines;
    };

    if (formData.plaintiffType === 'individual') {
        text += getPartyLine('原告', plaintiff) + '\n';
    } else {
        text += `原告：${orgPlaintiff.name || '______'}\n`;
        text += `    统一社会信用代码：${orgPlaintiff.code || '______'}\n`;
        text += `    法定代表人：${orgPlaintiff.principal || '______'}\n`;
        text += `    住所地：${orgPlaintiff.address || '______'}\n`;
        text += `    联系电话：${orgPlaintiff.phone || '______'}\n`;
    }

    if (formData.hasAgent) {
        text += `\n委托代理人：${agent.name || '______'}\n`;
        text += `    性别：${agent.gender || '______'}\n`;
        text += `    民族：${agent.ethnicity || '______'}\n`;
        text += `    出生日期：${safeFormatDate(agent.birthDate)}\n`;
        if (this.data.consentIdCard === true && agent.idCard) {
          text += `    身份证号码：${agent.idCard}\n`;
        } else if (this.data.consentIdCard === false) {
          text += `    身份证号码：\n`;
        }
        text += `    住址：${agent.address || '______'}\n`;
        text += `    联系电话：${agent.phone || '______'}\n`;
    }
    text += '\n';

    if (formData.defendantType === 'individual') {
        text += getPartyLine('被告', defendant) + '\n\n';
    } else {
        text += `被告：${orgDefendant.name || '______'}\n`;
        if (orgDefendant.code) text += `    统一社会信用代码：${orgDefendant.code}\n`;
        text += `    法定代表人：${orgDefendant.principal || '______'}\n`;
        text += `    住所地：${orgDefendant.address || '______'}\n`;
        if (orgDefendant.phone) text += `    联系电话：${orgDefendant.phone}\n`;
        text += '\n';
    }
    
    try {
        const causeOptions = this.data.causeOptions || [];
        const causeObj = causeOptions.find(c => c.value === formData.cause);
        let causeLabel = causeObj ? causeObj.label : '民事纠纷';
        if (formData.cause === 'reputation' || formData.scenario === '9') {
            causeLabel = '名誉权纠纷';
        }
        text += `案由：${causeLabel}\n\n`;
    } catch (e) {
        console.error('Error generating cause:', e);
        text += `案由：民事纠纷\n\n`;
    }

    try {
      text += '诉讼请求：\n';
        let claimIndex = 1;
        if (claims.length === 0) {
             text += '    (未选择诉讼请求)\n';
        }
        
        claims.forEach(id => {
            let claimText = '';
            switch(id) {
                case '1': claimText = `判令被告退回货物${claimInputs['1_1'] || '___'}，并退还货款${claimInputs['1_2'] || '___'}元；`; break;
                case '2': claimText = `判令被告按照买卖合同约定，补发${claimInputs['2_1'] || '___'}货物；`; break;
                case '3': claimText = `判令被告赔偿原告损失${claimInputs['3_1'] || '___'}元，及维权费用${claimInputs['3_2'] || '___'}元；`; break;
                case '4': claimText = `判令被告立即下架涉案${claimInputs['4_1'] || '___'}；`; break;
                case '5': claimText = `判令被告为原告补充开具${claimInputs['5_1'] || '___'}的正规${claimInputs['5_select'] || '___'}发票；`; break;
                case '6': claimText = `判令被告支付违约金${claimInputs['6_1'] || '___'}元；`; break;
                case '7': claimText = `判令被告返还已交付定金${claimInputs['7_1'] || '___'}元；`; break;
                case '8': claimText = `判令被告按照买卖合同约定，对${claimInputs['8_1'] || '___'}承担维修义务，并承担全部维修相关费用；`; break;
                case '9': claimText = `判令被告承担本案的诉讼费用；`; break;
                case '10': claimText = `判令被告在${claimInputs['10_1'] || '相关平台'}公开置顶发布致歉声明，向原告公开赔礼道歉，致歉声明保留时间不少于90天；`; break;
                case '11': claimText = `判令被告赔偿原告精神损害抚慰金${claimInputs['11_1'] || '___'}元；`; break;
            }
            if (claimText) text += `    ${claimIndex++}. ${claimText}\n`;
        });
    } catch (e) {
        console.error('Error generating claims:', e);
        text += `    (生成诉讼请求时发生错误: ${e.message})\n`;
    }
    text += '\n';

    let facts = '';
    try {
        text += '事实与理由：\n';
        
        if (aiFactsOverride) {
            // 给AI生成的每个段落添加段首缩进（4个空格）
            // AI段落之间用空行分隔，分割后给每个段落添加缩进
            const aiParagraphs = aiFactsOverride.split(/\n\s*\n/).map(para => {
                const trimmedPara = para.trim();
                if (trimmedPara.length === 0) return '';
                return '    ' + trimmedPara;  // 段首缩进4个空格
            }).filter(para => para.length > 0);
            facts = aiParagraphs.join('\n\n');  // 段落之间保留一个空行
            if (!facts.endsWith('\n')) facts += '\n';
        } else {
            if (formData.cause !== 'reputation') {
                facts += `    原告于${safeFormatDate(purchaseInfo.date)}，在被告经营的"${purchaseInfo.platform || '______'}"购买了"${purchaseInfo.product || '______'}"。双方建立了合法有效的买卖合同关系。原告已按约支付了全部价款共计人民币${purchaseInfo.price || '______'}元，订单号为"${purchaseInfo.orderId || '______'}"。\n`;
            }
        
            scenarios.forEach(scenId => {
                const getData = (key) => scenarioData[`${scenId}_${key}`] || '___';
                
                switch(scenId) {
                case '1': 
                    facts += `    在销售时，被告通过商品详情页面/宣传图册/销售人员口头承诺等方式，明确描述并承诺该商品具有${getData('q1')}等特性。原告收到商品后，经查验，发现${getData('q2')}。与被告承诺的特性完全不符。\n`;
                    facts += `    被告作为经营者，对其销售商品的性能、质量等核心信息负有如实告知义务。其故意告知虚假情况，隐瞒真实信息，诱使原告做出错误购买决定，该行为已构成"欺诈"。根据《中华人民共和国民法典》第一百四十八条、第五百条及《中华人民共和国消费者权益保护法》第八条、第二十条，原告享有知悉其购买、使用的商品或者接受的服务的真实情况的权利。被告严重违反约定内容交付商品，严重侵害了原告的消费者权益，应依法承担法律责任。\n`;
                    break;
                case '2': 
                    facts += `    被告在其商品销售页面或宣传广告中明确标示"${getData('q1')}"等信息。然而，原告随后发现，被告的上述促销行为构成《禁止价格欺诈行为的规定》及相关司法解释所定义的"价格欺诈"。\n`;
                    facts += `    经原告查询与核实，在该促销活动开始前七日内，被告在本交易场所（网店）对该商品的最低成交价格实际仅为${getData('q3')}元。被告通过捏造一个根本不存在的、更高的"原价"，制造了优惠假象。原告实际上以高于优惠价格的价款购得该商品。\n`;
                    facts += `    被告宣称的"${getData('q1')}"等优惠幅度，是建立在上述虚构的"原价"基础上的。由于作为计算基准的"原价"是虚假的，故其所声称的优惠价、折扣幅度完全失实，属于《中华人民共和国消费者权益保护法》所指的"虚假或者引人误解的宣传"。并且被告作为经营者，对其商品的价格信息负有如实、全面告知的法定义务。其故意虚构高价、再假意打折的行为，直接诱使原告及其他消费者误认为获得了巨大优惠，从而作出错误的购买决定。该行为完全符合"欺诈"的构成要件，严重侵害了原告的消费者权益，应依法承担法律责任。\n`;
                    break;
                case '3': 
                    facts += `    本买卖合同是基于原告对被告（经营者）在其商品销售页面、宣传广告或直播中对"${getData('q2')}"所作出的具体、明确且对交易决策有重大影响的宣传承诺的信赖而订立，然而其实质却为被告在销售过程中，为确保商品竞争力与销量，实施了以下与商品真实情况完全不符的虚假宣传行为：\n`;
                    facts += `    被告通过其${getData('q1')}等多种渠道，向包括原告在内的不特定消费者反复、重点强调并承诺，该商品/服务具备以下核心性能、效果或资质：${getData('q2')}。上述宣传内容是对足以影响消费者订立要约的商品内容作出的具体、确定、可验证的陈述，是原告决定购买该商品而放弃其他同类商品的决定性因素，直接诱使原告作出了错误的意思表示。原告收到商品/使用服务后发现，实际情况与被告的宣传承诺严重不符：${getData('q3')}。\n`;
                    facts += `    被告作为专业经营者，明知或应知其宣传内容与事实不符，仍故意告知虚假情况，其目的正是为了诱使消费者作出购买决定。该行为完全符合《最高人民法院关于适用<中华人民共和国民法典>总则编若干问题的解释》第二十一条关于欺诈的认定标准，即故意告知虚假情况，致使原告基于错误认识作出购买意思表示。因此，被告的虚假宣传已构成消费欺诈。被告的虚假宣传行为致使原告购买符合宣传品质之商品的根本合同目的完全落空，已构成根本违约，并直接侵害了原告的知情权与公平交易权。同时严重违反了《中华人民共和国广告法》第四条及《中华人民共和国消费者权益保护法》第二十条的规定，并因符合欺诈构成要件，应适用该法第五十五条的惩罚性赔偿规定。被告应承担相应的法律责任。\n`;
                    break;
                case '4': 
                    facts += `    被告于${safeFormatDate(getData('q1'))}向原告实际交付的商品，经原告查验，发现与双方订立的买卖合同约定严重不符。双方明确约定购买的商品为${getData('q2')}。被告实际交付的商品为${getData('q3')}。该商品在影响合同根本目的实现的关键要素上，均与合同约定存在本质差异。\n`;
                    facts += `    被告作为出卖人，其合同主义务是按照约定交付标的物。现被告交付错误商品的行为，已构成《中华人民共和国民法典》第五百六十三条所规定的"履行合同义务不符合约定"，构成根本性违约。该违约行为导致原告购买约定商品的合同目的完全落空。被告的违约行为，不仅导致原告未能获得合同约定的商品，并耗费了原告大量的时间与精力进行沟通维权。其怠于履责的态度，进一步扩大了原告的损失。应依法承担相应的违约责任。\n`;
                    break;
                case '5': 
                    facts += `    产品在原告正常使用时出现${getData('q1')}情况，存在可能危及人身、财产安全的不合理危险，属于《中华人民共和国产品质量法》第四十六条所定义的"缺陷产品"。根据《中华人民共和国民法典》第一千二百零二条及《中华人民共和国产品质量法》第二十六条，被告作为生产者/销售者，必须保证其产品不存在危及人身、财产安全的不合理危险。交付存在安全隐患的缺陷产品，已构成根本违约，且违反了法定的安全保障义务。\n`;
                    facts += `    基于对风险的合理担忧，原告立即${getData('q2')}。\n`;
                    facts += `    鉴于该产品安全隐患的现实性、被告的不作为态度，以及该产品可能对其他不特定消费者造成的同等威胁，原告除维护自身权益外，亦有必要通过司法途径，促使被告承担其应尽的社会责任，消除公共安全隐患。\n`;
                    break;
                case '6': 
                    facts += `    双方通过${getData('q1')}确定定制服装内容，但实际到手的货物与约定严重不符，严重影响到了原告的正常使用：${getData('q2')}。\n`;
                    facts += `    定制服装合同属于《中华人民共和国民法典》第三编"合同"分编所规定的承揽合同。承揽合同的根本特征在于，承揽人（被告）须按照定作人（原告）的特定要求完成工作并交付工作成果。本案中，被告交付的服装与约定严重不符，该工作成果完全不符合定作要求。鉴于定制服装具有极强的人身专属性和特定目的性，承揽人制作的根本性错误已导致原告的合同目的无法达成。被告的行为已构成《中华人民共和国民法典》第五百六十三条规定的根本违约。`;
                    if (getData('q3') === '是') facts += `且被告的行为同时构成"欺诈"，应承担相应的法律责任。`;
                    facts += `应承担相应的法律责任。\n`;
                    break;
                case '7': 
                    facts += `    原告收到商品后，发现该商品存在${getData('q1')}的情形。鉴于以上情形，${getData('q2')}。然而，被告在收到原告的合法合理诉求后，无正当理由地明确予以拒绝，且无充分理由，态度消极，协商无法解决该纠纷。\n`;
                    facts += `    根据《中华人民共和国消费者权益保护法》第二十四条，经营者提供的商品不符合质量要求的，消费者有权要求退货，经营者应当负责退货。被告在商品存在质量问题的情况下拒绝退货，直接违反了该法定义务。且其抗辩理由不成立：${getData('q3')}。\n`;
                    facts += `    根据《中华人民共和国民法典》第五百六十三条、第五百七十七条及《中华人民共和国消费者权益保护法》第二十五条，被告无理由拒绝履行其法定的或约定的退换货义务，导致原告的合同目的无法实现，已构成根本违约。其行为不仅侵害了原告作为消费者的合法权益，也扰乱了正常的市场交易秩序。应当承担相应的法律责任。\n`;
                    break;
                case '8': 
                    facts += `    原告发现被告利用其预先拟定并可重复使用的格式条款（下文统称"格式条款"），单方面设置了不公平、不合理的交易条件，严重排除和限制了原告作为消费者的主要权利，减轻或免除了其自身作为经营者的法定义务。${getData('q1')}。\n`;
                    facts += `    根据《中华人民共和国民法典》第四百九十七条及《中华人民共和国消费者权益保护法》第二十六条之明确规定，经营者在格式条款中，免除自身责任、加重消费者责任、排除消费者主要权利的，该条款无效。且经营者在使用格式条款时必须以显著方式提醒消费者注意并予以说明。而被告的行为实际上严重侵害了原告的消费者权利，其格式条款自始无效，对原告不发生法律约束力。\n`;
                    break;
                case '9': 
                    facts += `    被告未经权利人许可，擅自${getData('q3')}，侵犯了原告的${getData('q2')}。涉案商品/服务为${getData('q1')}，造成原告${getData('q4')}。\n`;
                    const ipType = getData('q2');
                    let ipLaw = '';
                    if (ipType === '商标权') {
                        ipLaw = '《中华人民共和国商标法》';
                    } else if (ipType === '著作权') {
                        ipLaw = '《中华人民共和国著作权法》';
                    } else if (ipType === '专利权') {
                        ipLaw = '《中华人民共和国专利法》';
                    } else {
                        ipLaw = '《中华人民共和国民法典》知识产权相关条款';
                    }
                    facts += `    根据${ipLaw}相关规定，被告的行为构成知识产权侵权，应当承担停止侵权、赔偿损失等法律责任。\n`;
                    break;
                case '10': 
                    facts += `    被告实施了${getData('q1')}的不正当竞争行为，具体表现为${getData('q2')}，导致原告${getData('q3')}。\n`;
                    facts += `    根据《中华人民共和国反不正当竞争法》相关规定，经营者在生产经营活动中，应当遵循自愿、平等、公平、诚信的原则，遵守法律和商业道德。被告的行为扰乱了市场秩序，损害了原告的合法权益，构成不正当竞争，应依法承担相应的法律责任。\n`;
                    break;
                }
            });

            if (formData.cause !== 'reputation' || (negotiation && negotiation.date)) {
                facts += `    原告于${safeFormatDate(negotiation.date)}通过${negotiation.method || '______'}与被告联系，但被告${negotiation.result || '______'}，协商失败，纠纷无法通过非诉手段解决。\n`;
            }
        }
    } catch (e) {
        console.error('Error generating facts:', e);
        facts += `    (生成事实与理由时发生错误: ${e.message})\n`;
    }
    text += facts;
    
    text += `    故原告为维护自身的合法权益，特向贵院提起诉讼，望贵院依法判决，判如所请。\n`;
    
    text += `\n    此致\n${formData.courtName || '________人民法院'}\n`;
    
    text += `\n\n\n\n`;
    text += `具 状 人 ：___________\n`;
    text += `          ${formatDate(new Date())}`;

    return text;
    } catch (e) {
      console.error('generateText critical error:', e);
      wx.showToast({ title: '部分内容生成失败', icon: 'none' });
      return text + '\n\n(系统提示：文书生成过程中遇到未知错误，以上为已生成的部分内容)';
    }
  },
  
  getEvidenceList() {
       const evidence = {
           general: [
               '主体身份证据',
               '已先行维权证据（沟通协商截图等）',
               '订单详情页截图',
               '支付凭证'
           ],
           agent: '',
           scenarios: []
       };
       
       try {
           if (this.data.formData && this.data.formData.hasAgent) {
               evidence.agent = '若为委托起诉，提示当事人需要准备证明委托关系的材料';
           }
           
           const scenarioTitles = {
               '1': '商品描述与实际不符',
               '2': '虚假促销',
               '3': '虚假宣传',
               '4': '发货错误',
               '5': '产品存在安全隐患',
               '6': '定制类货不对板',
               '7': '拒绝履行七日内无理由退货款义务',
               '8': '霸王条款',
               '9': '侵犯知识产权',
               '10': '不正当竞争'
           };

           const scenarios = (this.data.formData && this.data.formData.scenarios) || [];
           scenarios.forEach(scenId => {
               let items = [];
               switch(scenId) {
                   case '1':
                       items = [
                           '商品快照（证明原本描述内容，并对不符之处进行圈画）', 
                           '可证明实际到手商品与描述不符的证据（例：同角度、同光线特写图，权威机构检测报告）'
                       ]; 
                       break;
                   case '2':
                       items = [
                           '商品快照（证明购买时的优惠话术）', 
                           '优惠前七日内实际原价截图/朋友未被大数据杀熟的环境下查看价格', 
                           '商品详情页规则（截图商品详情中关于价格、促销活动的所有文字说明）'
                       ]; 
                       break;
                   case '3':
                       items = [
                           '宣传页面/视频录屏（时间戳为佳），若为直播，可查看直播回放予以录屏', 
                           '关键内容多角度截图', 
                           '有资质的第三方检测报告（可选）、权威标准比对，成分表/说明书相关内容',
                           '行业常识（如：一夜暴瘦十斤）'
                       ]; 
                       break;
                   case '4':
                       items = [
                           '开箱视频（必备）', 
                           '错误商品实物多角度照片（建议使用水印相机）', 
                           '快递面单照片', 
                           '（若已自主寄回）退货物流凭证'
                       ]; 
                       break;
                   case '5':
                       items = [
                           '风险存在证据（视频、图片材料与实物）', 
                           '第三方检测或安全评估报告', 
                           '采取合理避险措施的记录'
                       ]; 
                       break;
                   case '6':
                       items = [
                           '《定制合同单》、尺寸数据确认单、微信沟通记录、经确认的款式图、设计草图、样布照片或实物等能证明定制内容的证据', 
                           '交付成品与约定标准的对比照片/视频', 
                           '（如有）第三方专业人士（如裁缝、面料师）的书面评估意见'
                       ]; 
                       break;
                   case '7':
                       items = [
                           '退换货申请记录', 
                           '商品问题证据', 
                           '物流凭证'
                       ]; 
                       break;
                   case '8':
                       items = ['不合理格式条款特写截图']; 
                       break;
                   case '9':
                       items = [
                           '侵权商品实物照片', 
                           '正品与侵权商品对比照片', 
                           '商标注册证/著作权登记证/专利证书',
                           '侵权行为公证书（建议）'
                       ]; 
                       break;
                   case '10':
                       items = [
                           '不正当竞争行为截图/录屏', 
                           '损害后果证据', 
                           '相关交易记录',
                           '证人证言（如有）'
                       ]; 
                       break;
               }
               
               if (items.length > 0) {
                   evidence.scenarios.push({
                       title: scenarioTitles[scenId] || '其他情形',
                       items: items
                   });
               }
           });
       } catch (e) {
           console.error('Error generating evidence list:', e);
       }
       
       return evidence;
  },

  viewFullDocument() {
      if (!this.data.generatedText) return;

      const documentId = this.data.documentId;

      if (!documentId) {
          // 检查是否已经有保存操作在进行中
          const app = getApp();
          if (app.globalData.savePromise) {
              wx.showLoading({ title: '正在保存...', mask: true });
              app.globalData.savePromise
                .then(res => {
                    wx.hideLoading();
                    const docId = res._id || this.data.documentId;
                    if (docId) {
                        this.setData({ documentId: docId });
                        wx.navigateTo({
                            url: `/pages/complaint-detail/complaint-detail?id=${docId}`,
                            fail: (err) => {
                                console.error('Navigation failed:', err);
                                wx.showToast({ title: '跳转失败', icon: 'none' });
                            }
                        });
                    }
                })
                .catch(err => {
                    wx.hideLoading();
                    console.error('等待保存失败:', err);
                    wx.showToast({ title: '保存失败，请重试', icon: 'none' });
                });
              return;
          }

          this.hasGenerated = true;
          
          app.globalData.needRefreshDocuments = true;

          wx.showLoading({ title: '正在保存...', mask: true });

          this.saveDocumentToCloud(false, null)
            .then(res => {
              wx.hideLoading();
              
              if (res && res._id) {
                this.setData({ documentId: res._id });
                wx.navigateTo({
                    url: `/pages/complaint-detail/complaint-detail?id=${res._id}`,
                    fail: (err) => {
                        console.error('Navigation failed:', err);
                        wx.showToast({ title: '跳转失败', icon: 'none' });
                    }
                });
              }
            })
            .catch(err => {
              wx.hideLoading();
              console.error('保存文书失败:', err);
              wx.showToast({
                title: '保存失败，请重试',
                icon: 'none'
              });
            });
      } else {
          wx.navigateTo({
              url: `/pages/complaint-detail/complaint-detail?id=${documentId}`,
              fail: (err) => {
                  console.error('Navigation failed:', err);
                  wx.showToast({ title: '跳转失败', icon: 'none' });
              }
          });
      }
  },

  async generateWithAI() {
    this.setData({ isGeneratingAI: true });

    try {
      const { formData, scenarioOptions, scenarioQuestions } = this.data;
      const prompt = buildComplaintAIPrompt(formData, scenarioOptions, scenarioQuestions);

      const fullText = await generateWithAI(prompt, (progressText) => {
        const cleanText = cleanAIText(progressText);
        const text = this.generateText(cleanText);
        this.setData({ generatedText: text });
      });
      
      this.setData({
          aiFacts: fullText
      });
      
      wx.showToast({ title: 'AI 润色完成', icon: 'success' });

    } catch (err) {
      const errorMsg = handleAIError(err);
      wx.showToast({ title: errorMsg, icon: 'none' });
    } finally {
      this.setData({ isGeneratingAI: false });
    }
  },

  restart() {
      wx.navigateBack();
  },

  getExtraDocumentData() {
    const evidenceObj = this.data.evidenceList || { general: [], agent: '', scenarios: [] };
    const evidenceList = [];
    
    if (evidenceObj.general && evidenceObj.general.length > 0) {
      evidenceList.push({ type: 'general', items: evidenceObj.general });
    }
    if (evidenceObj.agent) {
      evidenceList.push({ type: 'agent', content: evidenceObj.agent });
    }
    if (evidenceObj.scenarios && evidenceObj.scenarios.length > 0) {
      evidenceObj.scenarios.forEach(scenario => {
        evidenceList.push({
          type: 'scenario',
          title: scenario.title,
          items: scenario.items
        });
      });
    }

    return {
      evidenceList: evidenceList,
      scenarioOptions: this.data.scenarioOptions,
      scenarioQuestions: this.data.scenarioQuestions
    };
  }
})
