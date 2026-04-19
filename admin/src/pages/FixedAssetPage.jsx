import { useState, useRef, useEffect } from 'react';
import {
  importFixedAssets,
  getFixedAssetImages,
  getUploadUrl,
  uploadFixedAssetImage,
  deleteFixedAssetImage,
} from '../api';
import TablePage from './TablePage';

const REQUIRED_HEADERS = ['序号', '资产类别', '资产名称', '规格型号', '数量', '单位', '价格', '采购时间', '使用年限', '使用情况', '产品序列号', '产品外观', '存放地点', '日常管理人', '备注'];
const IMAGES_MAX = 10;
const FIXED_ASSET_REQUIRED_FIELDS = ['serialNo', 'category', 'name', 'quantity', 'unit', 'price', 'purchaseTime', 'serviceLife', 'usageStatus', 'storageLocation', 'dailyManager'];

function FixedAssetFormExtra({ isNew, editingId, load }) {
  const [imgs, setImgs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!editingId) { setImgs([]); return; }
    getFixedAssetImages(editingId).then(setImgs).catch(() => setImgs([]));
  }, [editingId]);
  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingId) return;
    if (!/\.(png|jpg|jpeg)$/i.test(file.name)) { alert('仅支持 PNG/JPG 图片'); return; }
    if (imgs.length >= IMAGES_MAX) { alert(`每条资产最多上传 ${IMAGES_MAX} 张图片`); return; }
    setUploading(true);
    try {
      await uploadFixedAssetImage(editingId, file);
      setImgs(await getFixedAssetImages(editingId));
      load();
    } catch (err) { alert(err.message); } finally { setUploading(false); e.target.value = ''; }
  };
  const onDel = async (imageId) => {
    if (!editingId || !confirm('确定删除该图片？')) return;
    try {
      await deleteFixedAssetImage(editingId, imageId);
      setImgs(await getFixedAssetImages(editingId));
      load();
    } catch (err) { alert(err.message); }
  };
  if (isNew) return <p style={{ fontSize: 13, color: '#666', marginTop: 12 }}>保存后可在此上传产品外观图片（选填）</p>;
  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee' }}>
      <p style={{ fontWeight: 500, marginBottom: 8 }}>产品外观（选填）</p>
      <p style={{ fontSize: 12, color: '#666', margin: '0 0 8px 0' }}>支持 PNG/JPG，最多 {IMAGES_MAX} 张</p>
      <div style={formExtraStyles.imageList}>
        {imgs.map((img) => (
          <div key={img.id} style={formExtraStyles.imageItem}>
            <img src={img.url || getUploadUrl(img.path)} alt="" style={formExtraStyles.imageThumb} onError={(e) => { e.target.style.display = 'none'; }} />
            <button type="button" style={formExtraStyles.delImgBtn} onClick={() => onDel(img.id)}>删除</button>
          </div>
        ))}
        {imgs.length < IMAGES_MAX && (
          <div style={formExtraStyles.uploadArea} onClick={() => ref.current?.click()}>{uploading ? '上传中...' : '+ 上传'}</div>
        )}
      </div>
      <input ref={ref} type="file" accept=".png,.jpg,.jpeg" style={{ display: 'none' }} onChange={onUpload} />
    </div>
  );
}

