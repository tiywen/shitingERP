/**
 * 石亭ERP 小程序 - 全局配置
 *
 * 【重要】微信开发者工具里「模拟器」访问的是你电脑上的 localhost，所以填 localhost 可以通。
 * 【真机调试 / 真机预览】手机上的 localhost 是手机自己，不是你的电脑，请求会失败（常见：request:fail）。
 * 真机请改为：http://你的电脑局域网IP:端口/api
 *   例：http://192.168.1.8:3000/api（在电脑 cmd 执行 ipconfig 查看 IPv4）
 * 端口须与 server 的 PORT 一致（默认 3000，见 server/.env）
 * 手机与电脑需同一 WiFi；Windows 防火墙需放行该端口。
 */
module.exports = {
  /** 后端 API 基础地址（末尾不要漏 /api） */
  // 仅模拟器可用：
  baseUrl: 'http://localhost:3000/api',
  // 真机调试时请改成（示例，IP 换成你自己的）：
  // baseUrl: 'http://192.168.1.8:3000/api',

  /** 用户角色枚举 */
  USER_ROLE: {
    OWNER: 'owner',   // 业主
    MEMBER: 'member', // 院友
    VISITOR: 'visitor', // 访客
  },

  /** 工单状态 */
  WORK_ORDER_STATUS: {
    SUBMITTED: 'submitted',   // 已提交
    IN_PROGRESS: 'in_progress', // 进行中
    COMPLETED: 'completed',   // 已完成
  },
};
