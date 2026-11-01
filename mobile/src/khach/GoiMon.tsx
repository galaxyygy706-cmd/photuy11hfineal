/* GIAO DIỆN GỌI MÓN QR CHO KHÁCH — bản mới của ../../khach.html, giữ nguyên nhận diện:
   thẻ món viền neon xoay (xanh = món đơn, cam = combo, đỏ + viền vàng = SIÊU PHẨM), giá trong
   viên vàng, mô tả chữ chạy, thẻ "Suất bán ngày" + "Bàn của bạn", giỏ hàng lá sớ kéo lên,
   hiệu ứng xe hàng bay. Chỉ ĐỌC menu/tables và PUSH vào pending_qr_orders (rules cho phép
   khách chưa đăng nhập làm đúng 3 việc này). */

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { push, ref } from 'firebase/database';
import { db } from '../firebase/khoiTao';
import { useGiaTri } from '../hooks/useGiaTri';
import { anhMon } from '../services/dinhLuong';
import { suatConLai, veMangCoKey } from '../services/donHangThuan';
import {
  conThemDuoc, demMon, doiSoLuong, laSieuPham, moTaMon, mucSuat, suaGhiChu, taoDonQR, themVaoGio, tinhTienGio,
  type DongGio,
} from '../services/gioHangKhach';
import { dinhDangTien } from '../services/tinhTien';
import type { Ban, Mon } from '../types/duLieu';

/* ---- Lưu tạm (chỉ tiện ích cho khách: giỏ không mất khi lỡ tải lại trang; theme sáng/tối).
   Trình duyệt chặn storage (ẩn danh...) thì vẫn chạy bình thường. ---- */
function docLuu<T>(k: string, macDinh: T): T {
  try { const v = sessionStorage.getItem(k) ?? localStorage.getItem(k); return v ? (JSON.parse(v) as T) : macDinh; } catch { return macDinh; }
}
function ghiLuu(k: string, v: unknown, lauDai = false): void {
  try { (lauDai ? localStorage : sessionStorage).setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ }
}

function layBanTuUrl(): string | null {
  return new URLSearchParams(location.search).get('table');
}

