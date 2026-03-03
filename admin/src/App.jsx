import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import TablePage from './pages/TablePage';
import OrdersPage from './pages/OrdersPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import RoomTypePage from './pages/RoomTypePage';
import RestaurantBookingsPage from './pages/RestaurantBookingsPage';

const TABS = [
  { path: '/orders', label: '订单', realtime: true },
  { path: '/work-orders', label: '工单', realtime: true },
  { path: '/restaurant-bookings', label: '餐厅预约' },
  { path: '/order', label: '订单表', model: 'order' },
  { path: '/user', label: '用户', model: 'user' },
  { path: '/roomType', label: '房型', page: 'roomType' },
  { path: '/room', label: '房间', model: 'room' },
  { path: '/workOrder', label: '工单表', model: 'workOrder' },
  { path: '/facility', label: '设施', model: 'facility' },
  { path: '/facilityBooking', label: '设施预约', model: 'facilityBooking' },
  { path: '/invoice', label: '发票', model: 'invoice' },
];

function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <aside style={styles.sidebar}>
          <h2 style={styles.logo}>石亭 ERP</h2>
          <div style={styles.apiIndicator}>
            {(() => {
              const target = import.meta.env.VITE_API_TARGET || '';
              const isLocal = !target || target.includes('localhost');
              return (
                <span title={target || 'http://localhost:3000'} style={{ ...styles.apiBadge, ...(isLocal ? styles.apiLocal : styles.apiRemote) }}>
                  {isLocal ? '本地' : '服务器'}
                </span>
              );
            })()}
          </div>
          <nav style={styles.nav}>
            {TABS.map((t) => (
              <NavLink
                key={t.path}
                to={t.path}
                style={({ isActive }) => ({
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : {}),
                })}
              >
                {t.label}
                {t.realtime && <span style={styles.badge}>实时</span>}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<Navigate to="/orders" replace />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/work-orders" element={<WorkOrdersPage />} />
            <Route path="/restaurant-bookings" element={<RestaurantBookingsPage />} />
            {TABS.filter((t) => t.model).map((t) => (
              <Route
                key={t.path}
                path={t.path}
                element={<TablePage model={t.model} title={t.label} />}
              />
            ))}
            <Route path="/roomType" element={<RoomTypePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

const styles = {
  sidebar: {
    width: 220,
    background: '#1a5f4a',
    color: '#fff',
    padding: '24px 0',
  },
  logo: {
    margin: '0 20px 12px',
    fontSize: 20,
    fontWeight: 600,
  },
  apiIndicator: {
    margin: '0 20px 16px',
  },
  apiBadge: {
    display: 'inline-block',
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 4,
  },
  apiLocal: {
    background: 'rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.9)',
  },
  apiRemote: {
    background: '#52c41a',
    color: '#fff',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
  },
  navItem: {
    padding: '12px 20px',
    color: 'rgba(255,255,255,0.85)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
  },
  badge: {
    fontSize: 11,
    background: '#ff4d4f',
    padding: '2px 6px',
    borderRadius: 4,
  },
  main: {
    flex: 1,
    padding: 24,
    overflow: 'auto',
  },
};

export default App;
