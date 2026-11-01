import { useMemo, useState } from 'react';
import { get, ref } from 'firebase/database';
import { useNguoiDung } from '../../auth/XacThuc';
import { LaSo } from '../../components/LaSo';
import { useThongBao } from '../../components/ThongBao';
import { ChonKy, TrangCon } from '../../components/TrangCon';
import { db } from '../../firebase/khoiTao';
import { useGiaTri } from '../../hooks/useGiaTri';
import { coQuyen } from '../../quyen/phanQuyen';
import { veMangCoKey } from '../../services/donHangThuan';
import { capNhatHangHoiVien, luuHoiVien, xoaHoiVien, type DuLieuHoiVien } from '../../services/quanLy';
import { docBoDem, tongBat } from '../../services/tichDiem';
import { dinhDangTien } from '../../services/tinhTien';
import type { HoiVien, LichSuDon } from '../../types/duLieu';

type LocHang = 'tat_ca' | 'VIP' | 'ACTIVE' | 'NEW';

export function HoiVienQL({ dong }: { dong: () => void }) {
  const user = useNguoiDung();
  const { chay } = useThongBao();
  const { giaTri, dangTai } = useGiaTri<unknown>('members');
  const [tuKhoa, setTuKhoa] = useState('');
  const [hang, setHang] = useState<LocHang>('tat_ca');
  const [form, setForm] = useState<{ id: string | null; hv?: HoiVien } | null>(null);
  const quanLy = coQuyen(user, 'manage_member');

  const ds = useMemo(() => {
    const k = tuKhoa.trim().toLowerCase();
    return veMangCoKey<HoiVien>(giaTri)
      .filter(({ giaTri: v }) => v?.ten)
      .filter(({ giaTri: v }) => hang === 'tat_ca' || (v.rank ?? 'NEW') === hang)
      .filter(({ giaTri: v }) => !k || v.ten.toLowerCase().includes(k) || String(v.sdt ?? '').includes(k))
      .sort((a, b) => a.giaTri.ten.localeCompare(b.giaTri.ten, 'vi'));
  }, [giaTri, tuKhoa, hang]);

  return (
    <TrangCon tieuDe="Hội viên" dong={dong}
      phai={quanLy ? <button className="nut-icon" aria-label="Xếp lại hạng theo lịch sử"
        onClick={() => chay(async () => {
          const n = await capNhatHangHoiVien(user);
          return n;
        }, 'Đã xếp lại hạng hội viên')}>⟳</button> : undefined}
      chan={<button className="nut nut-chinh nut-to" onClick={() => setForm({ id: null })}>+ Thêm hội viên</button>}>
      <input className="o-tim" type="search" placeholder="Tìm tên hoặc số điện thoại" value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} />
      <ChonKy ky={hang} doi={setHang} ds={[['tat_ca', 'Tất cả'], ['VIP', '👑 VIP'], ['ACTIVE', '🔥 Thường xuyên'], ['NEW', '🆕 Mới']] as const} />
      {dangTai ? <div className="trang-thai-trong">Đang tải…</div> : (
        <ul className="ds-dong">
          {ds.map(({ key, giaTri: v }) => (
            <li key={key}>
              <button className="dong" onClick={() => setForm({ id: key, hv: v })}>
                <div>
                  <div className="dong-chinh">{v.ten} {v.rank && <span className="the-nho">{v.rank}</span>}</div>
                  <div className="phu">{v.sdt} · tham gia {v.joinedDate ?? '—'}</div>
                </div>
                <div className="dong-phai phu">{tongBat(docBoDem(v))}/10 bát</div>
              </button>
            </li>
          ))}
          {!ds.length && <li className="trang-thai-trong">Không có hội viên phù hợp.</li>}
        </ul>
      )}
      <LaSo mo={!!form} dong={() => setForm(null)} tieuDe={form?.id ? (form.hv?.ten ?? '') : 'Thêm hội viên'} cao="day">
        {form && <FormHoiVien key={form.id ?? 'moi'} id={form.id} hv={form.hv} dong={() => setForm(null)} />}
      </LaSo>
    </TrangCon>
  );
}

