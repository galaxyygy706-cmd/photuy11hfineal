/* KHO: danh sách nguyên liệu dạng thẻ (không bảng cuộn ngang), cảnh báo sắp hết/hết,
   nhập/xuất qua lá sớ, sửa định mức, nhật ký biến động, xuất CSV. */

import { useMemo, useState } from 'react';
import { useNguoiDung } from '../../auth/XacThuc';
import { LaSo } from '../../components/LaSo';
import { useThongBao } from '../../components/ThongBao';
import { ChonKy, TrangCon, taiFile } from '../../components/TrangCon';
import { useGiaTri } from '../../hooks/useGiaTri';
import { coQuyen } from '../../quyen/phanQuyen';
import { veMangCoKey } from '../../services/donHangThuan';
import { datDinhMuc, nhapXuatKho, xoaLichSuKho } from '../../services/quanLy';
import { docThoiGian, mucTonKho, taoCSV } from '../../services/quanLyThuan';
import type { NguyenLieu } from '../../types/duLieu';

interface DongLichSu { thoi_gian: string; timestamp?: number; ten_sp: string; hanh_dong: string; so_luong: number; dvt: string; ton_moi: number; nguoi_thuc_hien?: string }

const NHOM: Record<string, string> = { chinh: 'Nguyên liệu chính', phu: 'Nguyên liệu phụ', nuoc: 'Đồ uống' };
type Tab = 'ton' | 'lich_su';

