/**
 * 石亭ERP 小程序 - 全局配置
 * 开发/真机：改为本机局域网 IP 或已部署后端地址
 */
module.exports = {
  /** 后端 API 基础地址（与后端实际地址一致） */
  baseUrl: 'http://54.179.209.48:3000/api',

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
