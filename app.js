/**
 * 石亭ERP 微信小程序 - 入口文件
 * 负责全局逻辑、用户角色识别、登录态管理
 */

const storage = require('./utils/storage');
const config = require('./config/index');

App({
  globalData: {
    /** 用户角色：owner-业主 | member-院友 | visitor-访客 */
    userRole: 'visitor',
    /** 用户信息 { userId, role, name, phone } */
    userInfo: null,
    /** 是否已登录 */
    isLoggedIn: false,
  },

  onLaunch() {
    this._doLogin();
  },

  /**
   * 微信登录，获取并存储用户信息
   */
  _doLogin() {
    wx.login({
      success: (res) => {
        if (res.code) {
          wx.request({
            url: config.baseUrl + '/login',
            method: 'POST',
            data: { code: res.code },
            header: { 'content-type': 'application/json' },
            success: (apiRes) => {
              if (apiRes.statusCode === 200 && apiRes.data && apiRes.data.userId) {
                const userInfo = {
                  id: apiRes.data.userId,
                  userId: apiRes.data.userId,
                  role: apiRes.data.role || 'visitor',
                  name: apiRes.data.name,
                  phone: apiRes.data.phone,
                };
                storage.userInfo = userInfo;
                this.globalData.userInfo = userInfo;
                this.globalData.userRole = userInfo.role;
                this.globalData.isLoggedIn = true;
              } else {
                this._initUserFromStorage();
              }
            },
            fail: () => this._initUserFromStorage(),
          });
        } else {
          this._initUserFromStorage();
        }
      },
      fail: () => this._initUserFromStorage(),
    });
  },

  /**
   * 从本地存储恢复用户信息（网络失败时）
   */
  _initUserFromStorage() {
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

  /**
   * 获取当前用户角色
   * @returns {'owner'|'member'|'visitor'}
   */
  getUserRole() {
    return this.globalData.userRole;
  },

  /**
   * 是否有折扣权限（业主、院友）
   */
  hasDiscount() {
    return ['owner', 'member'].includes(this.globalData.userRole);
  },
});
