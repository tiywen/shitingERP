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
    const method = (options.method || 'GET').toUpperCase();
    const data = options.data;
    const sendData = method === 'GET' ? (data && Object.keys(data).length > 0 ? data : undefined) : (data || {});
    wx.request({
      url: config.baseUrl + options.url,
      method: method,
      data: sendData !== undefined ? sendData : {},
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
        const errMsg = err && (err.errMsg || err.message);
        let msg = errMsg || '网络请求失败';
        if (/fail|timeout|abort/i.test(String(msg)) && config.baseUrl && /localhost|127\.0\.0\.1/.test(config.baseUrl)) {
          msg += '。真机无法访问本机 localhost，请在 config/index.js 将 baseUrl 改为电脑局域网 IP（与 server 端口一致）';
        }
        reject(new Error(msg));
      },
    });
  });
}

module.exports = { request };
