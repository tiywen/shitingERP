/**
 * 我的订单 - 显示用户订单列表
 */

const { request } = require('../../utils/request');

Page({
  data: {
    orders: [],
    loading: true,
    empty: false,
  },

  onLoad() {},

  onShow() {
    this.loadOrders();
  },

  loadOrders() {
    const app = getApp();
    const userId = app.globalData.userInfo?.userId || app.globalData.userInfo?.id;

    if (!userId) {
      this.setData({ loading: false, empty: true });
      return;
    }

    this.setData({ loading: true });
    request({
      url: '/orders',
      method: 'GET',
      data: { userId },
    })
      .then((res) => {
        const list = res.list || [];
        this.setData({
          orders: list,
          loading: false,
          empty: list.length === 0,
        });
      })
      .catch(() => {
        this.setData({ loading: false, empty: true });
      });
  },
});
