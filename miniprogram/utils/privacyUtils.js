/**
 * 隐私合规工具模块
 * 提供脱敏、加密、隐私告知等共用功能
 */

// ==================== 脱敏函数 ====================

/**
 * 身份证号脱敏：仅显示第一位和最后一位
 * @param {string} idCard 身份证号
 * @returns {string} 脱敏后的身份证号
 * 示例：110101199001011234 → 1****************4
 */
const maskIdCard = (idCard) => {
  if (!idCard || idCard.length < 2) return '';
  const first = idCard[0];
  const last = idCard[idCard.length - 1];
  const middle = '*'.repeat(idCard.length - 2);
  return first + middle + last;
};

/**
 * 手机号脱敏：显示前3位和后4位
 * @param {string} phone 手机号
 * @returns {string} 脱敏后的手机号
 * 示例：13812345678 → 138****5678
 */
const maskPhone = (phone) => {
  if (!phone || phone.length < 7) return '';
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
};

/**
 * 地址脱敏：隐藏详细地址部分
 * @param {string} address 完整地址
 * @returns {string} 脱敏后的地址
 */
const maskAddress = (address) => {
  if (!address || address.length < 10) return address;
  return address.substring(0, 6) + '****' + address.substring(address.length - 4);
};

// ==================== 加密函数 ====================

/**
 * 加密敏感数据
 * @param {string} data 原始数据
 * @returns {Promise<object>} 加密结果 {encrypted, iv, authTag}
 */
const encryptSensitiveData = async (data) => {
  if (!data) return null;
  
  try {
    const res = await wx.cloud.callFunction({
      name: 'encryptData',
      data: { data }
    });
    return res.result;
  } catch (error) {
    console.error('加密失败:', error);
    return null;
  }
};

/**
 * 批量加密对象中的敏感字段
 * @param {object} obj 原始对象
 * @param {string[]} sensitiveFields 敏感字段列表
 * @returns {Promise<object>} 加密后的对象
 */
const encryptObjectFields = async (obj, sensitiveFields = ['idCard']) => {
  const result = { ...obj };
  
  for (const field of sensitiveFields) {
    if (result[field]) {
      const encrypted = await encryptSensitiveData(result[field]);
      if (encrypted) {
        result[`${field}Encrypted`] = encrypted.encrypted;
        result[`${field}Iv`] = encrypted.iv;
        result[`${field}AuthTag`] = encrypted.authTag;
        result[`${field}Masked`] = field === 'idCard' ? maskIdCard(result[field]) : result[field];
        result[field] = '';
      }
    }
  }
  
  return result;
};

// ==================== 隐私告知相关 ====================

/**
 * 隐私告知配置
 */
const PRIVACY_CONFIG = {
  civil_complaint: {
    title: '身份信息收集告知',
    description: '为生成民事起诉状，我们需要收集以下信息：',
    requiredFields: ['姓名', '性别', '民族', '出生日期', '联系电话', '联系地址'],
    optionalFields: ['身份证号码'],
    legalBasis: '《民事诉讼法》第121条规定起诉状必备内容',
    noIdCard: false
  },
  negotiation_letter: {
    title: '身份信息收集告知',
    description: '为生成协商函，我们需要收集以下信息：',
    requiredFields: ['姓名', '联系方式'],
    optionalFields: ['身份证号码'],
    legalBasis: '协商沟通需要的基本信息',
    noIdCard: false
  },
  report_letter: {
    title: '信息收集告知',
    description: '为生成举报文书，我们需要收集以下信息：',
    requiredFields: ['姓名', '联系电话'],
    optionalFields: ['通信地址'],
    legalBasis: '行政举报需要的基本信息',
    noIdCard: true
  }
};

/**
 * 获取隐私配置
 * @param {string} documentType 文书类型
 * @returns {object} 隐私配置
 */
const getPrivacyConfig = (documentType) => {
  return PRIVACY_CONFIG[documentType] || PRIVACY_CONFIG.civil_complaint;
};

/**
 * 检查是否需要显示身份证同意弹窗
 * @param {string} documentType 文书类型
 * @returns {boolean}
 */
const needsIdCardConsent = (documentType) => {
  const config = PRIVACY_CONFIG[documentType];
  return config && !config.noIdCard;
};

// ==================== 本地存储 ====================

const STORAGE_KEY = 'privacy_consent';

/**
 * 保存用户隐私同意状态
 * @param {string} documentType 文书类型
 * @param {boolean} consentIdCard 是否同意提供身份证
 */
const savePrivacyConsent = (documentType, consentIdCard) => {
  try {
    const data = wx.getStorageSync(STORAGE_KEY) || {};
    data[documentType] = {
      consentIdCard,
      timestamp: Date.now()
    };
    wx.setStorageSync(STORAGE_KEY, data);
  } catch (error) {
    console.error('保存隐私同意状态失败:', error);
  }
};

/**
 * 获取用户隐私同意状态
 * @param {string} documentType 文书类型
 * @returns {object|null} {consentIdCard, timestamp}
 */
const getPrivacyConsent = (documentType) => {
  try {
    const data = wx.getStorageSync(STORAGE_KEY) || {};
    return data[documentType] || null;
  } catch (error) {
    console.error('获取隐私同意状态失败:', error);
    return null;
  }
};

/**
 * 清除隐私同意状态
 * @param {string} documentType 文书类型（可选，不传则清除所有）
 */
const clearPrivacyConsent = (documentType) => {
  try {
    if (documentType) {
      const data = wx.getStorageSync(STORAGE_KEY) || {};
      delete data[documentType];
      wx.setStorageSync(STORAGE_KEY, data);
    } else {
      wx.removeStorageSync(STORAGE_KEY);
    }
  } catch (error) {
    console.error('清除隐私同意状态失败:', error);
  }
};

// ==================== 导出 ====================

module.exports = {
  maskIdCard,
  maskPhone,
  maskAddress,
  encryptSensitiveData,
  encryptObjectFields,
  PRIVACY_CONFIG,
  getPrivacyConfig,
  needsIdCardConsent,
  savePrivacyConsent,
  getPrivacyConsent,
  clearPrivacyConsent
};
