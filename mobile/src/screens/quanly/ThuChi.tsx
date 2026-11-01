import { useMemo, useState } from 'react';
import { useNguoiDung } from '../../auth/XacThuc';
import { LaSo } from '../../components/LaSo';
import { useThongBao } from '../../components/ThongBao';
import { ChonKy, OTien, TrangCon, taiFile } from '../../components/TrangCon';
import { useGiaTri } from '../../hooks/useGiaTri';
import { veMangCoKey } from '../../services/donHangThuan';
import { suaThuChi, themThuChi, xoaThuChi, type DuLieuThuChi } from '../../services/quanLy';
import {
  DANH_MUC_THU_CHI, PHUONG_THUC, TEN_KY, khoaNgay, taoCSV, tongHopThuChi, type KhoanThuChi, type Ky,
} from '../../services/quanLyThuan';
import { dinhDangTien } from '../../services/tinhTien';

const DS_KY = (Object.keys(TEN_KY) as Ky[]).map((k) => [k, TEN_KY[k]] as const);

export function ThuChi({ dong }: { dong: () => void }) {
  const { giaTri, dangTai } = useGiaTri<unknown>('thu_chi');
  const [ky, setKy] = useState<Ky>('thang');
  const [form, setForm] = useState<{ key: string | null; cu?: KhoanThuChi } | null>(null);
  const r = useMemo(() => tongHopThuChi(veMangCoKey<KhoanThuChi>(giaTri), ky), [giaTri, ky]);
  const maxDm = Math.max(1, ...Object.values(r.theoDanhMuc));

  const xuatCSV = () => taiFile(taoCSV([
    ['Thời gian', 'Loại', 'Nội dung', 'Danh mục', 'Phương thức', 'Số tiền', 'Người tạo'],
    ...r.ds.map(({ giaTri: k, luc }) => [luc ? new Date(luc).toLocaleString('vi-VN') : k.thoi_gian, k.loai === 'thu' ? 'Thu' : 'Chi',
      k.noi_dung, k.danh_muc, k.phuong_thuc, k.so_tien, k.nguoi_tao ?? '']),
  ]), `thu-chi-${ky}-${khoaNgay(new Date())}.csv`);

  return (
    <TrangCon tieuDe="Thu chi" dong={dong} phai={<button className="nut-icon" onClick={xuatCSV} aria-label="Xuất CSV">⤓</button>}
      chan={<button className="nut nut-chinh nut-to" onClick={() => setForm({ key: null })}>+ Thêm khoản thu / chi</button>}>
      <ChonKy ky={ky} doi={setKy} ds={DS_KY} />
      <div className="luoi-so">
        <div className="o-so"><span>Thu</span><b className="xanh">{dinhDangTien(r.thu)}</b></div>
        <div className="o-so"><span>Chi</span><b className="do">{dinhDangTien(r.chi)}</b></div>
        <div className="o-so rong"><span>Chênh lệch</span><b className={r.chenhLech >= 0 ? 'xanh' : 'do'}>{dinhDangTien(r.chenhLech)}</b></div>
      </div>

      {Object.keys(r.theoDanhMuc).length > 0 && (
        <section className="the-khoi">
          <h3 className="nhom-tieu-de">Chi theo danh mục</h3>
          {Object.entries(r.theoDanhMuc).sort((a, b) => b[1] - a[1]).map(([dm, tien]) => (
            <div key={dm} className="thanh-ngang">
              <div className="thanh-ngang-nhan"><span>{dm}</span><span>{dinhDangTien(tien)}</span></div>
              <div className="thanh-ngang-nen"><div style={{ width: `${(tien / maxDm) * 100}%` }} /></div>
            </div>
          ))}
        </section>
      )}

      <h3 className="nhom-tieu-de">{r.ds.length} khoản</h3>
      {dangTai ? <div className="trang-thai-trong">Đang tải…</div> : (
        <ul className="ds-dong">
          {r.ds.map(({ key, giaTri: k, luc }) => (
            <li key={key}>
              <button className="dong" onClick={() => setForm({ key, cu: k })}>
                <div>
                  <div className="dong-chinh">{k.noi_dung}</div>
                  <div className="phu">{luc ? new Date(luc).toLocaleDateString('vi-VN') : k.thoi_gian} · {k.danh_muc} · {k.phuong_thuc}</div>
                </div>
                <div className={`dong-phai dong-chinh ${k.loai === 'thu' ? 'xanh' : 'do'}`}>
                  {k.loai === 'thu' ? '+' : '−'}{dinhDangTien(k.so_tien)}
                </div>
              </button>
            </li>
          ))}
          {!r.ds.length && <li className="trang-thai-trong">Không có khoản nào trong {TEN_KY[ky].toLowerCase()}.</li>}
        </ul>
      )}
      <FormThuChi form={form} dong={() => setForm(null)} />
    </TrangCon>
  );
}

