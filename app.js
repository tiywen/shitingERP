/**
 * 石亭ERP 微信小程序 - 入口文件
 * 负责全局逻辑、用户角色识别、登录态管理
 * 登录方式：手机号（微信一键 或 验证码）
 */

const storage = require('./utils/storage');
const config = require('./config/index');

App({
  globalData: {
    userRole: 'visitor',
    userInfo: null,
    isLoggedIn: false,
  },

  onLaunch() {
    this._initFromStorage();
  },

  _initFromStorage() {
    const userInfo = storage.userInfo;
    if (userInfo && userInfo.userId) {
      this.globalData.userInfo = userInfo;
      this.globalData.userRole = userInfo.role || 'visitor';
      this.globalData.isLoggedIn = true;
    } else {
      this.globalData.userRole = 'visitor';
      this.globalData.isLoggedIn = false;
    }
  },

  setLoggedIn(userInfo) {
    storage.userInfo = userInfo;
    this.globalData.userInfo = userInfo;
    this.globalData.userRole = userInfo.role || 'visitor';
    this.globalData.isLoggedIn = true;
  },

  logout() {
    storage.clear();
    this.globalData.userInfo = null;
    this.globalData.userRole = 'visitor';
    this.globalData.isLoggedIn = false;
  },

  getUserRole() {
    return this.globalData.userRole;
  },

  hasDiscount() {
    return ['owner', 'member'].includes(this.globalData.userRole);
  },
});
