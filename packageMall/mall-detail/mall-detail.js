const { getProductById } = require('../../utils/mall-mock.js');

function buildSlides(product) {
  if (product.images && product.images.length > 0) {
    return product.images.map((url) => ({ url }));
  }
  return [
    { phClass: 'ph-a', phTitle: '茶', phSub: '精美礼盒装' },
    { phClass: 'ph-b', phTitle: '礼', phSub: '石亭书院出品' },
  ];
}

Page({
  data: {
    product: null,
    slides: [],
    currentSlide: 0,
  },

  onLoad(query) {
    const id = query.id || '';
    const product = getProductById(id);
    const slides = buildSlides(product);
    this.setData({ product, slides });
  },

  onSwiperChange(e) {
    this.setData({ currentSlide: e.detail.current });
  },

  onAddCartTip() {
    wx.showToast({ title: '演示版：购物车即将开放', icon: 'none' });
  },

  goBuy() {
    const { product } = this.data;
    if (!product) return;
    wx.navigateTo({
      url: `/packageMall/mall-order/mall-order?id=${encodeURIComponent(product.id)}`,
    });
  },
});
