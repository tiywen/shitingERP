/**
 * 石亭ERP 微信小程序 - 入口文件
 * 负责全局逻辑、用户角色识别、登录态管理
 */

App({
  globalData: {
    /** 用户角色：owner-业主 | member-院友 | visitor-访客 */
    userRole: 'visitor',
    /** 用户信息 */
    userInfo: null,
    /** 是否已登录 */
    isLoggedIn: false,
  },

  onLaunch() {
    this._initUserRole();
  },

  /**
   * 初始化用户角色
   * 登录后识别：业主、院友、访客；未登录视为访客
   */
  _initUserRole() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.role) {
      this.globalData.userInfo = userInfo;
      this.globalData.userRole = userInfo.role;
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
