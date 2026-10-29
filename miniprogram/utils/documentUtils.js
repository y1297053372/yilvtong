const { CLAIM_OPTIONS, REPORT_CLAIM_OPTIONS } = require('../config/constants');

const DATE_FORMATS = {
  DISPLAY: 'display',
  CN: 'cn',
  ISO: 'iso',
  DATETIME: 'datetime',
  RELATIVE: 'relative'
};

const formatDate = (date, format = DATE_FORMATS.DISPLAY) => {
  if (!date) return '';
  
  if (format === DATE_FORMATS.RELATIVE) {
    return formatRelativeTime(date);
  }
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  
  switch (format) {
    case DATE_FORMATS.DISPLAY:
      return `${year} 年 ${month} 月 ${day} 日`;
    case DATE_FORMATS.CN:
      return `${year}年${month}月${day}日`;
    case DATE_FORMATS.ISO:
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    case DATE_FORMATS.DATETIME:
      const hour = d.getHours().toString().padStart(2, '0');
      const minute = d.getMinutes().toString().padStart(2, '0');
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${hour}:${minute}`;
    default:
      return `${year} 年 ${month} 月 ${day} 日`;
  }
};

const formatDateCN = (date) => formatDate(date, DATE_FORMATS.CN);

const formatDateISO = (date) => formatDate(date, DATE_FORMATS.ISO);

const formatDateTime = (date) => formatDate(date, DATE_FORMATS.DATETIME);

const formatRelativeTime = (date) => {
  if (!date) return '';
  const now = new Date();
  const diff = now - new Date(date);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前';
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前';
  } else if (diff < 7 * day) {
    return Math.floor(diff / day) + '天前';
  } else {
    return formatDate(date, DATE_FORMATS.ISO);
  }
};

const textToHtml = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\u3000/g, '&emsp;')
    .replace(/\n/g, '<br>');
};

const htmlToText = (html) => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&emsp;/g, '\u3000')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '');
};

const generateClaimText = (claimId, inputs) => {
  const claim = CLAIM_OPTIONS.find(c => c.id === claimId);
  if (!claim) return '';

  const claimTextGenerators = {
    '1': (inputs) => {
      const amount1 = inputs['1_1'] || '';
      const amount2 = inputs['1_2'] || '';
      return `立即为我方办理退货退款，退还全部购衣款项${amount1}元，并承担我方因本次交易产生的运费${amount2}元；`;
    },
    '2': () => `立即为我方更换符合宣传/定制要求的全新商品，并保证商品质量，承担更换产生的全部物流费用；`,
    '3': (inputs) => {
      const date = inputs['3_1'] || '';
      return `立即按双方定制约定重新制作商品，于${date}前交付，承担重新制作的全部成本；`;
    },
    '4': (inputs) => {
      const amount = inputs['4_1'] || '';
      return `向我方支付损失赔偿${amount}元（含直接损失/间接损失，如医药费、误工费）；`;
    },
    '5': (inputs) => {
      const amount = inputs['5_1'] || '';
      return `根据合同约定支付违约金${amount}元；`;
    },
    '6': (inputs) => {
      const amount = inputs['6_1'] || '';
      return `根据已约定的定金返还定金${amount}元；`;
    },
    '7': () => `立刻停止对我方权利的侵害并及时采取补救措施（涉及人身权利或知识产权）。`
  };

  const generator = claimTextGenerators[claimId];
  return generator ? generator(inputs) : '';
};

const generateReportClaimText = (claimId, inputs) => {
  const claim = REPORT_CLAIM_OPTIONS.find(c => c.id === claimId);
  if (!claim) return '';

  let text = claim.label;
  
  if (claim.hasInput) {
    const amount = inputs[`${claimId}_1`] || '';
    if (amount) {
      text += `，金额${amount}元`;
    }
  }
  
  return text;
};

const generateDocumentTitle = (docType, formData) => {
  let title = '';
  
  if (docType === 'negotiation_letter') {
    title = '协商函';
    if (formData.receiver && formData.receiver.shopName) {
      title = `协商函 - ${formData.receiver.shopName}`;
    }
  } else if (docType === 'report_letter') {
    title = '举报信';
    if (formData.merchant && formData.merchant.shopName) {
      title = `举报信 - ${formData.merchant.shopName}`;
    }
  } else {
    title = '民事起诉状';
    if (formData.defendantType === 'individual' && formData.defendant && formData.defendant.name) {
      title = `民事起诉状 - ${formData.defendant.name}`;
    } else if (formData.defendantType === 'organization' && formData.orgDefendant && formData.orgDefendant.name) {
      title = `民事起诉状 - ${formData.orgDefendant.name}`;
    }
  }
  
  return title;
};

const calculateFinalDate = (workDays) => {
  const today = new Date();
  let daysAdded = 0;
  let currentDate = new Date(today);

  while (daysAdded < workDays) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }

  return formatDateISO(currentDate);
};

const checkIdCard = (idCard) => {
  if (!idCard || typeof idCard !== 'string') return false;
  
  const reg15 = /^[1-9]\d{7}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}$/;
  
  const reg18 = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[0-9Xx]$/;
  
  if (!reg15.test(idCard) && !reg18.test(idCard)) return false;
  
  if (reg18.test(idCard)) {
    const year = parseInt(idCard.substring(6, 10));
    const month = parseInt(idCard.substring(10, 12));
    const day = parseInt(idCard.substring(12, 14));
    
    const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
      daysInMonth[2] = 29;
    }
    
    if (day > daysInMonth[month]) return false;
  }
  
  return true;
};

const extractIdCardInfo = (idCard) => {
  if (!idCard || idCard.length !== 18 || !checkIdCard(idCard)) {
    return null;
  }
  
  const year = idCard.substring(6, 10);
  const month = idCard.substring(10, 12);
  const day = idCard.substring(12, 14);
  const birthDate = `${year}-${month}-${day}`;
  
  const genderCode = parseInt(idCard.charAt(16));
  const gender = genderCode % 2 === 1 ? '男' : '女';
  
  return { birthDate, gender };
};

const processHtmlContent = (content, isDarkMode = false) => {
  if (!content) return '';
  
  let processedContent = content;
  
  // 处理图片样式
  processedContent = processedContent.replace(/<img[^>]*>/gi, function(match) {
    if (match.indexOf('style=') > -1) {
      return match.replace(/style\s*=\s*['"]([^'"]*)['"]/i, 'style="max-width:100%;height:auto;display:block;margin:10px 0;$1"');
    } else {
      return match.replace(/<img/i, '<img style="max-width:100%;height:auto;display:block;margin:10px 0;"');
    }
  });

  // 清理链接
  processedContent = processedContent.replace(/href\s*=\s*['"]([^'"]*)['"]/gi, function(match, url) {
    const cleanUrl = url.trim().replace(/^`|`$/g, '').replace(/\s/g, '');
    return `href="${cleanUrl}"`;
  });

  // 处理所有带背景色的内联样式 - 统一使用黑色文字
  processedContent = processedContent.replace(
    /style\s*=\s*['"]([^'"]*)background-color\s*:\s*([^;'"]+)([^'"]*)['"]/gi,
    'style="$1background-color: $2; color: #000000;$3"'
  );
  
  // 处理 mark 标签 - 统一使用黑色文字
  processedContent = processedContent.replace(
    /<mark([^>]*)>/gi,
    '<mark$1 style="color: #000000; padding: 2px 4px; border-radius: 3px;">'
  );

  return processedContent;
};

module.exports = {
  DATE_FORMATS,
  formatDate,
  formatDateCN,
  formatDateISO,
  formatDateTime,
  formatRelativeTime,
  textToHtml,
  htmlToText,
  processHtmlContent,
  generateClaimText,
  generateReportClaimText,
  generateDocumentTitle,
  calculateFinalDate,
  checkIdCard,
  extractIdCardInfo
};
