/* BÁO CÁO DOANH THU (taiBaoCaoDoanhThu ở app cũ): chọn kỳ, ô số liệu + so kỳ trước,
   hội viên / vãng lai, doanh thu theo giờ, món bán chạy, danh sách đơn có chi tiết, xuất CSV. */

import { useEffect, useMemo, useState } from 'react';
import { get, ref } from 'firebase/database';
import { useNguoiDung } from '../../auth/XacThuc';
import { LaSo } from '../../components/LaSo';
import { useThongBao } from '../../components/ThongBao';
import { ChonKy, TrangCon, taiFile } from '../../components/TrangCon';
import { db } from '../../firebase/khoiTao';
import { batBuocQuyen } from '../../quyen/phanQuyen';
import { veMang, veMangCoKey } from '../../services/donHangThuan';
import {
  TEN_KY, khoaNgay, khoangKy, phanTramTang, taoCSV, tongHopDoanhThu, type Ky, type LocKhach,
} from '../../services/quanLyThuan';
import { dinhDangTien } from '../../services/tinhTien';
import type { DongMon, LichSuDon } from '../../types/duLieu';

const KY_BAO_CAO: readonly (readonly [Ky, string])[] = (['hom_nay', 'tuan', 'thang', 'nam'] as const).map((k) => [k, TEN_KY[k]] as const);
const TEN_KY_TRUOC: Record<Ky, string> = { hom_nay: 'hôm qua', tuan: 'tuần trước', thang: 'kỳ trước', nam: 'năm trước', tat_ca: '' };

