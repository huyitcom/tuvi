import React, { useState } from 'react';
import { X, Upload, Images, Check, Trash2 } from 'lucide-react';

interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPhotos: (images: string[]) => void;
  currentSlotsCount: number;
}

export const BatchUploadModal: React.FC<BatchUploadModalProps> = ({
  isOpen,
  onClose,
  onApplyPhotos,
  currentSlotsCount,
}) => {
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((file) =>
      file.type.startsWith('image/')
    );

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setUploadedImages((prev) => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleRemove = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (uploadedImages.length > 0) {
      onApplyPhotos(uploadedImages);
      setUploadedImages([]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-stone-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center gap-2">
            <Images className="w-5 h-5 text-sky-600" />
            <div>
              <h3 className="font-semibold text-stone-800 text-lg">
                Tải Lên Hàng Loạt Nhiều Ảnh Cưới
              </h3>
              <p className="text-xs text-stone-500">
                Tự động điền ảnh vào {currentSlotsCount} khung hình theo thứ tự
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropzone Area */}
        <div className="p-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition flex flex-col items-center justify-center cursor-pointer ${
              isDragging
                ? 'border-sky-500 bg-sky-50/50 scale-[0.99]'
                : 'border-stone-300 hover:border-stone-400 bg-stone-50/50'
            }`}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              id="batch-upload-file-input"
            />
            <label htmlFor="batch-upload-file-input" className="cursor-pointer flex flex-col items-center">
              <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mb-3 shadow-sm">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-stone-800 mb-1">
                Kéo thả nhiều ảnh cưới vào đây hoặc <span className="text-sky-600 underline">Bấm để chọn file</span>
              </p>
              <p className="text-xs text-stone-400">
                Hỗ trợ định dạng JPG, PNG, WEBP (Nên chọn từ {currentSlotsCount} ảnh trở lên)
              </p>
            </label>
          </div>

          {/* Uploaded Thumbnails Preview */}
          {uploadedImages.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-3">
                <span>Danh sách ảnh đã tải lên ({uploadedImages.length} ảnh)</span>
                <button
                  onClick={() => setUploadedImages([])}
                  className="text-stone-400 hover:text-red-600 transition"
                >
                  Xóa tất cả
                </button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-56 overflow-y-auto p-1 border border-stone-100 rounded-xl bg-stone-50/30">
                {uploadedImages.map((src, index) => (
                  <div
                    key={index}
                    className="relative group aspect-square rounded-xl overflow-hidden border border-stone-200 shadow-xs bg-stone-100"
                  >
                    <img
                      src={src}
                      alt={`Upload ${index}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md backdrop-blur-xs font-mono">
                      #{index + 1}
                    </div>
                    <button
                      onClick={() => handleRemove(index)}
                      className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-50 border-t border-stone-100">
          <button
            onClick={onClose}
            className="text-xs font-medium text-stone-500 hover:text-stone-800 px-3 py-2 rounded-lg"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={uploadedImages.length === 0}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-stone-300 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-sm transition disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            Đưa {uploadedImages.length} Ảnh Vào Khung
          </button>
        </div>
      </div>
    </div>
  );
};
