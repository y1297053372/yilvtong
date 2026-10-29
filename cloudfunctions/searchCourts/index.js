const cloud = require('wx-server-sdk');
const https = require('https');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const MAP_KEY = process.env.MAP_KEY || ''; 

exports.main = async (event, context) => {
  const { province, city, district } = event;
  
  if (!MAP_KEY) {
      return { 
          error: 'Missing Key', 
          message: '请在云函数环境变量中配置 MAP_KEY（腾讯地图 Key）',
          data: []
      };
  }

  // 构造查询关键词
  // 优先在区县范围内搜
  const boundary = `region(${district || city},0)`;
  const keyword = '人民法院';
  
  const url = `https://apis.map.qq.com/ws/place/v1/search?keyword=${encodeURIComponent(keyword)}&boundary=${encodeURIComponent(boundary)}&filter=category:130502&key=${MAP_KEY}&page_size=20`;

  return new Promise((resolve, reject) => {
      https.get(url, (res) => {
          // Use Buffer to handle multi-byte characters correctly
          const chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => {
              try {
                  const buffer = Buffer.concat(chunks);
                  const data = buffer.toString('utf8');
                  const json = JSON.parse(data);
                  
                  if (json.status === 0) {
                      // 强力过滤逻辑
                      let courts = json.data
                        .map(item => item.title)
                        .filter(title => {
                            // 1. 必须包含“人民法院”或“法院”
                            if (!title.includes('法院')) return false;

                            // 2. 排除词列表（黑名单）
                            // 由于使用了 category:130502 (法院)，大部分无关POI已被API过滤
                            // 这里仅保留极少数明显非办公地点的关键词作为兜底
                            const blackList = [
                                // 机构/场所后缀（保留明显的非办公区域）
                                '旧址', '宿舍', '家属', '住宅', '公寓', '小区', 
                                '食堂', '卫生室', '停车场', '车库',
                                '招待所', '宾馆', '酒店', '饭店', '餐厅', 
                                '充电站', '驿通', '驿站', '便民',
                                
                                // 商业/服务（虽然API会过滤，但保留以防万一）
                                '打印', '复印', '图文', '照相', '快印', 
                                '超市', '便利店', '商店', '小卖部', '药店',
                                '公司', '银行', '邮政', '快递', '物流',
                                '传媒', '报社', '杂志社', '出版', '新闻', '影视',
                                
                                // 交通/地址（保留明显的交通设施）
                                '公交', '车站', '地铁', '站牌', '候车'
                            ];
                            
                            // 已移除：方位词（如南区、北区）、内部部门（如审判庭、法庭）、门牌号等
                            // 这些通常是有效的法院分支或具体办公点
                            
                            for (let word of blackList) {
                                if (title.includes(word)) return false;
                            }
                            
                            // 3. 排除看起来不像法院全名的短语
                            if (title.length < 4) return false;

                            return true;
                        })
                        // 4. 排序优化：优先展示标准名称（长度较短的通常是本院）
                        .sort((a, b) => a.length - b.length);
                      
                      // 5. 如果过滤后结果过少，尝试放宽限制（比如允许“法庭”作为兜底，但暂时保持严格）
                      // 如果是空的，前端会有兜底逻辑生成标准名

                      resolve({ data: courts, raw: json });
                  } else {
                      // Return full error info for debugging
                      resolve({ error: json.message, status: json.status, data: [] });
                  }
              } catch (e) {
                  resolve({ error: 'Parse Error', data: [] });
              }
          });
      }).on('error', (e) => {
          resolve({ error: e.message, data: [] });
      });
  });
};