export function BaoCao({ dong }: { dong: () => void }) {
  const user = useNguoiDung();
  const { bao } = useThongBao();
  const [ds, setDs] = useState<{ key: string; giaTri: LichSuDon }[] | null>(null);
  const [ky, setKy] = useState<Ky>('hom_nay');
  const [locKhach, setLocKhach] = useState<LocKhach>('tat_ca');
  const [tuKhoa, setTuKhoa] = useState('');
  const [xem, setXem] = useState<LichSuDon | null>(null);
  const [lanTai, setLanTai] = useState(0);

  // Báo cáo đọc 1 lần (không lắng nghe realtime cả node lịch sử — nặng); kéo nút ↻ để tải lại.
  useEffect(() => {
    let huy = false;
    (async () => {
      try {
        batBuocQuyen(user, 'view_history');
        const snap = await get(ref(db, 'history_orders'));
        if (!huy) setDs(veMangCoKey<LichSuDon>(snap.val()));
      } catch (e) {
        bao((e as Error).message, 'loi');
        if (!huy) setDs([]);
      }
    })();
    return () => { huy = true; };
  }, [user, bao, lanTai]);

  const [tu, den] = khoangKy(ky);
  const r = useMemo(() => tongHopDoanhThu(ds ?? [], tu, den, locKhach, tuKhoa), [ds, tu, den, locKhach, tuKhoa]);
  const maxGio = Math.max(1, ...r.theoGio);
  const tang = phanTramTang(r.tong, r.kyTruoc.tong);

  const xuatCSV = () => taiFile(taoCSV([
    ['Thời gian', 'Bàn', 'Khách', 'SĐT', 'Tạm tính', 'Giảm giá', 'VAT', 'Tổng', 'Số bát', 'Người thu'],
    ...r.ds.map(({ giaTri: o }) => [new Date(o.timestamp).toLocaleString('vi-VN'), o.tableName, o.customerName, o.customerPhone,
      o.subTotal, o.discount, o.vat ?? '', o.total, o.totalBowls, o.paidBy ?? '']),
  ]), `doanh-thu-${ky}-${khoaNgay(new Date())}.csv`);

  return (
    <TrangCon tieuDe="Báo cáo doanh thu" dong={dong} phai={
      <span className="hang-icon">
        <button className="nut-icon" onClick={() => { setDs(null); setLanTai((x) => x + 1); }} aria-label="Tải lại">↻</button>
        <button className="nut-icon" onClick={xuatCSV} aria-label="Xuất CSV">⤓</button>
      </span>}>
      <ChonKy ky={ky} doi={setKy} ds={KY_BAO_CAO} />
      {ds === null ? <div className="trang-thai-trong">Đang tải lịch sử đơn…</div> : (
        <>
          <div className="o-so lon">
            <span>Doanh thu {TEN_KY[ky].toLowerCase()}</span>
            <b>{dinhDangTien(r.tong)}</b>
            <span className={`phu ${tang == null ? '' : tang >= 0 ? 'xanh' : 'do'}`}>
              {tang == null ? `Không có số liệu ${TEN_KY_TRUOC[ky]}` : `${tang >= 0 ? '▲' : '▼'} ${Math.abs(tang)}% so với ${TEN_KY_TRUOC[ky]}`}
            </span>
          </div>
          <div className="luoi-so">
            <div className="o-so"><span>Số đơn</span><b>{r.soDon}</b></div>
            <div className="o-so"><span>TB / đơn</span><b>{dinhDangTien(r.trungBinh)}</b></div>
            <div className="o-so"><span>Hội viên</span><b>{dinhDangTien(r.hoiVien)}</b></div>
            <div className="o-so"><span>Vãng lai</span><b>{dinhDangTien(r.vangLai)}</b></div>
          </div>

          {r.tong > 0 && (
            <section className="the-khoi">
              <h3 className="nhom-tieu-de">Theo giờ</h3>
              <div className="bieu-do-gio" role="img" aria-label="Doanh thu theo giờ trong ngày">
                {r.theoGio.map((v, h) => (
                  <div key={h} className="cot-gio" title={`${h}h: ${dinhDangTien(v)}`}>
                    <div className="cot-gio-thanh" style={{ height: `${(v / maxGio) * 100}%` }} />
                    {h % 3 === 0 && <span>{h}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {r.topMon.length > 0 && (
            <section className="the-khoi">
              <h3 className="nhom-tieu-de">Món bán chạy</h3>
              {r.topMon.map((m, i) => (
                <div key={m.ten} className="thanh-ngang">
                  <div className="thanh-ngang-nhan"><span>{i + 1}. {m.ten}</span><span>{m.sl} suất · {dinhDangTien(m.tien)}</span></div>
                  <div className="thanh-ngang-nen"><div style={{ width: `${(m.sl / r.topMon[0]!.sl) * 100}%` }} /></div>
                </div>
              ))}
            </section>
          )}

          <h3 className="nhom-tieu-de">Đơn đã thanh toán</h3>
          <div className="chip-hang">
            {([['tat_ca', 'Tất cả'], ['hoi_vien', 'Hội viên'], ['vang_lai', 'Vãng lai']] as const).map(([k, t]) => (
              <button key={k} className={`chip ${locKhach === k ? 'chon' : ''}`} onClick={() => setLocKhach(k)}>{t}</button>
            ))}
          </div>
          <input className="o-tim" type="search" placeholder="Tìm bàn, tên khách, SĐT" value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} />
          <ul className="ds-dong">
            {r.ds.slice(0, 300).map(({ key, giaTri: o }) => (
              <li key={key}>
                <button className="dong" onClick={() => setXem(o)}>
                  <div>
                    <div className="dong-chinh">{o.tableName} · {o.customerName}</div>
                    <div className="phu">{new Date(o.timestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}{o.paidBy ? ` · ${o.paidBy}` : ''}</div>
                  </div>
                  <div className="dong-phai dong-chinh">{dinhDangTien(o.total)}</div>
                </button>
              </li>
            ))}
            {!r.ds.length && <li className="trang-thai-trong">Không có đơn nào.</li>}
          </ul>
        </>
      )}

      <LaSo mo={!!xem} dong={() => setXem(null)} tieuDe={xem ? `${xem.tableName} · ${new Date(xem.timestamp).toLocaleString('vi-VN')}` : ''}>
        {xem && (
          <div className="hoa-don">
            {veMang<DongMon>(xem.items).map((i, k) => (
              <div key={k} className="hoa-don-dong"><span>{i.sl} × {i.ten}</span><span>{dinhDangTien(i.gia * i.sl)}</span></div>
            ))}
            <hr />
            <div className="hoa-don-dong"><span>Tạm tính</span><span>{dinhDangTien(xem.subTotal)}</span></div>
            {xem.discount > 0 && <div className="hoa-don-dong giam"><span>Giảm giá</span><span>−{dinhDangTien(xem.discount)}</span></div>}
            {xem.vat != null && <div className="hoa-don-dong"><span>VAT</span><span>{dinhDangTien(xem.vat)}</span></div>}
            <div className="hoa-don-dong tong"><span>Tổng</span><span>{dinhDangTien(xem.total)}</span></div>
            <p className="phu">Khách: {xem.customerName}{xem.customerPhone ? ` · ${xem.customerPhone}` : ''}{xem.paidBy ? ` · Thu: ${xem.paidBy}` : ''}</p>
          </div>
        )}
      </LaSo>
    </TrangCon>
  );
}
