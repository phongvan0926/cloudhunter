import React, { useMemo, useState } from 'react';
import { CloudAnalysis } from '../types';
import {
  FieldReport, SeaLevelRelative, SEA_LEVEL_TEXT,
  findReport, saveReport, listReports, exportReports, importReports,
} from '../services/fieldReportService';
import { vnTodayStr } from '../services/weatherService';

/**
 * FieldReportPanel — "Bạn vừa đi về?": một chạm để ghi lại THỰC TẾ đã thấy.
 *
 * Đây là vòng kiểm chứng duy nhất không có điểm mù: mô hình toàn cầu không phân giải nổi
 * biển mây thung lũng, còn vệ tinh thì mù khi có tầng mây cao che. Người đứng tại chỗ luôn
 * biết — và biết đúng đại lượng engine dự báo: mặt mây TRÊN hay DƯỚI chỗ mình đứng.
 *
 * Báo cáo chốt luôn ĐIỂM APP ĐÃ DỰ BÁO cho ngày đó, nên về sau chấm lại được mà không cần
 * gọi lại API. Dữ liệu chỉ nằm trong máy người dùng; muốn hiệu chuẩn thì xuất JSON ra chạy
 * `npx vite-node scripts/calibrate.ts <file>`.
 */
const OPTIONS: { v: SeaLevelRelative; icon: string; short: string; tone: string }[] = [
  { v: 'BELOW',  icon: '🏔️', short: 'Đứng TRÊN biển mây', tone: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200' },
  { v: 'AT_EYE', icon: '🌫️', short: 'Mây ngang tầm mắt',  tone: 'border-amber-500/60 bg-amber-500/10 text-amber-200' },
  { v: 'ABOVE',  icon: '☁️', short: 'Chìm trong mây/mù',   tone: 'border-slate-500/60 bg-slate-500/10 text-slate-200' },
  { v: 'NONE',   icon: '☀️', short: 'Trời quang, không mây', tone: 'border-sky-500/60 bg-sky-500/10 text-sky-200' },
];

export const FieldReportPanel: React.FC<{ result: CloudAnalysis }> = ({ result }) => {
  const today = vnTodayStr();
  // Chỉ báo cáo được ngày ĐÃ QUA hoặc hôm nay — không ai "quan sát" được tương lai
  const reportableDates = useMemo(
    () => result.dailyForecasts.map(f => f.date).filter(d => d <= today).sort().reverse(),
    [result, today]
  );
  const [date, setDate] = useState<string>(reportableDates[0] || today);
  const [note, setNote] = useState<string>('');
  const [saved, setSaved] = useState<FieldReport | null>(() => findReport(null, result.locationName, reportableDates[0] || today));
  const [count, setCount] = useState<number>(() => listReports().length);
  const [msg, setMsg] = useState<string>('');

  if (reportableDates.length === 0) return null;

  const pickDate = (d: string) => {
    setDate(d);
    setSaved(findReport(null, result.locationName, d));
    setNote('');
  };

  const submit = (v: SeaLevelRelative) => {
    const f = result.dailyForecasts.find(x => x.date === date);
    const entry = saveReport({
      spotKey: null,
      locationName: result.locationName,
      date,
      seaLevel: v,
      note: note.trim() || undefined,
      predictedScore: f?.score,
      predictedStatus: f?.status_code,
      engineVersion: result.engineVersion,
    });
    setSaved(entry);
    setCount(listReports().length);
    setMsg('Đã ghi. Cảm ơn bạn — mỗi báo cáo làm thuật toán chuẩn thêm một chút.');
    setTimeout(() => setMsg(''), 4000);
  };

  const doExport = () => {
    const blob = new Blob([exportReports()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cloudhunter-bao-cao-thuc-dia-${today}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text()
      .then(t => { const r = importReports(t); setCount(r.total); setMsg(`Đã nhập thêm ${r.added} báo cáo (tổng ${r.total}).`); })
      .catch(err => setMsg(`Không đọc được file: ${err.message}`));
    e.target.value = '';
  };

  const predicted = result.dailyForecasts.find(x => x.date === date);

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-emerald-400 font-bold text-sm uppercase flex items-center gap-2">
            <span>📣</span> Bạn vừa đi về? Báo cáo thực tế
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            App dự báo <b>mặt mây nằm trên hay dưới chỗ bạn đứng</b> — đó cũng là thứ bạn nhìn thấy
            bằng mắt. Một chạm của bạn là dữ liệu chuẩn nhất để hiệu chỉnh thuật toán.
          </p>
        </div>
        <span className="text-[11px] text-slate-500 whitespace-nowrap">{count} báo cáo đã lưu trên máy này</span>
      </div>

      {reportableDates.length > 1 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {reportableDates.map(d => (
            <button key={d} onClick={() => pickDate(d)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                d === date ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200' : 'border-slate-600 text-slate-400 hover:text-slate-200'}`}>
              {d === today ? 'Sáng nay' : d}
            </button>
          ))}
        </div>
      )}

      {predicted && (
        <p className="text-[11px] text-slate-500 mt-3">
          App đã dự báo cho {date}: <b className="text-slate-300">{predicted.score}/100 · {predicted.status_text}</b>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        {OPTIONS.map(o => (
          <button key={o.v} onClick={() => submit(o.v)}
            title={SEA_LEVEL_TEXT[o.v]}
            className={`text-left text-sm px-4 py-3 rounded-xl border transition-all hover:brightness-125 ${
              saved?.seaLevel === o.v ? o.tone + ' ring-2 ring-offset-0 ring-current' : 'border-slate-700 bg-slate-800/60 text-slate-300'}`}>
            <span className="mr-2">{o.icon}</span>{o.short}
          </button>
        ))}
      </div>

      <input
        value={note} onChange={e => setNote(e.target.value)}
        placeholder="Ghi chú (tuỳ chọn): mấy giờ mây lên/tan, độ dày, hôm trước có mưa không..."
        className="w-full mt-3 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
      />

      {saved && (
        <p className="text-xs text-emerald-300/90 mt-3">
          ✅ Đã ghi cho {saved.date}: {SEA_LEVEL_TEXT[saved.seaLevel]}
          {saved.note ? ` — “${saved.note}”` : ''}
        </p>
      )}
      {msg && <p className="text-xs text-slate-400 mt-2">{msg}</p>}

      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800">
        <button onClick={doExport}
          className="text-xs px-3 py-1.5 rounded-full border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400">
          ⬇️ Xuất JSON để hiệu chuẩn
        </button>
        <label className="text-xs px-3 py-1.5 rounded-full border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 cursor-pointer">
          ⬆️ Nhập lại từ file
          <input type="file" accept="application/json" onChange={doImport} className="hidden" />
        </label>
        <span className="text-[11px] text-slate-500 self-center">Dữ liệu chỉ nằm trong máy bạn, app không gửi đi đâu.</span>
      </div>
    </div>
  );
};
