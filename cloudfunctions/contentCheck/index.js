// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  const { type, payload } = event

  try {
    if (type === 'text') {
      return await checkText(payload.content)
    } else if (type === 'image') {
      return await checkImage(payload.fileID)
    } else {
      return { code: 400, msg: 'Unknown type' }
    }
  } catch (err) {
    console.error('Check failed', err)
    return { code: 500, msg: 'Check failed', err }
  }
}

async function checkText(content) {
  if (!content) return { code: 0, msg: 'Empty content' }
  
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: content
    })
    
    if (res.errCode === 0) {
      return { code: 0, msg: 'Pass' }
    } else {
      return { code: 87014, msg: 'Risky content' }
    }
  } catch (err) {
    if (err.errCode === 87014) {
      return { code: 87014, msg: 'Risky content' }
    }
    // 其他错误，如调用频率限制，暂时放行或抛出
    console.error('Text check error', err)
    return { code: 500, msg: 'Check error', err }
  }
}

async function checkImage(fileID) {
  if (!fileID) return { code: 0, msg: 'Empty fileID' }

  try {
    // 1. 下载文件
    const fileRes = await cloud.downloadFile({
      fileID: fileID,
    })
    const buffer = fileRes.fileContent

    // 检查大小 (imgSecCheck 限制 1MB)
    if (buffer.length > 1024 * 1024) {
      // 超过1MB，尝试使用 mediaCheckAsync 或直接返回失败
      // 这里简单返回失败提示
      return { code: 400, msg: 'Image too large (max 1MB)' }
    }

    // 2. 调用检测
    const res = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: 'image/png', // 流媒体类型，这里简单写 image/png，实际上微信会自动识别或兼容
        value: buffer
      }
    })

    if (res.errCode === 0) {
      return { code: 0, msg: 'Pass' }
    } else {
      return { code: 87014, msg: 'Risky image' }
    }

  } catch (err) {
    if (err.errCode === 87014) {
      return { code: 87014, msg: 'Risky image' }
    }
    console.error('Image check error', err)
    return { code: 500, msg: 'Check error', err }
  }
}
