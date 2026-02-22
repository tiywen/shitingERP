/**
 * 本地存储工具
 */

const KEY_USER = 'userInfo';
const KEY_TOKEN = 'token';

module.exports = {
  get userInfo() {
    return wx.getStorageSync(KEY_USER) || null;
  },
  set userInfo(v) {
    if (v) {
      wx.setStorageSync(KEY_USER, v);
    } else {
      wx.removeStorageSync(KEY_USER);
    }
  },

  get token() {
    return wx.getStorageSync(KEY_TOKEN) || '';
  },
  set token(v) {
    if (v) {
      wx.setStorageSync(KEY_TOKEN, v);
    } else {
      wx.removeStorageSync(KEY_TOKEN);
    }
  },

  clear() {
    wx.removeStorageSync(KEY_USER);
    wx.removeStorageSync(KEY_TOKEN);
  },
};