function FormHoiVien({ id, hv, dong }: { id: string | null; hv?: HoiVien; dong: () => void }) {
  const user = useNguoiDung();
  const { chay, xacNhan } = useThongBao();
  const duocSua = !id || coQuyen(user, 'manage_member');
  const [d, setD] = useState<DuLieuHoiVien>({ ten: hv?.ten ?? '', sdt: hv?.sdt ?? '', ngaysinh: hv?.ngaysinh ?? '', sothich: hv?.sothich ?? '' });
  const [lichSu, setLichSu] = useState<LichSuDon[] | null>(null);
  const [dangGui, setDangGui] = useState(false);
  const dat = (k: keyof DuLieuHoiVien, v: string) => setD((x) => ({ ...x, [k]: v }));

  const xemLichSu = () => chay(async () => {
    const snap = await get(ref(db, 'history_orders'));
    setLichSu(veMangCoKey<LichSuDon>(snap.val()).map((x) => x.giaTri).filter((o) => o.customerId === id)
      .sort((a, b) => b.timestamp - a.timestamp));
  });

  return (
    <div className="form">
      {hv && (
        <div className="luoi-so">
          <div className="o-so"><span>Túy Tâm</span><b>{docBoDem(hv).tuy_tam_count}</b></div>
          <div className="o-so"><span>Túy Thượng</span><b>{docBoDem(hv).tuy_thuong_count}</b></div>
        </div>
      )}
      <label>Họ tên<input className="o-nhap" value={d.ten} onChange={(e) => dat('ten', e.target.value)} disabled={!duocSua} autoComplete="off" /></label>
      <label>Số điện thoại<input className="o-nhap" type="tel" inputMode="tel" value={d.sdt} onChange={(e) => dat('sdt', e.target.value)} disabled={!duocSua} /></label>
      <label>Ngày sinh<input className="o-nhap" type="date" value={d.ngaysinh} onChange={(e) => dat('ngaysinh', e.target.value)} disabled={!duocSua} /></label>
      <label>Sở thích / ghi chú<input className="o-nhap" value={d.sothich} onChange={(e) => dat('sothich', e.target.value)} disabled={!duocSua} placeholder="VD: không hành, ít bánh" /></label>
      {duocSua && (
        <div className="hang-nut">
          {id && (
            <button className="nut nut-phu" disabled={dangGui} onClick={async () => {
              if (await xacNhan(`Xoá hội viên ${hv?.ten}?`, { chiTiet: 'Điểm tích luỹ sẽ mất.', nutDongY: 'Xoá', nguyHiem: true })) {
                if (await chay(() => xoaHoiVien(user, id), 'Đã xoá hội viên')) dong();
              }
            }}>Xoá</button>
          )}
          <button className="nut nut-chinh nut-gian" disabled={dangGui} onClick={async () => {
            setDangGui(true);
            const ok = await chay(() => luuHoiVien(user, id, d), id ? 'Đã cập nhật' : 'Đã thêm hội viên');
            setDangGui(false);
            if (ok) dong();
          }}>{dangGui ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      )}
      {id && coQuyen(user, 'view_history') && (
        lichSu === null ? <button className="nut nut-phu" onClick={xemLichSu}>Xem lịch sử ăn</button> : (
          <section>
            <h3 className="nhom-tieu-de">{lichSu.length} lần đến · {dinhDangTien(lichSu.reduce((s, o) => s + (Number(o.total) || 0), 0))}</h3>
            <ul className="ds-dong">
              {lichSu.slice(0, 50).map((o, i) => (
                <li key={i} className="dong"><span>{new Date(o.timestamp).toLocaleDateString('vi-VN')} · {o.tableName}</span><b>{dinhDangTien(o.total)}</b></li>
              ))}
            </ul>
          </section>
        )
      )}
    </div>
  );
}