export function GoiMon() {
  const menuNode = useGiaTri<unknown>('menu');
  const banNode = useGiaTri<unknown>('tables');
  const menu = useMemo(() => veMangCoKey<Mon>(menuNode.giaTri).map((m) => m.giaTri).filter((m) => m && m.id), [menuNode.giaTri]);
  const dsBan = useMemo(() => veMangCoKey<Ban>(banNode.giaTri).map((b) => b.giaTri).filter((b) => b && b.id != null), [banNode.giaTri]);

  const [tableId, setTableId] = useState<string | null>(layBanTuUrl);
  const ban = dsBan.find((b) => String(b.id) === tableId);
  const tenBan = ban?.name ?? (tableId ? `Bàn ${tableId}` : 'Chưa chọn');

  const khoaGio = `gio_khach_${tableId ?? ''}`;
  const [gio, setGio] = useState<DongGio[]>(() => docLuu(khoaGio, []));
  useEffect(() => ghiLuu(khoaGio, gio), [khoaGio, gio]);

  const [tab, setTab] = useState<'don' | 'combo'>('don');
  const [moGio, setMoGio] = useState(false);
  const [moChonBan, setMoChonBan] = useState(false);
  const [toi, setToi] = useState<boolean>(() => docLuu('theme_khach', false));
  const [dangGui, setDangGui] = useState(false);
  const [loiGui, setLoiGui] = useState<string | null>(null);
  const [daGui, setDaGui] = useState<{ soMon: number; tong: number } | null>(null);
  const [rungGio, setRungGio] = useState(0);
  const gioRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = toi ? 'dark' : 'light';
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', toi ? '#111318' : '#d32f2f');
    ghiLuu('theme_khach', toi, true);
  }, [toi]);

  // Không có ?table= hoặc số bàn không tồn tại -> mời chọn bàn ngay khi đã tải xong danh sách bàn
  useEffect(() => {
    if (!banNode.dangTai && (!tableId || (dsBan.length > 0 && !ban))) setMoChonBan(true);
  }, [banNode.dangTai, tableId, dsBan.length, ban]);

  const tien = tinhTienGio(gio, menu);
  const soMon = demMon(gio);

  const them = (mon: Mon, e: MouseEvent<HTMLButtonElement>) => {
    setGio((g) => themVaoGio(g, mon.id));
    navigator.vibrate?.(12);
    bayVaoGio(e.currentTarget, gioRef.current, mon.loai === 'combo' ? '#e65100' : laSieuPham(mon) ? '#d32f2f' : '#2e7d32');
    setTimeout(() => setRungGio((n) => n + 1), 550);
  };

  const gui = async () => {
    if (!tableId) { setMoChonBan(true); return; }
    const don = taoDonQR(gio, menu, tableId);
    if (don.items.length === 0) return;
    setDangGui(true);
    setLoiGui(null);
    try {
      await push(ref(db, 'pending_qr_orders'), don);
      setDaGui({ soMon, tong: tien.tongCong });
      setGio([]);
      setMoGio(false);
    } catch (e) {
      setLoiGui(`Chưa gửi được (${(e as Error).message}). Kiểm tra mạng rồi thử lại, hoặc gọi nhân viên giúp bạn.`);
    } finally {
      setDangGui(false);
    }
  };

  const chonBan = (id: number) => {
    setTableId(String(id));
    const url = new URL(location.href);
    url.searchParams.set('table', String(id));
    history.replaceState(null, '', url);
    setMoChonBan(false);
  };

  const dsTab = menu.filter((m) => (m.loai ?? 'don') === tab);

  return (
    <div className="kh">
      <header className="kh-dau">
        <div className="kh-thuong-hieu">
          <b>🍜 Phở Túy <span>QR Order</span></b>
          <small>Số 11 Bà Triệu · Hotline 0999.999.888</small>
        </div>
        <DongHo />
        <button className="kh-nut-theme" onClick={() => setToi((v) => !v)} aria-label={toi ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}>
          {toi ? '☀️' : '🌙'}
        </button>
      </header>

      <section className="kh-hang-tt">
        <TheSuat menu={menu} />
        <div className="kh-the kh-the-ban">
          <small>BÀN CỦA BẠN</small>
          <b className={tableId ? '' : 'chua-chon'}>{tenBan}</b>
          <button className="kh-nut-doi-ban" onClick={() => setMoChonBan(true)} aria-label="Đổi bàn">🔄</button>
        </div>
      </section>

      <div className="kh-tab" role="tablist">
        <button role="tab" aria-selected={tab === 'don'} className={tab === 'don' ? 'chon don' : ''} onClick={() => setTab('don')}>🥗 Menu Đơn</button>
        <button role="tab" aria-selected={tab === 'combo'} className={tab === 'combo' ? 'chon combo' : ''} onClick={() => setTab('combo')}>🍱 Menu COMBO</button>
      </div>

      <main className="kh-ds-mon">
        {menuNode.loi && <p className="kh-trong">Không tải được thực đơn. Kiểm tra mạng rồi tải lại trang.</p>}
        {menuNode.dangTai && Array.from({ length: 4 }, (_, i) => <div key={i} className="kh-mon kh-mon-cho" aria-hidden />)}
        {!menuNode.dangTai && dsTab.map((mon) => (
          <TheMon key={mon.id} mon={mon} conLai={conThemDuoc(menu, gio, mon.id)}
            daChon={gio.filter((d) => d.idMon === mon.id).reduce((s, d) => s + d.sl, 0)} onThem={(e) => them(mon, e)} />
        ))}
        {!menuNode.dangTai && !menuNode.loi && dsTab.length === 0 && <p className="kh-trong">Chưa có món trong mục này.</p>}
        <p className="kh-loi-chuc">🌱 Cảm ơn Quý Anh Chị đã lựa chọn Phở Túy. Chúc Quý Anh Chị thưởng thức ngon miệng!</p>
      </main>

      {/* ---- GIỎ HÀNG: thanh thu gọn ở đáy, chạm để kéo lá sớ lên ---- */}
      <div className={`kh-nen ${moGio ? 'mo' : ''}`} onClick={() => setMoGio(false)} aria-hidden />
      <section className={`kh-gio ${moGio ? 'mo' : ''}`} aria-label="Chi tiết đơn">
        <button ref={gioRef} className="kh-gio-dau" onClick={() => setMoGio((v) => !v)} aria-expanded={moGio}>
          <span className="kh-tay-cam" aria-hidden />
          <span key={rungGio} className={`kh-gio-icon ${rungGio ? 'rung' : ''}`} aria-hidden>
            🛒{soMon > 0 && <span className="kh-gio-so">{soMon}</span>}
          </span>
          <span className="kh-gio-tieu-de">
            <b>CHI TIẾT ĐƠN</b>
            <span className="kh-nhan-ban">{tenBan}</span>
          </span>
          <span className="kh-gio-tong">{soMon > 0 ? dinhDangTien(tien.tongCong) : ''}</span>
          <span className="kh-mui-ten" aria-hidden>{moGio ? '▾' : '▴'}</span>
        </button>

        <div className="kh-gio-than">
          {gio.length === 0 ? (
            <div className="kh-trong">
              <div className="kh-trong-icon" aria-hidden>🍜</div>
              Chưa có món ăn — chọn món ở thực đơn nhé!
            </div>
          ) : gio.map((d) => {
            const mon = menu.find((m) => m.id === d.idMon);
            if (!mon) return null;
            const conThem = conThemDuoc(menu, gio, mon.id);
            return (
              <div key={d.ma} className="kh-dong">
                <div className="kh-dong-tren">
                  <div className="kh-dong-ten">
                    <b>{mon.ten}</b>
                    {mon.desc && <small>({mon.desc})</small>}
                  </div>
                  <b className="kh-dong-gia">{dinhDangTien(mon.gia * d.sl)}</b>
                </div>
                <div className="kh-dong-duoi">
                  <label className="kh-ghi-chu">
                    <span>Ghi chú:</span>
                    <input value={d.note} maxLength={80} placeholder="VD: ít hành, không rau…"
                      onChange={(e) => setGio((g) => suaGhiChu(g, d.ma, e.target.value))} />
                  </label>
                  <div className="kh-dem">
                    <button onClick={() => setGio((g) => doiSoLuong(g, d.ma, -1))} aria-label={d.sl === 1 ? `Bỏ ${mon.ten}` : `Bớt ${mon.ten}`}
                      className={d.sl === 1 ? 'xoa' : ''}>{d.sl === 1 ? '🗑' : '−'}</button>
                    <b>{d.sl}</b>
                    <button onClick={() => setGio((g) => doiSoLuong(g, d.ma, 1))} disabled={conThem <= 0} aria-label={`Thêm ${mon.ten}`}>+</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="kh-gio-chan">
          <div className="kh-tong-dong"><span>Tiền món</span><b>{dinhDangTien(tien.tamTinh)}</b></div>
          <div className="kh-tong-dong"><span>Thuế GTGT (2%)</span><b>{dinhDangTien(tien.tienVat)}</b></div>
          <div className="kh-tong-dong kh-tong-cong"><span>TỔNG CỘNG</span><b>{dinhDangTien(tien.tongCong)}</b></div>
          {loiGui && <p className="kh-loi" role="alert">{loiGui}</p>}
          <button className="kh-nut-gui" onClick={gui} disabled={dangGui || soMon === 0}>
            {dangGui ? 'Đang gửi…' : 'GỬI YÊU CẦU 🚀'}
          </button>
        </footer>
      </section>

      {moChonBan && (
        <ChonBan dsBan={dsBan} dangTai={banNode.dangTai} hienTai={tableId} chon={chonBan}
          dong={tableId && ban ? () => setMoChonBan(false) : undefined} />
      )}
      {daGui && <DaGui {...daGui} tenBan={tenBan} dong={() => setDaGui(null)} />}
    </div>
  );
}

/* Đồng hồ tách riêng: chỉ phần này vẽ lại mỗi giây */
function DongHo() {
  const [bayGio, setBayGio] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setBayGio(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="kh-dong-ho">
      <span>{bayGio.toLocaleDateString('vi-VN')}</span>
      <b>{bayGio.toLocaleTimeString('vi-VN', { hour12: false })}</b>
    </div>
  );
}

function TheSuat({ menu }: { menu: Mon[] }) {
  const ds = ['tuy_tam', 'tuy_thuong']
    .map((id) => menu.find((m) => m.id === id))
    .filter((m): m is Mon => !!m && Number(m.limit) > 0);
  const dong = ds.map((m) => {
    const conLai = Math.max(0, suatConLai(menu, m.id));
    return { m, limit: Number(m.limit), conLai, muc: mucSuat(m.id, conLai) };
  });
  const canhBao = dong
    .filter((d) => d.muc !== 'du')
    .map((d) => (d.muc === 'het' ? `🏮 ${d.m.ten} đã hết!` : `✨ ${d.m.ten} chỉ còn ${d.conLai} suất!`));
  return (
    <div className="kh-the kh-the-suat">
      <div className="kh-the-suat-tieu-de">📊 SUẤT BÁN HÔM NAY</div>
      {ds.length === 0 && <small className="kh-mo">Đang cập nhật…</small>}
      {dong.map(({ m, limit, conLai, muc }) => (
        <div key={m.id} className={`kh-suat muc-${muc}`}>
          <span className="kh-suat-ten">{m.ten}</span>
          <div className="kh-suat-thanh"><div style={{ width: `${(conLai / limit) * 100}%` }} /></div>
          <b>{conLai}/{limit}</b>
        </div>
      ))}
      {canhBao.length > 0 && (
        <div className="kh-chay kh-canh-bao"><span>{canhBao.join('   ·   ')}</span></div>
      )}
    </div>
  );
}

function TheMon({ mon, conLai, daChon, onThem }: {
  mon: Mon; conLai: number; daChon: number; onThem: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
  const vip = laSieuPham(mon);
  const het = conLai <= 0 && daChon === 0;
  const { tenLoai, chayChu, moTaTinh } = moTaMon(mon);
  const anh = anhMon(mon.id, mon.img);
  const loai = vip ? 'vip' : mon.loai === 'combo' ? 'combo' : 'don';
  return (
    <article className={`kh-mon kh-mon-${loai} ${het ? 'het' : ''}`}>
      {vip && <span className="kh-nhan-vip">SIÊU PHẨM 💎</span>}
      <div className="kh-mon-anh">
        {anh ? <img src={anh} alt="" loading="lazy" /> : <span aria-hidden>🍜</span>}
        {daChon > 0 && <span className="kh-mon-da-chon">{daChon}</span>}
      </div>
      <div className="kh-mon-thong-tin">
        <h3>{mon.ten}{tenLoai && <small> ({tenLoai})</small>}</h3>
        {moTaTinh && <p className="kh-mon-mo-ta">{moTaTinh}</p>}
        {chayChu && <div className="kh-chay"><span>{chayChu}</span></div>}
        <div className="kh-mon-chan">
          <span className="kh-gia">{dinhDangTien(mon.gia)}</span>
          {het ? <span className="kh-con het">Hết món</span>
            : Number.isFinite(conLai) && conLai <= 5 ? <span className="kh-con">Còn {conLai} suất</span> : null}
        </div>
      </div>
      <button className="kh-nut-them" onClick={onThem} disabled={conLai <= 0}
        aria-label={conLai <= 0 ? `${mon.ten} — hết món` : `Thêm ${mon.ten} vào đơn`}>
        {conLai <= 0 ? '✕' : '🛒'}
      </button>
    </article>
  );
}

const NHAN_BAN: Record<string, string> = { empty: 'Trống', ordering: 'Đang chọn', waiting: 'Chờ bếp', eating: 'Đang ăn', paid: 'Chờ dọn' };

function ChonBan({ dsBan, dangTai, hienTai, chon, dong }: {
  dsBan: Ban[]; dangTai: boolean; hienTai: string | null; chon: (id: number) => void; dong?: () => void;
}) {
  return (
    <div className="kh-hop-nen" onClick={dong}>
      <div className="kh-hop" role="dialog" aria-modal aria-label="Chọn bàn của bạn" onClick={(e) => e.stopPropagation()}>
        <div className="kh-hop-dau">
          <b>📍 Chọn bàn của bạn</b>
          {dong && <button className="kh-nut-dong" onClick={dong} aria-label="Đóng">✕</button>}
        </div>
        <p className="kh-mo">Chỉ chọn được bàn đang trống. Bàn đã có khách, vui lòng quét mã QR trên bàn.</p>
        <div className="kh-luoi-ban">
          {dangTai && <p className="kh-mo">Đang tải danh sách bàn…</p>}
          {dsBan.map((b) => {
            const laHienTai = String(b.id) === hienTai;
            const duoc = b.status === 'empty' || laHienTai;
            return (
              <button key={b.id} className={`kh-o-ban tt-${b.status} ${laHienTai ? 'hien-tai' : ''}`} disabled={!duoc} onClick={() => chon(b.id)}>
                <b>{b.name}</b>
                <small>{laHienTai ? 'Bàn của bạn' : NHAN_BAN[b.status] ?? 'Bận'}</small>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DaGui({ soMon, tong, tenBan, dong }: { soMon: number; tong: number; tenBan: string; dong: () => void }) {
  return (
    <div className="kh-hop-nen">
      <div className="kh-hop kh-da-gui" role="alertdialog" aria-modal aria-label="Đã gửi yêu cầu">
        <div className="kh-da-gui-icon" aria-hidden>🚀</div>
        <h2>Đã gửi yêu cầu!</h2>
        <p>{soMon} món · {dinhDangTien(tong)} · {tenBan}</p>
        <p className="kh-mo">Nhân viên sẽ xác nhận đơn trong giây lát. Món sẽ được phục vụ tận bàn.</p>
        <button className="kh-nut-gui" onClick={dong}>Gọi thêm món</button>
      </div>
    </div>
  );
}

/* Hiệu ứng xe hàng bay từ nút 🛒 của món xuống giỏ ở đáy màn hình (hieuUngBay ở app cũ) */
function bayVaoGio(tu: HTMLElement, den: HTMLElement | null, mau: string): void {
  if (!den || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const a = tu.getBoundingClientRect();
  const b = den.getBoundingClientRect();
  const vat = document.createElement('div');
  vat.className = 'kh-vat-bay';
  vat.textContent = '🛒';
  vat.style.cssText = `left:${a.left + a.width / 2 - 18}px;top:${a.top + a.height / 2 - 18}px;background:${mau};--mau:${mau}`;
  document.body.appendChild(vat);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    vat.style.transform = `translate(${b.left + 40 - a.left - a.width / 2}px, ${b.top + b.height / 2 - a.top - a.height / 2}px) scale(.3) rotate(360deg)`;
    vat.style.opacity = '.2';
  }));
  setTimeout(() => vat.remove(), 650);
}
