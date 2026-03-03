/**
 * 我的餐厅预约列表
 */

const { request } = require('../../utils/request');

Page({
  data: {
    list: [],
    loading: true,
    empty: false,
  },

  onLoad() {},

  onShow() {
    this.loadList();
  },

  loadList() {
    const app = getApp();
    const userId = app.globalData?.userInfo?.userId || app.globalData?.userInfo?.id;

    if (!userId) {
      this.setData({ loading: false, empty: true });
      return;
    }

    this.setData({ loading: true });
    request({
      url: `/facilities/restaurant/my-bookings?userId=${encodeURIComponent(userId)}`,
      method: 'GET',
    })
      .then((res) => {
        const list = res.list || [];
        this.setData({
          list,
          loading: false,
          empty: list.length === 0,
        });
      })
      .catch(() => {
        this.setData({ loading: false, empty: true });
      });
  },
});
