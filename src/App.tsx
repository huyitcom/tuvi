import { useState, useRef } from 'react';
import {
  FrameSlot,
  PosterSettings,
  TemplateId,
  TextConfig,
} from './types';
import {
  DEFAULT_POSTER_SETTINGS,
  DEFAULT_TEXT_CONFIG,
  SAMPLE_WEDDING_PHOTOS,
  TEMPLATES,
} from './data/constants';
import { Navbar } from './components/Navbar';
import { PosterCanvas } from './components/PosterCanvas';
import { EditorSidebar } from './components/EditorSidebar';
import { PhotoCropModal } from './components/PhotoCropModal';
import { BatchUploadModal } from './components/BatchUploadModal';
import { OrderPrintModal } from './components/OrderPrintModal';
import { toJpeg } from 'html-to-image';

export default function App() {
  const [templateId, setTemplateId] = useState<TemplateId>('classic-10');
  const [textConfig, setTextConfig] = useState<TextConfig>(DEFAULT_TEXT_CONFIG);
  const [posterSettings, setPosterSettings] = useState<PosterSettings>(DEFAULT_POSTER_SETTINGS);

  // Initialize slots
  const [slots, setSlots] = useState<FrameSlot[]>(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      id: `slot-${i}`,
      imageUri: SAMPLE_WEDDING_PHOTOS[i] || null,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      filter: 'none',
      rotation: 0,
    }));
  });

  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [editingSlot, setEditingSlot] = useState<{ slot: FrameSlot; index: number } | null>(null);

  // Modals
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const posterRef = useRef<HTMLDivElement>(null);

  // Adjust slot count and auto-sync aspect ratio when template changes
  const handleTemplateChange = (newTemplateId: TemplateId) => {
    setTemplateId(newTemplateId);
    const selectedTemplate = TEMPLATES.find((t) => t.id === newTemplateId);
    const targetCount = selectedTemplate ? selectedTemplate.slotCount : 10;

    if (selectedTemplate?.aspectRatio && selectedTemplate.aspectRatio !== posterSettings.aspectRatio) {
      setPosterSettings((prev) => ({
        ...prev,
        aspectRatio: selectedTemplate.aspectRatio,
      }));
    }

    setSlots((prev) => {
      if (prev.length === targetCount) return prev;
      if (prev.length < targetCount) {
        const added = Array.from({ length: targetCount - prev.length }, (_, i) => ({
          id: `slot-${prev.length + i}`,
          imageUri: SAMPLE_WEDDING_PHOTOS[(prev.length + i) % SAMPLE_WEDDING_PHOTOS.length] || null,
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
          filter: 'none',
          rotation: 0,
        }));
        return [...prev, ...added];
      }
      return prev.slice(0, targetCount);
    });
  };

  // Single Slot Image Update
  const handleSlotImageChange = (index: number, imageUri: string) => {
    setSlots((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          imageUri,
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        };
      }
      return updated;
    });
  };

  // Update Slot Configuration
  const handleUpdateSlot = (updatedSlot: FrameSlot) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === updatedSlot.id ? updatedSlot : s))
    );
    if (editingSlot && editingSlot.slot.id === updatedSlot.id) {
      setEditingSlot({ ...editingSlot, slot: updatedSlot });
    }
  };

  // Remove Photo from Slot
  const handleRemovePhoto = (slotId: string) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, imageUri: null, zoom: 1, offsetX: 0, offsetY: 0, filter: 'none' }
          : s
      )
    );
  };

  // Batch Apply Uploaded Photos
  const handleApplyBatchPhotos = (images: string[]) => {
    setSlots((prev) => {
      const updated = [...prev];
      images.forEach((img, idx) => {
        if (idx < updated.length) {
          updated[idx] = {
            ...updated[idx],
            imageUri: img,
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
          };
        }
      });
      return updated;
    });
  };

  // Standard 300 DPI Print Dimensions (7087 x 10630 for 60x90cm / 10630 x 7087 for 90x60cm landscape)
  const getPrintDimensions = (aspectRatio: string) => {
    switch (aspectRatio) {
      case '3:2': // 90 x 60 cm at 300 DPI (10630 x 7087 px)
        return { width: 10630, height: 7087 };
      case '2:3': // 60 x 90 cm at 300 DPI (7087 x 10630 px)
        return { width: 7087, height: 10630 };
      case '3:4': // 50 x 75 cm at 300 DPI
        return { width: 5906, height: 7874 };
      case '22:30': // 22 x 30 cm at 300 DPI
        return { width: 2598, height: 3543 };
      case '1:1': // 90 x 90 cm at 300 DPI
        return { width: 7087, height: 7087 };
      case '9:16': // 60 x 106 cm at 300 DPI
        return { width: 7087, height: 12600 };
      default:
        return { width: 7087, height: 10630 };
    }
  };

  // Get Canvas Image Data URL for Order Email Submission (High-Resolution 300DPI JPEG)
  const handleGetDesignDataUrl = async (): Promise<string | null> => {
    if (!posterRef.current) return null;
    try {
      const { width: targetWidth, height: targetHeight } = getPrintDimensions(posterSettings.aspectRatio);
      const elemWidth = posterRef.current.offsetWidth || 560;
      const pixelRatio = targetWidth / elemWidth;

      // Use exact 300 DPI dimensions with JPEG. Quality 0.90 keeps the file size reasonable for email.
      const dataUrl = await toJpeg(posterRef.current, {
        canvasWidth: targetWidth,
        canvasHeight: targetHeight,
        pixelRatio: pixelRatio,
        quality: 0.90,
        backgroundColor: posterSettings.bgColor || '#ffffff',
        cacheBust: true,
      });
      return dataUrl;
    } catch (err) {
      console.error('Failed to capture high-res canvas as JPEG for order email:', err);
      try {
        const fallbackRatio = 4;
        return await toJpeg(posterRef.current, {
          pixelRatio: fallbackRatio,
          quality: 0.90,
          backgroundColor: posterSettings.bgColor || '#ffffff',
        });
      } catch (fallbackErr) {
        console.error('Fallback export also failed:', fallbackErr);
        return null;
      }
    }
  };

  // Reset All to Default
  const handleResetAll = () => {
    if (confirm('Khôi phục lại thiết lập mặc định ban đầu?')) {
      setTemplateId('classic-10');
      setTextConfig(DEFAULT_TEXT_CONFIG);
      setPosterSettings(DEFAULT_POSTER_SETTINGS);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-100 font-sans text-stone-900 selection:bg-sky-200 selection:text-sky-900">
      {/* Top Navbar */}
      <Navbar
        onOpenOrderModal={() => setIsOrderModalOpen(true)}
        onResetAll={handleResetAll}
        onOpenBatchUpload={() => setIsBatchUploadOpen(true)}
      />

      {/* Main App Layout: Left Workspace + Right Control Panel */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Workspace Center Display */}
        <main className="flex-1 bg-stone-200/60 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start min-h-[500px]">
          <div className="w-full max-w-4xl flex flex-col items-center">
            <PosterCanvas
              templateId={templateId}
              slots={slots}
              textConfig={textConfig}
              posterSettings={posterSettings}
              activeSlotIndex={activeSlotIndex}
              onSelectSlot={(index) => setActiveSlotIndex(index)}
              onSlotImageChange={handleSlotImageChange}
              onUpdateSlot={handleUpdateSlot}
              onOpenCropModal={(slot, index) => setEditingSlot({ slot, index })}
              posterRef={posterRef}
            />

            <p className="text-xs text-stone-500 mt-4 mb-2 text-center">
              💡 Kéo thả file ảnh trực tiếp vào từng ô, hoặc kéo di chuột trên ảnh để chỉnh vị trí lên/xuống/trái/phải.
            </p>
          </div>
        </main>

        {/* Right Editor Controls Sidebar */}
        <EditorSidebar
          templateId={templateId}
          onChangeTemplate={handleTemplateChange}
          textConfig={textConfig}
          onChangeTextConfig={setTextConfig}
          posterSettings={posterSettings}
          onChangePosterSettings={setPosterSettings}
        />
      </div>

      {/* Modals */}
      {editingSlot && (
        <PhotoCropModal
          slot={editingSlot.slot}
          slotIndex={editingSlot.index}
          onClose={() => setEditingSlot(null)}
          onUpdateSlot={handleUpdateSlot}
          onRemovePhoto={handleRemovePhoto}
        />
      )}

      <BatchUploadModal
        isOpen={isBatchUploadOpen}
        onClose={() => setIsBatchUploadOpen(false)}
        onApplyPhotos={handleApplyBatchPhotos}
        currentSlotsCount={slots.length}
      />

      <OrderPrintModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        textConfig={textConfig}
        posterSettings={posterSettings}
        onGetDesignDataUrl={handleGetDesignDataUrl}
      />
    </div>
  );
}
