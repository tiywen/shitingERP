/**
 * 封装 wx.request 网络请求
 */

const config = require('../config/index');

/**
 * 发起请求
 * @param {Object} options 请求配置
 * @param {string} options.url 接口路径（相对 baseUrl）
 * @param {string} [options.method='GET'] 请求方法
 * @param {Object} [options.data] 请求参数
 * @param {Object} [options.header] 请求头
 */
function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: config.baseUrl + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': 'application/json',
        ...options.header,
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error(res.data?.message || '请求失败'));
        }
      },
      fail(err) {
        reject(err);
      },
    });
  });
}

module.exports = { request };
