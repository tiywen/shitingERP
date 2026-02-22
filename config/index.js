/**
 * 石亭ERP - 全局配置
 */

module.exports = {
  /** API 基础地址（后续接入真实后端时配置） */
  baseUrl: 'http://localhost:3000/api',

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
