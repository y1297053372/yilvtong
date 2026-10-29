Page({
  data: {
    qaData: [
      {
        category: "关于两种代理模式",
        expanded: true,
        items: [
          {
            id: 1,
            question: "什么是「法学生代理」？",
            answer: "法学生代理是衣律通平台推出的小额服装网购维权纠纷专项服务。我们严格选拔国内知名法学院校高年级优秀学生，经过专业培训与考核，为消费者提供低成本、高效率的维权代理服务。适合涉案金额较小、事实清晰的案件（如货不对板、一般质量问题等）。",
            expanded: false
          },
          {
            id: 2,
            question: "什么是「律师代理」？",
            answer: "律师代理由衣律通合作的正规律师事务所指派执业律师承接，专门处理大额、复杂的服装网购维权案件（如涉案金额较高、涉及欺诈赔偿、需要诉讼等）。服务更全面，包括出具法律意见、代理诉讼等，费用相对较高，但专业保障更强。",
            expanded: false
          },
          {
            id: 3,
            question: "我该选择法学生代理还是律师代理？",
            answer: "您可以根据案件情况灵活选择：小额纠纷（如订单金额几百元、事实简单）推荐法学生代理，性价比高；大额纠纷（如订单金额数千元以上、涉及惩罚性赔偿）推荐律师代理，专业护航。如果您不确定，可先提交案件信息，平台会根据您的描述给出建议。",
            expanded: false
          }
        ]
      },
      {
        category: "费用相关",
        expanded: false,
        items: [
          {
            id: 4,
            question: "法学生代理收费吗？费用多少？",
            answer: "法学生代理收取远低于市场律师费的少量服务费，具体金额根据案件复杂程度浮动，页面会有明确公示。我们致力于让小额维权也能轻松负担。",
            expanded: false
          },
          {
            id: 5,
            question: "律师代理如何收费？",
            answer: "律师代理费用由合作律所按标准收取，通常包括基础代理费及风险代理（如按赔偿比例提成），具体费用会在您提交需求后由律师与您沟通确认，平台承诺价格透明。",
            expanded: false
          },
          {
            id: 6,
            question: "平台在其中起什么作用？",
            answer: "平台在维权代理中仅仅起到中介作用，并对用户进行维权代理提供坚实的服务保障和售后渠道。用户支付委托费用后，平台会在其中抽取一定比例的平台费。",
            expanded: false
          }
        ]
      },
      {
        category: "审核与质量",
        expanded: false,
        items: [
          {
            id: 7,
            question: "法学生的专业能力可靠吗？",
            answer: "我们对法学生进行严格筛选：每个法学生都有真实档案供您查阅。仅限知名政法大学法学专业大三以上学生，要求专业成绩排名前30%或有相关实习经历，并需要通过衣律通组织的维权实务培训与考核。代理全程由执业律师作为督导。",
            expanded: false
          },
          {
            id: 8,
            question: "律师代理的律所是否正规？",
            answer: "所有合作律所均具备合法执业资质，并在当地司法局备案。您可以在小程序查看律所介绍及承办律师信息。",
            expanded: false
          }
        ]
      },
      {
        category: "服务流程",
        expanded: false,
        items: [
          {
            id: 9,
            question: "如何申请代理服务？",
            answer: "只需三步：1.在小程序内填写案件基本信息（商品、问题、诉求）；2.系统匹配推荐适合的代理类型（法学生/律师）；3.您确认后，平台指派专人对接，启动维权。",
            expanded: false
          },
          {
            id: 10,
            question: "法学生代理具体做什么？",
            answer: "包括但不限于：协助整理证据材料、撰写协商函、投诉举报文本、指导与商家沟通谈判、提供法律建议（不包含出庭诉讼，如需诉讼可升级为律师代理）。",
            expanded: false
          },
          {
            id: 11,
            question: "律师代理包含诉讼吗？",
            answer: "是的，律师代理可根据您的需求包含协商、调解、诉讼、执行全流程服务。具体服务范围在委托合同中明确。",
            expanded: false
          }
        ]
      },
      {
        category: "责任与保障",
        expanded: false,
        items: [
          {
            id: 12,
            question: "如果代理效果不理想怎么办？",
            answer: "衣律通设有服务保障机制：法学生代理如因明显失误导致损失，平台将协调赔偿、律师代理按委托合同约定承担责任。所有服务均可评价，我们会持续监督服务质量。",
            expanded: false
          }
        ]
      },
      {
        category: "其他",
        expanded: false,
        items: [
          {
            id: 13,
            question: "提交案件后多久能有回复？",
            answer: "通常24小时内会有专人联系您，初步评估案件并匹配代理人员。",
            expanded: false
          }
        ]
      }
    ]
  },

  onLoad: function(options) {},

  onStudentCardTap: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
      duration: 2000
    });
  },

  onLawyerCardTap: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none',
      duration: 2000
    });
  },

  onCategoryTap: function(e) {
    const index = e.currentTarget.dataset.index;
    const qaData = this.data.qaData;
    qaData[index].expanded = !qaData[index].expanded;
    this.setData({ qaData });
  },

  onQATap: function(e) {
    const categoryIndex = e.currentTarget.dataset.categoryIndex;
    const qaIndex = e.currentTarget.dataset.qaIndex;
    const qaData = this.data.qaData;
    
    if (categoryIndex !== undefined && qaIndex !== undefined) {
      qaData[categoryIndex].items[qaIndex].expanded = !qaData[categoryIndex].items[qaIndex].expanded;
      this.setData({ qaData });
    }
  }
});
