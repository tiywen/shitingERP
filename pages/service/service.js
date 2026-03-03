/**
 * 服务页 - 入住服务、工单服务、石亭设施
 */

const app = getApp();

Page({
  data: {
    hasActiveOrder: false, // TODO: 从接口获取
    workOrderTypes: [
      { id: 'heating', name: '开关地暖', icon: '♨' },
      { id: 'ventilation', name: '开关门窗通风', icon: '🌬' },
      { id: 'repair', name: '报修', icon: '🔧' },
      { id: 'delivery', name: '快递取送', icon: '📦' },
      { id: 'other', name: '其它需求', icon: '📋' },
    ],
    facilities: [
      { id: 'parking', name: '停车场', type: 'static' },
      { id: 'restaurant', name: '餐厅预约', type: 'booking' },
      { id: 'ktv', name: 'K歌房预约', type: 'booking' },
      { id: 'laundry', name: '洗衣房', type: 'static' },
      { id: 'pickleball', name: '匹克球场预约', type: 'booking' },
    ],
  },

  onLoad() {
    this._setTabBarSelected(1);
  },

  onShow() {
    this._setTabBarSelected(1);
  },

  _setTabBarSelected(index) {
    const tabBar = this.getTabBar?.();
    if (tabBar) tabBar.setData({ selected: index });
  },

  /** 入住服务入口 */
  goCheckIn() {
    if (this.data.hasActiveOrder) {
      wx.navigateTo({ url: '/packageService/checkin/checkin' });
    } else {
      wx.navigateTo({ url: '/packageService/checkin-tutorial/checkin-tutorial' });
    }
  },

  /** 生活服务 */
  goWorkOrder(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/packageService/work-order/work-order?type=${id}`,
    });
  },

  /** 石亭设施 */
  goFacility(e) {
    const { id, type } = e.currentTarget.dataset;
    if (id === 'restaurant') {
      wx.navigateTo({ url: '/packageService/restaurant/restaurant' });
      return;
    }
    if (type === 'static') {
      wx.navigateTo({ url: `/packageService/facility-detail/facility-detail?id=${id}` });
    } else {
      wx.navigateTo({ url: `/packageService/facility-booking/facility-booking?id=${id}` });
    }
  },
});
