const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_encryption_key_32bytes!';

exports.main = async (event, context) => {
  const { data, action = 'encrypt' } = event;
  
  if (!data) {
    return { success: false, error: 'No data provided' };
  }
  
  try {
    if (action === 'encrypt') {
      return await encryptData(data);
    } else if (action === 'decrypt') {
      return await decryptData(data);
    } else {
      return { success: false, error: 'Invalid action' };
    }
  } catch (error) {
    console.error('Encryption error:', error);
    return { success: false, error: error.message };
  }
};

async function encryptData(plaintext) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    success: true,
    encrypted: encrypted,
    iv: iv.toString('hex')
  };
}

async function decryptData(encryptedData) {
  const { encrypted, iv } = encryptedData;
  
  if (!encrypted || !iv) {
    return { success: false, error: 'Missing encrypted data or iv' };
  }
  
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const ivBuffer = Buffer.from(iv, 'hex');
  
  const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return {
    success: true,
    decrypted: decrypted
  };
}
