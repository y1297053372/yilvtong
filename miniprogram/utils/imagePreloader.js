const { BANNER_IMAGES, DEFAULT_IMAGES, PRELOAD_CONFIG } = require('../config/constants');

const CONFIG = {
  PRELOAD_TIMEOUT: PRELOAD_CONFIG.TIMEOUT_MS,
  BATCH_DELAY: PRELOAD_CONFIG.BATCH_DELAY_MS,
  LOW_PRIORITY_TIMEOUT: PRELOAD_CONFIG.LOW_PRIORITY_TIMEOUT_MS,
  DEFER_DELAY: PRELOAD_CONFIG.DEFER_DELAY_MS,
  HIGH_PRIORITY_IMAGES: [
    BANNER_IMAGES.COMPLAINT,
    BANNER_IMAGES.REPORT,
    BANNER_IMAGES.NEGOTIATION
  ],
  LOW_PRIORITY_IMAGES: [
    DEFAULT_IMAGES.ARTICLE_COVER,
    DEFAULT_IMAGES.AVATAR
  ]
};

const PRELOAD_CACHE = {
  banners: null,
  indexImages: null,
  profileAvatar: null
};

async function preloadImage(src, timeout = CONFIG.PRELOAD_TIMEOUT) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    
    const timer = setTimeout(() => {
      resolve(src);
    }, timeout);
    
    wx.getImageInfo({
      src: src,
      success: (res) => {
        clearTimeout(timer);
        resolve(res.path);
      },
      fail: () => {
        clearTimeout(timer);
        resolve(src);
      }
    });
  });
}

async function getTempFileURL(fileID) {
  return new Promise((resolve) => {
    if (!fileID || !fileID.startsWith('cloud://')) {
      resolve(fileID);
      return;
    }
    
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: (res) => {
        if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
          resolve(res.fileList[0].tempFileURL);
        } else {
          resolve(fileID);
        }
      },
      fail: () => {
        resolve(fileID);
      }
    });
  });
}

async function preloadCloudImages() {
  const results = [];
  
  for (const fileID of CONFIG.HIGH_PRIORITY_IMAGES) {
    const tempURL = await getTempFileURL(fileID);
    await preloadImage(tempURL);
    results.push({ fileID, tempURL });
  }
  
  const urlMap = {};
  results.forEach(item => {
    urlMap[item.fileID] = item.tempURL;
  });
  
  return urlMap;
}

async function preloadLowPriorityImages() {
  const results = [];
  
  for (const fileID of CONFIG.LOW_PRIORITY_IMAGES) {
    const tempURL = await getTempFileURL(fileID);
    await preloadImage(tempURL, CONFIG.LOW_PRIORITY_TIMEOUT);
    results.push({ fileID, tempURL });
    await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
  }
  
  const urlMap = {};
  results.forEach(item => {
    urlMap[item.fileID] = item.tempURL;
  });
  
  return urlMap;
}

async function preloadIndexData() {
  const articleService = require('../services/articleService');
  
  try {
    const [banners, hotArticles] = await Promise.all([
      articleService.getBanners(),
      articleService.getHotArticles()
    ]);
    
    const bannerImages = banners.map(b => b.image).filter(Boolean);
    const articleImages = hotArticles.map(a => a.image).filter(Boolean);
    
    await Promise.all([...bannerImages, ...articleImages].map(src => preloadImage(src)));
    
    PRELOAD_CACHE.indexImages = { banners, hotArticles };
    
    return { banners, hotArticles };
  } catch (err) {
    console.error('预加载首页数据失败', err);
    return { banners: [], hotArticles: [] };
  }
}

async function preloadProfileAvatar(avatarUrl) {
  if (!avatarUrl) {
    return null;
  }
  
  try {
    let imageUrl = avatarUrl;
    
    if (avatarUrl.startsWith('cloud://')) {
      imageUrl = await getTempFileURL(avatarUrl);
    }
    
    await preloadImage(imageUrl);
    PRELOAD_CACHE.profileAvatar = imageUrl;
    
    return imageUrl;
  } catch (err) {
    console.error('预加载头像失败', err);
    return avatarUrl;
  }
}

async function initPreload() {
  console.log('开始预加载图片资源...');
  const startTime = Date.now();
  
  try {
    const cloudUrlMap = await preloadCloudImages();
    
    PRELOAD_CACHE.banners = {
      COMPLAINT: cloudUrlMap[BANNER_IMAGES.COMPLAINT] || BANNER_IMAGES.COMPLAINT,
      REPORT: cloudUrlMap[BANNER_IMAGES.REPORT] || BANNER_IMAGES.REPORT,
      NEGOTIATION: cloudUrlMap[BANNER_IMAGES.NEGOTIATION] || BANNER_IMAGES.NEGOTIATION
    };
    
    const endTime = Date.now();
    console.log(`高优先级图片预加载完成，耗时 ${endTime - startTime}ms`);
    
    setTimeout(() => {
      preloadLowPriorityImages().catch(err => console.error('低优先级图片预加载失败', err));
      preloadIndexData().catch(err => console.error('后台预加载首页数据失败', err));
      
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo && userInfo.avatarUrl) {
        preloadProfileAvatar(userInfo.avatarUrl).catch(err => console.error('后台预加载头像失败', err));
      }
    }, CONFIG.DEFER_DELAY);
    
    return true;
  } catch (err) {
    console.error('图片预加载失败', err);
    return false;
  }
}

function getPreloadedBanner(type) {
  if (PRELOAD_CACHE.banners && PRELOAD_CACHE.banners[type]) {
    return PRELOAD_CACHE.banners[type];
  }
  return BANNER_IMAGES[type] || '';
}

function getPreloadedBanners() {
  if (PRELOAD_CACHE.banners) {
    return PRELOAD_CACHE.banners;
  }
  return BANNER_IMAGES;
}

function getPreloadedIndexData() {
  return PRELOAD_CACHE.indexImages;
}

function getPreloadedAvatar() {
  return PRELOAD_CACHE.profileAvatar;
}

module.exports = {
  initPreload,
  preloadImage,
  preloadIndexData,
  preloadProfileAvatar,
  getTempFileURL,
  getPreloadedBanner,
  getPreloadedBanners,
  getPreloadedIndexData,
  getPreloadedAvatar,
  PRELOAD_CACHE
};
