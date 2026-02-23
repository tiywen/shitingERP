import { useState, useEffect, useCallback } from 'react';
import { fetchList, update } from '../api';

const STATUS_MAP = {
  pending: '待确认',
  confirmed: '已确认',
  checked_in: '已入住',
  checked_out: '已离店',
  cancelled: '已取消',
};

const STATUS_OPTIONS = [
  { value: 'pending', label: '待确认' },
  { value: 'confirmed', label: '已确认' },
  { value: 'checked_in', label: '已入住' },
  { value: 'checked_out', label: '已离店' },
  { value: 'cancelled', label: '已取消' },
];

export default function OrdersPage() {
  const [list, setList] = useState([]);
  const [editRow, setEditRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchList('order');
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

  // 实时刷新：每 5 秒拉取一次
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const handleStatusChange = async (row, newStatus) => {
    try {
      await update('order', row.id, { status: newStatus });
      setEditRow(null);
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
        <h1 style={{ margin: 0 }}>订单管理</h1>
        <span style={{ fontSize: 12, color: '#999' }}>每 5 秒自动刷新</span>
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>房型</th>
              <th style={styles.th}>住客</th>
              <th style={styles.th}>入住</th>
              <th style={styles.th}>离店</th>
              <th style={styles.th}>晚数</th>
              <th style={styles.th}>金额</th>
              <th style={styles.th}>状态</th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td style={styles.td}>{row.id}</td>
                <td style={styles.td}>{row.roomType?.name || '-'}</td>
                <td style={styles.td}>{row.guestName} / {row.guestPhone}</td>
                <td style={styles.td}>{row.checkinDate?.slice(0, 10)}</td>
                <td style={styles.td}>{row.checkoutDate?.slice(0, 10)}</td>
                <td style={styles.td}>{row.nights}</td>
                <td style={styles.td}>¥{row.totalAmount}</td>
                <td style={styles.td}>
                  {editRow?.id === row.id ? (
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
                      onClick={() => setEditRow(row)}
                      style={{ cursor: 'pointer', color: '#1a5f4a' }}
                      title="点击编辑状态"
                    >
                      {STATUS_MAP[row.status] || row.status}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  tableWrap: { background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: { padding: '12px 16px', textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 500 },
  td: { padding: '12px 16px', borderBottom: '1px solid #eee' },
};
