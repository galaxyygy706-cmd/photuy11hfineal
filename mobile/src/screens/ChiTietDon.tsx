import { useState } from 'react';
import { useNguoiDung } from '../auth/XacThuc';
import { LaSo } from '../components/LaSo';
import { useThongBao } from '../components/ThongBao';
import { useDuLieuQuan } from '../hooks/DuLieuQuan';
import { useNutQuayLai } from '../hooks/useNutQuayLai';
import { useNhung } from '../hooks/useManHinhRong';
import { coQuyen } from '../quyen/phanQuyen';
import { botMon, datGiamGia, donBan, guiBep, suaGhiChu, themMon } from '../services/donHang';
import { MUC_GIAM_GIA, dinhDangTien, tinhTien } from '../services/tinhTien';
import type { DongMon } from '../types/duLieu';
import { NHAN_TRANG_THAI } from './SoDoBan';
import { ThucDon } from './don/ThucDon';
import { ThanhToan } from './don/ThanhToan';
import { ChonHoiVien, TheHoiVien } from './don/HoiVienTrongDon';
import { GopBan, TachMon } from './don/GopTach';

type LaSoMo = null | 'thuc_don' | 'thanh_toan' | 'giam_gia' | 'hoi_vien' | 'gop' | 'tach' | 'them_lua_chon';

