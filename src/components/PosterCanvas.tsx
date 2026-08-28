import React, { useState, useRef, useEffect } from 'react';
import { FrameSlot, PosterSettings, TemplateId, TextConfig } from '../types';
import { PHOTO_FILTERS } from '../data/constants';
import { Upload, Sliders, Plus } from 'lucide-react';

interface PosterCanvasProps {
  templateId: TemplateId;
  slots: FrameSlot[];
  textConfig: TextConfig;
  posterSettings: PosterSettings;
  activeSlotIndex: number | null;
  onSelectSlot: (index: number) => void;
  onSlotImageChange: (index: number, imageUri: string) => void;
  onUpdateSlot?: (updated: FrameSlot) => void;
  onOpenCropModal: (slot: FrameSlot, index: number) => void;
  posterRef: React.RefObject<HTMLDivElement | null>;
}

export const PosterCanvas: React.FC<PosterCanvasProps> = ({
  templateId,
  slots,
  textConfig,
  posterSettings,
  activeSlotIndex,
  onSelectSlot,
  onSlotImageChange,
  onUpdateSlot,
  onOpenCropModal,
  posterRef,
}) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [panningIndex, setPanningIndex] = useState<number | null>(null);

  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  const onUpdateSlotRef = useRef(onUpdateSlot);
  onUpdateSlotRef.current = onUpdateSlot;

  const onSelectSlotRef = useRef(onSelectSlot);
  onSelectSlotRef.current = onSelectSlot;

  // --- Responsive Scaling Logic ---
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const baseWidth = posterSettings.aspectRatio === '3:2' ? 820 : 560;
  
  const getBaseHeight = (ratioStr: string, w: number) => {
    const parts = ratioStr.split(':');
    const wRatio = parseInt(parts[0]);
    const hRatio = parseInt(parts[1]);
    return (w * hRatio) / wRatio;
  };
  const baseHeight = getBaseHeight(posterSettings.aspectRatio, baseWidth);

  useEffect(() => {
    if (!wrapperRef.current) return;
    
    // Create a ResizeObserver to monitor the wrapper's available width
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        // We use Math.floor on the width to avoid fractional pixel jitter
        // We add a small buffer (16px) for padding so it doesn't touch the very edges
        const availableWidth = Math.floor(entry.contentRect.width) - 16;
        // Scale down if available width is less than baseWidth. Don't scale up past 1.
        const newScale = Math.min(1, availableWidth / baseWidth);
        setScale(newScale);
      }
    });

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [baseWidth]);
  // --------------------------------

  const panRef = useRef<{
    slotIndex: number;
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
    containerWidth: number;
    containerHeight: number;
    hasMoved: boolean;
  } | null>(null);

  // Global listener for smooth real-time drag/pan across canvas
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!panRef.current) return;
      const {
        slotIndex,
        startX,
        startY,
        initialOffsetX,
        initialOffsetY,
        containerWidth,
        containerHeight,
      } = panRef.current;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (Math.hypot(dx, dy) > 2) {
        panRef.current.hasMoved = true;
      }

      if (!panRef.current.hasMoved) return;

      const currentSlot = slotsRef.current[slotIndex];
      if (!currentSlot || !onUpdateSlotRef.current) return;

      // Dragging down (dy > 0) pulls the photo down -> reveals the top area of the photo (posY decreases towards 0%)
      // Dragging up (dy < 0) pushes the photo up -> reveals the bottom area of the photo (posY increases towards 100%)
      // Dragging right (dx > 0) pulls the photo right -> reveals the left area (posX decreases towards 0%)
      // Dragging left (dx < 0) pushes the photo left -> reveals the right area (posX increases towards 100%)
      const deltaPctX = -(dx / Math.max(containerWidth, 50)) * 100;
      const deltaPctY = -(dy / Math.max(containerHeight, 50)) * 100;

      const newOffsetX = Math.max(-50, Math.min(50, Math.round(initialOffsetX + deltaPctX)));
      const newOffsetY = Math.max(-50, Math.min(50, Math.round(initialOffsetY + deltaPctY)));

      onUpdateSlotRef.current({
        ...currentSlot,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      });
    };

    const handleGlobalPointerUp = () => {
      if (!panRef.current) return;
      const { slotIndex, hasMoved } = panRef.current;

      panRef.current = null;
      setPanningIndex(null);

      // If user merely clicked without dragging, select slot
      if (!hasMoved) {
        onSelectSlotRef.current(slotIndex);
      }
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  const getFilterStyle = (filterId: string) => {
    const f = PHOTO_FILTERS.find((item) => item.id === filterId);
    return f ? f.css : 'none';
  };

  const handleSingleFileInput = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onSlotImageChange(index, event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Drop files from computer directly onto slot
  const handleDropOnSlot = (targetIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            onSlotImageChange(targetIndex, event.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Start dragging image inside slot
  const handleSlotPointerDown = (index: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary mouse button or touch
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('label') || target.closest('input')) {
      return;
    }

    const slot = slots[index];
    if (!slot || !slot.imageUri) return;

    const rect = e.currentTarget.getBoundingClientRect();
    panRef.current = {
      slotIndex: index,
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: slot.offsetX || 0,
      initialOffsetY: slot.offsetY || 0,
      containerWidth: rect.width || 200,
      containerHeight: rect.height || 200,
      hasMoved: false,
    };
    setPanningIndex(index);
  };

  const renderSlot = (index: number, className: string = '') => {
    const slot = slots[index] || {
      id: `slot-${index}`,
      imageUri: null,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      filter: 'none',
    };

    const isFilled = Boolean(slot.imageUri);
    const filterCss = getFilterStyle(slot.filter);
    const isDragOver = dragOverIndex === index;
    const isPanningThis = panningIndex === index;

    // Convert -50..50 offset to 0%..100% objectPosition
    const posX = Math.max(0, Math.min(100, 50 + (slot.offsetX || 0)));
    const posY = Math.max(0, Math.min(100, 50 + (slot.offsetY || 0)));

    return (
      <div
        key={slot.id || index}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          if (dragOverIndex !== index) setDragOverIndex(index);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOverIndex(null);
        }}
        onDrop={(e) => handleDropOnSlot(index, e)}
        onPointerDown={(e) => handleSlotPointerDown(index, e)}
        className={`relative group overflow-hidden select-none transition-shadow duration-150 ${
          activeSlotIndex === index ? 'ring-2 ring-sky-500 ring-offset-1 z-10' : ''
        } ${isPanningThis ? 'cursor-grabbing ring-2 ring-sky-400' : isFilled ? 'cursor-grab' : 'cursor-pointer'} ${className}`}
        style={{
          borderRadius: `${posterSettings.cornerRadius}px`,
          backgroundColor: '#f5f5f4',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <input
          type="file"
          accept="image/*"
          id={`file-input-${index}`}
          className="hidden"
          onChange={(e) => handleSingleFileInput(index, e)}
        />

        {/* Drag Over Visual Indicator for Desktop Files */}
        {isDragOver && (
          <div className="absolute inset-0 z-40 bg-sky-500/25 border-2 border-dashed border-sky-500 rounded-lg flex flex-col items-center justify-center gap-1.5 p-2 backdrop-blur-2xs animate-in fade-in duration-150 pointer-events-none">
            <div className="w-9 h-9 rounded-full bg-white text-sky-600 flex items-center justify-center shadow-md animate-bounce">
              <Upload className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-white bg-sky-600 px-2.5 py-0.5 rounded-full shadow-xs">
              Thả ảnh vào khung #{index + 1}
            </span>
          </div>
        )}

        {isFilled ? (
          <div className="w-full h-full relative overflow-hidden pointer-events-none">
            <img
              src={slot.imageUri!}
              alt={`Frame ${index + 1}`}
              draggable={false}
              className="w-full h-full object-cover transition-transform duration-75 pointer-events-none select-none"
              style={{
                objectPosition: `${posX}% ${posY}%`,
                transform: `scale(${Math.max(1, slot.zoom || 1)}) rotate(${slot.rotation || 0}deg)`,
                transformOrigin: `${posX}% ${posY}%`,
                filter: filterCss,
              }}
            />

            {/* Quick Actions (top right) */}
            <div className={`absolute top-2 right-2 flex items-center gap-1.5 transition-opacity duration-150 pointer-events-auto ${activeSlotIndex === index ? 'opacity-100' : 'opacity-0 lg:group-hover:opacity-100'}`}>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCropModal(slot, index);
                }}
                className="flex items-center gap-1 bg-white/95 hover:bg-white text-stone-900 text-[11px] font-semibold px-2 py-1.5 rounded-lg shadow-md transition scale-95 hover:scale-100 cursor-pointer backdrop-blur-xs"
                title="Chỉnh sửa thu phóng & góc xoay"
              >
                <Sliders className="w-3.5 h-3.5 text-sky-600" />
                <span>Sửa</span>
              </button>

              <label
                htmlFor={`file-input-${index}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 bg-stone-900/90 hover:bg-black text-white text-[11px] font-semibold px-2 py-1.5 rounded-lg shadow-md transition cursor-pointer scale-95 hover:scale-100 backdrop-blur-xs"
                title="Tải ảnh mới từ thiết bị"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Đổi</span>
              </label>
            </div>
          </div>
        ) : (
          <label
            htmlFor={`file-input-${index}`}
            className="w-full h-full flex flex-col items-center justify-center p-3 text-stone-400 hover:text-stone-600 hover:bg-stone-200/60 transition cursor-pointer border border-dashed border-stone-300 rounded-lg group/placeholder"
          >
            <div className="w-8 h-8 rounded-full bg-white shadow-xs flex items-center justify-center mb-1 group-hover/placeholder:scale-110 transition">
              <Plus className="w-4 h-4 text-stone-500" />
            </div>
            <span className="text-[11px] font-medium text-stone-500 text-center">
              Khung #{index + 1}
            </span>
            <span className="text-[9px] text-stone-400 text-center">Kéo thả hoặc bấm để tải ảnh</span>
          </label>
        )}
      </div>
    );
  };

  const renderTypographyBlock = () => {
    return (
      <div className="flex flex-col items-center justify-center text-center p-1 sm:p-2 h-full select-none">
        {/* Tagline */}
        {textConfig.tagline && (
          <p
            style={{
              fontFamily: textConfig.taglineFont,
              fontSize: `${textConfig.taglineFontSize}px`,
              color: textConfig.taglineColor,
              letterSpacing: `${textConfig.taglineLetterSpacing}px`,
              textTransform: textConfig.textUppercase ? 'uppercase' : 'none',
            }}
            className="font-semibold mb-2 leading-tight tracking-widest"
          >
            {textConfig.tagline}
          </p>
        )}

        {/* Date Display */}
        {textConfig.dateText && (
          <div
            style={{
              fontFamily: textConfig.dateFont,
              fontSize: `${textConfig.dateFontSize}px`,
              color: textConfig.dateColor,
              letterSpacing: `${textConfig.dateLetterSpacing}px`,
            }}
            className="font-extrabold my-2 leading-[0.95] whitespace-pre-line tracking-tight"
          >
            {textConfig.dateText}
          </div>
        )}

        {/* Couple Names Block */}
        <div className="mt-3 mb-2 flex flex-col items-center">
          <span
            style={{
              fontFamily: textConfig.namesFont,
              fontSize: `${textConfig.namesFontSize}px`,
              color: textConfig.namesColor,
              textTransform: textConfig.textUppercase ? 'uppercase' : 'none',
            }}
            className="font-bold tracking-wider leading-snug"
          >
            {textConfig.groomName}
          </span>

          <span
            style={{
              fontFamily: textConfig.connectorFont,
              fontSize: `${Math.round(textConfig.namesFontSize * 0.95)}px`,
              color: textConfig.namesColor,
            }}
            className="my-0.5 font-normal italic"
          >
            {textConfig.connector}
          </span>

          <span
            style={{
              fontFamily: textConfig.namesFont,
              fontSize: `${textConfig.namesFontSize}px`,
              color: textConfig.namesColor,
              textTransform: textConfig.textUppercase ? 'uppercase' : 'none',
            }}
            className="font-bold tracking-wider leading-snug"
          >
            {textConfig.brideName}
          </span>
        </div>

        {/* Subtext */}
        {textConfig.subtext && (
          <p
            style={{
              fontFamily: textConfig.subtextFont,
              fontSize: `${textConfig.subtextFontSize}px`,
              color: textConfig.subtextColor,
            }}
            className="mt-2 text-stone-600 tracking-wide font-light max-w-xs"
          >
            {textConfig.subtext}
          </p>
        )}
      </div>
    );
  };

  return (
    <div 
      ref={wrapperRef}
      className="w-full flex justify-center items-start py-1 sm:py-2 px-2 overflow-hidden" 
      style={{ height: baseHeight * scale + 16 }}
    >
      <div 
        style={{ 
          width: baseWidth, 
          height: baseHeight, 
          transform: `scale(${scale})`, 
          transformOrigin: 'top center',
          transition: 'transform 0.1s ease-out'
        }}
        className="flex shrink-0 justify-center"
      >
        <div
          id="poster-root"
          ref={posterRef}
          className="relative bg-white shadow-2xl transition-all duration-300 overflow-hidden flex flex-col w-full h-full"
          style={{
            backgroundColor: posterSettings.bgColor,
            padding: `${posterSettings.outerMargin}px`,
            border:
              posterSettings.borderStyle === 'thin-line'
                ? `1px solid ${posterSettings.borderColor}`
                : posterSettings.borderStyle === 'gold-border'
                ? `3px double #d97706`
                : 'none',
          }}
        >
        {/* Decorative inner line frame if gold border style */}
        {posterSettings.borderStyle === 'double-frame' && (
          <div
            className="absolute inset-3 border border-amber-500/40 pointer-events-none rounded-xs"
            style={{ margin: `${posterSettings.outerMargin - 8}px` }}
          />
        )}

        {/* Layout Template 1: Classic 10-Grid (Exact layout from user's sample) */}
        {templateId === 'classic-10' && (
          <div
            className="w-full h-full grid grid-cols-3 grid-rows-4"
            style={{ gap: `${posterSettings.gap}px` }}
          >
            {/* Row 1: Top 3 photos */}
            {renderSlot(0, 'col-start-1 row-start-1 w-full h-full')}
            {renderSlot(1, 'col-start-2 row-start-1 w-full h-full')}
            {renderSlot(2, 'col-start-3 row-start-1 w-full h-full')}

            {/* Row 2: Left & Right photos */}
            {renderSlot(3, 'col-start-1 row-start-2 w-full h-full')}

            {/* Center Typography Block spanning row 2 and row 3 in column 2 */}
            <div className="col-start-2 row-start-2 row-span-2 w-full h-full flex items-center justify-center overflow-hidden">
              {renderTypographyBlock()}
            </div>

            {renderSlot(4, 'col-start-3 row-start-2 w-full h-full')}

            {/* Row 3: Left & Right photos */}
            {renderSlot(5, 'col-start-1 row-start-3 w-full h-full')}
            {renderSlot(6, 'col-start-3 row-start-3 w-full h-full')}

            {/* Row 4: Bottom 3 photos */}
            {renderSlot(7, 'col-start-1 row-start-4 w-full h-full')}
            {renderSlot(8, 'col-start-2 row-start-4 w-full h-full')}
            {renderSlot(9, 'col-start-3 row-start-4 w-full h-full')}
          </div>
        )}

        {/* Layout Template 2: Asymmetric 6 Photo Grid with Bottom Typography */}
        {templateId === 'asymmetric-6' && (
          <div className="w-full h-full flex flex-col justify-between overflow-hidden" style={{ gap: `${posterSettings.gap}px` }}>
            {/* Top 6-Photo Asymmetric Wall (approx 72% height) */}
            <div className="flex-1 flex flex-col justify-between min-h-0" style={{ gap: `${posterSettings.gap}px` }}>
              {/* Row 1: Left 42%, Right 58% */}
              <div className="flex-1 flex min-h-0" style={{ gap: `${posterSettings.gap}px` }}>
                {renderSlot(0, 'w-[42%] h-full')}
                {renderSlot(1, 'w-[58%] h-full')}
              </div>

              {/* Row 2: Left 58%, Right 42% (Inverted) */}
              <div className="flex-1 flex min-h-0" style={{ gap: `${posterSettings.gap}px` }}>
                {renderSlot(2, 'w-[58%] h-full')}
                {renderSlot(3, 'w-[42%] h-full')}
              </div>

              {/* Row 3: Left 42%, Right 58% */}
              <div className="flex-1 flex min-h-0" style={{ gap: `${posterSettings.gap}px` }}>
                {renderSlot(4, 'w-[42%] h-full')}
                {renderSlot(5, 'w-[58%] h-full')}
              </div>
            </div>

            {/* Bottom Elegant Typography Banner */}
            <div className="pt-2 pb-1 px-2 flex flex-col items-center justify-center text-center relative shrink-0">
              {/* Custom Save the Date with Cursive 'the' */}
              <div className="flex items-center justify-center gap-2 mb-0.5">
                <span
                  style={{
                    fontFamily: textConfig.taglineFont,
                    color: textConfig.taglineColor,
                    letterSpacing: '3px',
                  }}
                  className="font-bold text-xs sm:text-sm uppercase"
                >
                  SAVE
                </span>
                <span
                  style={{
                    fontFamily: 'Great Vibes',
                    color: textConfig.taglineColor,
                  }}
                  className="text-lg sm:text-xl italic font-normal -my-1"
                >
                  the
                </span>
                <span
                  style={{
                    fontFamily: textConfig.taglineFont,
                    color: textConfig.taglineColor,
                    letterSpacing: '3px',
                  }}
                  className="font-bold text-xs sm:text-sm uppercase"
                >
                  DATE
                </span>
              </div>

              {/* Names */}
              <div className="my-0.5">
                <span
                  style={{
                    fontFamily: textConfig.namesFont,
                    fontSize: `${Math.max(textConfig.namesFontSize, 20)}px`,
                    color: textConfig.namesColor,
                  }}
                  className="font-extrabold tracking-wider uppercase"
                >
                  {textConfig.groomName} {textConfig.connector} {textConfig.brideName}
                </span>
              </div>

              {/* Quote / Subtext */}
              {textConfig.subtext && (
                <p
                  style={{
                    fontFamily: textConfig.subtextFont,
                    color: textConfig.subtextColor,
                  }}
                  className="text-[11px] italic tracking-wide text-stone-600 mt-0.5"
                >
                  “{textConfig.subtext}”
                </p>
              )}
            </div>
          </div>
        )}

        {/* Layout Template 3: LOVE Banner 8 (L-O-V-E Cutout Overlay Layout) */}
        {templateId === 'love-banner-8' && (
          <div className="w-full h-full flex flex-col justify-between overflow-hidden" style={{ gap: `${posterSettings.gap}px` }}>
            {/* Top 8-Photo Wall with L-O-V-E Cutouts */}
            <div className="flex-1 flex flex-col justify-between min-h-0" style={{ gap: `${posterSettings.gap}px` }}>
              {/* Row 1: 2 Photos with Letter "L" Cutout Overlay */}
              <div className="flex-1 flex min-h-0 relative" style={{ gap: `${posterSettings.gap}px` }}>
                {renderSlot(0, 'w-1/2 h-full')}
                {renderSlot(1, 'w-1/2 h-full')}
                {/* Center Letter L Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg className="h-[98%] w-auto overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                    <text
                      x="50"
                      y="52"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={posterSettings.bgColor || '#ffffff'}
                      fontFamily="Bodoni Moda, Georgia, serif"
                      fontWeight="900"
                      fontSize="110"
                    >
                      L
                    </text>
                  </svg>
                </div>
              </div>

              {/* Row 2: 2 Photos with Letter "O" Cutout Overlay */}
              <div className="flex-1 flex min-h-0 relative" style={{ gap: `${posterSettings.gap}px` }}>
                {renderSlot(2, 'w-1/2 h-full')}
                {renderSlot(3, 'w-1/2 h-full')}
                {/* Center Letter O Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg className="h-[98%] w-auto overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                    <text
                      x="50"
                      y="52"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={posterSettings.bgColor || '#ffffff'}
                      fontFamily="Bodoni Moda, Georgia, serif"
                      fontWeight="900"
                      fontSize="110"
                    >
                      O
                    </text>
                  </svg>
                </div>
              </div>

              {/* Row 3: 2 Photos with Letter "V" Cutout Overlay */}
              <div className="flex-1 flex min-h-0 relative" style={{ gap: `${posterSettings.gap}px` }}>
                {renderSlot(4, 'w-1/2 h-full')}
                {renderSlot(5, 'w-1/2 h-full')}
                {/* Center Letter V Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg className="h-[98%] w-auto overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                    <text
                      x="50"
                      y="52"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={posterSettings.bgColor || '#ffffff'}
                      fontFamily="Bodoni Moda, Georgia, serif"
                      fontWeight="900"
                      fontSize="110"
                    >
                      V
                    </text>
                  </svg>
                </div>
              </div>

              {/* Row 4: 2 Photos with Letter "E" Cutout Overlay */}
              <div className="flex-1 flex min-h-0 relative" style={{ gap: `${posterSettings.gap}px` }}>
                {renderSlot(6, 'w-1/2 h-full')}
                {renderSlot(7, 'w-1/2 h-full')}
                {/* Center Letter E Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <svg className="h-[98%] w-auto overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                    <text
                      x="50"
                      y="52"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={posterSettings.bgColor || '#ffffff'}
                      fontFamily="Bodoni Moda, Georgia, serif"
                      fontWeight="900"
                      fontSize="110"
                    >
                      E
                    </text>
                  </svg>
                </div>
              </div>
            </div>

            {/* Bottom Elegant Typography */}
            <div className="pt-2 pb-1.5 px-2 flex flex-col items-center justify-center text-center shrink-0">
              {/* Save the Date */}
              <div
                style={{
                  fontFamily: textConfig.taglineFont,
                  color: textConfig.taglineColor,
                  letterSpacing: '4px',
                }}
                className="text-[11px] sm:text-xs tracking-[0.3em] uppercase font-semibold text-stone-700 mb-1"
              >
                {textConfig.tagline || 'SAVE THE DATE'}
              </div>

              {/* Names with Connector */}
              <div className="flex items-center justify-center gap-1.5 my-0.5">
                <span
                  style={{
                    fontFamily: textConfig.namesFont,
                    color: textConfig.namesColor,
                  }}
                  className="font-bold text-sm sm:text-base uppercase tracking-wider"
                >
                  {textConfig.groomName}
                </span>
                <span
                  style={{
                    fontFamily: 'Great Vibes',
                    color: textConfig.namesColor,
                  }}
                  className="text-base sm:text-lg italic font-normal px-0.5"
                >
                  {textConfig.connector || 'and'}
                </span>
                <span
                  style={{
                    fontFamily: textConfig.namesFont,
                    color: textConfig.namesColor,
                  }}
                  className="font-bold text-sm sm:text-base uppercase tracking-wider"
                >
                  {textConfig.brideName}
                </span>
              </div>

              {/* Date */}
              <div
                style={{
                  fontFamily: textConfig.dateFont,
                  color: textConfig.dateColor,
                  letterSpacing: '2px',
                }}
                className="text-xs sm:text-sm font-bold tracking-widest text-stone-800 mt-1"
              >
                {textConfig.dateText ? textConfig.dateText.replace(/\n/g, ' . ') : '10.08.2024'}
              </div>
            </div>
          </div>
        )}

        {/* Layout Template 4: Heart Mosaic 18 (Dear Love... Layout) */}
        {templateId === 'heart-mosaic-18' && (
          <div className="w-full h-full flex flex-col justify-between overflow-hidden" style={{ gap: `${posterSettings.gap}px` }}>
            {/* Top Tagline Header: Dear love... */}
            <div className="pt-2 pb-1 text-center shrink-0">
              <span
                style={{
                  fontFamily: textConfig.taglineFont === 'Montserrat' ? 'Great Vibes, cursive' : textConfig.taglineFont,
                  color: textConfig.taglineColor || '#1c1917',
                }}
                className="text-2xl sm:text-3xl italic font-normal tracking-wide"
              >
                {textConfig.tagline || 'Dear love...'}
              </span>
            </div>

            {/* Heart Collage Wall (Grid of 7 Cols x 7 Rows) */}
            <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-7 p-1 items-center justify-center" style={{ gap: `${Math.max(2, posterSettings.gap - 2)}px` }}>
              {/* Row 1: Top Lobes (4 photos) */}
              <div className="col-start-2 row-start-1 w-full h-full">{renderSlot(1, 'w-full h-full')}</div>
              <div className="col-start-3 row-start-1 w-full h-full">{renderSlot(2, 'w-full h-full')}</div>
              <div className="col-start-5 row-start-1 w-full h-full">{renderSlot(3, 'w-full h-full')}</div>
              <div className="col-start-6 row-start-1 w-full h-full">{renderSlot(4, 'w-full h-full')}</div>

              {/* Row 2: Upper Arch (6 photos) */}
              <div className="col-start-1 row-start-2 w-full h-full">{renderSlot(5, 'w-full h-full')}</div>
              <div className="col-start-2 row-start-2 w-full h-full">{renderSlot(6, 'w-full h-full')}</div>
              <div className="col-start-3 row-start-2 w-full h-full">{renderSlot(7, 'w-full h-full')}</div>
              <div className="col-start-5 row-start-2 w-full h-full">{renderSlot(8, 'w-full h-full')}</div>
              <div className="col-start-6 row-start-2 w-full h-full">{renderSlot(9, 'w-full h-full')}</div>
              <div className="col-start-7 row-start-2 w-full h-full">{renderSlot(10, 'w-full h-full')}</div>

              {/* Center Main Featured Photo (Spans cols 3 to 5, rows 3 to 5) */}
              <div className="col-start-3 col-span-3 row-start-3 row-span-3 w-full h-full z-10 shadow-sm rounded-sm overflow-hidden">
                {renderSlot(0, 'w-full h-full')}
              </div>

              {/* Left Side Main Portrait Frame (Spans cols 1 to 2, rows 3 to 4) */}
              <div className="col-start-1 col-span-2 row-start-3 row-span-2 w-full h-full rounded-sm overflow-hidden">
                {renderSlot(11, 'w-full h-full')}
              </div>

              {/* Right Side Main Portrait Frame (Spans cols 6 to 7, rows 3 to 4) */}
              <div className="col-start-6 col-span-2 row-start-3 row-span-2 w-full h-full rounded-sm overflow-hidden">
                {renderSlot(12, 'w-full h-full')}
              </div>

              {/* Row 5 Lower Taper Left & Right Side */}
              <div className="col-start-2 row-start-5 w-full h-full">{renderSlot(13, 'w-full h-full')}</div>
              <div className="col-start-6 row-start-5 w-full h-full">{renderSlot(14, 'w-full h-full')}</div>

              {/* Row 6 Bottom Taper (3 photos under center photo) */}
              <div className="col-start-3 row-start-6 w-full h-full">{renderSlot(15, 'w-full h-full')}</div>
              <div className="col-start-4 row-start-6 w-full h-full">{renderSlot(16, 'w-full h-full')}</div>
              <div className="col-start-5 row-start-6 w-full h-full">{renderSlot(17, 'w-full h-full')}</div>

              {/* Row 7 Pointed Bottom Tip */}
              <div className="col-start-4 row-start-7 w-full h-full">{renderSlot(18, 'w-full h-full')}</div>
            </div>

            {/* Bottom Section: Floral Branch Ornament + Names + Date */}
            <div className="pt-1 pb-2 px-2 flex flex-col items-center justify-center text-center shrink-0">
              {/* Floral Branch Line Art SVG */}
              <div className="my-1 opacity-75 text-stone-700">
                <svg width="120" height="28" viewBox="0 0 120 28" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  {/* Stem */}
                  <path d="M10 14 C35 12, 85 16, 110 14" />
                  {/* Leaves & Flower Buds */}
                  <path d="M30 13 C25 6, 38 4, 30 13" fill="currentColor" fillOpacity="0.1" />
                  <path d="M45 14 C40 22, 52 24, 45 14" fill="currentColor" fillOpacity="0.1" />
                  <path d="M60 13 C55 5, 68 3, 60 13" fill="currentColor" fillOpacity="0.15" />
                  <path d="M75 15 C70 23, 82 25, 75 15" fill="currentColor" fillOpacity="0.1" />
                  <path d="M90 13 C85 6, 98 4, 90 13" fill="currentColor" fillOpacity="0.1" />
                  {/* Small Petal Circles */}
                  <circle cx="60" cy="4" r="2.5" fill="currentColor" fillOpacity="0.2" />
                  <circle cx="45" cy="24" r="2" fill="currentColor" fillOpacity="0.2" />
                  <circle cx="75" cy="25" r="2" fill="currentColor" fillOpacity="0.2" />
                </svg>
              </div>

              {/* Groom & Bride Names */}
              <div className="flex items-center justify-center gap-2 my-0.5">
                <span
                  style={{
                    fontFamily: textConfig.namesFont,
                    color: textConfig.namesColor,
                  }}
                  className="font-bold text-base sm:text-lg uppercase tracking-[0.15em]"
                >
                  {textConfig.groomName}
                </span>
                <span
                  style={{
                    fontFamily: 'Great Vibes, cursive',
                    color: textConfig.namesColor,
                  }}
                  className="text-lg sm:text-xl italic font-normal px-1"
                >
                  {textConfig.connector || '&'}
                </span>
                <span
                  style={{
                    fontFamily: textConfig.namesFont,
                    color: textConfig.namesColor,
                  }}
                  className="font-bold text-base sm:text-lg uppercase tracking-[0.15em]"
                >
                  {textConfig.brideName}
                </span>
              </div>

              {/* Date */}
              <div
                style={{
                  fontFamily: textConfig.dateFont,
                  color: textConfig.dateColor,
                }}
                className="text-xs sm:text-sm font-medium tracking-[0.3em] text-stone-700 mt-0.5"
              >
                {textConfig.dateText ? textConfig.dateText.replace(/\n/g, ' / ') : '15 / 05 / 2025'}
              </div>
            </div>
          </div>
        )}

        {/* Layout Template 5: Hero 13-Mosaic (Top Large Hero + 4x3 Grid + Bottom Love Trip Typography) */}
        {templateId === 'hero-mosaic-13' && (
          <div className="w-full h-full flex flex-col justify-between overflow-hidden" style={{ gap: `${posterSettings.gap}px` }}>
            {/* Top Hero Featured Photo (approx 42% height) */}
            <div className="w-full h-[42%] min-h-0">
              {renderSlot(0, 'w-full h-full')}
            </div>

            {/* Middle 4x3 Grid Wall (12 Photos, approx 42% height) */}
            <div
              className="w-full h-[42%] min-h-0 grid grid-cols-4 grid-rows-3"
              style={{ gap: `${posterSettings.gap}px` }}
            >
              {/* Row 1 */}
              {renderSlot(1, 'w-full h-full')}
              {renderSlot(2, 'w-full h-full')}
              {renderSlot(3, 'w-full h-full')}
              {renderSlot(4, 'w-full h-full')}
              {/* Row 2 */}
              {renderSlot(5, 'w-full h-full')}
              {renderSlot(6, 'w-full h-full')}
              {renderSlot(7, 'w-full h-full')}
              {renderSlot(8, 'w-full h-full')}
              {/* Row 3 */}
              {renderSlot(9, 'w-full h-full')}
              {renderSlot(10, 'w-full h-full')}
              {renderSlot(11, 'w-full h-full')}
              {renderSlot(12, 'w-full h-full')}
            </div>

            {/* Bottom Elegant Typography (approx 16% height) */}
            <div className="w-full h-[16%] min-h-0 flex flex-col justify-center px-4 py-1 select-none">
              <div className="flex items-center justify-between w-full">
                {/* Left Side: Tagline + Double Line Names */}
                <div className="flex flex-col items-start justify-center">
                  {textConfig.tagline && (
                    <span
                      style={{
                        fontFamily: 'Cormorant Garamond, Georgia, serif',
                        fontSize: '11px',
                        letterSpacing: '1.5px',
                        color: textConfig.taglineColor || '#57534e',
                      }}
                      className="italic font-light mb-0.5"
                    >
                      {textConfig.tagline}
                    </span>
                  )}
                  <div className="flex flex-col">
                    <span
                      style={{
                        fontFamily: textConfig.namesFont || 'Cinzel, Bodoni Moda, serif',
                        fontSize: `${Math.max(16, Math.min(24, textConfig.namesFontSize))}px`,
                        color: textConfig.namesColor || '#1c1917',
                        letterSpacing: '3px',
                      }}
                      className="font-normal uppercase tracking-[0.2em] leading-tight"
                    >
                      {textConfig.groomName || 'ANH & THAO'}
                    </span>
                    <span
                      style={{
                        fontFamily: textConfig.namesFont || 'Cinzel, Bodoni Moda, serif',
                        fontSize: `${Math.max(16, Math.min(24, textConfig.namesFontSize))}px`,
                        color: textConfig.namesColor || '#1c1917',
                        letterSpacing: '3px',
                      }}
                      className="font-normal uppercase tracking-[0.2em] leading-tight"
                    >
                      {textConfig.brideName || 'MINH TÂM'}
                    </span>
                  </div>
                </div>

                {/* Right Side: Love Trip Calligraphy */}
                <div className="flex flex-col items-center justify-center pl-2">
                  <div className="flex flex-col items-end leading-none">
                    <span
                      style={{
                        fontFamily: 'Great Vibes, cursive',
                        fontSize: '36px',
                        color: textConfig.namesColor || '#1c1917',
                        lineHeight: 0.8,
                      }}
                      className="italic font-normal transform -rotate-6 mr-3"
                    >
                      Love
                    </span>
                    <span
                      style={{
                        fontFamily: 'Great Vibes, cursive',
                        fontSize: '42px',
                        color: textConfig.namesColor || '#1c1917',
                        lineHeight: 0.85,
                      }}
                      className="italic font-normal transform -rotate-3"
                    >
                      Trip
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Layout Template 6: Editorial 5 (Korean Magazine Layout with Integrated Typography) */}
        {templateId === 'editorial-5' && (
          <div className="w-full h-full flex overflow-hidden" style={{ gap: `${posterSettings.gap}px` }}>
            {/* Left Column (58% width): Top Tall Hero with Typography + Bottom Photo */}
            <div className="w-[58%] h-full flex flex-col justify-between" style={{ gap: `${posterSettings.gap}px` }}>
              {/* Top Tall Hero Slot (62% height) with Header Typography Overlay */}
              <div className="w-full h-[62%] min-h-0 relative">
                {renderSlot(0, 'w-full h-full')}
                {/* Elegant Top Overlay Typography */}
                <div className="absolute top-0 inset-x-0 p-3 pt-3.5 bg-gradient-to-b from-stone-900/60 via-stone-900/20 to-transparent pointer-events-none z-10 text-white select-none">
                  <div className="flex items-start justify-between w-full">
                    <div className="flex flex-col">
                      {textConfig.tagline && (
                        <span
                          style={{
                            fontFamily: 'Cormorant Garamond, Georgia, serif',
                            fontSize: '10px',
                            letterSpacing: '1.5px',
                          }}
                          className="italic font-light text-white/90 drop-shadow-xs mb-0.5"
                        >
                          {textConfig.tagline}
                        </span>
                      )}
                      <span
                        style={{
                          fontFamily: textConfig.namesFont || 'Cinzel, Bodoni Moda, serif',
                          fontSize: '15px',
                          letterSpacing: '2.5px',
                        }}
                        className="font-normal uppercase tracking-[0.2em] text-white drop-shadow-md leading-tight"
                      >
                        {textConfig.groomName || 'ANH & THAO'}
                      </span>
                      <span
                        style={{
                          fontFamily: textConfig.namesFont || 'Cinzel, Bodoni Moda, serif',
                          fontSize: '15px',
                          letterSpacing: '2.5px',
                        }}
                        className="font-normal uppercase tracking-[0.2em] text-white drop-shadow-md leading-tight"
                      >
                        {textConfig.brideName || 'MINH TÂM'}
                      </span>
                    </div>

                    {/* Script Love Trip */}
                    <div className="flex flex-col items-end leading-none pr-1">
                      <span
                        style={{
                          fontFamily: 'Great Vibes, cursive',
                          fontSize: '30px',
                          lineHeight: 0.8,
                        }}
                        className="italic font-normal text-white drop-shadow-md transform -rotate-6 mr-2"
                      >
                        Love
                      </span>
                      <span
                        style={{
                          fontFamily: 'Great Vibes, cursive',
                          fontSize: '34px',
                          lineHeight: 0.85,
                        }}
                        className="italic font-normal text-white drop-shadow-md transform -rotate-3"
                      >
                        Trip
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Horizontal Photo (38% height) */}
              <div className="w-full h-[38%] min-h-0">
                {renderSlot(1, 'w-full h-full')}
              </div>
            </div>

            {/* Right Column (42% width): 3 Vertically Stacked Photos */}
            <div className="w-[42%] h-full flex flex-col justify-between" style={{ gap: `${posterSettings.gap}px` }}>
              <div className="w-full h-[33.33%] min-h-0">
                {renderSlot(2, 'w-full h-full')}
              </div>
              <div className="w-full h-[33.33%] min-h-0">
                {renderSlot(3, 'w-full h-full')}
              </div>
              <div className="w-full h-[33.33%] min-h-0">
                {renderSlot(4, 'w-full h-full')}
              </div>
            </div>
          </div>
        )}

        {/* Layout Template 7: Landscape Trio 10 (2 Large Heroes on Sides + 2x4 Middle Grid + Overlay Typography) */}
        {templateId === 'landscape-trio-10' && (
          <div className="w-full h-full flex overflow-hidden" style={{ gap: `${posterSettings.gap}px` }}>
            {/* Left Hero Column (~32% width) with Top Typography Overlay */}
            <div className="w-[32%] h-full relative min-h-0">
              {renderSlot(0, 'w-full h-full')}
              <div className="absolute top-0 inset-x-0 p-3 pt-3.5 bg-gradient-to-b from-stone-900/70 via-stone-900/30 to-transparent pointer-events-none z-10 text-white select-none">
                <div className="flex flex-col">
                  <span
                    style={{
                      fontFamily: textConfig.namesFont || 'Cinzel, Bodoni Moda, serif',
                      fontSize: '13px',
                      letterSpacing: '2px',
                    }}
                    className="font-normal uppercase text-white drop-shadow-md leading-tight mb-1"
                  >
                    {textConfig.groomName || 'PHUONG PHI'} & {textConfig.brideName || 'HUU PHUOC'}
                  </span>
                  <div className="text-[9px] text-white/90 font-light drop-shadow-xs leading-relaxed max-w-[95%]">
                    <span>SOMETIMES WHEN I LOOK INTO </span>
                    <span style={{ fontFamily: 'Great Vibes, cursive', fontSize: '15px' }} className="italic font-normal">your eyes,</span>
                    <div>I PRETEND YOU'RE MINE ALL THE DAMN TIME</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle 2x4 Grid (~34% width, 8 photos) */}
            <div
              className="w-[34%] h-full grid grid-cols-2 grid-rows-4 min-h-0"
              style={{ gap: `${posterSettings.gap}px` }}
            >
              {renderSlot(1, 'w-full h-full')}
              {renderSlot(2, 'w-full h-full')}
              {renderSlot(3, 'w-full h-full')}
              {renderSlot(4, 'w-full h-full')}
              {renderSlot(5, 'w-full h-full')}
              {renderSlot(6, 'w-full h-full')}
              {renderSlot(7, 'w-full h-full')}
              {renderSlot(8, 'w-full h-full')}
            </div>

            {/* Right Hero Column (~34% width) */}
            <div className="w-[34%] h-full min-h-0">
              {renderSlot(9, 'w-full h-full')}
            </div>
          </div>
        )}

        {/* Layout Template 8: Landscape Duo 6 (2 Left Stacked Photos + Right Typography & 2x2 Grid) */}
        {templateId === 'landscape-duo-6' && (
          <div className="w-full h-full flex overflow-hidden" style={{ gap: `${posterSettings.gap}px` }}>
            {/* Left Column (~46% width): 2 Stacked Photos */}
            <div className="w-[46%] h-full flex flex-col justify-between min-h-0" style={{ gap: `${posterSettings.gap}px` }}>
              <div className="w-full h-[42%] min-h-0">
                {renderSlot(0, 'w-full h-full')}
              </div>
              <div className="w-full h-[58%] min-h-0">
                {renderSlot(1, 'w-full h-full')}
              </div>
            </div>

            {/* Right Column (~54% width): Top Typography + Bottom 2x2 Grid */}
            <div className="w-[54%] h-full flex flex-col justify-between min-h-0" style={{ gap: `${posterSettings.gap}px` }}>
              {/* Top Typography Header */}
              <div className="w-full h-[34%] min-h-0 flex flex-col items-center justify-center text-center px-2 py-1 select-none">
                <div className="flex flex-col items-center leading-tight">
                  <span
                    style={{
                      fontFamily: textConfig.namesFont || 'Cinzel, Bodoni Moda, serif',
                      fontSize: '18px',
                      color: textConfig.namesColor || '#1c1917',
                      letterSpacing: '4px',
                    }}
                    className="font-light uppercase tracking-[0.25em]"
                  >
                    {textConfig.groomName || 'QUYNH CHI'}
                  </span>
                  <span
                    style={{
                      fontFamily: 'Great Vibes, cursive',
                      fontSize: '18px',
                      color: textConfig.namesColor || '#1c1917',
                      lineHeight: 1,
                    }}
                    className="my-[-2px] italic"
                  >
                    &
                  </span>
                  <span
                    style={{
                      fontFamily: textConfig.namesFont || 'Cinzel, Bodoni Moda, serif',
                      fontSize: '18px',
                      color: textConfig.namesColor || '#1c1917',
                      letterSpacing: '4px',
                    }}
                    className="font-light uppercase tracking-[0.25em]"
                  >
                    {textConfig.brideName || 'NGOC HUNG'}
                  </span>
                </div>

                {/* You make my heart happy */}
                <div className="flex flex-col items-center mt-1 text-stone-700">
                  <span
                    style={{
                      fontFamily: 'Bodoni Moda, Cormorant Garamond, serif',
                      fontSize: '24px',
                      fontStyle: 'italic',
                      lineHeight: 1,
                    }}
                    className="font-normal"
                  >
                    You
                  </span>
                  <div className="flex items-center gap-1 leading-none -mt-1">
                    <span
                      style={{
                        fontFamily: 'Bodoni Moda, Cormorant Garamond, serif',
                        fontSize: '17px',
                        fontStyle: 'italic',
                      }}
                    >
                      my
                    </span>
                    <span className="text-[8px] tracking-[2px] uppercase font-bold text-stone-500">
                      MAKE HEART
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: 'Bodoni Moda, serif',
                      fontSize: '16px',
                      letterSpacing: '3px',
                    }}
                    className="font-normal uppercase italic tracking-[0.2em] -mt-0.5"
                  >
                    HAPPY
                  </span>
                </div>
              </div>

              {/* Bottom 2x2 Grid (4 photos) */}
              <div
                className="w-full h-[66%] min-h-0 grid grid-cols-2 grid-rows-2"
                style={{ gap: `${posterSettings.gap}px` }}
              >
                {renderSlot(2, 'w-full h-full')}
                {renderSlot(3, 'w-full h-full')}
                {renderSlot(4, 'w-full h-full')}
                {renderSlot(5, 'w-full h-full')}
              </div>
            </div>
          </div>
        )}

        {/* Layout Template 9: Landscape Story 8 (Left Big Hero with Header + Right 2x4 Grid with Heart Badge) */}
        {templateId === 'landscape-story-8' && (
          <div className="w-full h-full flex overflow-hidden" style={{ gap: `${posterSettings.gap}px` }}>
            {/* Left Column (~63% width): Top Typography + Bottom Big Hero Photo */}
            <div className="w-[63%] h-full flex flex-col justify-between min-h-0" style={{ gap: `${posterSettings.gap}px` }}>
              {/* Top Typography Header */}
              <div className="w-full h-[18%] min-h-0 flex flex-col items-start justify-center px-4 py-1 select-none">
                <span
                  style={{
                    fontFamily: textConfig.namesFont || 'Cinzel, Bodoni Moda, serif',
                    fontSize: '18px',
                    color: textConfig.namesColor || '#1c1917',
                    letterSpacing: '4px',
                  }}
                  className="font-normal uppercase tracking-[0.25em]"
                >
                  {textConfig.groomName || 'GIA BAO'} - {textConfig.brideName || 'TU ANH'}
                </span>
                <div className="flex items-center gap-3 mt-0.5">
                  <span
                    style={{
                      fontFamily: 'Alex Brush, Great Vibes, cursive',
                      fontSize: '26px',
                      color: textConfig.namesColor || '#1c1917',
                    }}
                    className="italic font-normal leading-none"
                  >
                    Enjoy the now
                  </span>
                  <span className="text-[9px] tracking-[2.5px] uppercase font-semibold text-stone-500">
                    FOCUS ON YOU
                  </span>
                </div>
              </div>

              {/* Bottom Big Hero Photo */}
              <div className="w-full h-[82%] min-h-0">
                {renderSlot(0, 'w-full h-full')}
              </div>
            </div>

            {/* Right Column (~37% width): 2x4 Grid with 7 Photos and 1 Love Forever Badge */}
            <div
              className="w-[37%] h-full grid grid-cols-2 grid-rows-4 min-h-0"
              style={{ gap: `${posterSettings.gap}px` }}
            >
              {renderSlot(1, 'w-full h-full')}
              {renderSlot(2, 'w-full h-full')}
              {renderSlot(3, 'w-full h-full')}
              {renderSlot(4, 'w-full h-full')}
              {renderSlot(5, 'w-full h-full')}
              {renderSlot(6, 'w-full h-full')}

              {/* Row 4: Left Cell Heart Emblem Badge */}
              <div className="w-full h-full bg-white flex flex-col items-center justify-center p-2 rounded-xs select-none shadow-2xs border border-stone-100">
                <svg width="42" height="38" viewBox="0 0 50 45" fill="none" className="text-red-500 drop-shadow-xs">
                  <path
                    d="M25 40 C25 40 5 26 5 14 C5 7 10 3 16 3 C20 3 23.5 6 25 9 C26.5 6 30 3 34 3 C40 3 45 7 45 14 C45 26 25 40 25 40 Z"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M12 16 C18 10 32 10 38 16" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M10 20 C18 16 32 16 40 20" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M14 26 C20 23 30 23 36 26" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M18 31 C22 29 28 29 32 31" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <span
                  style={{ fontFamily: 'Bodoni Moda, serif', fontSize: '11px', letterSpacing: '1px' }}
                  className="text-stone-700 font-medium tracking-wider mt-1.5"
                >
                  Love forever
                </span>
              </div>

              {/* Row 4: Right Cell Photo */}
              {renderSlot(7, 'w-full h-full')}
            </div>
          </div>
        )}

        {/* Layout Template 10: Landscape London 11 (Panorama Magazine Collage with Center Love Trip) */}
        {templateId === 'landscape-london-11' && (
          <div className="w-full h-full flex overflow-hidden" style={{ gap: `${posterSettings.gap}px` }}>
            {/* Left Column (~30% width): Top, Mid (2 split), Bottom */}
            <div className="w-[30%] h-full flex flex-col justify-between min-h-0" style={{ gap: `${posterSettings.gap}px` }}>
              <div className="w-full h-[33%] min-h-0">
                {renderSlot(0, 'w-full h-full')}
              </div>
              <div className="w-full h-[34%] min-h-0 flex" style={{ gap: `${posterSettings.gap}px` }}>
                <div className="w-1/2 h-full min-h-0">{renderSlot(1, 'w-full h-full')}</div>
                <div className="w-1/2 h-full min-h-0">{renderSlot(2, 'w-full h-full')}</div>
              </div>
              <div className="w-full h-[33%] min-h-0">
                {renderSlot(3, 'w-full h-full')}
              </div>
            </div>

            {/* Center Column (~30% width): Top, Mid Tall with Love Trip Overlay, Bottom */}
            <div className="w-[30%] h-full flex flex-col justify-between min-h-0" style={{ gap: `${posterSettings.gap}px` }}>
              <div className="w-full h-[25%] min-h-0">
                {renderSlot(4, 'w-full h-full')}
              </div>
              <div className="w-full h-[50%] min-h-0 relative">
                {renderSlot(5, 'w-full h-full')}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-white pointer-events-none z-10 select-none drop-shadow-md">
                  <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '12px', letterSpacing: '1px' }} className="italic font-light text-white/90">
                    it's time for a
                  </span>
                  <div className="flex flex-col items-center leading-none -mt-1">
                    <span style={{ fontFamily: 'Great Vibes, cursive', fontSize: '44px', lineHeight: 0.8 }} className="italic font-normal transform -rotate-6">
                      Love
                    </span>
                    <span style={{ fontFamily: 'Great Vibes, cursive', fontSize: '48px', lineHeight: 0.85 }} className="italic font-normal transform -rotate-3 ml-2">
                      Trip
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-full h-[25%] min-h-0">
                {renderSlot(6, 'w-full h-full')}
              </div>
            </div>

            {/* Right Column (~40% width): Top Wide, Mid (2 split), Bottom Wide */}
            <div className="w-[40%] h-full flex flex-col justify-between min-h-0" style={{ gap: `${posterSettings.gap}px` }}>
              <div className="w-full h-[33%] min-h-0">
                {renderSlot(7, 'w-full h-full')}
              </div>
              <div className="w-full h-[34%] min-h-0 flex" style={{ gap: `${posterSettings.gap}px` }}>
                <div className="w-1/2 h-full min-h-0">{renderSlot(8, 'w-full h-full')}</div>
                <div className="w-1/2 h-full min-h-0">{renderSlot(9, 'w-full h-full')}</div>
              </div>
              <div className="w-full h-[33%] min-h-0">
                {renderSlot(10, 'w-full h-full')}
              </div>
            </div>
          </div>
        )}

        {templateId === 'grid-8-center-text' && (
          <div className="w-full h-full flex flex-col" style={{ gap: `${posterSettings.gap}px` }}>
            {/* Top Row */}
            <div className="w-full h-[33.33%] min-h-0 flex" style={{ gap: `${posterSettings.gap}px` }}>
              <div className="w-1/3 h-full min-h-0">{renderSlot(0, 'w-full h-full')}</div>
              <div className="w-1/3 h-full min-h-0">{renderSlot(1, 'w-full h-full')}</div>
              <div className="w-1/3 h-full min-h-0">{renderSlot(2, 'w-full h-full')}</div>
            </div>
            {/* Middle Row */}
            <div className="w-full h-[33.34%] min-h-0 flex" style={{ gap: `${posterSettings.gap}px` }}>
              <div className="w-1/3 h-full min-h-0">{renderSlot(3, 'w-full h-full')}</div>
              {/* Text Block */}
              <div className="w-1/3 h-full min-h-0 flex flex-col items-center justify-center p-2 sm:p-4 text-center">
                <div
                  style={{
                    fontFamily: textConfig.namesFont,
                    color: textConfig.namesColor,
                  }}
                  className="text-lg sm:text-2xl font-light mb-2"
                >
                  {textConfig.groomName}<br />&<br />{textConfig.brideName}
                </div>
                <div
                  style={{
                    fontFamily: textConfig.taglineFont === 'Montserrat' ? 'Great Vibes, cursive' : textConfig.taglineFont,
                    color: textConfig.taglineColor,
                  }}
                  className="text-xs sm:text-sm italic mb-2 mt-4"
                >
                  {textConfig.tagline}
                </div>
                <div
                  style={{
                    fontFamily: textConfig.dateFont,
                    color: textConfig.dateColor,
                  }}
                  className="text-[10px] sm:text-xs font-medium tracking-widest uppercase"
                >
                  {textConfig.dateText ? textConfig.dateText.replace(/\n/g, '.') : '29.03.2026'}
                </div>
              </div>
              <div className="w-1/3 h-full min-h-0">{renderSlot(4, 'w-full h-full')}</div>
            </div>
            {/* Bottom Row */}
            <div className="w-full h-[33.33%] min-h-0 flex" style={{ gap: `${posterSettings.gap}px` }}>
              <div className="w-1/3 h-full min-h-0">{renderSlot(5, 'w-full h-full')}</div>
              <div className="w-1/3 h-full min-h-0">{renderSlot(6, 'w-full h-full')}</div>
              <div className="w-1/3 h-full min-h-0">{renderSlot(7, 'w-full h-full')}</div>
            </div>
          </div>
        )}

        {templateId === 'hero-trio-3' && (
          <div className="w-full h-full flex flex-col" style={{ gap: `${posterSettings.gap}px` }}>
            {/* Hero Image */}
            <div className="w-full h-[55%] min-h-0">
              {renderSlot(0, 'w-full h-full')}
            </div>
            {/* Text Block */}
            <div className="w-full h-[15%] min-h-0 flex flex-col items-center justify-center p-2 text-center">
              <div
                style={{
                  fontFamily: textConfig.taglineFont,
                  color: textConfig.taglineColor,
                  letterSpacing: '3px',
                }}
                className="text-[10px] sm:text-xs font-bold uppercase mb-2"
              >
                {textConfig.tagline}
              </div>
              <div
                style={{
                  fontFamily: textConfig.namesFont,
                  color: textConfig.namesColor,
                }}
                className="text-lg sm:text-2xl font-normal tracking-wide uppercase mb-2"
              >
                {textConfig.groomName} {textConfig.connector || '&'} {textConfig.brideName}
              </div>
              <div
                style={{
                  fontFamily: textConfig.subtextFont,
                  color: textConfig.subtextColor,
                }}
                className="text-[9px] sm:text-[10px] italic max-w-[80%] mx-auto"
              >
                {textConfig.subtext}
              </div>
            </div>
            {/* Bottom Photos */}
            <div className="w-full h-[30%] min-h-0 flex" style={{ gap: `${posterSettings.gap}px` }}>
              <div className="w-1/2 h-full min-h-0">{renderSlot(1, 'w-full h-full')}</div>
              <div className="w-1/2 h-full min-h-0">{renderSlot(2, 'w-full h-full')}</div>
            </div>
          </div>
        )}

        {templateId === 'magazine-8' && (
          <div className="w-full h-full flex flex-col" style={{ gap: `${posterSettings.gap}px` }}>
            {/* Row 1: Left 1/3, Right 2/3 */}
            <div className="w-full h-[30%] min-h-0 flex" style={{ gap: `${posterSettings.gap}px` }}>
              <div className="w-1/3 h-full min-h-0">{renderSlot(0, 'w-full h-full')}</div>
              <div className="w-2/3 h-full min-h-0">{renderSlot(3, 'w-full h-full')}</div>
            </div>
            {/* Row 2: 3 columns */}
            <div className="w-full h-[40%] min-h-0 flex" style={{ gap: `${posterSettings.gap}px` }}>
              <div className="w-1/3 h-full min-h-0">{renderSlot(1, 'w-full h-full')}</div>
              <div className="w-1/3 h-full min-h-0 flex flex-col items-center justify-center p-3 text-center text-white overflow-hidden"
                style={{ backgroundColor: posterSettings.blockBgColor || '#8b988f' }}>
                <div
                  style={{
                    fontFamily: textConfig.subtextFont,
                  }}
                  className="text-[8px] sm:text-[9px] uppercase tracking-widest mb-4 opacity-80"
                >
                  FROM TODAY WE WILL GROW OLD TOGETHER
                </div>
                <div
                  style={{
                    fontFamily: textConfig.dateFont,
                    lineHeight: 1.1,
                  }}
                  className="text-3xl sm:text-4xl font-normal mb-4"
                >
                  {textConfig.dateText ? textConfig.dateText.replace(/\./g, '\n') : '29\n03\n26'}
                </div>
                <div
                  style={{
                    fontFamily: textConfig.namesFont,
                  }}
                  className="text-[10px] sm:text-xs font-medium tracking-wide uppercase flex flex-col items-center"
                >
                  <span>{textConfig.groomName}</span>
                  <span className="text-xl my-1" style={{ fontFamily: 'Great Vibes, cursive' }}>&</span>
                  <span>{textConfig.brideName}</span>
                </div>
              </div>
              <div className="w-1/3 h-full min-h-0">{renderSlot(4, 'w-full h-full')}</div>
            </div>
            {/* Row 3: 3 columns, last col is 2 stacked */}
            <div className="w-full h-[30%] min-h-0 flex" style={{ gap: `${posterSettings.gap}px` }}>
              <div className="w-1/3 h-full min-h-0">{renderSlot(2, 'w-full h-full')}</div>
              <div className="w-1/3 h-full min-h-0">{renderSlot(5, 'w-full h-full')}</div>
              <div className="w-1/3 h-full min-h-0 flex flex-col" style={{ gap: `${posterSettings.gap}px` }}>
                <div className="w-full h-[50%] min-h-0">{renderSlot(6, 'w-full h-full')}</div>
                <div className="w-full h-[50%] min-h-0">{renderSlot(7, 'w-full h-full')}</div>
              </div>
            </div>
          </div>
        )}

        {templateId === 'asymmetric-7' && (
          <div className="w-full h-full flex flex-col" style={{ gap: `${posterSettings.gap}px` }}>
            {/* Row 1 */}
            <div className="w-full h-[33.33%] min-h-0 flex" style={{ gap: `${posterSettings.gap}px` }}>
              <div className="w-1/3 h-full min-h-0">{renderSlot(0, 'w-full h-full')}</div>
              <div className="w-1/3 h-full min-h-0">{renderSlot(1, 'w-full h-full')}</div>
              <div className="w-1/3 h-full min-h-0 flex flex-col items-start justify-center p-4">
                <div
                  style={{
                    fontFamily: textConfig.taglineFont,
                    color: textConfig.taglineColor,
                  }}
                  className="text-xl sm:text-2xl uppercase tracking-widest leading-snug font-medium"
                >
                  ETERNAL<br/>PROMISE
                </div>
              </div>
            </div>
            {/* Row 2 */}
            <div className="w-full h-[33.34%] min-h-0 flex" style={{ gap: `${posterSettings.gap}px` }}>
              <div className="w-1/3 h-full min-h-0">{renderSlot(2, 'w-full h-full')}</div>
              <div className="w-1/3 h-full min-h-0">{renderSlot(3, 'w-full h-full')}</div>
              <div className="w-1/3 h-full min-h-0">{renderSlot(4, 'w-full h-full')}</div>
            </div>
            {/* Row 3 */}
            <div className="w-full h-[33.33%] min-h-0 flex" style={{ gap: `${posterSettings.gap}px` }}>
              <div className="w-1/3 h-full min-h-0 flex flex-col items-center justify-end p-4 text-center">
                <div
                  style={{
                    fontFamily: textConfig.subtextFont,
                    color: textConfig.subtextColor,
                  }}
                  className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest leading-relaxed mb-4"
                >
                  LET ETERNAL MOMENT<br/>BECOME YOUR LOVE STORY
                </div>
              </div>
              <div className="w-1/3 h-full min-h-0">{renderSlot(5, 'w-full h-full')}</div>
              <div className="w-1/3 h-full min-h-0">{renderSlot(6, 'w-full h-full')}</div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
