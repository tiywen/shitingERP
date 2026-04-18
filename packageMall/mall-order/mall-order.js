const { getProductById } = require('../../utils/mall-mock.js');

Page({
  data: {
    product: null,
    qty: 1,
    total: 0,
    receiverName: '',
    receiverPhone: '',
    address: '',
    remark: '',
  },

  onLoad(query) {
    const id = query.id || '';
    const product = getProductById(id);
    const qty = 1;
    this.setData({
      product,
      qty,
      total: this._calcTotal(product, qty),
    });
  },

  _calcTotal(product, qty) {
    if (!product) return 0;
    return (Number(product.price) || 0) * (qty || 1);
  },

  decQty() {
    const { qty, product } = this.data;
    if (qty <= 1) return;
    const n = qty - 1;
    this.setData({ qty: n, total: this._calcTotal(product, n) });
  },

  incQty() {
    const { qty, product } = this.data;
    if (qty >= 99) return;
    const n = qty + 1;
    this.setData({ qty: n, total: this._calcTotal(product, n) });
  },

  onNameInput(e) {
    this.setData({ receiverName: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ receiverPhone: e.detail.value });
  },

  onAddrInput(e) {
    this.setData({ address: e.detail.value });
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value });
  },

  onSubmit() {
    const { product, qty, receiverName, receiverPhone } = this.data;
    if (!product) return;
    if (!receiverName || !receiverName.trim()) {
      wx.showToast({ title: '请填写收货人', icon: 'none' });
      return;
    }
    if (!receiverPhone || !receiverPhone.trim()) {
      wx.showToast({ title: '请填写手机号', icon: 'none' });
      return;
    }
    if (!/^\d{11}$/.test(receiverPhone.trim())) {
      wx.showToast({ title: '请输入11位手机号', icon: 'none' });
      return;
    }
    const total = this._calcTotal(product, qty);
    wx.showModal({
      title: '订单已提交（演示）',
      content: `${product.name} × ${qty}，合计 ¥${total}。暂未对接支付，工作人员将稍后与您联系确认。`,
      showCancel: false,
      confirmText: '知道了',
      success: () => {
        wx.navigateBack({ delta: 2 });
      },
    });
  },
});
