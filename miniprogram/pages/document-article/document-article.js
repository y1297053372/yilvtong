const { processHtmlContent } = require('../../utils/documentUtils');

Page({
  data: {
    source: '',
    article: null,
    rawContent: '',
    isDarkMode: false,
    loading: true,
    error: '',
    imageUrls: [],
    tagStyle: {
      p: 'margin-bottom: 1em; line-height: 1.8; text-align: justify; font-size: 16px; color: #333; text-indent: 0;',
      img: 'max-width: 100%; height: auto; display: block; margin: 16px auto; border-radius: 8px;',
      blockquote: 'margin: 16px 0; padding: 16px 20px; background-color: #f8fafc; border-left: 4px solid #1152d4; color: #64748b; line-height: 1.7; border-radius: 0 8px 8px 0;',
      h1: 'font-size: 1.6em; font-weight: 700; margin: 1.5em 0 1em; color: #1e293b; line-height: 1.4; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5em;',
      h2: 'font-size: 1.35em; font-weight: 700; margin: 1.2em 0 0.8em; color: #1e293b; line-height: 1.4; padding-left: 12px; border-left: 4px solid #1152d4;',
      h3: 'font-size: 1.2em; font-weight: 600; margin: 1em 0 0.6em; color: #334155; line-height: 1.4;',
      h4: 'font-size: 1.1em; font-weight: 600; margin: 0.8em 0 0.5em; color: #475569;',
      a: 'color: #1152d4; text-decoration: none; border-bottom: 1px solid transparent;',
      ul: 'margin: 16px 0; padding-left: 28px; line-height: 1.8;',
      ol: 'margin: 16px 0; padding-left: 28px; line-height: 1.8;',
      li: 'margin-bottom: 12px; color: #334155; line-height: 1.8;',
      code: 'background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #e11d48;',
      pre: 'background-color: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-size: 14px; line-height: 1.6;',
      table: 'width: 100%; border-collapse: separate; border-spacing: 0; margin: 20px 0; font-size: 14px; background-color: transparent; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;',
      th: 'background-color: #f1f5f9; padding: 14px 12px; border: none; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; text-align: left; font-weight: 600; color: #1e293b;',
      td: 'padding: 12px; border: none; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; line-height: 1.6; color: #334155;',
      hr: 'border: none; height: 1px; background: linear-gradient(90deg, transparent, #cbd5e1, transparent); margin: 32px 0;',
      strong: 'font-weight: 700; color: #1e293b;',
      em: 'font-style: italic; color: #475569;',
      div: 'max-width: 100%; overflow-x: auto;',
      span: 'line-height: inherit; color: inherit;'
    }
  },

  onLoad(options) {
    const { source } = options;
    
    if (!source) {
      this.setData({
        loading: false,
        error: '参数错误：缺少source参数'
      });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    
    const appBaseInfo = wx.getAppBaseInfo();
    const isDarkMode = appBaseInfo.theme === 'dark';
    
    this.setData({ 
      source,
      isDarkMode 
    });
    this.updateTagStyle(isDarkMode);
    this.loadArticle(source);
    
    this._themeHandler = (res) => {
      const isDark = res.theme === 'dark';
      this.setData({ isDarkMode: isDark });
      this.updateTagStyle(isDark);
      if (this.data.rawContent) {
        this.reprocessContent(isDark);
      }
    };
    wx.onThemeChange(this._themeHandler);
  },

  onUnload() {
    if (this._themeHandler) {
      wx.offThemeChange(this._themeHandler);
    }
  },

  updateTagStyle(isDark) {
    const blockquoteBg = isDark ? '#1e293b' : '#f8fafc';
    const blockquoteColor = isDark ? '#94a3b8' : '#64748b';
    const textColor = isDark ? '#e2e8f0' : '#333';
    const headingColor = isDark ? '#f1f5f9' : '#1e293b';
    const subHeadingColor = isDark ? '#cbd5e1' : '#334155';
    const codeBg = isDark ? '#334155' : '#f1f5f9';
    const thBg = isDark ? '#334155' : '#f1f5f9';
    const borderColor = isDark ? '#475569' : '#e2e8f0';
    const tableBg = isDark ? '#1e293b' : '#fff';
    const h1BorderColor = isDark ? '#334155' : '#e2e8f0';
    const tdColor = isDark ? '#e2e8f0' : '#334155';
    const linkColor = isDark ? '#60a5fa' : '#1152d4';
    
    this.setData({
      'tagStyle.p': `margin-bottom: 1em; line-height: 1.8; text-align: justify; font-size: 16px; color: ${textColor}; text-indent: 0;`,
      'tagStyle.blockquote': `margin: 16px 0; padding: 16px 20px; background-color: ${blockquoteBg}; border-left: 4px solid #1152d4; color: ${blockquoteColor}; line-height: 1.7; border-radius: 0 8px 8px 0;`,
      'tagStyle.h1': `font-size: 1.6em; font-weight: 700; margin: 1.5em 0 1em; color: ${headingColor}; line-height: 1.4; border-bottom: 2px solid ${h1BorderColor}; padding-bottom: 0.5em;`,
      'tagStyle.h2': `font-size: 1.35em; font-weight: 700; margin: 1.2em 0 0.8em; color: ${headingColor}; line-height: 1.4; padding-left: 12px; border-left: 4px solid #1152d4;`,
      'tagStyle.h3': `font-size: 1.2em; font-weight: 600; margin: 1em 0 0.6em; color: ${subHeadingColor}; line-height: 1.4;`,
      'tagStyle.h4': `font-size: 1.1em; font-weight: 600; margin: 0.8em 0 0.5em; color: ${subHeadingColor};`,
      'tagStyle.a': `color: ${linkColor}; text-decoration: none; border-bottom: 1px solid transparent;`,
      'tagStyle.li': `margin-bottom: 12px; color: ${textColor}; line-height: 1.8;`,
      'tagStyle.code': `background-color: ${codeBg}; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #e11d48;`,
      'tagStyle.th': `background-color: ${thBg}; padding: 14px 12px; border: none; border-bottom: 1px solid ${borderColor}; border-right: 1px solid ${borderColor}; text-align: left; font-weight: 600; color: ${headingColor};`,
      'tagStyle.td': `padding: 12px; border: none; border-bottom: 1px solid ${borderColor}; border-right: 1px solid ${borderColor}; line-height: 1.6; color: ${tdColor};`,
      'tagStyle.table': `width: 100%; border-collapse: separate; border-spacing: 0; margin: 20px 0; font-size: 14px; background-color: ${tableBg}; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid ${borderColor};`,
      'tagStyle.strong': `font-weight: 700; color: ${headingColor};`,
      'tagStyle.em': `font-style: italic; color: ${subHeadingColor};`,
      'tagStyle.span': `line-height: inherit; color: inherit;`
    });
  },

  reprocessContent(isDark) {
    const { processHtmlContent } = require('../../utils/documentUtils');
    let content = this.data.rawContent;
    content = processHtmlContent(content, isDark);
    
    content = content.replace(/<span[^>]*class\s*=\s*["']exeditor-picture["'][^>]*>([\s\S]*?)<\/span>/gi, function(match, inner) {
      return inner;
    });
    
    content = content.replace(/<span[^>]*style\s*=\s*["'][^"']*(?:position\s*:\s*relative|display\s*:\s*block|padding-bottom\s*:\s*\d+%)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi, function(match, inner) {
      return inner;
    });
    
    content = content.replace(/<span[^>]*font-family:[^>]*Wingdings[^>]*>([^<]*)<\/span>/gi, function(match, inner) {
      const cleaned = inner.replace(/l/gi, '•').replace(/&nbsp;/g, '').trim();
      return cleaned ? cleaned + ' ' : '';
    });
    
    content = content.replace(/<(td|th)([^>]*)>/gi, function(match, tag, attrs) {
      if (attrs.indexOf('style=') > -1) {
        const cleanedAttrs = attrs.replace(/color:\s*#[0-9a-fA-F]+\s*;?/gi, '').replace(/color:\s*[a-zA-Z]+\s*;?/gi, '');
        return '<' + tag + cleanedAttrs + '>';
      }
      return match;
    });
    
    content = content.replace(/<span([^>]*)>/gi, function(match, attrs) {
      if (attrs.indexOf('style=') > -1) {
        const cleanedAttrs = attrs.replace(/color:\s*#[0-9a-fA-F]+\s*;?/gi, '').replace(/color:\s*[a-zA-Z]+\s*;?/gi, '');
        return '<span' + cleanedAttrs + '>';
      }
      return match;
    });
    
    this.setData({
      'article.content': content
    });
  },

  loadArticle(source) {
    const db = wx.cloud.database();
    
    db.collection('document_article')
      .where({
        source: source
      })
      .get({
        success: res => {
          if (res.data && res.data.length > 0) {
            const data = res.data[0];
            let rawContent = data.content || '';
            
            let content = processHtmlContent(rawContent, this.data.isDarkMode);
            
            content = content.replace(/<span[^>]*class\s*=\s*["']exeditor-picture["'][^>]*>([\s\S]*?)<\/span>/gi, function(match, inner) {
              return inner;
            });
            
            content = content.replace(/<span[^>]*style\s*=\s*["'][^"']*(?:position\s*:\s*relative|display\s*:\s*block|padding-bottom\s*:\s*\d+%)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi, function(match, inner) {
              return inner;
            });
            
            content = content.replace(/<span[^>]*font-family:[^>]*Wingdings[^>]*>([^<]*)<\/span>/gi, function(match, inner) {
              const cleaned = inner.replace(/l/gi, '•').replace(/&nbsp;/g, '').trim();
              return cleaned ? cleaned + ' ' : '';
            });
            
            content = content.replace(/<(td|th)([^>]*)>/gi, function(match, tag, attrs) {
              if (attrs.indexOf('style=') > -1) {
                const cleanedAttrs = attrs.replace(/color:\s*#[0-9a-fA-F]+\s*;?/gi, '').replace(/color:\s*[a-zA-Z]+\s*;?/gi, '');
                return '<' + tag + cleanedAttrs + '>';
              }
              return match;
            });
            
            content = content.replace(/<span([^>]*)>/gi, function(match, attrs) {
              if (attrs.indexOf('style=') > -1) {
                const cleanedAttrs = attrs.replace(/color:\s*#[0-9a-fA-F]+\s*;?/gi, '').replace(/color:\s*[a-zA-Z]+\s*;?/gi, '');
                return '<span' + cleanedAttrs + '>';
              }
              return match;
            });
            
            const imgRegex = /<img[^>]*src=['"]([^'"]+)['"][^>]*>/gi;
            const images = [];
            let imgMatch;
            while ((imgMatch = imgRegex.exec(content)) !== null) {
              images.push(imgMatch[1]);
            }
            
            this.setData({
              article: {
                title: data.title,
                content: content
              },
              rawContent: rawContent,
              imageUrls: images,
              loading: false
            });
          } else {
            this.setData({
              loading: false,
              error: '文章不存在'
            });
            setTimeout(() => wx.navigateBack(), 1500);
          }
        },
        fail: err => {
          console.error('加载文章失败', err);
          this.setData({
            loading: false,
            error: '加载失败，请重试'
          });
        }
      });
  },

  onShareAppMessage() {
    if (this.data.article) {
      return {
        title: this.data.article.title,
        path: `/pages/document-article/document-article?source=${this.data.source}`
      };
    }
    return {
      title: '文章详情',
      path: `/pages/document-article/document-article?source=${this.data.source}`
    };
  },

  onImageLoad(e) {
    console.log('图片加载完成', e);
  },

  onHtmlTap(e) {
    if (e.detail && e.detail.target && e.detail.target.tagName === 'IMG') {
      const src = e.detail.target.attrs.src;
      if (src && this.data.imageUrls.length > 0) {
        wx.previewImage({
          current: src,
          urls: this.data.imageUrls
        });
      }
    }
  }
});
