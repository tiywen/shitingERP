import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchList, create, update, remove, bulkRemove } from '../api';

const HIDDEN = ['createdAt', 'updatedAt', 'roomType', 'user', 'order', 'facility', 'owner', 'members'];

/** 英文字段名 -> 中文表头 */
const FIELD_LABELS = {
  id: 'ID',
  openid: '微信OpenID',
  nickname: '微信昵称',
  role: '角色',
  name: '姓名',
  phone: '手机号',
  ownerCode: '业主编号',
  houseNumber: '户号',
  memberCode: '会员编号',
  ownerId: '关联业主',
  visitorCode: '游客编号',
  bedType: '床型',
  maxOccupancy: '可住人数',
  price: '原价/晚',
  discountPrice: '折扣价/晚',
  roomNo: '房号',
  typeName: '房型',
  roomName: '客房名称',
  memberWeekdayPrice: '会员平日价',
  memberWeekendPrice: '会员假日价',
  platformWeekdayPrice: '平台平日价',
  platformWeekendPrice: '平台假日价',
  specialHolidayPrice: '特殊节假日',
  platformPromoWeekday: '平台推广平日价',
  platformPromoWeekend: '平台推广假日价',
  originalPrice: '原价',
  descriptionZh: '房型说明(中)',
  descriptionEn: '房型说明(英)',
  roomTypeId: '房型ID',
  images: '房型图',
  userId: '用户ID',
  checkinDate: '入住日期',
  checkoutDate: '离店日期',
  nights: '晚数',
  pricePerNight: '每晚价格',
  totalAmount: '总金额',
  guestName: '住客姓名',
  guestPhone: '住客电话',
  arriveTime: '预计到店时间',
  remark: '备注',
  status: '状态',
  roomId: '房间ID',
  type: '类型',
  roomKind: '房间种类',
  content: '服务要求',
  adminRemark: '管理备注',
  description: '描述',
  facilityId: '设施ID',
  bookingDate: '预约日期',
  timeSlot: '时间段',
  orderId: '订单ID',
  amount: '金额',
  serialNo: '序号',
  category: '资产类别',
  name: '资产名称',
  specification: '规格型号',
  quantity: '数量',
  unit: '单位',
  price: '价格',
  purchaseTime: '采购时间',
  serviceLife: '使用年限',
  usageStatus: '使用情况',
  productSerialNo: '产品序列号',
  productAppearance: '产品外观',
  storageLocation: '存放地点',
  dailyManager: '日常管理人',
  remark: '备注',
};

function getLabel(key) {
  return FIELD_LABELS[key] ?? key;
}

function formatVal(v) {
  if (v == null) return '';
  if (typeof v === 'object' && v?.constructor?.name === 'Object') return JSON.stringify(v);
  if (typeof v === 'string' && v.length > 10 && v.match(/^\d{4}-\d{2}-\d{2}/)) return v.slice(0, 10);
  return String(v);
}

function compare(a, b, key) {
  let va = a[key];
  let vb = b[key];
  const numA = typeof va === 'number' ? va : Number(va);
  const numB = typeof vb === 'number' ? vb : Number(vb);
  if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
  const strA = va == null ? '' : String(va);
  const strB = vb == null ? '' : String(vb);
  const dateLike = (s) => /^\d{4}-\d{2}-\d{2}/.test(s);
  if (dateLike(strA) && dateLike(strB)) return strA.slice(0, 10).localeCompare(strB.slice(0, 10));
  return strA.localeCompare(strB, undefined, { numeric: true });
}