function FormThuChi({ form, dong }: { form: { key: string | null; cu?: KhoanThuChi } | null; dong: () => void }) {
  const mo = !!form;
  // key thay đổi -> dựng lại form với giá trị mới
  return (
    <LaSo mo={mo} dong={dong} tieuDe={form?.key ? 'Sửa khoản' : 'Thêm khoản thu / chi'} cao="day">
      {form && <NoiDungForm key={form.key ?? 'moi'} keyKhoan={form.key} cu={form.cu} dong={dong} />}
    </LaSo>
  );
}

function NoiDungForm({ keyKhoan, cu, dong }: { keyKhoan: string | null; cu?: KhoanThuChi; dong: () => void }) {
  const user = useNguoiDung();
  const { chay, xacNhan } = useThongBao();
  const [d, setD] = useState<DuLieuThuChi>({
    loai: cu?.loai ?? 'chi', so_tien: cu?.so_tien ?? 0, noi_dung: cu?.noi_dung ?? '',
    danh_muc: cu?.danh_muc ?? 'Nguyên liệu', phuong_thuc: cu?.phuong_thuc ?? 'Tiền mặt', ngay: '',
  });
  const [dangGui, setDangGui] = useState(false);
  const dat = <K extends keyof DuLieuThuChi>(k: K, v: DuLieuThuChi[K]) => setD((x) => ({ ...x, [k]: v }));

  const luu = async () => {
    setDangGui(true);
    const ok = await chay(() => (keyKhoan ? suaThuChi(user, keyKhoan, d) : themThuChi(user, d)), keyKhoan ? 'Đã cập nhật' : 'Đã thêm');
    setDangGui(false);
    if (ok) dong();
  };

  return (
    <div className="form">
      <div className="chip-hang">
        <button className={`chip ${d.loai === 'thu' ? 'chon' : ''}`} onClick={() => dat('loai', 'thu')}>Thu</button>
        <button className={`chip ${d.loai === 'chi' ? 'chon' : ''}`} onClick={() => dat('loai', 'chi')}>Chi</button>
      </div>
      <label>Số tiền (đ)<OTien giaTri={d.so_tien} doi={(v) => dat('so_tien', v)} /></label>
      <label>Nội dung<input className="o-nhap" value={d.noi_dung} onChange={(e) => dat('noi_dung', e.target.value)} placeholder="VD: Mua 5kg thịt bò" /></label>
      <label>Danh mục
        <select className="o-nhap" value={d.danh_muc} onChange={(e) => dat('danh_muc', e.target.value)}>
          {DANH_MUC_THU_CHI.map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>
      <label>Phương thức
        <select className="o-nhap" value={d.phuong_thuc} onChange={(e) => dat('phuong_thuc', e.target.value)}>
          {PHUONG_THUC.map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>
      <label>Ngày {keyKhoan ? '(để trống = giữ nguyên)' : '(để trống = hôm nay)'}
        <input className="o-nhap" type="date" value={d.ngay} max={khoaNgay(new Date())} onChange={(e) => dat('ngay', e.target.value)} />
      </label>
      {cu?.lich_su_sua?.length ? (
        <details className="phu"><summary>Đã sửa {cu.lich_su_sua.length} lần</summary>
          {cu.lich_su_sua.map((l, i) => <div key={i}>{l.thoi_gian_sua} · {l.nguoi_sua}: "{l.noi_dung_cu}" {dinhDangTien(l.so_tien_cu)}</div>)}
        </details>
      ) : null}
      <div className="hang-nut">
        {keyKhoan && (
          <button className="nut nut-phu" disabled={dangGui} onClick={async () => {
            if (await xacNhan('Xoá khoản này?', { nutDongY: 'Xoá', nguyHiem: true })) {
              if (await chay(() => xoaThuChi(user, keyKhoan), 'Đã xoá')) dong();
            }
          }}>Xoá</button>
        )}
        <button className="nut nut-chinh nut-gian" disabled={dangGui} onClick={luu}>{dangGui ? 'Đang lưu…' : 'Lưu'}</button>
      </div>
    </div>
  );
}
