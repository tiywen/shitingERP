import { useState, useEffect, useCallback } from 'react';
import { fetchList, update } from '../api';

const TYPE_NAMES = {
  heating: '开关地暖',
  ventilation: '开关门窗通风',
  repair: '报修',
  delivery: '快递取送',
  other: '其它需求',
};

const STATUS_OPTIONS = [
  { value: 'submitted', label: '已提交' },
  { value: 'in_progress', label: '处理中' },
  { value: 'completed', label: '已完成' },
];

export default function WorkOrdersPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [editRemark, setEditRemark] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchList('workOrder');
      setList(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const handleStatusChange = async (row, newStatus) => {
    try {
      await update('workOrder', row.id, { status: newStatus });
      setEditRow(null);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleRemarkSave = async (row) => {
    try {
      await update('workOrder', row.id, { adminRemark: editRemark });
      setEditRow(null);
      setEditRemark('');
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>加载中...</div>;
  if (error) return <div style={{ padding: 24, color: '#f5222d' }}>{error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>工单管理</h1>
        <span style={{ fontSize: 12, color: '#999' }}>每 5 秒自动刷新</span>
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>类型</th>
              <th style={styles.th}>房间种类</th>
              <th style={styles.th}>服务要求</th>
              <th style={styles.th}>状态</th>
              <th style={styles.th}>管理备注</th>
              <th style={styles.th}>时间</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td style={styles.td}>{row.id}</td>
                <td style={styles.td}>{TYPE_NAMES[row.type] || row.type}</td>
                <td style={styles.td}>{row.roomKind || '-'}</td>
                <td style={styles.td}>{row.content || '-'}</td>
                <td style={styles.td}>
                  {editRow?.id === row.id && editRow?.field === 'status' ? (
                    <select
                      value={editRow.status}
                      onChange={(e) => handleStatusChange(row, e.target.value)}
                      onBlur={() => setEditRow(null)}
                      autoFocus
                      style={{ padding: 4 }}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span
                      onClick={() => setEditRow({ ...row, field: 'status' })}
                      style={{ cursor: 'pointer', color: '#1a5f4a' }}
                      title="点击编辑状态"
                    >
                      {STATUS_OPTIONS.find((o) => o.value === row.status)?.label || row.status}
                    </span>
                  )}
                </td>
                <td style={styles.td}>
                  {editRow?.id === row.id && editRow?.field === 'remark' ? (
                    <div>
                      <textarea
                        value={editRemark}
                        onChange={(e) => setEditRemark(e.target.value)}
                        placeholder="如：x月x日已处理；遇到xx问题等"
                        rows={2}
                        style={{ width: '100%', padding: 4, fontSize: 12 }}
                      />
                      <button onClick={() => handleRemarkSave(row)} style={{ ...styles.btnSm, marginTop: 4 }}>保存</button>
                      <button onClick={() => { setEditRow(null); setEditRemark(''); }} style={{ ...styles.btnSm, marginTop: 4, marginLeft: 4 }}>取消</button>
                    </div>
                  ) : (
                    <span
                      onClick={() => { setEditRow({ ...row, field: 'remark' }); setEditRemark(row.adminRemark || ''); }}
                      style={{ cursor: 'pointer', color: '#1a5f4a' }}
                      title="点击添加/编辑管理备注"
                    >
                      {row.adminRemark || '点击添加'}
                    </span>
                  )}
                </td>
                <td style={styles.td}>{row.createdAt?.slice(0, 16).replace('T', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  tableWrap: { background: '#fff', borderRadius: 8, overflow: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 700 },
  th: { padding: '12px 16px', textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 500 },
  td: { padding: '12px 16px', borderBottom: '1px solid #eee', fontSize: 13 },
  btnSm: { padding: '4px 10px', fontSize: 12, background: '#1a5f4a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
};