const formExtraStyles = {
  imageList: { display: 'flex', flexWrap: 'wrap', gap: 12 },
  imageItem: { width: 100, textAlign: 'center' },
  imageThumb: { width: 100, height: 80, objectFit: 'cover', borderRadius: 6, display: 'block' },
  delImgBtn: { marginTop: 4, padding: '2px 8px', fontSize: 12, color: '#f5222d', background: 'transparent', border: '1px solid #f5222d', borderRadius: 4, cursor: 'pointer' },
  uploadArea: { width: 100, height: 80, border: '1px dashed #ddd', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#999', cursor: 'pointer' },
};

export default function FixedAssetPage() {
  const fileRef = useRef(null);
  const uploadImageRef = useRef(null);
  /** 导入成功后递增，强制 TablePage 重新拉列表（避免 location.reload 在 dev/公网下白屏） */
  const [tableKey, setTableKey] = useState(0);
  const [imageModalRow, setImageModalRow] = useState(null);
  const [modalImages, setModalImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const xlsxMod = await import('xlsx');
      const XLSX = xlsxMod.default && xlsxMod.default.read ? xlsxMod.default : xlsxMod;
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (rows.length < 2) {
        alert('Excel 至少需要表头和一行数据');
        e.target.value = '';
        return;
      }

      const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
      const rawHeaders = rows[0].map((h) => norm(h)).filter(Boolean);
      const requiredNorm = REQUIRED_HEADERS.map(norm);
      const missing = requiredNorm.filter((h) => !rawHeaders.includes(h));
      if (missing.length) {
        alert(`表头与规定不一致，缺少：${missing.join('、')}`);
        e.target.value = '';
        return;
      }

      const dataRows = rows.slice(1).filter((r) => r.some((c) => c != null && String(c).trim() !== ''));
      const excelSerialToYmd = (n) => {
        if (typeof n !== 'number' || n < 1) return null;
        const d = new Date((n - 25569) * 86400 * 1000);
        return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
      };
      const result = dataRows.map((row) => {
        const obj = {};
        rows[0].forEach((h, i) => {
          const key = rows[0][i];
          if (key === undefined || key === null) return;
          const v = row[i];
          if (v == null) {
            obj[key] = '';
            return;
          }
          if (typeof v === 'number') {
            const keyNorm = String(key).replace(/\s+/g, ' ').trim();
            if (keyNorm === '采购时间') {
              const ymd = excelSerialToYmd(v);
              obj[key] = ymd != null ? ymd : String(v);
            } else {
              obj[key] = v;
            }
            return;
          }
          if (v instanceof Date) {
            obj[key] = v.toISOString().slice(0, 10);
            return;
          }
          obj[key] = String(v).trim();
        });
        return obj;
      });

      if (result.length === 0) {
        alert('没有可导入的数据行');
        e.target.value = '';
        return;
      }

      const res = await importFixedAssets(result);
      alert(res.message || `成功导入 ${res.created} 条`);
      setTableKey((k) => k + 1);
    } catch (err) {
      alert(err.message || '导入失败');
    } finally {
      e.target.value = '';
    }
  };

  const openImageModal = async (row) => {
    setImageModalRow(row);
    try {
      const list = await getFixedAssetImages(row.id);
      setModalImages(list || []);
    } catch (e) {
      alert(e.message);
      setModalImages([]);
    }
  };

  const closeImageModal = () => {
    setImageModalRow(null);
    setModalImages([]);
  };

  const refreshModalImages = async () => {
    if (!imageModalRow) return;
    try {
      const list = await getFixedAssetImages(imageModalRow.id);
      setModalImages(list || []);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !imageModalRow) return;
    if (!/\.(png|jpg|jpeg)$/i.test(file.name)) {
      alert('仅支持 PNG/JPG 图片');
      return;
    }
    if (modalImages.length >= IMAGES_MAX) {
      alert(`每条资产最多上传 ${IMAGES_MAX} 张图片`);
      return;
    }
    setUploading(true);
    try {
      await uploadFixedAssetImage(imageModalRow.id, file);
      await refreshModalImages();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!imageModalRow || !confirm('确定删除该图片？')) return;
    try {
      await deleteFixedAssetImage(imageModalRow.id, imageId);
      await refreshModalImages();
    } catch (err) {
      alert(err.message);
    }
  };

  const renderProductAppearance = (row) => {
    const images = row.images || [];
    const preview = images.slice(0, 3).map((img) => (
      <img
        key={img.id}
        src={getUploadUrl(img.path)}
        alt=""
        style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, marginRight: 4 }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    ));
    return (
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        {preview}
        {images.length > 3 && <span style={{ fontSize: 12, color: '#999' }}>+{images.length - 3}</span>}
        <button type="button" style={styles.manageImgBtn} onClick={() => openImageModal(row)}>
          管理
        </button>
      </div>
    );
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleImport}
      />
      <TablePage
        key={tableKey}
        model="fixedAsset"
        title="固定资产"
        multiSelect
        hiddenCols={['id', 'productAppearance', 'images']}
        filterConfig={['category', 'serviceLife', 'usageStatus', 'storageLocation']}
        createButtonLabel="登记新的固定资产"
        requiredFields={FIXED_ASSET_REQUIRED_FIELDS}
        renderFormExtra={(props) => <FixedAssetFormExtra {...props} />}
        extraColumns={[
          { key: 'productAppearance', label: '产品外观', render: renderProductAppearance },
        ]}
        extraActions={
          <button
            onClick={() => fileRef.current?.click()}
            style={styles.importBtn}
          >
            Excel 导入
          </button>
        }
      />
      <div style={styles.tip}>
        表头须与规定一致：{REQUIRED_HEADERS.join('、')}。规格型号、产品序列号、产品外观、备注可空，其余必填；产品外观在列表中点击「管理」上传图片。数量、价格、序号为数字，采购时间为日期。
      </div>

      {imageModalRow && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h3 style={{ marginTop: 0 }}>
              产品外观：{imageModalRow.name || imageModalRow.category || `资产 #${imageModalRow.id}`}
            </h3>
            <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px 0' }}>
              支持 PNG/JPG，最多 {IMAGES_MAX} 张
            </p>
            <div style={styles.imageList}>
              {modalImages.map((img) => (
                <div key={img.id} style={styles.imageItem}>
                  <img
                    src={img.url || getUploadUrl(img.path)}
                    alt=""
                    style={styles.imageThumb}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <button
                    type="button"
                    style={styles.delImgBtn}
                    onClick={() => handleDeleteImage(img.id)}
                  >
                    删除
                  </button>
                </div>
              ))}
              {modalImages.length < IMAGES_MAX && (
                <div
                  style={styles.uploadArea}
                  onClick={() => uploadImageRef.current?.click()}
                >
                  {uploading ? '上传中...' : '+ 上传'}
                </div>
              )}
            </div>
            <input
              ref={uploadImageRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              style={{ display: 'none' }}
              onChange={handleUploadImage}
            />
            <div style={{ marginTop: 16 }}>
              <button onClick={closeImageModal} style={{ ...styles.importBtn, background: '#999' }}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  importBtn: {
    padding: '8px 16px',
    background: '#1890ff',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
  },
  tip: {
    marginTop: 12,
    fontSize: 12,
    color: '#999',
  },
  modal: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalBox: {
    background: '#fff',
    padding: 24,
    borderRadius: 8,
    minWidth: 400,
    maxWidth: '90vw',
    maxHeight: '85vh',
    overflow: 'auto',
  },
  imageList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageItem: {
    width: 100,
    textAlign: 'center',
  },
  imageThumb: {
    width: 100,
    height: 80,
    objectFit: 'cover',
    borderRadius: 6,
    display: 'block',
  },
  delImgBtn: {
    marginTop: 4,
    padding: '2px 8px',
    fontSize: 12,
    color: '#f5222d',
    background: 'transparent',
    border: '1px solid #f5222d',
    borderRadius: 4,
    cursor: 'pointer',
  },
  uploadArea: {
    width: 100,
    height: 80,
    border: '1px dashed #ddd',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    color: '#999',
    cursor: 'pointer',
  },
  manageImgBtn: {
    padding: '2px 8px',
    fontSize: 12,
    background: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: 4,
    cursor: 'pointer',
  },
};
