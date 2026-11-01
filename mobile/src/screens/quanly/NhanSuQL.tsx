/* NHÂN SỰ: danh sách thẻ (đang trong ca / nghỉ), thêm/sửa hồ sơ + tạo luôn tài khoản đăng nhập,
   chấm công hộ, bảng giờ công theo kỳ (tổng giờ × lương giờ = lương tạm tính). */

import { useEffect, useMemo, useState } from 'react';
import { endAt, get, orderByKey, query, ref, startAt } from 'firebase/database';
import { useNguoiDung } from '../../auth/XacThuc';
import { LaSo } from '../../components/LaSo';
import { useThongBao } from '../../components/ThongBao';
import { ChonKy, OTien, TrangCon, taiFile } from '../../components/TrangCon';
import { db } from '../../firebase/khoiTao';
import { useGiaTri } from '../../hooks/useGiaTri';
import { chamCong, luuNhanSu, xoaNhanSu, type CaLam, type DuLieuNhanSu } from '../../services/quanLy';
import {
  BANG_LUONG, CA_LAM, VAI_TRO, VI_TRI_THEO_VAI_TRO, hienGioPhut, khoaNgay, khoangKy, luongGio, soPhutCa, taoCSV,
} from '../../services/quanLyThuan';
import { dinhDangTien } from '../../services/tinhTien';
import type { NhanSu } from '../../types/duLieu';

type HoSo = NhanSu & { daVaoCa?: boolean; daTanCa?: boolean; luongCoBan?: number; ngaySinh?: string; cccd?: string; diachi?: string };
type Tab = 'ds' | 'cong';

export function NhanSuQL({ dong }: { dong: () => void }) {
  const { giaTri, dangTai } = useGiaTri<Record<string, HoSo>>('NhanSu');
  const [tab, setTab] = useState<Tab>('ds');
  const [form, setForm] = useState<{ id: string | null; ns?: HoSo } | null>(null);
  const ds = useMemo(() => Object.entries(giaTri ?? {}).filter(([, v]) => v?.ten)
    .sort(([, a], [, b]) => Number(!!b.daVaoCa && !b.daTanCa) - Number(!!a.daVaoCa && !a.daTanCa) || a.ten.localeCompare(b.ten, 'vi')), [giaTri]);
  const dangLam = ds.filter(([, v]) => v.daVaoCa && !v.daTanCa).length;

  return (
    <TrangCon tieuDe="Nhân sự" dong={dong}
      chan={tab === 'ds' ? <button className="nut nut-chinh nut-to" onClick={() => setForm({ id: null })}>+ Thêm nhân sự</button> : undefined}>
      <ChonKy ky={tab} doi={setTab} ds={[['ds', `Danh sách · ${dangLam} đang làm`], ['cong', 'Giờ công & lương']] as const} />
      {tab === 'ds' && (dangTai ? <div className="trang-thai-trong">Đang tải…</div> : (
        <ul className="ds-dong">
          {ds.map(([id, v]) => <DongNhanSu key={id} id={id} ns={v} mo={() => setForm({ id, ns: v })} />)}
        </ul>
      ))}
      {tab === 'cong' && <BangCong nhanSu={giaTri ?? {}} />}
      <LaSo mo={!!form} dong={() => setForm(null)} tieuDe={form?.id ? (form.ns?.ten ?? '') : 'Thêm nhân sự'} cao="day">
        {form && <FormNhanSu key={form.id ?? 'moi'} id={form.id} ns={form.ns} dong={() => setForm(null)} />}
      </LaSo>
    </TrangCon>
  );
}

function DongNhanSu({ id, ns, mo }: { id: string; ns: HoSo; mo: () => void }) {
  const user = useNguoiDung();
  const { chay } = useThongBao();
  const dangLam = !!ns.daVaoCa && !ns.daTanCa;
  return (
    <li className="dong dong-ns">
      <button className="dong-ns-thong-tin" onClick={mo}>
        <span className={`cham-tron ${dangLam ? 'xanh-nen' : ''}`} aria-hidden />
        <div>
          <div className="dong-chinh">{ns.ten} {ns.capDo === 'ADMIN' && <span className="the-nho">ADMIN</span>}</div>
          <div className="phu">{ns.viTri ?? ns.vaiTro} · {ns.ca ?? '—'}{dangLam ? ' · đang trong ca' : ''}</div>
        </div>
      </button>
      <button className={`nut ${dangLam ? 'nut-phu' : 'nut-xanh'}`}
        onClick={() => chay(async () => {
          const gio = await chamCong(user, id, dangLam ? 'ra' : 'vao');
          return gio;
        }, `${ns.ten}: ${dangLam ? 'tan ca' : 'vào ca'}`)}>
        {dangLam ? 'Tan ca' : 'Vào ca'}
      </button>
    </li>
  );
}

