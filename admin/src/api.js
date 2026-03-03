/**
 * 后台管理 - 与后端 /api/admin 的请求封装
 * 通过 Vite 代理转发到 VITE_API_TARGET（见 admin/.env）
 */
const BASE = '/api/admin';

export async function fetchList(model) {
  const res = await fetch(`${BASE}/${model}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '请求失败');
  return data.list;
}

/** 餐厅预约列表（仅餐厅，含用户与状态中文） */
export async function fetchRestaurantBookings() {
  const res = await fetch(`${BASE}/restaurant-bookings`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '请求失败');
  return data.list || [];
}

/** 餐厅预约设置（每餐人数上限） */
export async function fetchRestaurantSettings() {
  const res = await fetch(`${BASE}/restaurant-settings`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '请求失败');
  return data;
}

/** 更新餐厅预约每餐人数上限 */
export async function updateRestaurantSettings(body) {
  const res = await fetch(`${BASE}/restaurant-settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '更新失败');
  return data;
}

export async function fetchOne(model, id) {
  const res = await fetch(`${BASE}/${model}/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '请求失败');
  return data;
}

export async function create(model, data) {
  const res = await fetch(`${BASE}/${model}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || '创建失败');
  return result;
}

export async function update(model, id, data) {
  const res = await fetch(`${BASE}/${model}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || '更新失败');
  return result;
}

export async function importRoomTypes(rows) {
  const res = await fetch(`${BASE}/roomType/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '导入失败');
  return data;
}

export async function remove(model, id) {
  const res = await fetch(`${BASE}/${model}/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '删除失败');
  return data;
}

export async function bulkRemove(model, ids) {
  await Promise.all(ids.map((id) => remove(model, id)));
}

const UPLOADS_BASE = typeof window !== 'undefined' ? window.location.origin : '';

export function getRoomTypeImageUrl(path) {
  if (!path) return '';
  return `${UPLOADS_BASE}/uploads/${path}`;
}

export async function getRoomTypeImages(roomTypeId) {
  const res = await fetch(`${BASE}/roomType/${roomTypeId}/images`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '获取失败');
  return data.list;
}

export async function uploadRoomTypeImage(roomTypeId, file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${BASE}/roomType/${roomTypeId}/images`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '上传失败');
  return data;
}

export async function deleteRoomTypeImage(roomTypeId, imageId) {
  const res = await fetch(`${BASE}/roomType/${roomTypeId}/images/${imageId}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '删除失败');
  return data;
}
