import React, { useState } from 'react';
import {
  X,
  Check,
  ShoppingBag,
  Phone,
  MapPin,
  User,
  Calendar,
  ExternalLink,
  MessageCircle,
  Heart,
  Send,
  Mail
} from 'lucide-react';
import { TextConfig, PosterSettings } from '../types';
import confetti from 'canvas-confetti';

export interface GatePhotoMaterial {
  id: string;
  name: string;
  shortDesc: string;
  highlightTag: string;
  highlightColor: string;
  imagePreview: string;
  popular?: boolean;
}

export const GATE_PHOTO_MATERIALS: GatePhotoMaterial[] = [
  {
    id: 'ep-go-laminate',
    name: 'Ảnh Cổng Ép Gỗ Laminate',
    shortDesc: 'Bề mặt cán màng lụa mờ mịn, không lóa đèn flash tiệc cưới, chống ẩm mốc bền màu.',
    highlightTag: 'Bán chạy nhất ⭐',
    highlightColor: 'bg-amber-100 text-amber-800 border-amber-200',
    popular: true,
    imagePreview: 'https://www.photobookvietnam.net/images/thb_Ep_Go_Laminate.png'
  },
  {
    id: 'ep-go-khung-pro',
    name: 'Ảnh Cổng Ép Gỗ Khung PRO',
    shortDesc: 'Dòng sản phẩm ép gỗ Pro chuyên nghiệp viền cạnh chắc chắn, chuẩn studio cao cấp.',
    highlightTag: 'Chuẩn Studio 🏆',
    highlightColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    imagePreview: 'https://www.photobookvietnam.net/images/thb_Ep_Go_Pro.png'
  },
  {
    id: 'phale-14-mau',
    name: 'Ảnh Cổng Pha Lê 14 Màu',
    shortDesc: 'Mặt tráng gương pha lê bóng bẩy lấp lánh, màu sắc rực rỡ và chiều sâu 3D sang trọng.',
    highlightTag: 'Tráng Gương Cao Cấp ✨',
    highlightColor: 'bg-sky-100 text-sky-800 border-sky-200',
    popular: true,
    imagePreview: 'https://www.photobookvietnam.net/images/thb_phale_14maus.png'
  },
  {
    id: 'canvas-cang-khung',
    name: 'Ảnh Cổng Canvas Căng Khung',
    shortDesc: 'Vải Canvas gân dệt mỹ thuật tự nhiên mộc mạc, siêu nhẹ thích hợp tiệc ngoài trời & Rustic.',
    highlightTag: 'Phong Cách Rustic 🌿',
    highlightColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    imagePreview: 'https://www.photobookvietnam.net/images/thb_canvas_cang_khung.png'
  },
  {
    id: 'khung-4k',
    name: 'Ảnh Cổng Ép Gỗ Khung 4K',
    shortDesc: 'Công nghệ in Ultra 4K sắc nét từng chi tiết, viền Slim thanh thoát phong cách Hàn Quốc.',
    highlightTag: 'Style Hàn Quốc 🇰🇷',
    highlightColor: 'bg-purple-100 text-purple-800 border-purple-200',
    imagePreview: 'https://www.photobookvietnam.net/images/thb_epgo_khung4k_1.png'
  },
  {
    id: 'khung-titan',
    name: 'Ảnh Cổng Ép Gỗ Khung Titan',
    shortDesc: 'Viền khung Titan kim loại bóng gương ánh kim hiện đại, tạo điểm nhấn cực kỳ sang trọng.',
    highlightTag: 'Khung Kim Loại Titan 💎',
    highlightColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    imagePreview: 'https://www.photobookvietnam.net/images/thb_epgo_khungtitan.png'
  },
  {
    id: 'khung-doi',
    name: 'Ảnh Cổng Khung Đôi Nghệ Thuật',
    shortDesc: 'Kết cấu lồng 2 tầng khung tạo độ sâu tầng lớp tinh tế, phong cách tranh triển lãm Gallery.',
    highlightTag: 'Thiết Kế Khung Đôi 🖼️',
    highlightColor: 'bg-rose-100 text-rose-800 border-rose-200',
    imagePreview: 'https://www.photobookvietnam.net/images/thb_Anh%20cong%20khung%20doi.png'
  },
  {
    id: 'khung-6k',
    name: 'Ảnh Cổng Ép Gỗ Khung 6K Vàng',
    shortDesc: 'Độ phân giải Ultra 6K dải màu siêu rộng kết hợp viền ánh vàng hoàng gia lộng lẫy.',
    highlightTag: 'Siêu Nét Ultra 6K 👑',
    highlightColor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    imagePreview: 'https://www.photobookvietnam.net/images/thb_Khung_6K_vang.png'
  }
];