export function ChiTietDon({ tableId, dong, chuyenBan }: { tableId: number; dong: () => void; chuyenBan: (id: number) => void }) {
  // PC: đơn là cột cố định bên phải (không phủ màn hình, không chiếm nút Back); thực đơn luôn hiện ở cột giữa
  const nhung = useNhung();
  useNutQuayLai(!nhung, dong);
  const user = useNguoiDung();
  const { ban: dsBan, donTheoBan, menu } = useDuLieuQuan();
  const { chay, xacNhan, bao } = useThongBao();
  const [laSo, setLaSo] = useState<LaSoMo>(null);
  const [dangXuLy, setDangXuLy] = useState(false);

  const ban = dsBan.find((b) => b.id === tableId);
  const items = donTheoBan[tableId] ?? [];
  if (!ban) return null;

  const tien = tinhTien(items, ban.discount ?? 0);
  const soMonMoi = items.filter((i) => i.isSent !== true).reduce((s, i) => s + i.sl, 0);
  const daThanhToan = ban.status === 'paid';
  const duocSua = coQuyen(user, 'order') && !daThanhToan;
  const dongLaSo = () => setLaSo(null);

  const lamViec = async (viec: () => Promise<unknown>, thanhCong?: string) => {
    setDangXuLy(true);
    const ok = await chay(viec, thanhCong);
    setDangXuLy(false);
    return ok;
  };

  const tang = (dong: DongMon) => {
    const mon = menu.find((m) => m.giaTri.id === dong.id_mon)?.giaTri;
    if (!mon) return bao('Món này không còn trong thực đơn.', 'loi');
    void chay(async () => {
      const thongDiep = await themMon(user, tableId, mon, menu.map((m) => m.giaTri));
      if (thongDiep) bao(thongDiep, 'thanh_cong');
    });
  };

  const giam = async (dong: DongMon) => {
    if (dong.isSent && !(await xacNhan(`Bớt 1 "${dong.ten}"?`, { chiTiet: 'Món này đã gửi bếp.', nutDongY: 'Bớt', nguyHiem: true }))) return;
    void chay(() => botMon(user, tableId, dong.id));
  };

  const ghiChu = (dong: DongMon) => {
    // prompt() đủ dùng cho ghi chú ngắn và mở bàn phím ngay trên mọi trình duyệt di động.
    const moi = window.prompt(`Ghi chú cho "${dong.ten}"`, dong.note ?? '');
    if (moi === null) return;
    void chay(() => suaGhiChu(user, tableId, dong.id, moi.trim()));
  };

  // ---- nút hành động chính theo trạng thái bàn (capNhatNut ở app cũ)
  let nutChinh: { nhan: string; lam: () => void } | null = null;
  if (soMonMoi > 0 && !daThanhToan && (coQuyen(user, 'order') || coQuyen(user, 'print_kitchen'))) {
    nutChinh = {
      nhan: `Gửi bếp · ${soMonMoi} món mới`,
      lam: async () => {
        if (!(await xacNhan(`Gửi ${soMonMoi} món mới xuống bếp?`, { chiTiet: 'Kho nguyên liệu sẽ được trừ theo định lượng.', nutDongY: 'Gửi bếp' }))) return;
        await lamViec(() => guiBep(user, tableId, menu), 'Đã gửi bếp');
      },
    };
  } else if ((ban.status === 'eating' || ban.status === 'waiting') && items.length > 0 && coQuyen(user, 'payment')) {
    nutChinh = { nhan: `Thanh toán · ${dinhDangTien(tien.tongCong)}`, lam: () => setLaSo('thanh_toan') };
  } else if (daThanhToan && (coQuyen(user, 'clear_table') || coQuyen(user, 'payment') || coQuyen(user, 'order'))) {
    nutChinh = {
      nhan: 'Dọn bàn xong',
      lam: async () => {
        if (!(await xacNhan(`Dọn sạch ${ban.name} để đón khách mới?`, { nutDongY: 'Đã dọn' }))) return;
        if (await lamViec(() => donBan(user, tableId), `${ban.name} đã trống`)) dong();
      },
    };
  }

  return (
    <div className={`trang ${nhung ? 'trang-nhung' : ''}`}>
      <header className="trang-dau">
        <button className="nut-icon" onClick={dong} aria-label={nhung ? 'Bỏ chọn bàn' : 'Quay lại sơ đồ bàn'}>{nhung ? '✕' : '‹'}</button>
        <div className="trang-dau-giua">
          <h1>{ban.name}</h1>
          <span className={`nhan-tt tt-${ban.status}`}>{NHAN_TRANG_THAI[ban.status]}</span>
        </div>
        {duocSua && items.length > 0 ? (
          <button className="nut-icon" onClick={() => setLaSo('them_lua_chon')} aria-label="Thêm lựa chọn">⋯</button>
        ) : <span className="nut-icon-cho" />}
      </header>

      <div className="trang-than">
        <TheHoiVien ban={ban} moChon={() => setLaSo('hoi_vien')} duocSua={duocSua} />

        {items.length === 0 ? (
          <div className="trang-thai-trong">
            <div className="bieu-tuong-lon" aria-hidden>🍜</div>
            Chưa có món nào.
            {duocSua && (nhung ? <span className="phu">Bấm món ở cột Thực đơn bên cạnh</span> : <button className="nut nut-chinh" onClick={() => setLaSo('thuc_don')}>Chọn món</button>)}
          </div>
        ) : (
          <ul className="ds-dong-mon">
            {items.map((d) => (
              <li key={d.id} className={`dong-mon ${d.isSent ? 'da-gui' : ''}`}>
                <button className="dong-mon-thong-tin" onClick={() => duocSua && ghiChu(d)} disabled={!duocSua}>
                  <span className="dong-mon-ten">
                    {d.ten}
                    {d.isReward && <span className="the-nho qua">Quà</span>}
                    {d.isSent ? <span className="the-nho">Đã gửi bếp</span> : <span className="the-nho moi">Mới</span>}
                  </span>
                  <span className="dong-mon-ghi-chu">{d.note ? `📝 ${d.note}` : duocSua ? '+ Ghi chú' : ''}</span>
                  <span className="dong-mon-gia">{dinhDangTien(d.gia * d.sl)}</span>
                </button>
                <div className="bo-dem">
                  {duocSua ? (
                    <>
                      <button className="nut-tron" onClick={() => giam(d)} aria-label={`Bớt ${d.ten}`}>−</button>
                      <span className="bo-dem-so">{d.sl}</span>
                      <button className="nut-tron" onClick={() => tang(d)} disabled={d.isReward} aria-label={`Thêm ${d.ten}`}>+</button>
                    </>
                  ) : <span className="bo-dem-so">×{d.sl}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <footer className="trang-chan">
          <div className="tong-ket">
            <div><span>Tạm tính</span><span>{dinhDangTien(tien.tamTinh)}</span></div>
            {tien.tienGiam > 0 && (
              <div className="giam"><span>Giảm {ban.discount}%</span><span>−{dinhDangTien(tien.tienGiam)}</span></div>
            )}
            <div><span>VAT 2%</span><span>{dinhDangTien(tien.tienVat)}</span></div>
            <div className="tong"><span>Tổng cộng</span><span>{dinhDangTien(tien.tongCong)}</span></div>
          </div>
          <div className="hang-nut">
            {duocSua && !nhung && <button className="nut nut-phu" onClick={() => setLaSo('thuc_don')}>+ Thêm món</button>}
            {nutChinh && (
              <button className="nut nut-chinh nut-gian" onClick={nutChinh.lam} disabled={dangXuLy}>
                {dangXuLy ? 'Đang xử lý…' : nutChinh.nhan}
              </button>
            )}
          </div>
        </footer>
      )}

      {!nhung && <ThucDon mo={laSo === 'thuc_don'} dong={dongLaSo} tableId={tableId} />}
      <ThanhToan mo={laSo === 'thanh_toan'} dong={dongLaSo} ban={ban} items={items} />
      <ChonHoiVien mo={laSo === 'hoi_vien'} dong={dongLaSo} tableId={tableId} />
      <GopBan mo={laSo === 'gop'} dong={dongLaSo} tableId={tableId} sauKhiGop={chuyenBan} />
      <TachMon mo={laSo === 'tach'} dong={dongLaSo} tableId={tableId} items={items} />

      <LaSo mo={laSo === 'giam_gia'} dong={dongLaSo} tieuDe="Giảm giá">
        <div className="ds-lua-chon">
          {MUC_GIAM_GIA.map((m) => (
            <button key={m.phanTram} className={`lua-chon ${(ban.discount ?? 0) === m.phanTram ? 'chon' : ''}`}
              onClick={async () => {
                if (await lamViec(() => datGiamGia(user, tableId, m.phanTram), m.phanTram ? `Đã giảm ${m.phanTram}%` : 'Đã bỏ giảm giá')) dongLaSo();
              }}>
              {m.ten}
            </button>
          ))}
        </div>
      </LaSo>

      <LaSo mo={laSo === 'them_lua_chon'} dong={dongLaSo} tieuDe="Thao tác với bàn">
        <div className="ds-lua-chon">
          {coQuyen(user, 'discount') && (
            <button className="lua-chon" onClick={() => setLaSo('giam_gia')}>🏷️ Giảm giá {ban.discount ? `(đang ${ban.discount}%)` : ''}</button>
          )}
          <button className="lua-chon" onClick={() => setLaSo('gop')}>🔗 Gộp sang bàn khác</button>
          <button className="lua-chon" onClick={() => setLaSo('tach')}>✂️ Tách món sang bàn khác</button>
        </div>
      </LaSo>
    </div>
  );
}
