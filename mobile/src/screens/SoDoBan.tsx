import { useMemo, useState } from 'react';
import { useNguoiDung } from '../auth/XacThuc';
import { useThongBao } from '../components/ThongBao';
import { useDuLieuQuan } from '../hooks/DuLieuQuan';
import { useBayGio } from '../hooks/useGiaTri';
import { coQuyen } from '../quyen/phanQuyen';
import { demSoBat } from '../services/dinhLuong';
import { xacNhanGiaoMon } from '../services/donHang';
import type { Ban, TrangThaiBan } from '../types/duLieu';

export const NHAN_TRANG_THAI: Record<TrangThaiBan, string> = {
  empty: 'Trống',
  ordering: 'Đang chọn món',
  waiting: 'Chờ bếp',
  eating: 'Đang ăn',
  paid: 'Chờ dọn',
};

/** Số phút kể từ mốc; bỏ qua giá trị vô lý (<0 hoặc >10 tiếng) như app cũ. */
export function soPhut(tu: number | null | undefined, bayGio: number): number | null {
  if (!tu) return null;
  const p = Math.floor((bayGio - tu) / 60000);
  return p < 0 || p > 600 ? null : p;
}

type BoLoc = 'tat_ca' | 'co_khach' | 'trong';

/** dangChon: bàn đang mở ở cột đơn (chỉ dùng trên PC, để tô viền). */
export function SoDoBan({ moBan, dangChon = null }: { moBan: (id: number) => void; dangChon?: number | null }) {
  const { ban, donTheoBan, phieuBep, dangTai, loi } = useDuLieuQuan();
  const [boLoc, setBoLoc] = useState<BoLoc>('tat_ca');
  const bayGio = useBayGio();

  const dem = useMemo(() => {
    const coKhach = ban.filter((b) => b.status !== 'empty').length;
    return { coKhach, trong: ban.length - coKhach };
  }, [ban]);

  if (loi) return <div className="trang-thai-trong loi">Lỗi tải dữ liệu: {loi.message}</div>;
  if (dangTai) return <div className="trang-thai-trong">Đang tải sơ đồ bàn…</div>;

  const loc = (b: Ban) =>
    boLoc === 'tat_ca' || (boLoc === 'trong' ? b.status === 'empty' : b.status !== 'empty');
  const dsBan = ban.filter((b) => b.type !== 'bar' && b.id <= 100 && loc(b));
  const dsBar = ban.filter((b) => (b.type === 'bar' || b.id > 100) && loc(b));

  const the = (b: Ban) => (
    <TheBan
      key={b.id}
      ban={b}
      soKhach={demSoBat(donTheoBan[b.id] ?? [])}
      bepDaXong={phieuBep.some((p) => String(p.tableId) === String(b.id)) &&
        phieuBep.filter((p) => String(p.tableId) === String(b.id)).every((p) => p.isDoneByChef)}
      bayGio={bayGio}
      dangChon={dangChon === b.id}
      onMo={() => moBan(b.id)}
    />
  );

  return (
    <div className="so-do">
      <div className="chip-hang" role="tablist">
        {([
          ['tat_ca', `Tất cả ${ban.length}`],
          ['co_khach', `Có khách ${dem.coKhach}`],
          ['trong', `Trống ${dem.trong}`],
        ] as const).map(([k, nhan]) => (
          <button key={k} role="tab" aria-selected={boLoc === k} className={`chip ${boLoc === k ? 'chon' : ''}`} onClick={() => setBoLoc(k)}>
            {nhan}
          </button>
        ))}
      </div>

      {dsBan.length > 0 && (
        <>
          <h3 className="nhom-tieu-de">Bàn</h3>
          <div className="luoi-ban">{dsBan.map(the)}</div>
        </>
      )}
      {dsBar.length > 0 && (
        <>
          <h3 className="nhom-tieu-de">Quầy bar</h3>
          <div className="luoi-ban">{dsBar.map(the)}</div>
        </>
      )}
      {dsBan.length + dsBar.length === 0 && <div className="trang-thai-trong">Không có bàn nào.</div>}
    </div>
  );
}

function TheBan({ ban, soKhach, bepDaXong, bayGio, dangChon, onMo }: {
  ban: Ban; soKhach: number; bepDaXong: boolean; bayGio: number; dangChon: boolean; onMo: () => void;
}) {
  const user = useNguoiDung();
  const { chay } = useThongBao();
  const [dangGui, setDangGui] = useState(false);

  let phu = NHAN_TRANG_THAI[ban.status] ?? ban.status;
  if (ban.status === 'waiting') {
    const p = soPhut(ban.timeAtBep, bayGio);
    phu = bepDaXong ? 'Bếp xong — chờ bưng' : `Chờ bếp${p != null ? ` · ${p}p` : ''}`;
  } else if (ban.status === 'eating') {
    const p = soPhut(ban.timeGiaoMon, bayGio);
    phu = `Đang ăn${p != null ? ` · ${p}p` : ''}`;
  }

  const coTheXacNhan = ban.status === 'waiting' && (coQuyen(user, 'confirm_done') || coQuyen(user, 'order'));
  const xacNhan = async () => {
    setDangGui(true);
    await chay(async () => {
      const kq = await xacNhanGiaoMon(user, ban.id);
      navigator.vibrate?.(15);
      return kq;
    }, bepDaXong ? `${ban.name}: đã giao món` : `${ban.name}: bếp đã xong`);
    setDangGui(false);
  };

  return (
    <div className={`the-ban tt-${ban.status} ${dangChon ? 'dang-chon' : ''}`}>
      <button className="the-ban-chinh" onClick={onMo} aria-label={`${ban.name}, ${phu}`} aria-pressed={dangChon || undefined}>
        <span className="the-ban-ten">{ban.name}</span>
        <span className="the-ban-phu">{ban.customerName || phu}</span>
        {ban.customerName && <span className="the-ban-phu nho">{phu}</span>}
        {soKhach > 0 && <span className="the-ban-so-khach" aria-label={`${soKhach} suất`}>👤 {soKhach}</span>}
      </button>
      {coTheXacNhan && (
        <button className="the-ban-xac-nhan" onClick={xacNhan} disabled={dangGui}
          aria-label={bepDaXong ? 'Xác nhận đã giao món' : 'Xác nhận bếp đã xong'}>
          {bepDaXong ? '🍜' : '✓'}
        </button>
      )}
    </div>
  );
}
