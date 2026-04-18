/**
 * 小程序首页：订房 / 商城 双入口
 */

Page({
  onLoad() {
    this._setTabBarSelected(0);
  },

  onShow() {
    this._setTabBarSelected(0);
  },

  _setTabBarSelected(index) {
    const tabBar = this.getTabBar?.();
    if (tabBar) tabBar.setData({ selected: index });
  },

  goRoom() {
    wx.navigateTo({ url: '/pages/room/room' });
  },

  goMall() {
    wx.navigateTo({ url: '/packageMall/mall/mall' });
  },
});
