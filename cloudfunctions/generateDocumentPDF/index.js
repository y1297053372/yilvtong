const cloud = require('wx-server-sdk');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const MAX_CONTENT_LENGTH = 100000;

exports.main = async (event, context) => {
  const { content, title } = event;

  if (!content || typeof content !== 'string') {
    return { error: true, code: 400, message: '缺少内容参数或格式错误' };
  }

  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    return { error: true, code: 400, message: '内容不能为空' };
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return { error: true, code: 400, message: `内容长度超出限制（最大${MAX_CONTENT_LENGTH}字符）` };
  }

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50
  });

  const normalFontPath = path.resolve(__dirname, 'normal.ttf');

  if (!fs.existsSync(normalFontPath)) {
    return { error: true, code: 500, message: '服务器配置错误：缺少字体文件' };
  }

  doc.registerFont('Normal', normalFontPath);

  const buffers = [];
  doc.on('data', buffers.push.bind(buffers));

  // 清理特殊字符：将不换行空格转换为普通空格
  const cleanContent = content.replace(/\u00A0/g, ' ');
  
  const lines = cleanContent.split('\n');
  const docTitle = title || lines[0]?.trim() || '文书';
  const pageWidth = 595.28;
  const margin = 50;

  doc.font('Normal').fontSize(22).text(docTitle, { align: 'center' });
  doc.moveDown(1.5);

  doc.font('Normal').fontSize(16);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!line.trim()) {
      doc.moveDown(0.8);
      continue;
    }

    if (line.trim() === docTitle) {
      continue;
    }

    if (line.match(/具\s*状\s*人/)) {
      doc.moveDown(2);
      doc.text(line.trim(), { align: 'right' });
      continue;
    }

    if (line.match(/发函方签字|盖章/)) {
      doc.moveDown(2);
      doc.text(line.trim(), { align: 'right' });
      continue;
    }

    if (line.match(/^举\s*报\s*人/)) {
      doc.moveDown(2);
      doc.text(line.trim(), { align: 'right' });
      continue;
    }

    // 只匹配纯日期行（日期后面只能是空白或结束），避免误判正文中的日期
    if (line.match(/^\s*\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日\s*$/)) {
      doc.text(line.trim(), { align: 'right' });
      continue;
    }

    if (line.trim() === '此致') {
      doc.moveDown(1);
      doc.text(line.trim(), { indent: 32 });
      continue;
    }

    const leadingSpaces = line.match(/^(\s*)/)[1].length;
    const indent = leadingSpaces * 8;

    // 使用PDFKit原生indent选项（默认只缩进第一行）
    doc.text(line.trimStart(), {
      indent: indent,
      align: 'left',
      lineGap: 4
    });
  }

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', async () => {
      const buffer = Buffer.concat(buffers);
      const fileName = `document_${Date.now()}.pdf`;

      try {
        const res = await cloud.uploadFile({
          cloudPath: `exports/${fileName}`,
          fileContent: buffer
        });
        resolve({ fileID: res.fileID });
      } catch (err) {
        reject(err);
      }
    });
    doc.on('error', reject);
  });
};
