import React, { useState } from 'react';
import { X, Check, LayoutGrid } from 'lucide-react';
import { TemplateId, TemplateDefinition } from '../types';
import { TEMPLATES } from '../data/constants';
import { TemplateThumbnail } from './EditorSidebar';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTemplateId: TemplateId;
  onSelectTemplate: (id: TemplateId) => void;
}

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  onClose,
  currentTemplateId,
  onSelectTemplate,
}) => {
  const [filter, setFilter] = useState<'all' | 'portrait' | 'landscape'>('all');

  if (!isOpen) return null;

  const filteredTemplates = TEMPLATES.filter((tmpl) => {
    if (filter === 'portrait') return tmpl.aspectRatio === '2:3' || tmpl.aspectRatio === '22:30';
    if (filter === 'landscape') return tmpl.aspectRatio === '3:2';
    return true;
  });

  const handleSelect = (tmpl: TemplateDefinition) => {
    onSelectTemplate(tmpl.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shadow-xs">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                Kho Mẫu Layout Cổng Cưới
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-semibold">
                  {TEMPLATES.length} Mẫu
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                Chọn mẫu bố cục phù hợp với ý thích và số lượng ảnh của bạn
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Categories */}
        <div className="px-6 py-3 border-b border-stone-100 bg-white flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-white text-sky-600 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tất Cả ({TEMPLATES.length})
            </button>
            <button
              onClick={() => setFilter('portrait')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filter === 'portrait'
                  ? 'bg-white text-sky-600 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Khổ Đứng ({TEMPLATES.filter((t) => t.aspectRatio === '2:3' || t.aspectRatio === '22:30').length})
            </button>
            <button
              onClick={() => setFilter('landscape')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                filter === 'landscape'
                  ? 'bg-white text-sky-600 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Khổ Ngang 90x60cm ({TEMPLATES.filter((t) => t.aspectRatio === '3:2').length})
            </button>
          </div>

          <span className="text-xs text-stone-400 italic">
            * Bấm vào mẫu để áp dụng ngay lên bản thiết kế
          </span>
        </div>

        {/* Templates Grid Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-stone-50/50">
          <div
            className={
              filter === 'landscape'
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-5'
                : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'
            }
          >
            {filteredTemplates.map((tmpl) => {
              const isSelected = currentTemplateId === tmpl.id;
              const isLandscape = tmpl.aspectRatio === '3:2';

              return (
                <div
                  key={tmpl.id}
                  onClick={() => handleSelect(tmpl)}
                  className={`group relative flex flex-col bg-white rounded-2xl border-2 transition-all duration-200 cursor-pointer overflow-hidden p-3 ${
                    isLandscape && filter === 'all' ? 'col-span-2 sm:col-span-2' : ''
                  } ${
                    isSelected
                      ? 'border-sky-500 ring-4 ring-sky-500/15 shadow-md bg-sky-50/20'
                      : 'border-stone-200 hover:border-sky-400 hover:shadow-md'
                  }`}
                >
                  {/* Selected Badge */}
                  {isSelected && (
                    <div className="absolute top-3.5 right-3.5 z-20 flex items-center justify-center w-6 h-6 bg-sky-500 text-white rounded-full shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  {/* Thumbnail Container - Truly Horizontal for Landscape (3:2) and Vertical for Portrait (2:3) */}
                  <div
                    className={`w-full flex items-center justify-center bg-stone-100/80 rounded-xl overflow-hidden p-2.5 transition-colors group-hover:bg-stone-100 ${
                      isLandscape ? 'aspect-[3/2]' : tmpl.aspectRatio === '22:30' ? 'aspect-[22/30]' : 'aspect-[2/3]'
                    }`}
                  >
                    <div
                      className={`shadow-sm border border-stone-200/90 rounded-md overflow-hidden transition-transform duration-200 group-hover:scale-[1.02] ${
                        isLandscape ? 'w-full h-full aspect-[3/2]' : tmpl.aspectRatio === '22:30' ? 'w-full h-full aspect-[22/30]' : 'w-full h-full aspect-[2/3]'
                      }`}
                    >
                      <TemplateThumbnail id={tmpl.id} />
                    </div>
                  </div>

                  {/* Compact Header Info */}
                  <div className="pt-2.5 px-0.5 flex items-center justify-between gap-1.5">
                    <h3 className="font-bold text-stone-800 text-xs truncate group-hover:text-sky-600 transition">
                      {tmpl.name}
                    </h3>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
                        isLandscape
                          ? 'bg-amber-100 text-amber-800'
                          : tmpl.aspectRatio === '22:30' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {isLandscape ? '90x60 Ngang' : tmpl.aspectRatio === '22:30' ? '22x30 Đứng' : '60x90 Đứng'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-100 bg-white flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Tổng cộng: <strong className="text-stone-800">{TEMPLATES.length} mẫu thiết kế</strong> (Đã tối ưu hóa bố cục in ấn)
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition shadow-xs"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
};
