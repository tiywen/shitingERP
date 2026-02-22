/**
 * 会员中心 - 工单状态、订单、发票、商城入口
 */

Page({
  data: {},

  onLoad() {
    this._setTabBarSelected(2);
  },

  onShow() {
    this._setTabBarSelected(2);
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
