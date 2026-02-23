import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  fetchList,
  importRoomTypes,
  getRoomTypeImageUrl,
  getRoomTypeImages,
  uploadRoomTypeImage,
  deleteRoomTypeImage,
} from '../api';
import TablePage from './TablePage';

const IMAGES_MAX = 10;

export default function RoomTypePage() {
  const fileRef = useRef(null);
  const uploadImageRef = useRef(null);
  const navigate = useNavigate();
  const [imageModalRow, setImageModalRow] = useState(null);
  const [modalImages, setModalImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (rows.length < 2) {
        alert('Excel 至少需要表头和一行数据');
        return;
      }

      const rawHeaders = rows[0].map((h) => String(h || '').trim().replace(/\r\n/g, '\n'));
      const dataRows = rows.slice(1).filter((r) => r.some((c) => c != null && String(c).trim() !== ''));

      const result = dataRows.map((row) => {
        const obj = {};
        rawHeaders.forEach((h, i) => {
          const v = row[i];
          if (h) obj[h] = v != null ? (typeof v === 'number' ? v : String(v).trim()) : '';
        });
        return obj;
      });

      const res = await importRoomTypes(result);
      alert(res.message || `成功导入 ${res.created} 条`);
      navigate(0);
    } catch (err) {
      alert(err.message || '导入失败');
    } finally {
      e.target.value = '';
    }
  };

  const openImageModal = async (row, load) => {
    setImageModalRow(row);
    try {
      const list = await getRoomTypeImages(row.id);
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
      const list = await getRoomTypeImages(imageModalRow.id);
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
      alert(`每个房型最多上传 ${IMAGES_MAX} 张图片`);
      return;
    }
    setUploading(true);
    try {
      await uploadRoomTypeImage(imageModalRow.id, file);
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
      await deleteRoomTypeImage(imageModalRow.id, imageId);
      await refreshModalImages();
    } catch (err) {
      alert(err.message);
    }
  };

  const renderRoomTypeImages = (row, load) => {
    const images = row.images || [];
    const preview = images.slice(0, 3).map((img) => (
      <img
        key={img.id}
        src={getRoomTypeImageUrl(img.path)}
        alt=""
        style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, marginRight: 4 }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    ));
    return (
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        {preview}
        {images.length > 3 && <span style={{ fontSize: 12, color: '#999' }}>+{images.length - 3}</span>}
        <button
          type="button"
          style={styles.manageImgBtn}
          onClick={() => openImageModal(row, load)}
        >
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
        model="roomType"
        title="房型"
        hiddenCols={['id', 'name', 'bedType', 'maxOccupancy', 'price', 'discountPrice', 'images']}
        multiSelect
        extraColumns={[
          { key: 'roomTypeImages', label: '房型图', render: renderRoomTypeImages },
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
        表头需包含：房号、房型、客房名称、会员平日价 周日至周四、会员假日价 周五周六、平台平日价、平台假日价、特殊节假日、平台推广 平日价/假日价、原价、房型说明 (中/英)
      </div>

      {imageModalRow && (
        <div style={styles.modal}>
          <div style={styles.modalBox}>
            <h3 style={{ marginTop: 0 }}>
              房型图：{imageModalRow.typeName || imageModalRow.roomName || imageModalRow.name}
            </h3>
            <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px 0' }}>
              支持 PNG/JPG，最多 {IMAGES_MAX} 张
            </p>
            <div style={styles.imageList}>
              {modalImages.map((img) => (
                <div key={img.id} style={styles.imageItem}>
                  <img
                    src={img.url || getRoomTypeImageUrl(img.path)}
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
  manageImgBtn: {
    padding: '2px 8px',
    fontSize: 12,
    background: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: 4,
    cursor: 'pointer',
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
};
