const generatePDF = async (options) => {
  const { content, title } = options;

  if (!content) {
    throw new Error('内容不能为空');
  }

  const res = await wx.cloud.callFunction({
    name: 'generateDocumentPDF',
    data: { content, title }
  });

  if (res.result.error) {
    throw new Error(res.result.message);
  }

  return res.result;
};

const downloadAndOpenPDF = async (fileID) => {
  wx.showLoading({ title: '正在下载...', mask: true });

  try {
    const downloadRes = await wx.cloud.downloadFile({ fileID });
    wx.hideLoading();

    await wx.openDocument({
      filePath: downloadRes.tempFilePath,
      fileType: 'pdf',
      showMenu: true
    });
  } catch (err) {
    wx.hideLoading();
    throw err;
  }
};

const generateAndOpenPDF = async (options) => {
  const { fileID } = await generatePDF(options);
  await downloadAndOpenPDF(fileID);
};

module.exports = {
  generatePDF,
  downloadAndOpenPDF,
  generateAndOpenPDF
};
