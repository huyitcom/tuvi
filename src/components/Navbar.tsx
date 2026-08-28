import React from 'react';
import { RotateCcw, Images, ShoppingBag } from 'lucide-react';

interface NavbarProps {
  onOpenOrderModal: () => void;
  onResetAll: () => void;
  onOpenBatchUpload: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenOrderModal,
  onResetAll,
  onOpenBatchUpload,
}) => {
  return (
    <header className="w-full bg-white border-b border-stone-200 sticky top-0 z-40 px-3 sm:px-6 py-2.5 shadow-xs flex items-center justify-between gap-2 sm:gap-4">
      {/* Left: Photobook Vietnam Logo */}
      <div className="flex items-center shrink-0">
        <a
          href="https://photobookvietnam.net"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center hover:opacity-90 transition"
        >
          <img
            src="https://www.photobookvietnam.net/images/logo_reve.png"
            alt="Photobook Vietnam"
            className="h-6 sm:h-7 md:h-8 w-auto object-contain max-w-[140px] sm:max-w-[190px]"
            referrerPolicy="no-referrer"
          />
        </a>
      </div>

      {/* Center: Title & Subtitle */}
      <div className="flex items-center justify-center text-center min-w-0">
        <div className="min-w-0 text-center">
          <h1 className="font-serif font-bold text-stone-900 text-sm sm:text-base leading-tight flex items-center justify-center gap-1.5 sm:gap-2 truncate">
            <span>Thiết Kế Ảnh Cổng Cưới</span>
            <span className="text-[10px] font-sans font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full inline-block uppercase tracking-wider">
              MIỄN PHÍ
            </span>
          </h1>
          <p className="text-[11px] text-stone-500 hidden sm:block truncate">
            Một sản phẩm của Photobook Vietnam
          </p>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        <button
          onClick={onOpenBatchUpload}
          className="hidden sm:flex items-center gap-1.5 bg-stone-100 hover:bg-sky-50 hover:text-sky-700 text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl border border-stone-200 hover:border-sky-200 transition"
        >
          <Images className="w-3.5 h-3.5 text-sky-600" />
          <span>Upload Ảnh</span>
        </button>

        <button
          onClick={onOpenOrderModal}
          className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white text-xs sm:text-sm font-semibold px-3.5 sm:px-4 py-2 rounded-xl shadow-xs hover:shadow transition"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Đặt In</span>
        </button>

        <button
          onClick={onResetAll}
          title="Làm mới lại từ đầu"
          className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
