/**
 * 会员中心 - 登录状态、会员种类、工单、订单、发票、商城入口
 */

const ROLE_LABELS = {
  owner: '业主',
  member: '院友',
  visitor: '访客',
};

Page({
  data: {
    isLoggedIn: false,
    roleLabel: '访客',
    userName: '',
  },

  onLoad() {
    this._setTabBarSelected(2);
  },

  onShow() {
    this._setTabBarSelected(2);
    this._updateUserStatus();
  },

  _updateUserStatus() {
    const app = getApp();
    const role = app.getUserRole?.() || app.globalData?.userRole || 'visitor';
    const isLoggedIn = app.globalData?.isLoggedIn ?? false;
    const userInfo = app.globalData?.userInfo || {};
    this.setData({
      isLoggedIn,
      roleLabel: ROLE_LABELS[role] || '访客',
      userName: userInfo.name || userInfo.phone || '',
    });
  },

  _setTabBarSelected(index) {
    const tabBar = this.getTabBar?.();
    if (tabBar) tabBar.setData({ selected: index });
  },

  goWorkOrders() {
    wx.navigateTo({ url: '/packageMember/work-orders/work-orders' });
  },

  goOrders() {
    wx.navigateTo({ url: '/packageMember/orders/orders' });
  },

  goInvoices() {
    wx.navigateTo({ url: '/packageMember/invoices/invoices' });
  },

  goMall() {
    wx.showToast({ title: '商城功能开发中', icon: 'none' });
  },
});
