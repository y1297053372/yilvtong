// 全局常量配置

const CLOUD_ID_PREFIX = 'cloud://cloud1-3ghkaqpp214e4fc4.636c-cloud1-3ghkaqpp214e4fc4-1411640654';

const LEGAL_BASIS_MAP = {
  'breach': '根据《中华人民共和国民法典》第五百七十七条、第五百八十二条等相关规定，当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。',
  'quality': '根据《中华人民共和国消费者权益保护法》第二十四条、第四十条等相关规定，经营者提供的商品或者服务不符合质量要求的，消费者可以依照国家规定、当事人约定退货，或者要求经营者履行更换、修理等义务。',
  'personal': '根据《中华人民共和国民法典》第一千零三十四条、第一千零三十五条等相关规定，自然人的个人信息受法律保护。任何组织或者个人需要获取他人个人信息的，应当依法取得并确保信息安全。',
  'ip': '根据《中华人民共和国商标法》第五十七条、《中华人民共和国专利法》第十一条等相关规定，未经商标注册人许可，在同一种商品上使用与其注册商标相同的商标的，构成商标侵权。'
};

const INFRINGEMENT_OPTIONS = [
  { value: 'breach', label: '违约问题', desc: '商家履行内容与约定严重不符' },
  { value: 'quality', label: '产品质量问题', desc: '可能或已经造成人身财产损失' },
  { value: 'personal', label: '侵犯人身权利问题', desc: '泄露个人信息、侵犯名誉权/肖像权' },
  { value: 'ip', label: '侵犯知识产权', desc: '侵犯商标权、专利权等' }
];

const CLAIM_OPTIONS = [
  { id: '1', label: '退货退款', hasInput: true, hasInput2: true,
    input1Label: '退款金额 (元)', input1Placeholder: '请输入退款金额',
    input2Label: '运费金额 (元)', input2Placeholder: '请输入运费金额' },
  { id: '2', label: '更换商品', hasInput: false,
    desc: '更换符合宣传/定制要求的全新商品，承担物流费用' },
  { id: '3', label: '重新制作', hasInput: true, input1Type: 'date',
    input1Label: '交付日期', input1Placeholder: '请选择交付日期',
    desc: '按定制约定重新制作，承担全部成本' },
  { id: '4', label: '损失赔偿', hasInput: true,
    input1Label: '赔偿金额 (元)', input1Placeholder: '含直接损失/间接损失',
    desc: '医药费、误工费等' },
  { id: '5', label: '支付违约金', hasInput: true,
    input1Label: '违约金金额 (元)', input1Placeholder: '请输入违约金金额' },
  { id: '6', label: '返还定金', hasInput: true,
    input1Label: '定金金额 (元)', input1Placeholder: '请输入定金金额' },
  { id: '7', label: '停止侵害', hasInput: false,
    desc: '停止对我方权利的侵害并及时采取补救措施' }
];

const CLAIM_LABEL_MAP = Object.fromEntries(CLAIM_OPTIONS.map(c => [c.id, c.label]));

const CONTACT_OPTIONS = ['平台私信', '电话', '微信'];

// 非定制服装侵权选项
const NON_CUSTOM_INFRINGEMENT_OPTIONS = [
  { id: '1', label: '制作假冒伪劣产品', desc: '以次充好、以假乱真' },
  { id: '2', label: '材质/成分虚假标注', desc: '标注与实际材质不符' },
  { id: '3', label: '三无产品', desc: '无生产日期，无合格证，无生产厂家' },
  { id: '4', label: '质量严重不合格', desc: '存在明显质量缺陷' },
  { id: '5', label: '虚假宣传/刷单炒信', desc: '虚构好评、误导消费者' },
  { id: '6', label: '价格欺诈', desc: '虚标原价、虚假折扣' },
  { id: '7', label: '虚假发货', desc: '发货与订单不符或未发货' },
  { id: '8', label: '霸王条款', desc: '拒不履行法定售后' },
  { id: '9', label: '泄露个人信息', desc: '未经同意泄露用户信息' }
];

// 定制服装侵权选项
const CUSTOM_INFRINGEMENT_OPTIONS = [
  { id: '1', label: '侵犯知识产权', desc: '仿牌/盗图/非法标识等' },
  { id: '2', label: '材质/工艺虚假承诺/造假', desc: '实际材质/工艺与承诺不符' },
  { id: '3', label: '三无产品', desc: '无生产日期，无合格证，无生产厂家' },
  { id: '4', label: '虚假宣传', desc: '夸大工艺/隐瞒瑕疵等' },
  { id: '5', label: '违法霸王条款', desc: '拒担质量责任等' },
  { id: '6', label: '无营业执照或超经营范围', desc: '商家资质不全或超范围经营' }
];

