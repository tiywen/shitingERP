import { useState, useEffect, useCallback } from 'react';
import { fetchPickleballBookings, update } from '../api';

const STATUS_OPTIONS = [
  { value: 'confirmed', label: '已预约' },
  { value: 'cancelled', label: '已取消' },
];

const tableWrap = { background: '#fff', borderRadius: 8, overflow: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const table = { width: '100%', borderCollapse: 'collapse', minWidth: 600 };
const th = { padding: '12px 16px', textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 500 };
const td = { padding: '12px 16px', borderBottom: '1px solid #eee' };
const select = { padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', minWidth: 100 };

export default function PickleballBookingsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchPickleballBookings();
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

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await update('facilityBooking', id, { status: newStatus });
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>加载中...</div>;
  if (error) return <div style={{ padding: 24, color: '#f5222d' }}>{error}</div>;

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>匹克球场预约</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        仅两个状态：已预约、已取消。用户取消后此处显示已取消，时段将释放可再次预约。
      </p>
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>用户</th>
              <th style={th}>手机号</th>
              <th style={th}>预约日期</th>
              <th style={th}>时段</th>
              <th style={th}>状态</th>
              <th style={th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ ...td, textAlign: 'center', color: '#999' }}>暂无球场预约</td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.id}>
                  <td style={td}>{row.id}</td>
                  <td style={td}>{row.userName}</td>
                  <td style={td}>{row.userPhone || '-'}</td>
                  <td style={td}>{row.bookingDate}</td>
                  <td style={td}>{row.timeSlot}</td>
                  <td style={td}>{row.statusLabel}</td>
                  <td style={td}>
                    <select
                      style={select}
                      value={row.status}
                      disabled={updatingId === row.id}
                      onChange={(e) => handleStatusChange(row.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {updatingId === row.id && <span style={{ fontSize: 12, color: '#999' }}> 保存中...</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
