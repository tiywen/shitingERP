/**
 * 生活服务 - 工单提交
 * 自动填入用户名称、关联房屋；房间种类、服务要求
 */

const app = getApp();
const { request } = require('../../utils/request');

const TYPE_NAMES = {
  heating: '开关地暖',
  ventilation: '开关门窗通风',
  repair: '报修',
  delivery: '快递取送',
  other: '其它需求',
};

/** 房间种类提示（按服务类型） */
const ROOM_KIND_PLACEHOLDERS = {
  heating: '如：客厅、一楼卧室、二楼卧室',
  ventilation: '如：客厅、主卧、阳台',
  repair: '如：卫生间、厨房、二楼卧室',
  delivery: '如：前台代收、房间号',
  other: '如：客厅、一楼卧室',
};

/** 服务要求提示（按服务类型） */
const CONTENT_PLACEHOLDERS = {
  heating: '请说明需要开启或关闭地暖、设定温度等',
  ventilation: '如：打开窗户通风、关闭阳台门等',
  repair: '如：有漏水请尽快维修、灯泡坏了等',
  delivery: '如：有快递需要帮忙取送到房间',
  other: '请详细描述您的需求',
};

Page({
  data: {
    type: '',
    typeName: '',
    roomKindPlaceholder: '',
    contentPlaceholder: '',
    userName: '',
    linkedRooms: [],
    selectedRoomIndex: 0,
    roomKind: '',
    content: '',
  },

  onLoad(options) {
    const type = options.type || 'other';
    const typeName = TYPE_NAMES[type] || '其它需求';
    this._fillUserInfo();
    this.setData({
      type,
      typeName,
      roomKindPlaceholder: ROOM_KIND_PLACEHOLDERS[type] || ROOM_KIND_PLACEHOLDERS.other,
      contentPlaceholder: CONTENT_PLACEHOLDERS[type] || CONTENT_PLACEHOLDERS.other,
    });
    wx.setNavigationBarTitle({ title: typeName });
  },

  onShow() {
    // 每次显示时刷新用户信息，避免登录完成前打开页面导致显示未登录
    this._fillUserInfo();
  },

  /** 自动填入用户名称和关联房屋 */
  _fillUserInfo() {
    const userInfo = app.globalData?.userInfo || {};
    const isLoggedIn = app.globalData?.isLoggedIn ?? false;
    const userName = userInfo.name || userInfo.phone || (isLoggedIn ? '已登录' : '');

    // 关联房屋：业主有 houseNumber，院友关联业主的房屋；暂时用 mock
    let linkedRooms = [];
    if (userInfo.houseNumber) {
      linkedRooms = [{ id: 1, label: userInfo.houseNumber }];
    }
    if (userInfo.linkedHouseNumbers && userInfo.linkedHouseNumbers.length > 0) {
      linkedRooms = userInfo.linkedHouseNumbers.map((h, i) => ({ id: i + 1, label: h }));
    }
    if (linkedRooms.length === 0) {
      linkedRooms = [{ id: 0, label: '暂无关联房屋' }];
    }

    this.setData({
      userName,
      linkedRooms,
      selectedRoomIndex: 0,
    });
  },

  onRoomKindInput(e) {
    this.setData({ roomKind: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  onRoomPickerChange(e) {
    this.setData({ selectedRoomIndex: Number(e.detail.value) });
  },

  submit() {
    const { type, content, roomKind, linkedRooms, selectedRoomIndex } = this.data;
    if (!content || !content.trim()) {
      wx.showToast({ title: '请填写服务要求', icon: 'none' });
      return;
    }

    const app = getApp();
    const userId = app.globalData?.userInfo?.userId || app.globalData?.userInfo?.id;
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const roomId = linkedRooms[selectedRoomIndex]?.id && linkedRooms[selectedRoomIndex].id > 0
      ? linkedRooms[selectedRoomIndex].id
      : null;

    wx.showLoading({ title: '提交中' });
    request({
      url: '/work-orders',
      method: 'POST',
      data: {
        userId,
        roomId,
        type,
        roomKind: roomKind?.trim() || undefined,
        content: content.trim(),
      },
    })
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: '提交成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({ title: err.message || '提交失败', icon: 'none' });
      });
  },
});