export function Kho({ dong }: { dong: () => void }) {
  const user = useNguoiDung();
  const { chay, xacNhan } = useThongBao();
  const kho = useGiaTri<unknown>('kho');
  const lichSu = useGiaTri<Record<string, DongLichSu>>('lich_su_kho');
  const [tab, setTab] = useState<Tab>('ton');
  const [chon, setChon] = useState<{ key: string; nl: NguyenLieu } | null>(null);

  const ds = useMemo(() => veMangCoKey<NguyenLieu>(kho.giaTri), [kho.giaTri]);
  const canhBao = ds.filter((x) => mucTonKho(x.giaTri) !== 'du').length;
  const dsLichSu = useMemo(() => Object.values(lichSu.giaTri ?? {})
    .map((l) => ({ ...l, luc: l.timestamp ?? docThoiGian(l.thoi_gian)?.getTime() ?? 0 }))
    .sort((a, b) => b.luc - a.luc), [lichSu.giaTri]);

  const xuatCSV = () => taiFile(taoCSV([
    ['Nguyên liệu', 'Tồn', 'Đơn vị', 'Định mức', 'Trạng thái'],
    ...ds.map(({ giaTri: n }) => [n.ten, n.ton, n.dvt, n.limit, { het: 'Hết', sap_het: 'Sắp hết', du: 'Đủ' }[mucTonKho(n)]]),
  ]), `kho-${new Date().toISOString().slice(0, 10)}.csv`);

  return (
    <TrangCon tieuDe="Kho" dong={dong} phai={<button className="nut-icon" onClick={xuatCSV} aria-label="Xuất CSV">⤓</button>}>
      <ChonKy ky={tab} doi={setTab} ds={[['ton', `Tồn kho${canhBao ? ` · ⚠️ ${canhBao}` : ''}`], ['lich_su', 'Nhật ký']] as const} />

      {tab === 'ton' && (kho.dangTai ? <div className="trang-thai-trong">Đang tải…</div> : (
        Object.entries(NHOM).map(([loai, ten]) => {
          const nhom = ds.filter((x) => (x.giaTri.loai ?? 'phu') === loai);
          if (!nhom.length) return null;
          return (
            <section key={loai}>
              <h3 className="nhom-tieu-de">{ten}</h3>
              <div className="ds-the">
                {nhom.map(({ key, giaTri: n }) => {
                  const muc = mucTonKho(n);
                  return (
                    <button key={key} className={`the-kho muc-${muc}`} onClick={() => setChon({ key, nl: n })}
                      disabled={!coQuyen(user, 'manage_stock')}>
                      <span className="the-kho-ten">{n.ten}</span>
                      <span className="the-kho-ton"><b>{n.ton}</b> {n.dvt}</span>
                      <span className="the-kho-phu">
                        {muc === 'het' ? 'Hết hàng' : muc === 'sap_het' ? 'Sắp hết' : 'Đủ'} · định mức {n.limit} {n.dvt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })
      ))}

      {tab === 'lich_su' && (
        <>
          {coQuyen(user, 'full_control') && dsLichSu.length > 0 && (
            <button className="nut nut-phu" onClick={async () => {
              if (await xacNhan('Xoá TOÀN BỘ nhật ký kho?', { chiTiet: 'Không hoàn tác được.', nutDongY: 'Xoá hết', nguyHiem: true })) {
                await chay(() => xoaLichSuKho(user), 'Đã xoá nhật ký kho');
              }
            }}>🗑️ Xoá nhật ký</button>
          )}
          <ul className="ds-dong">
            {dsLichSu.slice(0, 200).map((l, i) => (
              <li key={i} className="dong">
                <div>
                  <div className="dong-chinh">{l.ten_sp}</div>
                  <div className="phu">{l.luc ? new Date(l.luc).toLocaleString('vi-VN') : l.thoi_gian} · {l.nguoi_thuc_hien ?? '—'}</div>
                </div>
                <div className="dong-phai">
                  <div className={l.hanh_dong === 'Nhập kho' ? 'xanh' : 'do'}>{l.hanh_dong === 'Nhập kho' ? '+' : '−'}{l.so_luong} {l.dvt}</div>
                  <div className="phu">còn {l.ton_moi}</div>
                </div>
              </li>
            ))}
            {!dsLichSu.length && <li className="trang-thai-trong">Chưa có biến động nào.</li>}
          </ul>
        </>
      )}

      <LaSoNhapXuat chon={chon} dong={() => setChon(null)} />
    </TrangCon>
  );
}

function LaSoNhapXuat({ chon, dong }: { chon: { key: string; nl: NguyenLieu } | null; dong: () => void }) {
  const user = useNguoiDung();
  const { chay } = useThongBao();
  const [soLuong, setSoLuong] = useState('');
  const [dinhMuc, setDinhMuc] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const nl = chon?.nl;
  const so = Number(soLuong.replace(',', '.'));

  const lam = async (viec: () => Promise<unknown>, tb: string) => {
    setDangGui(true);
    if (await chay(viec, tb)) { setSoLuong(''); setDinhMuc(''); dong(); }
    setDangGui(false);
  };

  return (
    <LaSo mo={!!chon} dong={() => { setSoLuong(''); setDinhMuc(''); dong(); }} tieuDe={nl?.ten ?? ''}>
      {nl && chon && (
        <div className="form">
          <p className="phu">Đang tồn <b>{nl.ton} {nl.dvt}</b> · định mức cảnh báo {nl.limit} {nl.dvt}</p>
          <label>Số lượng ({nl.dvt})
            <input className="o-nhap" inputMode="decimal" value={soLuong} onChange={(e) => setSoLuong(e.target.value)} placeholder="VD: 2.5" autoFocus />
          </label>
          <div className="hang-nut">
            <button className="nut nut-phu nut-gian" disabled={dangGui || !(so > 0)}
              onClick={() => lam(() => nhapXuatKho(user, chon.key, -so), `Đã xuất ${so} ${nl.dvt} ${nl.ten}`)}>− Xuất</button>
            <button className="nut nut-chinh nut-gian" disabled={dangGui || !(so > 0)}
              onClick={() => lam(() => nhapXuatKho(user, chon.key, so), `Đã nhập ${so} ${nl.dvt} ${nl.ten}`)}>+ Nhập</button>
          </div>
          <hr />
          <label>Định mức cảnh báo ({nl.dvt})
            <div className="hang-nut">
              <input className="o-nhap" inputMode="decimal" value={dinhMuc} onChange={(e) => setDinhMuc(e.target.value)} placeholder={String(nl.limit)} />
              <button className="nut nut-phu" disabled={dangGui || dinhMuc === ''}
                onClick={() => lam(() => datDinhMuc(user, chon.key, Number(dinhMuc.replace(',', '.'))), 'Đã lưu định mức')}>Lưu</button>
            </div>
          </label>
        </div>
      )}
    </LaSo>
  );
}