interface OrderPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  textConfig: TextConfig;
  posterSettings: PosterSettings;
  onGetDesignDataUrl?: () => Promise<string | null>;
}

export const OrderPrintModal: React.FC<OrderPrintModalProps> = ({
  isOpen,
  onClose,
  textConfig,
  posterSettings,
  onGetDesignDataUrl,
}) => {
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('ep-go-laminate');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Admin Download State
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [adminPwd, setAdminPwd] = useState<string>('');
  const [adminError, setAdminError] = useState<boolean>(false);
  const [isAdminDownloading, setIsAdminDownloading] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentMaterial = GATE_PHOTO_MATERIALS.find((m) => m.id === selectedMaterialId) || GATE_PHOTO_MATERIALS[0];

  // Map Aspect Ratio to Size String
  const sizeMap: Record<string, string> = {
    '3:2': '90 x 60 cm (Khổ Ngang Chuẩn)',
    '2:3': '60 x 90 cm (Khổ Đứng Chuẩn)',
    '3:4': '50 x 75 cm (Khổ Đứng Vừa)',
    '1:1': '90 x 90 cm (Khổ Vuông Nghệ Thuật)',
    '9:16': '60 x 120 cm (Khổ Dọc Panorama)',
  };
  const currentSize = sizeMap[posterSettings.aspectRatio] || '60 x 90 cm';

  const handleSendOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone.trim()) {
      alert('Vui lòng nhập số điện thoại hoặc Zalo để Photobook Vietnam liên hệ tư vấn và gửi bản in thử!');
      return;
    }

    setIsSubmitting(true);

    let designImageData: string | null = null;
    if (onGetDesignDataUrl) {
      try {
        designImageData = await onGetDesignDataUrl();
      } catch (err) {
        console.warn('Could not capture design image preview:', err);
      }
    }

    const payload = {
      groomName: textConfig.groomName || 'Chú rể',
      brideName: textConfig.brideName || 'Cô dâu',
      weddingDate: textConfig.dateText.replace('\n', ' - '),
      size: currentSize,
      materialId: currentMaterial.id,
      materialName: currentMaterial.name,
      customerName: customerName.trim() || 'Khách hàng',
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      customerAddress: customerAddress.trim() || 'Tư vấn giao hàng tận nơi',
      notes: notes.trim() || 'Không có',
      designImageData: designImageData,
    };

    try {
      const res = await fetch('/api/order/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      await res.json();
    } catch (err) {
      console.error('Error submitting order:', err);
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);

      // Trigger confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (_) {}
    }
  };

  const handleOpenZalo = () => {
    // Generate text message for Zalo
    const message = encodeURIComponent(
      `Chào Photobook Vietnam, tôi muốn đặt in Ảnh Cổng Cưới:\n` +
      `- Dâu rể: ${textConfig.groomName || 'Chú rể'} & ${textConfig.brideName || 'Cô dâu'}\n` +
      `- Kích thước: ${currentSize}\n` +
      `- Chất liệu: ${currentMaterial.name}\n` +
      `- Khách hàng: ${customerName || 'Khách hàng'} - SĐT: ${customerPhone}\n` +
      `- Địa chỉ: ${customerAddress || 'Tư vấn giao hàng'}\n` +
      `- Ghi chú: ${notes || 'Không có'}`
    );
    
    window.open(`https://zalo.me/0938023079?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-6xl w-full shadow-2xl overflow-hidden border border-stone-200 my-auto max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-500 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-serif leading-tight">
                  Đặt In Ảnh Cổng Cưới Cao Cấp
                </h2>
                <span className="text-[11px] bg-white/25 text-white font-sans font-semibold px-2 py-0.5 rounded-full hidden sm:inline-block">
                  Photobook Vietnam
                </span>
              </div>
              <p className="text-xs text-sky-100 font-normal mt-0.5">
                Chọn chất liệu ép gỗ chuẩn studio & nhận thành phẩm hoàn thiện tận nơi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {!isSubmitted ? (
            <>
              {/* Current Design Quick Summary */}
              <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
                    <Heart className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <div className="text-xs text-sky-700 font-semibold uppercase tracking-wider">
                      Mẫu Thiết Kế Hiện Tại
                    </div>
                    <div className="text-sm font-bold text-stone-800">
                      {textConfig.groomName || 'CHÚ RỂ'} {textConfig.connector || '&'} {textConfig.brideName || 'CÔ DÂU'}
                      <span className="text-xs font-normal text-stone-500 ml-2">({textConfig.dateText.replace('\n', ' - ')})</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-sky-200 self-start sm:self-auto shadow-2xs">
                  <span className="text-xs text-stone-500">Kích thước in:</span>
                  <span className="text-xs font-bold text-sky-700">{currentSize}</span>
                </div>
              </div>

              {/* Step 1: Choose Gate Photo Material */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs flex items-center justify-center font-semibold">1</span>
                    Chọn Chất Liệu Ảnh Cổng Cưới
                  </h3>
                  <a
                    href="https://www.photobookvietnam.net/sanpham-epgo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 font-medium hover:underline"
                  >
                    <span>Xem chi tiết chất liệu tại website</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
                  {GATE_PHOTO_MATERIALS.map((mat) => {
                    const isSelected = mat.id === selectedMaterialId;
                    return (
                      <div
                        key={mat.id}
                        onClick={() => setSelectedMaterialId(mat.id)}
                        className={`group relative rounded-2xl border-2 overflow-hidden transition-all duration-200 cursor-pointer flex flex-col ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20 shadow-md scale-[1.01]'
                            : 'border-stone-200 hover:border-stone-300 bg-white hover:shadow-xs'
                        }`}
                      >
                        {/* Material Product Image Preview (Portrait Vertical display) */}
                        <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] bg-stone-50 p-2 sm:p-3 overflow-hidden flex items-center justify-center border-b border-stone-100">
                          <img
                            src={mat.imagePreview}
                            alt={mat.name}
                            className="w-full h-full object-contain drop-shadow-xs transition duration-300 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />

                          {/* Top Badge */}
                          <div className="absolute top-2.5 left-2.5 z-10">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs backdrop-blur-xs ${mat.highlightColor}`}>
                              {mat.highlightTag}
                            </span>
                          </div>

                          {/* Selection Checkmark */}
                          <div
                            className={`absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full border flex items-center justify-center shadow-xs transition ${
                              isSelected
                                ? 'bg-sky-600 border-sky-600 text-white'
                                : 'border-stone-300 bg-white/90 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                          </div>
                        </div>

                        {/* Card Info */}
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">
                              {mat.name}
                            </h4>
                            <p className="text-[11px] text-stone-500 mt-1 leading-relaxed line-clamp-2">
                              {mat.shortDesc}
                            </p>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between">
                            <span className={`text-[11px] font-medium ${isSelected ? 'text-sky-600 font-bold' : 'text-stone-400 group-hover:text-stone-600'}`}>
                              {isSelected ? '✓ Đã chọn' : 'Bấm để chọn'}
                            </span>
                            <span className="text-[10px] text-stone-400">Ép gỗ cao cấp</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Customer Information Form */}
              <div className="border-t border-stone-200 pt-5">
                <h3 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs flex items-center justify-center font-semibold">2</span>
                  Thông Tin Nhận Báo Giá & Tư Vấn Thành Phẩm
                </h3>

                <form onSubmit={handleSendOrder} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-stone-400" />
                        Họ & Tên Người Đặt
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Nguyễn Văn A"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-stone-400" />
                        Số Điện Thoại / Zalo <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Ví dụ: 0938023079"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-stone-400" />
                        Email (Tùy chọn)
                      </label>
                      <input
                        type="email"
                        placeholder="Để nhận bản sao đơn in"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        Địa Chỉ Giao Hàng (Tỉnh / Thành phố)
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Quận 1, TP. Hồ Chí Minh"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        Ghi Chú Ngày Cưới / Yêu Cầu Đặc Biệt
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Cần gấp trước ngày 20 tới..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none bg-white"
                      />
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {isAdminMode ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          autoFocus
                          placeholder="Mật khẩu Admin..."
                          value={adminPwd}
                          onChange={(e) => {
                            setAdminPwd(e.target.value);
                            setAdminError(false);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              if (adminPwd === '341341') {
                                if (onGetDesignDataUrl) {
                                  setIsAdminDownloading(true);
                                  try {
                                    const dataUrl = await onGetDesignDataUrl();
                                    if (dataUrl) {
                                      const groom = (textConfig.groomName || 'Groom').replace(/\s+/g, '_');
                                      const bride = (textConfig.brideName || 'Bride').replace(/\s+/g, '_');
                                      const fileName = `Anh_Cong_Admin_${groom}_${bride}_${Date.now()}.jpg`;
                                      const link = document.createElement('a');
                                      link.download = fileName;
                                      link.href = dataUrl;
                                      link.click();
                                      setIsAdminMode(false);
                                      setAdminPwd('');
                                    } else {
                                      alert('Không thể tạo file ảnh!');
                                    }
                                  } catch (err) {
                                    console.error(err);
                                    alert('Lỗi xuất file!');
                                  } finally {
                                    setIsAdminDownloading(false);
                                  }
                                }
                              } else {
                                setAdminError(true);
                              }
                            }
                          }}
                          className="w-32 px-2 py-1.5 text-xs border border-stone-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none"
                        />
                        {adminError && <span className="text-xs text-red-500 font-medium">Sai mật khẩu!</span>}
                        {isAdminDownloading && <span className="text-xs text-stone-500">Đang xuất file...</span>}
                        {!isAdminDownloading && (
                          <button 
                            type="button" 
                            onClick={() => { setIsAdminMode(false); setAdminPwd(''); setAdminError(false); }} 
                            className="text-xs text-stone-500 underline ml-1"
                          >
                            Đóng
                          </button>
                        )}
                      </div>
                    ) : (
                      <div 
                        className="text-xs text-stone-500 cursor-pointer hover:text-stone-700 transition"
                        onClick={() => setIsAdminMode(true)}
                      >
                        🔒 File thiết kế sẽ được gửi trực tiếp đến hệ thống kỹ thuật Photobook Vietnam để kiểm tra chuẩn in & tiến hành gia công.
                      </div>
                    )}

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold transition"
                      >
                        Đóng
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white text-xs sm:text-sm font-semibold px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Đang Gửi Đơn...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Gửi Yêu Cầu Đặt In</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          ) : (
            /* Order Success State */
            <div className="py-6 px-4 text-center space-y-5 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <h3 className="text-xl font-bold font-serif text-stone-900">
                  Đã Ghi Nhận Yêu Cầu Đặt In Thành Công!
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 mt-1.5 max-w-md mx-auto">
                  Photobook Vietnam đã nhận thông tin đặt in ảnh cổng cưới của bạn. Đội ngũ kỹ thuật sẽ liên hệ qua SĐT / Zalo <span className="font-semibold text-stone-900">{customerPhone}</span> để kiểm tra file in, gửi bản duyệt mẫu và xác nhận đơn hàng.
                </p>
              </div>

              {/* Order Summary Box */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 max-w-lg mx-auto text-left text-xs space-y-2">
                <div className="font-bold text-stone-800 border-b border-stone-200 pb-2 flex justify-between">
                  <span>Tóm Tắt Đơn Đặt In</span>
                  <span className="text-sky-700">1 bức ảnh cổng</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Dâu Rể:</span>
                  <span className="font-semibold text-stone-800">{textConfig.groomName} & {textConfig.brideName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Kích thước:</span>
                  <span className="font-semibold text-stone-800">{currentSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Chất liệu đã chọn:</span>
                  <span className="font-semibold text-sky-700">{currentMaterial.name}</span>
                </div>
                {customerAddress && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Địa chỉ giao:</span>
                    <span className="font-semibold text-stone-800">{customerAddress}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleOpenZalo}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#0068FF] hover:bg-[#0055d4] text-white text-xs sm:text-sm font-semibold px-6 py-2.5 rounded-xl shadow-md transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Mở Chat Zalo Với Photobook Vietnam</span>
                </button>

                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs sm:text-sm font-semibold transition"
                >
                  Đóng Cửa Sổ
                </button>
              </div>

              <div className="text-[11px] text-stone-400 pt-3">
                Hotline hỗ trợ nhanh: <a href="tel:0938023079" className="text-sky-600 font-semibold underline">0938.023.079</a> | Website: <a href="https://www.photobookvietnam.net" target="_blank" rel="noreferrer" className="text-sky-600 underline">photobookvietnam.net</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
