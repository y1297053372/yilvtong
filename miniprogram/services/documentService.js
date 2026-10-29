const db = wx.cloud.database();
const _ = db.command;

class DocumentService {
  async getDocuments(options = {}) {
    const { type, status, limit = 20, skip = 0, orderBy = 'updatedAt' } = options;
    
    try {
      // 注意：'{openid}' 是微信小程序客户端查询的占位符语法，会自动替换为当前用户的 openid
      // 此语法仅在客户端环境下有效，不可在云函数中使用
      const conditions = { _openid: '{openid}' };
      
      if (type) {
        conditions.type = type;
      }
      if (status) {
        conditions.status = status;
      }
      
      const res = await db.collection('documents')
        .where(conditions)
        .orderBy(orderBy, 'desc')
        .skip(skip)
        .limit(limit)
        .get();

      return res.data;
    } catch (err) {
      console.error('获取文书列表失败:', err);
      return [];
    }
  }

  async getDocumentById(documentId) {
    try {
      const res = await db.collection('documents').doc(documentId).get();
      return res.data;
    } catch (err) {
      console.error('获取文书详情失败:', err);
      return null;
    }
  }

  async createDocument(data) {
    try {
      const documentData = {
        ...data,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      };
      const res = await db.collection('documents').add({ data: documentData });
      return res._id;
    } catch (err) {
      console.error('创建文书失败:', err);
      return null;
    }
  }

  async updateDocument(documentId, data) {
    try {
      await db.collection('documents').doc(documentId).update({
        data: {
          ...data,
          updatedAt: db.serverDate()
        }
      });
      return true;
    } catch (err) {
      console.error('更新文书失败:', err);
      return false;
    }
  }

  async deleteDocument(documentId) {
    try {
      await db.collection('documents').doc(documentId).remove();
      return true;
    } catch (err) {
      console.error('删除文书失败:', err);
      return false;
    }
  }

  async countDocuments(type = null) {
    try {
      const conditions = { _openid: '{openid}' };
      
      if (type) {
        conditions.type = type;
      }

      const res = await db.collection('documents')
        .where(conditions)
        .count();
      return res.total || 0;
    } catch (err) {
      console.error('统计文书数量失败:', err);
      return 0;
    }
  }

  async getDocumentsByType(type) {
    return this.getDocuments({ type });
  }

  async getDrafts() {
    return this.getDocuments({ status: 'draft' });
  }

  async getCompletedDocuments() {
    return this.getDocuments({ status: 'generated' });
  }
}

module.exports = new DocumentService();