function FormNhanSu({ id, ns, dong }: { id: string | null; ns?: HoSo; dong: () => void }) {
  const user = useNguoiDung();
  const { chay, xacNhan } = useThongBao();
  const vaiTroDau = ns?.vaiTro ?? 'Đại sứ Ngoại Giao';
  const [d, setD] = useState<DuLieuNhanSu>({
    ten: ns?.ten ?? '', sdt: ns?.sdt ?? '', ngaySinh: ns?.ngaySinh ?? '', cccd: ns?.cccd ?? '', diachi: ns?.diachi ?? '',
    username: ns?.username ?? '', capDo: ns?.capDo ?? 'STAFF', vaiTro: vaiTroDau, ca: ns?.ca ?? CA_LAM[0],
    viTri: ns?.viTri ?? VI_TRI_THEO_VAI_TRO[vaiTroDau]?.[0] ?? '',
    luongCoBan: Number(ns?.luongCoBan) || BANG_LUONG[VI_TRI_THEO_VAI_TRO[vaiTroDau]?.[0] ?? ''] || 0, matKhau: '',
  });
  const [dangGui, setDangGui] = useState(false);
  const dat = <K extends keyof DuLieuNhanSu>(k: K, v: DuLieuNhanSu[K]) => setD((x) => ({ ...x, [k]: v }));
  const dsViTri = VI_TRI_THEO_VAI_TRO[d.vaiTro] ?? [];

  return (
    <div className="form">
      <label>Họ tên<input className="o-nhap" value={d.ten} onChange={(e) => dat('ten', e.target.value)} autoComplete="off" /></label>
      <label>Số điện thoại<input className="o-nhap" type="tel" value={d.sdt} onChange={(e) => dat('sdt', e.target.value)} /></label>
      <div className="hang-2">
        <label>Ngày sinh<input className="o-nhap" type="date" value={d.ngaySinh} onChange={(e) => dat('ngaySinh', e.target.value)} /></label>
        <label>CCCD<input className="o-nhap" inputMode="numeric" value={d.cccd} onChange={(e) => dat('cccd', e.target.value)} /></label>
      </div>
      <label>Địa chỉ<input className="o-nhap" value={d.diachi} onChange={(e) => dat('diachi', e.target.value)} /></label>
      <label>Vai trò
        <select className="o-nhap" value={d.vaiTro} onChange={(e) => {
          const vt = e.target.value;
          const viTri = VI_TRI_THEO_VAI_TRO[vt]?.[0] ?? '';
          setD((x) => ({ ...x, vaiTro: vt, viTri, luongCoBan: BANG_LUONG[viTri] ?? x.luongCoBan }));
        }}>
          {VAI_TRO.map((v) => <option key={v}>{v}</option>)}
        </select>
      </label>
      <div className="hang-2">
        <label>Vị trí
          <select className="o-nhap" value={d.viTri} onChange={(e) => { dat('viTri', e.target.value); dat('luongCoBan', BANG_LUONG[e.target.value] ?? d.luongCoBan); }}>
            {dsViTri.map((v) => <option key={v}>{v}</option>)}
          </select>
        </label>
        <label>Ca
          <select className="o-nhap" value={d.ca} onChange={(e) => dat('ca', e.target.value)}>
            {CA_LAM.map((v) => <option key={v}>{v}</option>)}
          </select>
        </label>
      </div>
      <label>Lương tháng (đ) — {dinhDangTien(luongGio(d.luongCoBan))}/giờ
        <OTien key={d.viTri} giaTri={d.luongCoBan} doi={(v) => dat('luongCoBan', v)} />
      </label>
      <div className="hang-2">
        <label>Tên đăng nhập<input className="o-nhap" value={d.username} onChange={(e) => dat('username', e.target.value)} autoCapitalize="none" autoComplete="off" /></label>
        <label>Cấp độ
          <select className="o-nhap" value={d.capDo} onChange={(e) => dat('capDo', e.target.value as 'ADMIN' | 'STAFF')}>
            <option value="STAFF">STAFF</option><option value="ADMIN">ADMIN</option>
          </select>
        </label>
      </div>
      {!id && (
        <label>Mật khẩu đăng nhập (≥ 6 ký tự)
          <input className="o-nhap" type="password" value={d.matKhau} onChange={(e) => dat('matKhau', e.target.value)} autoComplete="new-password" />
        </label>
      )}
      {id && <p className="phu">Đổi mật khẩu: nhân viên tự đổi, hoặc xoá và tạo lại tài khoản. App mới không đọc/ghi mật khẩu trong hồ sơ.</p>}
      <div className="hang-nut">
        {id && id !== user.nhanSuId && (
          <button className="nut nut-phu" disabled={dangGui} onClick={async () => {
            if (await xacNhan(`Xoá hồ sơ ${ns?.ten}?`, { chiTiet: 'Nhân viên sẽ không đăng nhập app mới được nữa.', nutDongY: 'Xoá', nguyHiem: true })) {
              if (await chay(() => xoaNhanSu(user, id), 'Đã xoá nhân sự')) dong();
            }
          }}>Xoá</button>
        )}
        <button className="nut nut-chinh nut-gian" disabled={dangGui} onClick={async () => {
          setDangGui(true);
          const ok = await chay(() => luuNhanSu(user, id, d), id ? 'Đã cập nhật hồ sơ' : 'Đã thêm nhân sự + tài khoản đăng nhập');
          setDangGui(false);
          if (ok) dong();
        }}>{dangGui ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </div>
  );
}

/** Giờ công theo kỳ: đọc ChamCong theo khoảng khoá ngày (không tải toàn bộ lịch sử). */
function BangCong({ nhanSu }: { nhanSu: Record<string, HoSo> }) {
  const { bao } = useThongBao();
  const [ky, setKy] = useState<'tuan' | 'thang'>('thang');
  const [ca, setCa] = useState<{ ngay: string; nsId: string; ca: CaLam }[] | null>(null);
  const [tu, den] = khoangKy(ky);

  useEffect(() => {
    let huy = false;
    setCa(null);
    get(query(ref(db, 'ChamCong'), orderByKey(), startAt(khoaNgay(new Date(tu))), endAt(khoaNgay(new Date(den - 1)))))
      .then((snap) => {
        const kq: { ngay: string; nsId: string; ca: CaLam }[] = [];
        snap.forEach((ngay) => {
          ngay.forEach((ns) => {
            ns.forEach((c) => { kq.push({ ngay: ngay.key!, nsId: ns.key!, ca: c.val() as CaLam }); });
          });
        });
        if (!huy) setCa(kq);
      })
      .catch((e) => { bao((e as Error).message, 'loi'); if (!huy) setCa([]); });
    return () => { huy = true; };
  }, [tu, den, bao]);

  const tong = useMemo(() => {
    const m: Record<string, { phut: number; soCa: number; moCa: number }> = {};
    for (const { nsId, ca: c } of ca ?? []) {
      m[nsId] ??= { phut: 0, soCa: 0, moCa: 0 };
      const p = soPhutCa(c.gioVao, c.gioRa);
      if (p == null) m[nsId].moCa += 1;
      else { m[nsId].phut += p; m[nsId].soCa += 1; }
    }
    return Object.entries(m).map(([id, t]) => {
      const ns = nhanSu[id];
      const coLuong = Number(ns?.luongCoBan) > 0;
      const luong = Math.round((t.phut / 60) * luongGio(Number(ns?.luongCoBan) || 0));
      return { id, ten: ns?.ten ?? (ca?.find((x) => x.nsId === id)?.ca.ten ?? id), ...t, luong, coLuong };
    }).sort((a, b) => b.phut - a.phut);
  }, [ca, nhanSu]);

  const xuatCSV = () => taiFile(taoCSV([
    ['Ngày', 'Nhân viên', 'Giờ vào', 'Giờ ra', 'Số phút'],
    ...(ca ?? []).sort((a, b) => a.ngay.localeCompare(b.ngay)).map(({ ngay, ca: c }) => [ngay, c.ten, c.gioVao, c.gioRa || '(đang làm)', soPhutCa(c.gioVao, c.gioRa) ?? '']),
  ]), `cham-cong-${ky}-${khoaNgay(new Date())}.csv`);

  return (
    <>
      <div className="hang-nut">
        <ChonKy ky={ky} doi={setKy} ds={[['tuan', 'Tuần này'], ['thang', 'Tháng này']] as const} />
        <button className="nut nut-phu" onClick={xuatCSV} disabled={!ca?.length}>⤓ CSV</button>
      </div>
      {ca === null ? <div className="trang-thai-trong">Đang tải chấm công…</div> : (
        <ul className="ds-dong">
          {tong.map((t) => (
            <li key={t.id} className="dong">
              <div>
                <div className="dong-chinh">{t.ten}</div>
                <div className="phu">{t.soCa} ca · {hienGioPhut(t.phut)}{t.moCa ? ` · ${t.moCa} ca chưa tan` : ''}</div>
              </div>
              <div className="dong-phai">
                {t.coLuong ? (
                  <>
                    <div className="dong-chinh">{dinhDangTien(t.luong)}</div>
                    <div className="phu">lương tạm tính</div>
                  </>
                ) : <div className="phu">Chưa đặt lương<br />trong hồ sơ</div>}
              </div>
            </li>
          ))}
          {!tong.length && <li className="trang-thai-trong">Chưa có ca làm nào trong kỳ.</li>}
        </ul>
      )}
    </>
  );
}
