const { textToHtml, htmlToText, formatDate } = require('../../utils/documentUtils');
const { generateAndOpenPDF } = require('../../utils/pdfUtils');
const { buildComplaintAIPrompt, generateWithAI, cleanAIText, handleAIError } = require('../../utils/aiService');

Page({
  data: {
    documentId: '',
    document: null,
    generatedText: '',
    isGeneratingAI: false,
    bodyText: '',
    bodyTextHtml: '',
    formData: {},
    scenarioOptions: [],
    scenarioQuestions: {},
    todayDate: '',
    isPolished: false,
    isEditing: false
  },

  editorCtx: null,
  _originalBodyText: '',
  _hasContentChanges: false,

  onLoad(options) {
    this.setData({ todayDate: formatDate(new Date()) });
    this._hasContentChanges = false;

    if (options.id) {
      this.setData({ documentId: options.id });
      this.loadDocument(options.id);
    }
  },

  onHide() {
    if (this._hasContentChanges && this.data.bodyText) {
      this.saveToCloud();
    }
  },

  onUnload() {
    if (this._hasContentChanges && this.data.bodyText) {
      this.saveToCloud();
    }
  },

  loadDocument(id) {
    const db = wx.cloud.database();
    db.collection('documents').doc(id).get()
      .then(res => {
        if (res.data) {
          const doc = res.data;
          const rawText = doc.generatedContent || '';
          const processed = this.processTextForDisplay(rawText);

          this._originalBodyText = processed;
          this._hasContentChanges = false;

          this.setData({
            document: doc,
            generatedText: rawText,
            bodyText: processed,
            bodyTextHtml: textToHtml(processed),
            formData: doc.formData || {},
            scenarioOptions: doc.scenarioOptions || [],
            scenarioQuestions: doc.scenarioQuestions || {},
            isPolished: doc.isPolished || false
          });
        }
      })
      .catch(err => {
        console.error('加载文档失败:', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  processTextForDisplay(text) {
      if (!text) return '';

      let lines = text.split('\n');

      if (lines.length > 0 && lines[0].trim() === '民事起诉状') {
          lines.shift();
      }
      while(lines.length > 0 && lines[0].trim() === '') {
          lines.shift();
      }

      const footerIndex = lines.findIndex(l => l.trim().startsWith('此致'));
      if (footerIndex > -1) {
          lines = lines.slice(0, footerIndex);
      }

      while(lines.length > 0 && lines[lines.length - 1].trim() === '') {
          lines.pop();
      }

      let inFactsSection = false;
      const factsHeaderRegex = /^(事实与理由 | 一、事实 | 事实部分)[:：]?\s*$/;

      const newLines = lines.map(line => {
          const trimmed = line.trim();

          if (factsHeaderRegex.test(trimmed)) {
              inFactsSection = true;
              return line;
          }

          if (inFactsSection) {
             if (trimmed.length > 0) {
                  if (!line.startsWith('\u3000') && !line.startsWith('    ')) {
                      return '\u3000\u3000' + trimmed;
                  }
              }
          }

          return line;
      });

      return newLines.join('\n');
  },

  getFullText() {
      let text = "民事起诉状\n\n" + this.data.bodyText;
      const formData = this.data.formData || {};

      text += `\n\n    此致\n${formData.courtName || '________人民法院'}\n`;

      text += `\n\n\n\n`;
      text += `具 状 人 ：___________\n`;
      text += `          ${this.data.todayDate}`;

      return text;
  },

  copyText() {
    wx.setClipboardData({ data: this.getFullText() });
  },

  saveToCloud() {
    return new Promise((resolve, reject) => {
      if (!this.data.documentId) {
        console.error('saveToCloud: documentId is empty');
        reject(new Error('documentId is empty'));
        return;
      }

      const content = this.getFullText();
      console.log('saveToCloud: saving content, length:', content.length);

      const db = wx.cloud.database();
      const app = getApp();
      app.globalData.needRefreshDocuments = true;

      const savePromise = db.collection('documents').doc(this.data.documentId).update({
        data: {
          generatedContent: content,
          isPolished: this.data.isPolished,
          updatedAt: db.serverDate()
        }
      }).then(() => {
        console.log('saveToCloud: save success');
        this.setData({ generatedText: content });
        resolve();
      }).catch(err => {
        console.error('保存失败:', err);
        reject(err);
      });

      app.globalData.savePromise = savePromise;
    });
  },

  startEditing() {
      this.setData({ isEditing: true });
  },

  stopEditing() {
      this.setData({ isEditing: false });
  },

  async saveEditing() {
      if (this.editorCtx) {
          this.editorCtx.getContents({
              success: async (res) => {
                  const text = res.text;
                  if (text !== this._originalBodyText) {
                      this._hasContentChanges = true;
                  }
                  this.setData({
                      bodyText: text,
                      bodyTextHtml: textToHtml(text),
                      isEditing: false
                  });
                  if (this._hasContentChanges) {
                      await this.saveToCloud();
                  }
              }
          });
      }
  },

  onEditorReady() {
      const that = this;
      wx.createSelectorQuery().in(this).select('#editor').context(function(res) {
          that.editorCtx = res.context;
          if (that.data.bodyText) {
              that.editorCtx.setContents({
                  html: that.data.bodyTextHtml || textToHtml(that.data.bodyText)
              });
          }
      }).exec();
  },

  onEditorInput(e) {
      const text = htmlToText(e.detail.html);
      if (text !== this._originalBodyText) {
          this._hasContentChanges = true;
      }
      this.setData({ bodyText: text });
  },

  formatBold() {
      if (this.editorCtx) {
          this.editorCtx.format('bold', true);
      }
  },

  formatItalic() {
      if (this.editorCtx) {
          this.editorCtx.format('italic', true);
      }
  },

  formatUnderline() {
      if (this.editorCtx) {
          this.editorCtx.format('underline', true);
      }
  },

  exportPDF() {
      generateAndOpenPDF({
          content: this.getFullText(),
          title: '民事起诉状'
      }).catch(e => {
          wx.showToast({ title: e.message || '生成失败', icon: 'none' });
      });
  },

  updateFullTextWithAI(aiFactsContent) {
      return new Promise((resolve) => {
          if (!aiFactsContent || typeof aiFactsContent !== 'string') {
              console.error('updateFullTextWithAI: invalid aiFactsContent');
              resolve(false);
              return;
          }

          const currentBody = this.data.bodyText;
          if (!currentBody || typeof currentBody !== 'string') {
              console.error('updateFullTextWithAI: bodyText is empty or invalid');
              resolve(false);
              return;
          }

          let cleanText = cleanAIText(aiFactsContent);

          // 给AI生成的每个段落添加段首缩进（4个空格）
          const aiParagraphs = cleanText.split(/\n\s*\n/).map(para => {
              const trimmedPara = para.trim();
              if (trimmedPara.length === 0) return '';
              return '    ' + trimmedPara;
          }).filter(para => para.length > 0);
          cleanText = aiParagraphs.join('\n');

          // 自动拼接"故原告"部分（带缩进）
          cleanText += '\n    故原告为维护自身的合法权益，特向贵院提起诉讼，望贵院依法判决，判如所请。\n';

          const startMarker = '事实与理由：\n';
          const endMarkerRegex = /此致/;
          const startIdx = currentBody.indexOf(startMarker);
          const match = currentBody.match(endMarkerRegex);
          const endIdx = match ? match.index : -1;

          if (startIdx > -1) {
              let newBody;
              if (endIdx > -1 && endIdx > startIdx) {
                  newBody = currentBody.substring(0, startIdx + startMarker.length) +
                                  cleanText + '\n' +
                                  currentBody.substring(endIdx);
              } else {
                   newBody = currentBody.substring(0, startIdx + startMarker.length) + cleanText;
              }
              this._hasContentChanges = true;
              this.setData({
                  bodyText: newBody,
                  bodyTextHtml: textToHtml(newBody)
              }, () => resolve(true));
          } else {
              console.warn('updateFullTextWithAI: 未找到"事实与理由："标记，无法替换AI润色内容');
              wx.showToast({
                  title: '文本格式已改变，无法应用AI润色',
                  icon: 'none',
                  duration: 3000
              });
              resolve(false);
          }
      });
  },

  handleAIButtonTap() {
      if (this.data.isPolished) {
          return;
      }
      this.generateWithAI();
  },

  async generateWithAI() {
    this.setData({ isGeneratingAI: true });

    try {
      const { formData, scenarioOptions, scenarioQuestions } = this.data;
      const prompt = buildComplaintAIPrompt(formData, scenarioOptions, scenarioQuestions);
      console.log('🤖 [AI Debug] 正在请求混元大模型...');

      const fullText = await generateWithAI(prompt, async (progressText) => {
        await this.updateFullTextWithAI(progressText);
      });

      console.log('✅ [AI Debug] AI 生成完成，总长度:', fullText.length);

      await new Promise((resolve) => {
        this.setData({ isPolished: true }, resolve);
      });

      await this.saveToCloud();
      console.log('✅ [AI Debug] 内容已保存到云端');
      wx.showToast({ title: 'AI 润色完成', icon: 'success' });

    } catch (err) {
      const errorMsg = handleAIError(err);
      wx.showToast({ title: errorMsg, icon: 'none' });
    } finally {
      this.setData({ isGeneratingAI: false });
    }
  }
})
