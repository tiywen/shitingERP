import { useState, useEffect, useCallback } from 'react';
import { fetchRestaurantBookings, fetchRestaurantSettings, updateRestaurantSettings, update } from '../api';

const STATUS_OPTIONS = [
  { value: 'pending', label: '已提交' },
  { value: 'confirmed', label: '已确认' },
  { value: 'cancelled', label: '已取消' },
];

const tableWrap = { background: '#fff', borderRadius: 8, overflow: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };
const table = { width: '100%', borderCollapse: 'collapse', minWidth: 800 };
const th = { padding: '12px 16px', textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 500 };
const td = { padding: '12px 16px', borderBottom: '1px solid #eee' };
const btn = { padding: '6px 12px', fontSize: 12, background: '#1a5f4a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', marginRight: 8 };
const select = { padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', minWidth: 100 };
const input = { padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', width: 80 };

export default function RestaurantBookingsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [capacityPerMeal, setCapacityPerMeal] = useState(40);
  const [capacityInput, setCapacityInput] = useState('40');
  const [savingCapacity, setSavingCapacity] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchRestaurantBookings();
      setList(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await fetchRestaurantSettings();
      const cap = data.capacityPerMeal ?? 40;
      setCapacityPerMeal(cap);
      setCapacityInput(String(cap));
    } catch (e) {
      setCapacityPerMeal(40);
      setCapacityInput('40');
    }
  }, []);

  useEffect(() => {
    load();
    loadSettings();
  }, [load, loadSettings]);

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

  const handleSaveCapacity = async () => {
    const num = parseInt(capacityInput, 10);
    if (isNaN(num) || num < 1 || num > 999) {
      alert('请输入 1～999 的整数');
      return;
    }
    setSavingCapacity(true);
    try {
      await updateRestaurantSettings({ capacityPerMeal: num });
      setCapacityPerMeal(num);
      setCapacityInput(String(num));
      alert('已保存');
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingCapacity(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>加载中...</div>;
  if (error) return <div style={{ padding: 24, color: '#f5222d' }}>{error}</div>;

  return (
    <div>
      <h1 style={{ marginBottom: 16 }}>餐厅预约</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        用户提交后显示「已提交」；管理员可将状态改为「已确认」或「已取消」，用户端「我的预约」会同步显示。
      </p>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <label>每餐人数上限：</label>
        <input
          type="number"
          min={1}
          max={999}
          value={capacityInput}
          onChange={(e) => setCapacityInput(e.target.value)}
          style={input}
        />
        <button onClick={handleSaveCapacity} disabled={savingCapacity} style={btn}>
          {savingCapacity ? '保存中...' : '保存'}
        </button>
        <span style={{ color: '#999', fontSize: 12 }}>（当前生效：{capacityPerMeal} 人）</span>
      </div>
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>用户</th>
              <th style={th}>手机号</th>
              <th style={th}>预约日期</th>
              <th style={th}>餐次</th>
              <th style={th}>类型</th>
              <th style={th}>人数</th>
              <th style={th}>时间段</th>
              <th style={th}>状态</th>
              <th style={th}>备注</th>
              <th style={th}>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ ...td, textAlign: 'center', color: '#999' }}>暂无餐厅预约</td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.id}>
                  <td style={td}>{row.id}</td>
                  <td style={td}>{row.userName}</td>
                  <td style={td}>{row.userPhone || '-'}</td>
                  <td style={td}>{row.bookingDate}</td>
                  <td style={td}>{row.mealLabel}</td>
                  <td style={td}>{row.bookingTypeLabel}</td>
                  <td style={td}>{row.headcount ?? '-'}</td>
                  <td style={td}>{row.timeSlot}</td>
                  <td style={td}>{row.statusLabel}</td>
                  <td style={td}>{row.remark || '-'}</td>
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
