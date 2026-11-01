/* MÀN HÌNH BẾP (moManHinhBep ở app cũ): phiếu theo thứ tự gửi, đồng hồ mm:ss đổi màu
   theo thời gian chờ (<3 phút / 3–7 phút / ≥7 phút), bấm "Xong" từng phiếu. */

import { useState } from 'react';
import { useNguoiDung } from '../auth/XacThuc';
import { useThongBao } from '../components/ThongBao';
import { useDuLieuQuan, type PhieuBepCoKey } from '../hooks/DuLieuQuan';
import { phatChuong, useBaoKhiCoMoi } from '../hooks/useChuong';
import { useBayGio } from '../hooks/useGiaTri';
import { coQuyen } from '../quyen/phanQuyen';
import { anhMon } from '../services/dinhLuong';
import { bepXongPhieu } from '../services/donHang';
import { mucChoBep } from '../services/donHangThuan';

function dongHo(giay: number): string {
  const g = Math.max(0, giay);
  return `${String(Math.floor(g / 60)).padStart(2, '0')}:${String(g % 60).padStart(2, '0')}`;
}

/** Kêu chuông khi có phiếu bếp mới — gắn ở gốc app để đầu bếp nghe được cả khi đang ở tab khác. */
export function ChuongBep() {
  const { phieuBep, dangTai } = useDuLieuQuan();
  const { bao } = useThongBao();
  useBaoKhiCoMoi(phieuBep.map((p) => p.key), dangTai, (moi) => {
    phatChuong();
    const ten = phieuBep.filter((p) => moi.includes(p.key)).map((p) => p.tableName).join(', ');
    bao(`🔔 Phiếu bếp mới: ${ten}`, 'thong_tin');
  });
  return null;
}

export function ManHinhBep() {
  const { phieuBep, dangTai } = useDuLieuQuan();
  const bayGio = useBayGio(1000);

  if (dangTai) return <div className="trang-thai-trong">Đang tải phiếu bếp…</div>;

  // Phiếu chưa làm lên trước (cũ nhất trước), phiếu đã xong xuống cuối
  const chuaXong = phieuBep.filter((p) => !p.isDoneByChef);
  const daXong = phieuBep.filter((p) => p.isDoneByChef);
  const soMon = chuaXong.reduce((s, p) => s + p.items.reduce((t, i) => t + (Number(i.sl) || 0), 0), 0);

  return (
    <div className="bep">
      <div className="bep-tom-tat">
        <span><b>{chuaXong.length}</b> phiếu đang làm · <b>{soMon}</b> món</span>
        {daXong.length > 0 && <span className="phu">{daXong.length} chờ bưng</span>}
      </div>
      {phieuBep.length === 0 && (
        <div className="trang-thai-trong">
          <div className="bieu-tuong-lon" aria-hidden>👨‍🍳</div>
          Chưa có món nào cần làm.
        </div>
      )}
      <div className="luoi-phieu">
        {[...chuaXong, ...daXong].map((p) => <ThePhieu key={p.key} phieu={p} bayGio={bayGio} />)}
      </div>
    </div>
  );
}

function ThePhieu({ phieu, bayGio }: { phieu: PhieuBepCoKey; bayGio: number }) {
  const user = useNguoiDung();
  const { chay } = useThongBao();
  const [dangGui, setDangGui] = useState(false);
  const giay = Math.floor((bayGio - (phieu.timestamp || bayGio)) / 1000);
  const muc = phieu.isDoneByChef ? 'xong' : mucChoBep(giay);
  const duocBam = coQuyen(user, 'confirm_done') || coQuyen(user, 'view_kitchen');

  return (
    <article className={`phieu phieu-${muc}`} aria-label={`Phiếu ${phieu.tableName}`}>
      <header className="phieu-dau">
        <div>
          <div className="phieu-ban">{phieu.tableName}</div>
          <div className="phieu-gio">
            gửi lúc {new Date(phieu.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div className="phieu-dong-ho" aria-label={`Đã chờ ${Math.floor(giay / 60)} phút`}>{dongHo(giay)}</div>
      </header>
      <ul className="phieu-mon">
        {phieu.items.map((i, k) => {
          const anh = anhMon(i.id_mon, i.img);
          return (
            <li key={`${i.id}-${k}`}>
              <div className="phieu-mon-anh">{anh ? <img src={anh} alt="" loading="lazy" /> : <span aria-hidden>🍜</span>}</div>
              <div className="phieu-mon-ten">
                {i.ten}
                {i.note && <div className="phieu-ghi-chu">⚠️ {i.note}</div>}
              </div>
              <div className="phieu-sl">×{i.sl}</div>
            </li>
          );
        })}
      </ul>
      {phieu.isDoneByChef ? (
        <div className="phieu-trang-thai">⏳ Chờ phục vụ bưng</div>
      ) : duocBam ? (
        <button className="nut nut-xanh nut-to" disabled={dangGui} onClick={async () => {
          setDangGui(true);
          await chay(() => bepXongPhieu(user, phieu.key), `${phieu.tableName}: đã báo xong`);
          setDangGui(false);
        }}>
          {dangGui ? 'Đang gửi…' : '✓ Xong'}
        </button>
      ) : null}
    </article>
  );
}
