/**
 * 餐厅预约入口：桌餐 / 单人餐
 */

Page({
  data: {},

  onLoad() {},

  goTable() {
    wx.navigateTo({
      url: '/packageService/restaurant-book/restaurant-book?type=table',
    });
  },

  goIndividual() {
    wx.navigateTo({
      url: '/packageService/restaurant-book/restaurant-book?type=individual',
    });
  },
});