// 举报诉求选项
const REPORT_CLAIM_OPTIONS = [
  { id: '1', label: '依法查处商家违法违规行为' },
  { id: '2', label: '责令商家停止违法行为、下架违规商品' },
  { id: '3', label: '责令整改、规范经营' },
  { id: '4', label: '依法罚款、没收违法所得' },
  { id: '5', label: '依法公示处罚结果' },
  { id: '6', label: '涉嫌犯罪的移送公安机关' },
  { id: '7', label: '责令商家退还货款', hasInput: true, inputLabel: '退款金额（元）', inputPlaceholder: '请输入退款金额' },
  { id: '8', label: '责令商家赔偿损失', hasInput: true, inputLabel: '赔偿金额（元）', inputPlaceholder: '请输入赔偿金额' },
  { id: '9', label: '责令商家赔偿人身伤害损失', hasInput: true, inputLabel: '医疗费等（元）', inputPlaceholder: '请输入医疗费等' },
  { id: '10', label: '责令商家赔偿其他财产损失', hasInput: true, inputLabel: '损失金额（元）', inputPlaceholder: '请输入损失金额' },
  { id: '11', label: '责令商家支付惩罚性赔偿（假一赔三）', hasInput: true, inputLabel: '赔偿金额（元）', inputPlaceholder: '请输入赔偿金额' }
];

const REPORT_CLAIM_LABEL_MAP = {
  '1': '依法查处',
  '2': '停止违法行为',
  '3': '责令整改',
  '4': '罚款没收',
  '5': '公示处罚',
  '6': '移送公安',
  '7': '退还货款',
  '8': '赔偿损失',
  '9': '人身伤害赔偿',
  '10': '财产损失赔偿',
  '11': '惩罚性赔偿'
};

const COMPLAINT_CLAIM_LABEL_MAP = {
  '1': '退货退款',
  '2': '发货',
  '3': '赔偿损失',
  '4': '下架产品',
  '5': '开发票',
  '6': '支付违约金',
  '7': '返还定金',
  '8': '维修',
  '9': '诉讼费用',
  '10': '赔礼道歉',
  '11': '精神损害抚慰金'
};

const CAUSE_LABEL_MAP = {
  'sale': '买卖合同纠纷',
  'transport': '交通运输合同纠纷',
  'injury': '人身损害赔偿纠纷',
  'reputation': '名誉权纠纷'
};

const CACHE_CONFIG = {
  MAX_SIZE: 50,
  TTL_MS: 5 * 60 * 1000,
  USER_CACHE_TTL_MS: 5 * 60 * 1000,
  DOCUMENT_LIST_THROTTLE_MS: 30 * 1000
};

const SEARCH_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  COMPREHENSIVE_LIMIT: 100
};

const PRELOAD_CONFIG = {
  TIMEOUT_MS: 5000,
  LOW_PRIORITY_TIMEOUT_MS: 3000,
  BATCH_DELAY_MS: 100,
  DEFER_DELAY_MS: 500
};

const TOAST_DURATION = {
  SHORT: 1500,
  NORMAL: 2000,
  LONG: 3000
};

module.exports = {
  DEFAULT_IMAGES: {
    ARTICLE_COVER: `${CLOUD_ID_PREFIX}/weda-richtext-upload/uploader-61274ba8-5194-4cde-a6d5-1f4948a900e3.jpg`,
    UNSPLASH_FALLBACK: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    AVATAR: `${CLOUD_ID_PREFIX}/avatar/default-avatar.png`
  },

  BANNER_IMAGES: {
    COMPLAINT: `${CLOUD_ID_PREFIX}/banner/complaint-banner.jpg`,
    REPORT: `${CLOUD_ID_PREFIX}/banner/report-banner.jpg`,
    NEGOTIATION: `${CLOUD_ID_PREFIX}/banner/negotiation-banner.jpg`
  },

  CATEGORY_MAP: {
    '1': '证据搜集',
    '2': '维权途径',
    '3': '法条详解',
    '4': '维权专题',
    'evidence': '证据搜集',
    'channel': '维权途径',
    'law': '法条详解',
    'topic': '维权专题'
  },

  CLOUD_ENV_ID: 'cloud1-3ghkaqpp214e4fc4',
  
  COLLECTIONS: {
    ARTICLE: 'article',
    USER: 'user',
    COMMENTS: 'comments',
    DOCUMENT_ARTICLE: 'document_article'
  },

  DOCUMENT_ARTICLE_SOURCES: {
    COMPLAINT_BANNER: 'complaint_banner',
    REPORT_BANNER: 'report_banner',
    NEGOTIATION_BANNER: 'negotiation_banner',
    USER_NOTICE: 'user_notice'
  },

  LEGAL_BASIS_MAP,
  INFRINGEMENT_OPTIONS,
  CLAIM_OPTIONS,
  CLAIM_LABEL_MAP,
  CONTACT_OPTIONS,
  NON_CUSTOM_INFRINGEMENT_OPTIONS,
  CUSTOM_INFRINGEMENT_OPTIONS,
  REPORT_CLAIM_OPTIONS,
  REPORT_CLAIM_LABEL_MAP,
  COMPLAINT_CLAIM_LABEL_MAP,
  CAUSE_LABEL_MAP,
  CACHE_CONFIG,
  SEARCH_CONFIG,
  PRELOAD_CONFIG,
  TOAST_DURATION
};