export default function TablePage({ model, title, extraActions, hiddenCols = [], multiSelect = false, extraColumns = [], filterConfig = [], createButtonLabel = '+ 新建', requiredFields = [], renderFormExtra }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterValues, setFilterValues] = useState(() => {
    const o = {};
    filterConfig.forEach((k) => { o[k] = ''; });
    return o;
  });

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchList(model);
      setList(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [model]);

  useEffect(() => {
    load();
  }, [load]);

  const allCols = list.length ? Object.keys(list[0]).filter((k) => !HIDDEN.includes(k)) : [];
  const cols = allCols.filter((k) => !hiddenCols.includes(k));
  const formCols = allCols.filter((k) => !hiddenCols.includes(k) && !extraColumns.some((ec) => ec.key === k));

  const filterOptions = useMemo(() => {
    const opts = {};
    filterConfig.forEach((key) => {
      const values = new Set();
      list.forEach((row) => {
        const v = row[key];
        if (v != null && String(v).trim() !== '') values.add(String(v).trim());
      });
      opts[key] = [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
    return opts;
  }, [list, filterConfig]);

  const displayedList = useMemo(() => {
    let result = list;
    if (filterConfig.length > 0 && list.length > 0) {
      result = list.filter((row) => {
        for (const key of filterConfig) {
          const fv = filterValues[key];
          if (fv === '') continue;
          const cell = row[key];
          const cellStr = cell != null ? String(cell).trim() : '';
          if (cellStr !== fv) return false;
        }
        return true;
      });
    }
    if (sortBy && result.length > 0) {
      result = [...result].sort((a, b) => {
        const diff = compare(a, b, sortBy);
        return sortOrder === 'asc' ? diff : -diff;
      });
    }
    return result;
  }, [list, filterConfig, filterValues, sortBy, sortOrder]);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  const openEdit = (row) => {
    setEditing(row?.id || 'new');
    const f = { ...row };
    delete f.id;
    if (row?.roomType) f.roomTypeId = row.roomTypeId ?? row.roomType?.id;
    if (row?.user) f.userId = row.userId ?? row.user?.id;
    if (row?.facility) f.facilityId = row.facilityId ?? row.facility?.id;
    if (row?.order) f.orderId = row.orderId ?? row.order?.id;
    if (row?.room) f.roomId = row.roomId ?? row.room?.id;
    setForm(f);
  };

  const closeEdit = () => {
    setEditing(null);
    setForm({});
  };

  const handleSave = async () => {
    try {
      if (editing === 'new') {
        const result = await create(model, form);
        if (renderFormExtra && result && result.id != null) {
          setEditing(result.id);
          setForm({ ...result, id: undefined });
          setList((prev) => [{ ...result }, ...prev]);
          return;
        }
      } else {
        await update(model, editing, form);
      }
      closeEdit();
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除？')) return;
    try {
      await remove(model, id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayedList.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayedList.map((r) => r.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      alert('请先选择要删除的项');
      return;
    }
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条？`)) return;
    try {
      await bulkRemove(model, [...selectedIds]);
      setSelectedIds(new Set());
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>加载中...</div>;
  if (error) return <div style={{ padding: 24, color: '#f5222d' }}>{error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {extraActions}
          {multiSelect && selectedIds.size > 0 && (
            <button onClick={handleBulkDelete} style={{ ...styles.btn, background: '#f5222d' }}>
              批量删除 ({selectedIds.size})
            </button>
          )}
          <button onClick={() => openEdit(null)} style={styles.btn}>{createButtonLabel}</button>
        </div>
      </div>

      {filterConfig.length > 0 && (
        <div style={styles.filterRow}>
          {filterConfig.map((key) => (
            <label key={key} style={styles.filterItem}>
              <span style={styles.filterLabel}>{getLabel(key)}：</span>
              <select
                value={filterValues[key] ?? ''}
                onChange={(e) => setFilterValues((prev) => ({ ...prev, [key]: e.target.value }))}
                style={styles.filterSelect}
              >
                <option value="">全部</option>
                {(filterOptions[key] || []).map((val) => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {multiSelect && (
                <th style={{ ...styles.th, width: 48 }}>
                  <input type="checkbox" checked={displayedList.length > 0 && selectedIds.size === displayedList.length} onChange={toggleSelectAll} />
                </th>
              )}
              {cols.map((c) => (
                <th
                  key={c}
                  style={{ ...styles.th, ...styles.thSort }}
                  onClick={() => handleSort(c)}
                  title="点击按该列排序"
                >
                  {getLabel(c)}
                  {sortBy === c && <span style={styles.sortIcon}>{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>}
                </th>
              ))}
              {extraColumns.map((ec) => (
                <th key={ec.key} style={styles.th}>{ec.label}</th>
              ))}
              <th style={{ ...styles.th, width: 120 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {displayedList.map((row) => (
              <tr key={row.id}>
                {multiSelect && (
                  <td style={styles.td}>
                    <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} />
                  </td>
                )}
                {cols.map((c) => (
                  <td key={c} style={styles.td}>{formatVal(row[c])}</td>
                ))}
                {extraColumns.map((ec) => (
                  <td key={ec.key} style={styles.td}>{ec.render ? ec.render(row, load) : formatVal(row[ec.key])}</td>
                ))}
                <td style={styles.td}>
                  <button onClick={() => openEdit(row)} style={styles.btnSm}>编辑</button>
                  <button onClick={() => handleDelete(row.id)} style={{ ...styles.btnSm, marginLeft: 8, color: '#f5222d' }}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h3 style={{ marginTop: 0 }}>{editing === 'new' ? '新建' : '编辑'}</h3>
            <div style={styles.form}>
              {formCols.filter((c) => c !== 'id').map((k) => (
                <div key={k} style={styles.field}>
                  <label>
                    {getLabel(k)}
                    {requiredFields.includes(k) && <span style={{ color: '#f5222d', marginLeft: 4 }}>*</span>}
                  </label>
                  <input
                    value={form[k] ?? ''}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    style={styles.input}
                  />
                </div>
              ))}
            </div>
            {renderFormExtra && renderFormExtra({
              isNew: editing === 'new',
              editingId: editing === 'new' ? null : editing,
              form,
              closeEdit,
              load,
            })}
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button onClick={handleSave} style={styles.btn}>保存</button>
              <button onClick={closeEdit} style={{ ...styles.btn, background: '#999' }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  tableWrap: { background: '#fff', borderRadius: 8, overflow: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 600 },
  th: { padding: '12px 16px', textAlign: 'left', background: '#fafafa', borderBottom: '1px solid #eee', fontWeight: 500 },
  thSort: { cursor: 'pointer', userSelect: 'none' },
  sortIcon: { marginLeft: 4, color: '#1a5f4a', fontSize: 12 },
  td: { padding: '12px 16px', borderBottom: '1px solid #eee' },
  btn: { padding: '8px 16px', background: '#1a5f4a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  btnSm: { padding: '4px 10px', fontSize: 12, background: 'transparent', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: '#fff', padding: 24, borderRadius: 8, minWidth: 400, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  input: { padding: 8, border: '1px solid #ddd', borderRadius: 4 },
  filterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
    marginBottom: 12,
    padding: '12px 16px',
    background: '#fafafa',
    borderRadius: 8,
    border: '1px solid #eee',
  },
  filterItem: { display: 'flex', alignItems: 'center', gap: 6 },
  filterLabel: { fontSize: 14, color: '#333' },
  filterSelect: { padding: '6px 10px', borderRadius: 4, border: '1px solid #ddd', minWidth: 120 },
};
