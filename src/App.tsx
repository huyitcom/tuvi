/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, Calendar, Clock, User, Volume2, Upload, X, Camera, Lock, CheckCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [calendar, setCalendar] = useState<'Dương lịch' | 'Âm lịch'>('Dương lịch');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zodiacImage, setZodiacImage] = useState<string | null>(null);
  const [zodiacName, setZodiacName] = useState<string | null>(null);
  
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [portraitImage, setPortraitImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fallback Web Speech Synthesis (client-side) states
  const [isSynthesizingClient, setIsSynthesizingClient] = useState(false);
  const [syntheticStatus, setSyntheticStatus] = useState<string | null>(null);
  const utteranceRef = useRef<any>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // ==========================================
  // STATE THANH TOÁN
  // ==========================================
  const [isPaid, setIsPaid] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPortraitImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPortraitImage(dataUrl);
        stopCamera();
      }
    }
  };

  // ==========================================
  // HÀM CHIA CẮT VĂN BẢN (NỬA FREE - NỬA VIP)
  // ==========================================
  const getSplitResult = (text: string | null) => {
    if (!text) return { free: '', premium: '' };
    
    const firstHeading = text.indexOf('##');
    if (firstHeading === -1) return { free: text, premium: '' };
    
    const secondHeading = text.indexOf('##', firstHeading + 2);
    if (secondHeading === -1) return { free: text, premium: '' };
    
    return {
      free: text.substring(0, secondHeading),
      premium: text.substring(secondHeading)
    };
  };

  const splitContent = getSplitResult(result);

  const generateAudio = async () => {
    if (!result) return;
    setIsGeneratingAudio(true);
    setAudioSrc(null);
    setIsSynthesizingClient(false);
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    try {
      const textToRead = isPaid ? result : splitContent.free;
      const cleanText = textToRead.replace(/[#*`_]/g, '');
      
      const response = await fetch("/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText })
      });

      if (!response.ok) {
        throw new Error("Server TTS unavailable");
      }

      // We now receive a binary audio stream (audio/mpeg)
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error("Empty audio returned");
      }
      
      const audioUrl = URL.createObjectURL(blob);
      setAudioSrc(audioUrl);
    } catch (err: any) {
      console.warn("Server TTS failed, activating Web Speech Synthesis fallback:", err);
      
      if ('speechSynthesis' in window) {
        setIsSynthesizingClient(true);
        setSyntheticStatus("Thầy đang bấm niệm truyền âm...");
        
        const textToRead = isPaid ? result : splitContent.free;
        const cleanText = textToRead
          .replace(/[#*`_:-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        const sentences = cleanText.split(/([.!?\n]+)/).filter(s => s.trim().length > 0);
        let currentUtteranceIndex = 0;
        
        const speakNext = () => {
          if (currentUtteranceIndex >= sentences.length) {
            setIsSynthesizingClient(false);
            return;
          }
          
          let chunk = sentences[currentUtteranceIndex];
          if (chunk.match(/^[.!?\n\s]+$/)) {
            currentUtteranceIndex++;
            speakNext();
            return;
          }
          
          if (currentUtteranceIndex + 1 < sentences.length && sentences[currentUtteranceIndex + 1].match(/^[.!?\n\s]+$/)) {
            chunk += sentences[currentUtteranceIndex + 1];
            currentUtteranceIndex++;
          }
          currentUtteranceIndex++;
          
          const utterance = new SpeechSynthesisUtterance(chunk);
          utterance.lang = 'vi-VN';
          
          const voices = window.speechSynthesis.getVoices();
          const viVoice = voices.find(v => v.lang.toLowerCase().includes('vi'));
          if (viVoice) {
            utterance.voice = viVoice;
          }
          
          utterance.rate = 0.90;
          utterance.pitch = 0.95;
          
          utterance.onend = () => {
            speakNext();
          };
          
          utterance.onerror = (e) => {
            console.error("Speech Synthesis Error:", e);
            speakNext();
          };
          
          utteranceRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        };
        
        speakNext();
      } else {
        setError("Lão phu đang bị khản cổ và trình duyệt không hỗ trợ đọc âm thanh. Kính mời đương số tự xem.");
      }
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const analyzeChart = async () => {
    if (!day || !month || !year || !hour || !minute) {
      setError("Xin đương số hãy cung cấp đầy đủ ngày tháng năm và giờ sinh để lão phu luận giải.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setZodiacImage(null);
    setZodiacName(null);
    setAudioSrc(null);
    
    // Đảm bảo reset trạng thái thanh toán khi xem lá số mới
    setIsPaid(false);
    setShowPayment(false);

    try {
      const response = await fetch("/api/analyze-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender,
          day,
          month,
          year,
          calendar,
          hour,
          minute,
          portraitImage
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Thiên cơ bất khả lộ, lão phu chưa thể nhìn thấu lá số này. Xin hãy thử lại.");
      }

      const data = await response.json();
      setResult(data.result);
      setZodiacName(data.zodiacName);
      if (data.zodiacImage) {
        setZodiacImage(data.zodiacImage);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Có lỗi xảy ra trong quá trình bấm độn. Xin hãy thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mystical-pattern text-[var(--color-paper)] font-sans selection:bg-[var(--color-gold-500)] selection:text-black">
      {/* Mystical Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-gold-600)] blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#8a2be2] blur-[120px] mix-blend-screen opacity-30"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <header className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="font-serif text-5xl md:text-7xl font-medium text-[var(--color-gold-500)] mb-4 tracking-tight">
              Thầy Bảy Xì Gòn
            </h1>
            <p className="text-lg md:text-xl text-[var(--color-paper)] opacity-70 font-light max-w-2xl mx-auto">
              Cung cấp ngày giờ sinh, tỏ thiên cơ. Lão phu sẽ giúp đương số nhìn thấu 12 cung mệnh vận, thấu hiểu nhân sinh.
            </p>
          </motion.div>
        </header>

        {/* Main Content */}
        <main className="space-y-12">
          <AnimatePresence mode="wait">
            {/* Form Section */}
            {!result && !loading && (
              <motion.section 
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-[var(--color-gold-600)] to-[#8a2be2] rounded-2xl blur opacity-20"></div>
                <div className="relative bg-[var(--color-mystic-800)]/90 backdrop-blur-md border border-white/5 rounded-2xl p-6 md:p-10 shadow-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    
                    {/* Giới tính */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-[var(--color-gold-400)] font-serif text-xl">
                        <User className="w-5 h-5" /> Giới tính
                      </label>
                      <div className="flex gap-4">
                        {['Nam', 'Nữ'].map((g) => (
                          <button
                            key={g}
                            onClick={() => setGender(g as 'Nam' | 'Nữ')}
                            className={`flex-1 py-3 rounded-xl border transition-all ${gender === g ? 'bg-[var(--color-gold-600)]/20 border-[var(--color-gold-500)] text-[var(--color-gold-400)]' : 'bg-black/20 border-white/10 text-white/60 hover:border-white/30'}`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Loại lịch */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-[var(--color-gold-400)] font-serif text-xl">
                        <Calendar className="w-5 h-5" /> Loại lịch
                      </label>
                      <div className="flex gap-4">
                        {['Dương lịch', 'Âm lịch'].map((c) => (
                          <button
                            key={c}
                            onClick={() => setCalendar(c as 'Dương lịch' | 'Âm lịch')}
                            className={`flex-1 py-3 rounded-xl border transition-all ${calendar === c ? 'bg-[var(--color-gold-600)]/20 border-[var(--color-gold-500)] text-[var(--color-gold-400)]' : 'bg-black/20 border-white/10 text-white/60 hover:border-white/30'}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ngày tháng năm sinh */}
                    <div className="space-y-3 md:col-span-2">
                      <label className="flex items-center gap-2 text-[var(--color-gold-400)] font-serif text-xl">
                        <Calendar className="w-5 h-5" /> Ngày tháng năm sinh
                      </label>
                      <div className="grid grid-cols-3 gap-4">
                        <input type="number" placeholder="Ngày" value={day} onChange={(e) => setDay(e.target.value)} className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-gold-500)] transition-colors text-center text-lg" />
                        <input type="number" placeholder="Tháng" value={month} onChange={(e) => setMonth(e.target.value)} className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-gold-500)] transition-colors text-center text-lg" />
                        <input type="number" placeholder="Năm" value={year} onChange={(e) => setYear(e.target.value)} className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-gold-500)] transition-colors text-center text-lg" />
                      </div>
                    </div>

                    {/* Giờ phút sinh */}
                    <div className="space-y-3 md:col-span-2">
                      <label className="flex items-center gap-2 text-[var(--color-gold-400)] font-serif text-xl">
                        <Clock className="w-5 h-5" /> Giờ sinh
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Giờ (0-23)" value={hour} onChange={(e) => setHour(e.target.value)} className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-gold-500)] transition-colors text-center text-lg" />
                        <input type="number" placeholder="Phút (0-59)" value={minute} onChange={(e) => setMinute(e.target.value)} className="bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[var(--color-gold-500)] transition-colors text-center text-lg" />
                      </div>
                    </div>

                    {/* Chân dung */}
                    <div className="space-y-3 md:col-span-2">
                      <label className="flex items-center gap-2 text-[var(--color-gold-400)] font-serif text-xl">
                        <User className="w-5 h-5" /> Chân dung (Tùy chọn)
                      </label>
                      <p className="text-white/50 text-sm mb-2">Tải lên hoặc chụp ảnh rõ mặt để lão phu kết hợp xem tướng mạo ngũ quan, giúp quẻ thêm phần chính xác.</p>
                      
                      {isCameraOpen ? (
                        <div className="relative w-full max-w-sm mx-auto rounded-xl overflow-hidden border-2 border-[var(--color-gold-500)]/50 bg-black">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-auto text-white bg-black rounded-lg" />
                          <canvas ref={canvasRef} className="hidden" />
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                            <button onClick={takePhoto} className="bg-[var(--color-gold-600)] text-white px-4 py-2 rounded-full hover:bg-[var(--color-gold-500)] transition-colors font-medium border border-[var(--color-gold-400)] text-sm shadow-md">Chụp ảnh</button>
                            <button onClick={stopCamera} className="bg-red-600/80 text-white px-4 py-2 rounded-full hover:bg-red-500 transition-colors font-medium text-sm shadow-md">Hủy</button>
                          </div>
                        </div>
                      ) : portraitImage ? (
                        <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-[var(--color-gold-500)]/50">
                          <img src={portraitImage} alt="Chân dung đương số" className="w-full h-full object-cover" />
                          <button onClick={() => setPortraitImage(null)} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-red-500/80 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div 
                            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                            className={`flex-1 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors cursor-pointer ${isDragging ? 'border-[var(--color-gold-400)] bg-[var(--color-gold-400)]/10 text-[var(--color-gold-400)]' : 'border-white/20 text-white/40 hover:text-[var(--color-gold-400)] hover:border-[var(--color-gold-400)]/50 bg-black/10'}`}
                          >
                            <Upload className="w-8 h-8 mb-2" />
                            <span className="text-sm font-medium text-center">Nhấn hoặc kéo thả ảnh vào đây</span>
                            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                          </div>
                          <div onClick={startCamera} className="flex-1 border-2 border-white/20 rounded-xl p-6 flex flex-col items-center justify-center text-white/40 hover:text-[var(--color-gold-400)] hover:border-[var(--color-gold-400)]/50 transition-colors cursor-pointer bg-black/10">
                            <Camera className="w-8 h-8 mb-2" />
                            <span className="text-sm font-medium text-center">Sử dụng Camera</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center mt-6">
                    <button onClick={analyzeChart} disabled={loading} className="relative group overflow-hidden rounded-full bg-[var(--color-mystic-700)] border border-[var(--color-gold-500)]/30 px-10 py-4 transition-all hover:border-[var(--color-gold-500)] disabled:opacity-50 disabled:cursor-not-allowed">
                      <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-gold-600)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <span className="relative flex items-center gap-3 text-xl font-serif text-[var(--color-gold-400)]">
                        {loading ? (
                          <><Loader2 className="w-6 h-6 animate-spin" /> Lão phu đang chiêm nghiệm tinh tú...</>
                        ) : (
                          <><Sparkles className="w-6 h-6 animate-pulse" /> Xem Quẻ Ngay</>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.section>
            )}

            {/* Loading Section */}
            {loading && (
              <motion.section key="loading" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }} transition={{ duration: 0.5 }} className="flex flex-col items-center justify-center py-20 text-center">
                <div className="relative w-32 h-32 mb-8">
                  <div className="absolute inset-0 border-4 border-t-[var(--color-gold-500)] border-r-[var(--color-gold-600)] border-b-[#8a2be2] border-l-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-2 border-4 border-t-transparent border-r-[var(--color-gold-400)] border-b-transparent border-l-[#8a2be2] rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-[var(--color-gold-400)] animate-pulse" />
                  </div>
                </div>
                <h2 className="text-2xl font-serif text-[var(--color-gold-400)] mb-2">Đang gieo quẻ...</h2>
                <p className="text-white/60">Thiên cơ đang dần hé lộ, lão phu đang bấm độn lập lá số tử vi cho đương số.</p>
              </motion.section>
            )}

            {/* Error Message */}
            {error && !loading && (
              <motion.div key="error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-red-950/50 border border-red-900/50 text-red-200 px-6 py-4 rounded-xl text-center font-serif text-lg">
                {error}
              </motion.div>
            )}

            {/* Result Section */}
            {result && !loading && (
              <motion.section key="result" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="relative mt-8">
                <div className="bg-[var(--color-mystic-800)]/95 backdrop-blur-xl border-2 border-[var(--color-gold-500)]/40 rounded-sm p-1 shadow-2xl relative overflow-hidden">
                  <div className="border border-[var(--color-gold-500)]/30 p-6 md:p-10 relative">
                    {/* Decorative corners */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[var(--color-gold-500)]"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[var(--color-gold-500)]"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[var(--color-gold-500)]"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[var(--color-gold-500)]"></div>
                    
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
                      <div className="w-[150%] h-[150%] rounded-full border-[40px] border-[var(--color-gold-500)] border-double"></div>
                    </div>
                    
                    <div className="mb-10 flex flex-col items-center">
                      <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full p-1 bg-gradient-to-br from-[var(--color-gold-400)] to-[#8a2be2] shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                        {zodiacImage ? (
                          <img src={zodiacImage} alt={zodiacName || 'Zodiac'} className="w-full h-full object-cover rounded-full border-4 border-[var(--color-mystic-900)]" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full rounded-full border-4 border-[var(--color-mystic-900)] bg-[radial-gradient(ellipse_at_center,_#1c1712,_#0d0a08)] flex flex-col items-center justify-center relative overflow-hidden">
                            {/* Rotating celestial ring */}
                            <div className="absolute inset-2 rounded-full border border-dashed border-[var(--color-gold-500)]/30 animate-spin" style={{ animationDuration: '60s' }}></div>
                            <div className="absolute inset-4 rounded-full border border-double border-[var(--color-gold-500)]/15"></div>
                            
                            <div className="relative z-10 text-center px-4">
                              <span className="block text-4xl mb-1 filter drop-shadow-[0_0_10px_rgba(212,175,55,0.7)] animate-pulse">☯️</span>
                              <span className="block text-[11px] uppercase tracking-[0.2em] text-[var(--color-gold-400)] font-sans opacity-80">Bản Mệnh</span>
                              <span className="block text-lg font-serif text-[var(--color-paper)] font-medium mt-1 truncate max-w-[130px]">
                                {zodiacName ? (zodiacName.includes(':') ? zodiacName.split(':')[1]?.trim() : zodiacName) : 'Gieo Số'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      {zodiacName && <h3 className="mt-6 text-2xl font-serif text-[var(--color-gold-400)] tracking-wider uppercase">{zodiacName}</h3>}
                    </div>

                    {/* Audio Controls */}
                    <div className="mb-8 flex flex-col items-center justify-center border-b border-[var(--color-gold-500)]/20 pb-8">
                      {audioSrc ? (
                        <div className="w-full max-w-md bg-black/40 p-4 rounded-2xl border border-[var(--color-gold-500)]/30">
                          <p className="text-center text-[var(--color-gold-400)] font-serif mb-3 text-sm flex items-center justify-center gap-2">
                            <Volume2 className="w-4 h-4 animate-bounce" /> Lão phu đang đọc giải lá số...
                          </p>
                          <audio controls src={audioSrc} autoPlay className="w-full" />
                          <p className="text-center text-[var(--color-paper)]/40 text-[11px] mt-2 font-mono border-t border-white/5 pt-2">
                            {isPaid ? "ÂM THANH FULL VIP ĐƯỢC KHAI MỞ TRỌN VẸN" : "ÂM THANH ĐANG Ở CHẾ ĐỘ THỬ NGHIỆM FREE"}
                          </p>
                        </div>
                      ) : isSynthesizingClient ? (
                        <div className="w-full max-w-md bg-black/40 p-4 rounded-2xl border border-[var(--color-gold-500)]/30 flex flex-col items-center">
                          <p className="text-center text-[var(--color-gold-400)] font-serif mb-2 text-sm flex items-center justify-center gap-2">
                            <Volume2 className="w-4 h-4 animate-bounce hover:text-red-400" /> Thầy Đạt đang thông linh đọc quẻ...
                          </p>
                          <div className="flex items-center gap-3 mt-1 mb-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-gold-500)] animate-ping"></span>
                            <span className="text-xs text-white/70 italic font-light">Đang đọc bằng thần âm trình duyệt</span>
                          </div>
                          
                          <button onClick={() => {
                            if ('speechSynthesis' in window) {
                              window.speechSynthesis.cancel();
                            }
                            setIsSynthesizingClient(false);
                          }} className="px-4 py-1.5 rounded-full bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/40 text-xs transition-colors">
                            Dừng đọc giọng thầy
                          </button>
                        </div>
                      ) : (
                        <button onClick={isPaid ? generateAudio : () => setShowPayment(true)} disabled={isGeneratingAudio} className="flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-gold-600)]/20 border border-[var(--color-gold-500)] text-[var(--color-gold-400)] hover:bg-[var(--color-gold-600)]/40 transition-colors disabled:opacity-50">
                          {isGeneratingAudio ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Đang thông linh lấy giọng phù hợp...</>
                          ) : (
                            <><Volume2 className="w-5 h-5" /> {isPaid ? 'Nghe giọng thầy đọc lá số' : 'Mở khóa Audio đọc lá số'}</>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Render Content Area */}
                    <div className="markdown-body relative z-10 text-left">
                      <ReactMarkdown>{splitContent.free}</ReactMarkdown>

                      {isPaid ? (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="border-t border-[var(--color-gold-500)]/20 mt-8 pt-8 text-left">
                          <div className="bg-[var(--color-gold-600)]/10 border border-[var(--color-gold-500)]/30 p-4 rounded-xl mb-6 text-sm flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-[var(--color-gold-400)] shrink-0" />
                            <div>
                              <strong className="text-[var(--color-gold-400)] block">LÁ SỐ VIP ĐÃ ĐƯỢC KHAI MỞ</strong>
                              Đương số đã gửi duyên lành, lão phu hân hoan chúc đương số vạn sự hanh thông, cát tường như ý!
                            </div>
                          </div>
                          <ReactMarkdown>{splitContent.premium}</ReactMarkdown>
                        </motion.div>
                      ) : (
                        <div className="relative mt-12 pt-8 border-t border-dashed border-[var(--color-gold-500)]/30">
                          <div className="opacity-[0.2] filter blur-sm select-none pointer-events-none h-[400px] overflow-hidden mask-image-gradient transition-all duration-300">
                            <ReactMarkdown>{splitContent.premium}</ReactMarkdown>
                          </div>

                          <div className="absolute inset-0 flex flex-col items-center justify-start pt-6 z-20">
                            <div className="bg-[#16120e]/95 backdrop-blur-md p-8 rounded-2xl border border-[var(--color-gold-500)]/60 text-center shadow-[0_0_30px_rgba(0,0,0,0.8)] max-w-sm">
                              <div className="bg-gradient-to-br from-[var(--color-gold-400)] to-[var(--color-gold-600)] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                                <Lock className="w-8 h-8 text-black" />
                              </div>
                              <h4 className="text-2xl font-serif text-[var(--color-gold-400)] mb-3">Thiên Cơ Khả Lộ</h4>
                              <p className="text-white/80 mb-6 text-sm leading-relaxed">
                                Để xem trọn vẹn luận giải chi tiết <strong>11 cung mệnh còn lại</strong> kèm lời khuyên vận hạn trọn đời, kính mời đương số dâng chút lễ mọn (100.000đ) để mở khóa thiên cơ.
                              </p>
                              <button onClick={() => setShowPayment(true)} className="w-full bg-gradient-to-r from-[var(--color-gold-600)] to-[var(--color-gold-400)] text-black font-bold py-3 px-6 rounded-full hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-2">
                                Mở Khóa Toàn Bộ Lá Số
                              </button>
                            </div>
                          </div>
                          
                          <style>{`
                            .mask-image-gradient {
                              -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
                              mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
                            }
                          `}</style>
                        </div>
                      )}
                    </div>

                    {/* Footer reset button */}
                    <div className="mt-12 pt-8 border-t border-[var(--color-gold-500)]/20 flex justify-center relative z-10">
                      <button onClick={() => {
                        if ('speechSynthesis' in window) {
                          window.speechSynthesis.cancel();
                        }
                        setIsSynthesizingClient(false);
                        setResult(null); setZodiacImage(null); setAudioSrc(null); setIsPaid(false); setShowPayment(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }} className="flex items-center gap-2 px-8 py-3 rounded-full bg-transparent border border-[var(--color-gold-500)] text-[var(--color-gold-400)] hover:bg-[var(--color-gold-600)]/20 transition-colors">
                        <RefreshCw className="w-5 h-5" /> Lập Quẻ Khai Số Mới
                      </button>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Screen-level full screen payment overlay modal */}
      <AnimatePresence>
        {showPayment && !isPaid && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#16120e] p-6 rounded-3xl border-2 border-[var(--color-gold-500)] shadow-[0_0_50px_rgba(212,175,55,0.25)] relative my-8"
            >
              <button 
                onClick={() => setShowPayment(false)} 
                className="absolute top-4 right-4 text-white/40 hover:text-[var(--color-gold-400)] transition-colors p-1"
                aria-label="Đóng"
              >
                <X className="w-6 h-6" />
              </button>

              {/* COMPONENT THANH TOÁN THẬT */}
              <PaymentScreen onPaidSuccess={() => {
                setIsPaid(true);
                setShowPayment(false);
              }} />
              
              <button onClick={() => setShowPayment(false)} className="mt-6 w-full text-white/50 hover:text-[var(--color-gold-400)] transition-colors py-2.5 text-sm font-light border-t border-[var(--color-gold-500)]/15">
                Hủy bỏ / Quay lại
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =====================================================================
// COMPONENT THANH TOÁN (KẾT NỐI API THỰC TẾ)
// =====================================================================
function PaymentScreen({ onPaidSuccess }: { onPaidSuccess: () => void }) {
  const [statusText, setStatusText] = useState('Đang khởi tạo mã thanh toán...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

  // 1. Gọi API tạo đơn hàng
  useEffect(() => {
    const createOrder = async () => {
      try {
        const response = await fetch('https://anhtheonline.id.vn/checkout.php');
        const data = await response.json();

        if (data.error === 0) {
          setOrderId(data.orderId);
          setCheckoutUrl(data.checkoutUrl);
          setStatusText('Quét mã phía trên để dâng lễ');
        } else {
          setStatusText('Lỗi khởi tạo thanh toán: ' + data.message);
        }
      } catch (error) {
        console.error("Lỗi gọi checkout.php", error);
        setStatusText('Mạng lưới hư không, vui lòng thử lại sau.');
      }
    };
    createOrder();
  }, []);

  // 2. Polling API kiểm tra trạng thái
  useEffect(() => {
    if (!orderId) return;

    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`https://anhtheonline.id.vn/check_status.php?id=${orderId}`);
        const data = await response.json();

        if (data.error === 0 && data.status === 'PAID') {
          setStatusText('Gieo quẻ thành công! Đang hiển thị...');
          setIsSuccess(true);
          clearInterval(checkInterval); 
          
          setTimeout(() => {
            onPaidSuccess();
          }, 1500);
        }
      } catch (error) {
        console.error("Lỗi kiểm tra mạng", error);
      }
    }, 3000);

    return () => clearInterval(checkInterval);
  }, [orderId, onPaidSuccess]);

  return (
    <div className="flex flex-col items-center justify-center">
      <h3 className="font-serif text-2xl text-[var(--color-gold-400)] mb-2 mt-2">Dâng Lễ Mở Cung</h3>
      <p className="text-xs text-stone-400 mb-6 font-light">Tùy hỷ 100.000đ để xem tiếp 11 cung mệnh</p>

      {/* Khung chứa iframe QR Code */}
      <div className="w-full h-[760px] md:h-[800px] bg-white rounded-xl p-1 mb-6 relative overflow-hidden flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)] border-2 border-[var(--color-gold-500)]">
        {checkoutUrl ? (
          <iframe 
            src={checkoutUrl} 
            width="100%" 
            height="100%" 
            frameBorder="0" 
            scrolling="yes"
            title="PayOS Checkout"
            className="rounded-lg"
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[var(--color-gold-600)] animate-spin" />
            <span className="text-gray-500 text-sm font-medium">Đang thỉnh mã QR...</span>
          </div>
        )}
      </div>

      {/* Trạng thái thanh toán */}
      <div className={`w-full px-5 py-3 rounded-full border flex items-center justify-center gap-2 transition-colors ${isSuccess ? 'bg-green-900/40 border-green-500 text-green-400' : 'bg-[var(--color-gold-600)]/10 border-[var(--color-gold-500)]/40 text-[var(--color-gold-400)]'}`}>
        {isSuccess ? <Sparkles className="w-5 h-5" /> : <Loader2 className="w-5 h-5 animate-spin" />}
        <span className="text-sm font-medium">{statusText}</span>
      </div>
    </div>
  );
}