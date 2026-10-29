const buildComplaintAIPrompt = (formData, scenarioOptions, scenarioQuestions) => {
  let prompt = `你是一名专业的法律文书助手。请根据以下当事人提供的信息，撰写《民事起诉状》中的"事实与理由"部分。\n\n`;

  prompt += `【严格约束（必读）】\n`;
  prompt += `1. 【禁止标题】：绝对不要输出"事实与理由"、"一、事实部分"等任何标题，直接开始写正文。\n`;
  prompt += `2. 【禁止落款】：绝对不要输出"此致"、"具状人"、"年月日"等结尾落款信息。\n`;
  prompt += `3. 【禁止Markdown】：绝对不要使用 **加粗**、# 标题等 Markdown 格式，仅输出纯文本。\n`;
  prompt += `4. 【禁止重复结尾】：绝对不要输出"故原告特向贵院提起诉讼..."等请求语，因为系统会自动添加。\n`;
  prompt += `5. 【内容要求】：重点描述侵权/违约事实（时间、地点、经过、后果）和法律依据（引用《民法典》《消保法》具体条款）。\n`;
  prompt += `6. 【强制分段】：请务必按照"交易背景"、"侵权事实"、"法律依据"等逻辑进行分段，段落之间用换行符分隔，不要写成一大段。\n\n`;

  prompt += `【案件信息】\n`;

  const pInfo = formData.purchaseInfo || {};
  if (pInfo.product) {
    prompt += `交易信息：原告于${pInfo.date || '______'}在${pInfo.platform || '______'}购买了${pInfo.product}，价格${pInfo.price || '______'}元，订单号${pInfo.orderId || '______'}。\n`;
  }

  if (formData.cause) {
    const causeMap = {
      'contract': '买卖合同纠纷',
      'transport': '交通运输合同纠纷',
      'reputation': '人身损害赔偿纠纷',
      'sale': '买卖合同纠纷',
      'injury': '人身损害赔偿纠纷'
    };
    prompt += `案由：${causeMap[formData.cause] || '买卖合同纠纷'}。\n`;
  }

  prompt += `具体情形：\n`;
  const scenarios = formData.scenarios || [];
  scenarios.forEach(scenId => {
    const option = scenarioOptions.find(o => o.id === scenId);
    const label = option ? option.label : '';
    prompt += `- 情形类型：${label}\n`;

    const questions = scenarioQuestions[scenId] || [];
    questions.forEach(q => {
      const key = `${scenId}_${q.id}`;
      const answer = formData.scenarioData ? formData.scenarioData[key] : '';
      if (answer) {
        prompt += `  - ${q.label}：${answer}\n`;
      }
    });
  });

  if (formData.negotiation && formData.negotiation.date) {
    prompt += `协商经过：${formData.negotiation.date}通过${formData.negotiation.method || '______'}联系，结果：${formData.negotiation.result || '______'}。\n`;
  }

  prompt += `\n请根据以上事实撰写条理清晰、分段合理的"事实与理由"。`;
  return prompt;
};

const generateWithAI = async (prompt, onProgress) => {
  if (!wx.cloud || !wx.cloud.extend || !wx.cloud.extend.AI) {
    throw new Error('请先升级微信基础库以使用AI功能');
  }

  const model = wx.cloud.extend.AI.createModel("hunyuan-exp");

  const res = await model.streamText({
    data: {
      model: "hunyuan-turbos-latest",
      messages: [
        { role: "user", content: prompt }
      ]
    }
  });

  let fullText = "";

  for await (let event of res.textStream) {
    fullText += event;
    if (onProgress) {
      onProgress(fullText);
    }
  }

  return fullText;
};

const cleanAIText = (aiFactsContent) => {
  let cleanText = aiFactsContent;

  cleanText = cleanText.replace(/\*\*/g, '').replace(/##/g, '').replace(/^#\s+/gm, '');

  cleanText = cleanText.replace(/^(事实与理由|一、事实|事实部分)[:：]?\s*/g, '');

  // 只截断"此致"、"具状人"等落款，不截断"故原告"
  // "故原告"部分由系统自动拼接，确保格式正确
  const closingRegex = /(此致|具状人|综上所述|谨此|申请人：)/;
  const splitIndex = cleanText.search(closingRegex);
  if (splitIndex > -1) {
    cleanText = cleanText.substring(0, splitIndex);
  }

  // 移除AI可能生成的"故原告"部分（由系统统一添加）
  const guYuanRegex = /故原告.*$/;
  cleanText = cleanText.replace(guYuanRegex, '');

  cleanText = cleanText.trim();

  return cleanText;
};

const handleAIError = (err) => {
  console.error("AI Generation Error", err);
  if (err.code === 'EXCEED_CONCURRENT_REQUEST_LIMIT') {
    return 'AI服务繁忙，请稍后重试';
  }
  return 'AI生成失败，已保留模板内容';
};

module.exports = {
  buildComplaintAIPrompt,
  generateWithAI,
  cleanAIText,
  handleAIError
};
