import React from 'react';
import { FrameSlot } from '../types';
import { PHOTO_FILTERS } from '../data/constants';
import { X, ZoomIn, ZoomOut, RotateCw, Trash2, Sliders, Check } from 'lucide-react';

interface PhotoCropModalProps {
  slot: FrameSlot | null;
  slotIndex: number;
  onClose: () => void;
  onUpdateSlot: (updated: FrameSlot) => void;
  onRemovePhoto: (id: string) => void;
}

export const PhotoCropModal: React.FC<PhotoCropModalProps> = ({
  slot,
  slotIndex,
  onClose,
  onUpdateSlot,
  onRemovePhoto,
}) => {
  if (!slot || !slot.imageUri) return null;

  const currentFilter = PHOTO_FILTERS.find((f) => f.id === slot.filter) || PHOTO_FILTERS[0];
  const posX = Math.max(0, Math.min(100, 50 + (slot.offsetX || 0)));
  const posY = Math.max(0, Math.min(100, 50 + (slot.offsetY || 0)));

  const handleZoomChange = (newZoom: number) => {
    const zoom = Math.min(Math.max(newZoom, 1), 3);
    onUpdateSlot({ ...slot, zoom });
  };

  const handleOffsetChange = (axis: 'X' | 'Y', value: number) => {
    if (axis === 'X') {
      onUpdateSlot({ ...slot, offsetX: value });
    } else {
      onUpdateSlot({ ...slot, offsetY: value });
    }
  };

  const handleRotate = () => {
    const currentRot = slot.rotation || 0;
    const nextRot = (currentRot + 90) % 360;
    onUpdateSlot({ ...slot, rotation: nextRot });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-full flex flex-col overflow-hidden border border-stone-200">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-600" />
            <h3 className="font-semibold text-stone-800 text-base sm:text-lg">
              Chỉnh Sửa Ảnh Khung #{slotIndex + 1}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Preview Container */}
            <div className="flex flex-col items-center">
              <div className="relative w-full max-w-[280px] sm:max-w-none aspect-[3/4] bg-stone-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center group border border-stone-200">
                <img
                  src={slot.imageUri}
                  alt={`Slot ${slotIndex + 1}`}
                  className="w-full h-full object-cover transition-transform duration-100"
                  style={{
                    objectPosition: `${posX}% ${posY}%`,
                    transform: `scale(${slot.zoom}) rotate(${slot.rotation || 0}deg)`,
                    transformOrigin: `${posX}% ${posY}%`,
                    filter: currentFilter.css,
                  }}
                />
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm pointer-events-none">
                  Thu Phóng: {Math.round(slot.zoom * 100)}%
                </div>
              </div>
              <p className="text-xs text-stone-400 mt-2 text-center">
                Mẹo: Dùng các thanh kéo bên dưới để căn chỉnh vị trí ảnh hoàn hảo.
              </p>
            </div>

            {/* Adjustments Panel */}
            <div className="space-y-5">
            {/* Zoom Slider */}
            <div>
              <div className="flex items-center justify-between text-sm font-medium text-stone-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <ZoomIn className="w-4 h-4 text-stone-500" />
                  Mức Thu Phóng (Zoom)
                </span>
                <span className="text-stone-500 text-xs">{slot.zoom.toFixed(1)}x</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleZoomChange(slot.zoom - 0.1)}
                  className="p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg border border-stone-200"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={slot.zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="w-full accent-sky-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
                />
                <button
                  onClick={() => handleZoomChange(slot.zoom + 0.1)}
                  className="p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg border border-stone-200"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Position X Offset */}
            <div>
              <div className="flex items-center justify-between text-sm font-medium text-stone-700 mb-1.5">
                <span>Vị trí ngang (Trái / Phải)</span>
                <span className="text-stone-500 text-xs">{slot.offsetX}%</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="1"
                value={slot.offsetX}
                onChange={(e) => handleOffsetChange('X', parseInt(e.target.value))}
                className="w-full accent-sky-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Position Y Offset */}
            <div>
              <div className="flex items-center justify-between text-sm font-medium text-stone-700 mb-1.5">
                <span>Vị trí dọc (Lên / Xuống)</span>
                <span className="text-stone-500 text-xs">{slot.offsetY}%</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="1"
                value={slot.offsetY}
                onChange={(e) => handleOffsetChange('Y', parseInt(e.target.value))}
                className="w-full accent-sky-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
              />
            </div>

            {/* Rotation & Reset */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleRotate}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Xoay 90°
              </button>
              <button
                onClick={() => onUpdateSlot({ ...slot, zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 })}
                className="py-2 px-3 text-xs font-medium text-stone-500 hover:text-stone-800 bg-stone-50 hover:bg-stone-100 rounded-xl border border-stone-200 transition"
              >
                Đặt lại ban đầu
              </button>
            </div>

            {/* Photo Filters */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-2">
                Bộ Lọc Màu Nghệ Thuật
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {PHOTO_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => onUpdateSlot({ ...slot, filter: f.id })}
                    className={`px-2 py-1.5 text-xs rounded-lg border text-center transition truncate ${
                      slot.filter === f.id
                        ? 'border-sky-600 bg-sky-50 text-sky-800 font-medium'
                        : 'border-stone-200 hover:border-stone-300 text-stone-600'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 bg-stone-50 border-t border-stone-100">
          <button
            onClick={() => {
              onRemovePhoto(slot.id);
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Xóa ảnh khỏi khung</span>
            <span className="sm:hidden">Xóa ảnh</span>
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-stone-900 hover:bg-black text-white text-sm font-medium px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-sm transition"
          >
            <Check className="w-4 h-4" />
            <span className="hidden sm:inline">Hoàn Tất Chỉnh Sửa</span>
            <span className="sm:hidden">Xong</span>
          </button>
        </div>
      </div>
    </div>
  );
};
