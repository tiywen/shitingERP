const { PRODUCTS } = require('../../utils/mall-mock.js');

Page({
  data: {
    products: PRODUCTS,
  },

  onTapProduct(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/packageMall/mall-detail/mall-detail?id=${encodeURIComponent(id)}`,
    });
  },
});
