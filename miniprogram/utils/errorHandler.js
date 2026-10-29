const realtimeLog = wx.getRealtimeLogManager ? wx.getRealtimeLogManager() : null;

const ErrorLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

function handleError(err, userMessage = '操作失败，请稍后重试', options = {}) {
  const { 
    showToast = true, 
    duration = 2000,
    level = ErrorLevel.ERROR,
    silent = false
  } = options;

  const errorInfo = {
    message: err?.message || String(err),
    stack: err?.stack || '',
    timestamp: new Date().toISOString(),
    page: getCurrentPageRoute()
  };

  console[level]('[ErrorHandler]', errorInfo);

  if (realtimeLog) {
    realtimeLog[level](`[${errorInfo.page}] ${errorInfo.message}`, err);
  }

  if (showToast && !silent) {
    wx.showToast({
      title: userMessage,
      icon: 'none',
      duration: duration
    });
  }

  return {
    success: false,
    error: err,
    message: userMessage
  };
}

function handleSuccess(data, message = '操作成功') {
  return {
    success: true,
    data: data,
    message: message
  };
}

function wrapAsync(fn, errorMessage = '操作失败') {
  return async function(...args) {
    try {
      const result = await fn.apply(this, args);
      return handleSuccess(result);
    } catch (err) {
      return handleError(err, errorMessage);
    }
  };
}

function getCurrentPageRoute() {
  const pages = getCurrentPages();
  if (pages.length > 0) {
    const currentPage = pages[pages.length - 1];
    return currentPage.route || 'unknown';
  }
  return 'unknown';
}

function logInfo(message, data = {}) {
  console.log('[INFO]', message, data);
  if (realtimeLog) {
    realtimeLog.info(message, data);
  }
}

function logWarn(message, data = {}) {
  console.warn('[WARN]', message, data);
  if (realtimeLog) {
    realtimeLog.warn(message, data);
  }
}

function logError(message, err = null) {
  console.error('[ERROR]', message, err);
  if (realtimeLog) {
    realtimeLog.error(message, err);
  }
}

module.exports = {
  ErrorLevel,
  handleError,
  handleSuccess,
  wrapAsync,
  logInfo,
  logWarn,
  logError
};
