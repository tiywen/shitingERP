import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }

  static getDerivedStateFromError(err) {
    return { err };
  }

  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, maxWidth: 720, margin: '40px auto', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#c00' }}>后台页面加载失败</h2>
          <p style={{ color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.err?.message || String(this.state.err)}
          </p>
          <p style={{ color: '#666', fontSize: 14 }}>
            请用 Chrome 打开并查看控制台（F12）；若在微信内打开，请换系统浏览器访问同一地址。
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
