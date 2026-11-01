import { useEffect, useRef } from 'react';

/* CHUÔNG BÁO — tự tạo tiếng "ding-dong" bằng Web Audio, không cần file âm thanh.
   (App cũ trỏ tới 'https://mixkit.co' — trang chủ, không phải file mp3 — nên chưa từng kêu.)
   Trình duyệt chỉ cho phát âm thanh sau khi người dùng đã chạm vào trang ít nhất một lần;
   màn hình đăng nhập luôn có thao tác chạm nên điều kiện này luôn thoả. */

let ctx: AudioContext | null = null;

export function phatChuong(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime;
    for (const [tanSo, tre] of [[880, 0], [660, 0.18]] as const) {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = tanSo;
      vol.gain.setValueAtTime(0.0001, t0 + tre);
      vol.gain.exponentialRampToValueAtTime(0.35, t0 + tre + 0.02);
      vol.gain.exponentialRampToValueAtTime(0.0001, t0 + tre + 0.5);
      osc.connect(vol).connect(ctx.destination);
      osc.start(t0 + tre);
      osc.stop(t0 + tre + 0.55);
    }
  } catch {
    // Không có Web Audio -> bỏ qua, vẫn còn rung + toast
  }
  navigator.vibrate?.([120, 80, 120]);
}

/** Gọi `baoMoi(cacKeyMoi)` mỗi khi danh sách xuất hiện key chưa từng thấy.
    Lần nhận dữ liệu đầu tiên chỉ ghi nhớ, không báo (tránh kêu loạt khi vừa mở app). */
export function useBaoKhiCoMoi(keys: readonly string[], dangTai: boolean, baoMoi: (moi: string[]) => void): void {
  const daThay = useRef<Set<string> | null>(null);
  const baoMoiRef = useRef(baoMoi);
  baoMoiRef.current = baoMoi;

  const chuoiKey = keys.join('|');
  useEffect(() => {
    if (dangTai) return;
    const hienTai = chuoiKey ? chuoiKey.split('|') : [];
    if (daThay.current === null) {
      daThay.current = new Set(hienTai);
      return;
    }
    const moi = hienTai.filter((k) => !daThay.current!.has(k));
    hienTai.forEach((k) => daThay.current!.add(k));
    if (moi.length) baoMoiRef.current(moi);
  }, [chuoiKey, dangTai]);
}
