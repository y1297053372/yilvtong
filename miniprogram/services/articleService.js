const db = wx.cloud.database();
const _ = db.command;
const { DEFAULT_IMAGES, CATEGORY_MAP, COLLECTIONS, SEARCH_CONFIG } = require('../config/constants');
const { formatDateISO } = require('../utils/documentUtils');

const STOP_WORDS = new Set([
  '怎么', '如何', '怎样', '什么', '哪些', '关于', '进行', '可以', '需要', 
  '流程', '手续', '资料', '问题', '详解', '是否', '一个', '没有', '就是', 
  '这个', '那个', '因为', '所以', '为了', '如果', '并且', '或者'
]);

class ArticleService {
  _tokenize(keyword) {
    if (!keyword || keyword.length < 2) return [keyword];
    
    const tokens = new Set([keyword]);
    
    for (let i = 0; i < keyword.length - 1; i++) {
      const gram = keyword.substring(i, i + 2);
      if (!STOP_WORDS.has(gram)) {
        if (/[\u4e00-\u9fa5]/.test(gram)) {
           tokens.add(gram);
        }
      }
    }
    
    return Array.from(tokens);
  }

  _getCategoryName(key) {
    return CATEGORY_MAP[key] || key || '法律科普';
  }

  async getBanners() {
    try {
      const res = await db.collection('article')
        .where({
          position: 'banner'
        })
        .orderBy('date', 'asc')
        .limit(20)
        .field({
          _id: true,
          title: true,
          desc: true,
          imgUrl: true,
          category_l1: true
        })
        .get();

      return res.data.map(item => ({
        id: item._id,
        image: item.imgUrl || DEFAULT_IMAGES.ARTICLE_COVER,
        title: item.title,
        desc: item.desc || '',
        category: this._getCategoryName(item.category_l1)
      }));
    } catch (err) {
      console.error('获取轮播图失败', err);
      return [];
    }
  }

  async getHotArticles(limit = 5) {
    try {
      const res = await db.collection('article')
        .where({
          position: 'hot'
        })
        .orderBy('view', 'desc')
        .limit(limit)
        .field({
          _id: true,
          title: true,
          desc: true,
          imgUrl: true,
          category_l1: true,
          date: true,
          view: true,
          collect: true
        })
        .get();

      return res.data.map(item => ({
        id: item._id,
        title: item.title,
        summary: item.desc || '',
        image: item.imgUrl || DEFAULT_IMAGES.ARTICLE_COVER,
        category: this._getCategoryName(item.category_l1),
        date: formatDateISO(item.date),
        view: item.view || 0,
        collect: item.collect || 0
      }));
    } catch (err) {
      console.error('获取热门文章失败', err);
      return [];
    }
  }

  async getArticles({ keyword, category, category_l2, category_l3, page = 1, pageSize = 10, orderBy = 'newest' }) {
    try {
      let query = db.collection('article');
      
      let baseCondition = {};

      if (category) {
        baseCondition.category_l1 = category;
      }

      if (category_l2 && category_l2 !== '全部') {
        baseCondition.category_l2 = category_l2;
      }

      if (category_l3 && category_l3 !== '全部') {
        baseCondition.category_l3 = category_l3;
      }

      let keywordCondition = null;
      if (keyword) {
        const searchTokens = this._tokenize(keyword);
        
        const orConditions = [];
        
        searchTokens.forEach(token => {
           const tokenReg = db.RegExp({
              regexp: token,
              options: 'i',
            });
            
            orConditions.push({ title: tokenReg });
            orConditions.push({ desc: tokenReg });
            orConditions.push({ tags: tokenReg });
        });
        
        if (orConditions.length > 0) {
          keywordCondition = _.or(orConditions);
        }
      }

      let finalCondition = baseCondition;
      if (keywordCondition) {
        if (Object.keys(baseCondition).length > 0) {
          finalCondition = _.and(baseCondition, keywordCondition);
        } else {
          finalCondition = keywordCondition;
        }
      }

      const skip = (page - 1) * pageSize;
      
      if (keyword && orderBy === 'comprehensive') {
         const searchTokens = this._tokenize(keyword);
         const safeTokens = searchTokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
         const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

         try {
           const fetchLimit = SEARCH_CONFIG.COMPREHENSIVE_LIMIT;
           
           const res = await query.where(finalCondition)
             .orderBy('date', 'desc') 
             .limit(fetchLimit)
             .field({
               _id: true,
               title: true,
               desc: true,
               imgUrl: true,
               category_l1: true,
               date: true,
               view: true,
               collect: true,
               tags: true
             })
             .get();
            
           let rawList = res.data || [];
           
           rawList = rawList.map(item => {
             let score = 0;
             const title = item.title || '';
             const desc = item.desc || '';
             const tags = (item.tags || []).join(' ');

             if (new RegExp(safeKeyword, 'i').test(title)) score += 50;
             if (new RegExp(safeKeyword, 'i').test(desc)) score += 20;
             if (new RegExp(safeKeyword, 'i').test(tags)) score += 20;

             safeTokens.forEach(token => {
               if (new RegExp(token, 'i').test(title)) score += 10;
               if (new RegExp(token, 'i').test(desc)) score += 5;
               if (new RegExp(token, 'i').test(tags)) score += 5;
             });
             
             return { ...item, _score: score };
           });

           rawList.sort((a, b) => {
             if (b._score !== a._score) {
               return b._score - a._score;
             }
             return new Date(b.date) - new Date(a.date);
           });

           const sortedTotalList = rawList;
           const start = (page - 1) * pageSize;
           const end = start + pageSize;
           const list = sortedTotalList.slice(start, end).map(item => ({
             id: item._id,
             title: item.title,
             summary: item.desc,
             image: item.imgUrl || DEFAULT_IMAGES.ARTICLE_COVER,
             category: this._getCategoryName(item.category_l1),
             date: formatDateISO(item.date),
             views: item.view || 0,
             collections: item.collect || 0
           }));

           return {
             list,
             total: rawList.length,
             hasMore: end < rawList.length,
             isLimited: rawList.length >= fetchLimit,
             limitHint: rawList.length >= fetchLimit ? 
               `为提升搜索速度，仅显示前${fetchLimit}条相关度最高的结果` : null
           };

         } catch (err) {
           console.error('Local Relevance Sort Failed:', err);
         }
      }

      console.log('执行本地搜索，条件：', finalCondition);

      let sortField = 'date';
      if (orderBy === 'most_viewed') {
        sortField = 'view';
      }

      const res = await query.where(finalCondition)
        .orderBy(sortField, 'desc')
        .skip(skip)
        .limit(pageSize)
        .field({
          _id: true,
          title: true,
          desc: true,
          imgUrl: true,
          category_l1: true,
          date: true,
          view: true,
          collect: true
        })
        .get();
        
      const countRes = await query.where(finalCondition).count();

      const list = res.data.map(item => ({
        id: item._id,
        title: item.title,
        summary: item.desc,
        image: item.imgUrl || DEFAULT_IMAGES.ARTICLE_COVER,
        category: this._getCategoryName(item.category_l1),
        date: formatDateISO(item.date),
        views: item.view || 0,
        collections: item.collect || 0
      }));

      return {
        list,
        total: countRes.total,
        hasMore: skip + list.length < countRes.total
      };
    } catch (err) {
      console.error('获取文章列表失败', err);
      return { list: [], total: 0, hasMore: false };
    }
  }

