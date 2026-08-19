import { Component, type ReactNode } from 'react';

/**
 * ErrorBoundary — chặn crash màn trắng khi màn kết quả gặp dữ liệu bất ngờ
 * (vd bản lưu lịch sử từ phiên bản cũ). Hiện thông báo trung thực + nút quay lại.
 */
interface Props { onReset: () => void; children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error('Lỗi render kết quả:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-xl mx-auto bg-slate-800/60 border border-rose-700/50 rounded-2xl p-6 text-center space-y-3">
          <p className="text-rose-300 text-sm leading-relaxed">
            😵 Không hiển thị được kết quả này (dữ liệu không đúng định dạng — có thể là bản
            lưu từ phiên bản cũ). Chi tiết kỹ thuật: {this.state.error.message}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); this.props.onReset(); }}
            className="min-h-11 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs transition-all"
          >
            ← Quay về trang tra cứu
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
