/**
 * 我的预约 - 全部设施预约列表（含餐厅等）
 * 状态与后台同步：已提交、已确认
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
      url: `/facilities/my-bookings?userId=${encodeURIComponent(userId)}`,
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

  onCancel(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '取消预约',
      content: '确定取消该时段预约吗？取消后时段将释放。',
      success: (res) => {
        if (!res.confirm) return;
        const app = getApp();
        const userId = app.globalData?.userInfo?.userId || app.globalData?.userInfo?.id;
        if (!userId) {
          wx.showToast({ title: '请先登录', icon: 'none' });
          return;
        }
        request({
          url: '/facilities/cancel-booking',
          method: 'POST',
          data: { userId, bookingId: id },
        })
          .then(() => {
            wx.showToast({ title: '已取消', icon: 'success' });
            this.loadList();
          })
          .catch((err) => wx.showToast({ title: err.message || '取消失败', icon: 'none' }));
      },
    });
  },
});