  async getArticlesByIds(ids) {
    if (!ids || ids.length === 0) return [];
    try {
      const res = await db.collection('article')
        .where({
          _id: _.in(ids)
        })
        .field({
          _id: true,
          title: true,
          desc: true,
          imgUrl: true,
          category_l1: true,
          date: true,
          view: true,
          collect: true
        })
        .get();

      return res.data.map(item => ({
        id: item._id,
        title: item.title,
        summary: item.desc || '',
        image: item.imgUrl || DEFAULT_IMAGES.ARTICLE_COVER,
        category: this._getCategoryName(item.category_l1),
        date: formatDateISO(item.date),
        view: item.view || 0,
        collect: item.collect || 0
      }));
    } catch (err) {
      console.error('批量获取文章失败', err);
      return [];
    }
  }

  async getArticleById(id) {
    try {
      db.collection('article').doc(id).update({
        data: {
          view: _.inc(1)
        }
      }).catch(err => console.error('更新浏览量失败', err));

      const res = await db.collection('article').doc(id).get();
      const item = res.data;
      
      return {
        id: item._id,
        title: item.title,
        desc: item.desc || '',
        content: item.content || '', 
        image: item.imgUrl || DEFAULT_IMAGES.ARTICLE_COVER, 
        category: this._getCategoryName(item.category_l1),
        category_l1: item.category_l1,
        date: formatDateISO(item.date),
        view: (item.view || 0),
        collect: item.collect || 0,
        tags: item.tags || []
      };
    } catch (err) {
      console.error('获取文章详情失败', err);
      return null;
    }
  }

  async getArticlesByCategory({ category_l1, category_l2, category_l3, limit = 100 }) {
    try {
      let query = db.collection('article');
      
      const conditions = {};
      
      if (category_l1) {
        conditions.category_l1 = category_l1;
      }
      
      if (category_l2 && category_l2 !== 'all') {
        conditions.category_l2 = category_l2;
      }
      
      if (category_l3 && category_l3 !== 'all') {
        conditions.category_l3 = _.elemMatch(_.eq(category_l3));
      }
      
      const res = await query.where(conditions)
        .orderBy('date', 'desc')
        .limit(limit)
        .field({
          _id: true,
          title: true,
          desc: true,
          imgUrl: true,
          category_l1: true,
          date: true,
          view: true,
          collect: true
        })
        .get();

      return res.data.map(item => ({
        id: item._id,
        title: item.title,
        summary: item.desc || '',
        date: formatDateISO(item.date),
        category: this._getCategoryName(item.category_l1),
        views: item.view || 0,
        collections: item.collect || 0,
        image: item.imgUrl || ''
      }));
    } catch (err) {
      console.error('获取分类文章失败', err);
      return [];
    }
  }

  async updateCollectCount(articleId, increment) {
    try {
      await db.collection('article').doc(articleId).update({
        data: { collect: _.inc(increment) }
      });
      return true;
    } catch (err) {
      console.error('更新文章收藏数失败:', err);
      return false;
    }
  }
}

module.exports = new ArticleService();
