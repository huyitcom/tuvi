/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, Calendar, Clock, User, Volume2, Upload, X, Camera, Lock, CheckCircle, RefreshCw, Play, Pause, SkipForward, SkipBack, VolumeX, Music, BarChart3, Users, Activity, Percent, Award, Heart } from 'lucide-react';
import { saveDivination, updatePremiumStatus, getRecentDivinations, testConnection } from './firebase';

// Helper to format localized relative timestamps for our live dashboard feed
function formatRelativeTime(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "Vừa mới xong ☯️";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffSecs < 10) return "Vừa mới xong ☯️";
  if (diffSecs < 60) return `${diffSecs} giây trước`;
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return date.toLocaleDateString('vi-VN', { 
    day: '2-digit', 
    month: '2-digit',
    year: 'numeric'
  }) + ' lúc ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

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
  // STATE THANH TOÁN & PREMIUM INTERACTIVES
  // ==========================================
  const [isPaid, setIsPaid] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [premiumResult, setPremiumResult] = useState<string | null>(null);
  const [loadingPremium, setLoadingPremium] = useState(false);

  // ==========================================
  // STATE PHÁT AUDIO TỪNG CUNG MỆNH THÔNG MINH
  // ==========================================
  const [audioCache, setAudioCache] = useState<Record<string, string>>({});
  const [playingSectionId, setPlayingSectionId] = useState<string | null>(null);
  const [loadingSectionId, setLoadingSectionId] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // ==========================================
  // STATE FIRESTORE & THỐNG KÊ LƯU LƯỢNG
  // ==========================================
  const [currentDivinationId, setCurrentDivinationId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Chế độ quản trị & phân quyền
  const [showAdminButton, setShowAdminButton] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    const auth = sessionStorage.getItem("thaybay_admin_authenticated");
    return auth === "true" || (auth !== null && auth.length >= 24);
  });
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [tempPasscode, setTempPasscode] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");

  useEffect(() => {
    testConnection();
    // Kiểm tra nếu URL có chứa bùa truy cập quản trị viên `admin=true` hoặc tương đương
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "true" || params.has("admin")) {
      setShowAdminButton(true);
    }
  }, []);

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
  // HÀM CHIA CẮT VĂN BẢN (NỬA FREE - NỬA VIP LẬP RIÊNG BIỆT)
  // ==========================================
  const premiumPlaceholderText = `
## 4. Cung Phụ Mẫu
*(Nội dung dâng lễ mới khai mở)*
Đương số sẽ nhìn thấu sâu đậm nhân duyên với đấng sinh thành, thấu hiểu sức khỏe, thọ mạng và mối liên kết tâm linh với cha mẹ qua các chòm sao hộ mệnh...

## 5. Cung Thiên Di
*(Nội dung dâng lễ mới khai mở)*
Con đường viễn xứ, xuất ngoại, giao thiệp nhân gian, hung cát khi bước chân ra xã hội sẽ hiển lộ rõ rệt, giúp đương số biết tiến lui đúng thế, tránh xa tiểu nhân dữ dằn...

## 6. Cung Tật Ách
*(Nội dung dâng lễ mới khai mở)*
Chi tiết về tai ách dập dồn, căn bệnh tiềm ẩn và phương cách hóa giải từ gốc rễ tâm đức, bảo bọc thân mệnh bình an...

## 7. Cung Nô Bộc
*(Nội dung dâng lễ mới khai mở)*
Bè bạn, người giúp việc, đối tác làm ăn có trung thành, trợ lực hay là điềm báo phản trắc tổn hao...

## 8. Cung Quan Lộc
*(Nội dung dâng lễ mới khai mở)*
Đỉnh cao danh vọng hay khúc quanh sự nghiệp, nên tự lập làm chủ hay nương nhờ trướng người khác...

## 9. Cung Điền Trạch
*(Nội dung dâng lễ mới khai mở)*
Cơ ngơi bất động sản, của cải đất đai tích lũy và vận may điền sản cả đời...

## 10. Cung Tử Tức
*(Nội dung dâng lễ mới khai mở)*
Duyên lành con cái, hiếu thảo phu thê và tài năng của thế hệ tiếp nối...

## 11. Cung Huynh Đệ
*(Nội dung dâng lễ mới khai mở)*
Tình cảm anh em ruột thịt, sự tương trợ hay tranh chấp trong cuộc sống...

## 12. Cung Phúc Đức
*(Nội dung dâng lễ mới khai mở)*
Phúc phần gia tiên dòng họ, sự che chở của tổ tiên và hậu vận thọ tường...

## Lời khuyên tổng thể vận hạn trọn đời từ Thầy Bảy
*(Nội dung dâng lễ mới khai mở)*
Kim chỉ nam hóa giải tai ương, đón tài rước lộc dặn dò từ lão phu...
`;

  const getSections = () => {
    const list: { id: string; title: string; content: string; isPremium: boolean }[] = [];
    
    const parseText = (text: string | null, isPrem: boolean) => {
      if (!text) return [];
      const parts = text.split(/(?=^##\s+)/m);
      const subList: typeof list = [];
      
      let intro = parts[0]?.trim();
      if (intro && !intro.startsWith('##')) {
        subList.push({
          id: isPrem ? 'premium-intro' : 'intro',
          title: isPrem ? 'Lời nhắn tinh tế từ Thầy' : 'Nhận định tổng quan',
          content: intro,
          isPremium: isPrem
        });
      }
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (part.startsWith('##')) {
          const lines = part.split('\n');
          const titleLine = lines[0].replace(/^##\s+/, '').trim();
          const contentLines = lines.slice(1).join('\n').trim();
          
          let id = `sec-${isPrem ? 'prem-' : 'free-'}${i}`;
          const titleLower = titleLine.toLowerCase();
          if (titleLower.includes('bản mệnh')) id = 'ban-menh';
          else if (titleLower.includes('phu thê')) id = 'phu-the';
          else if (titleLower.includes('tài bạch') || titleLower.includes('tài sản') || titleLower.includes('nghề nghiệp')) id = 'tai-bach';
          else if (titleLower.includes('phụ mẫu') || titleLower.includes('cha mẹ')) id = 'phu-mau';
          else if (titleLower.includes('thiên di')) id = 'thien-di';
          else if (titleLower.includes('tật ách')) id = 'tat-ach';
          else if (titleLower.includes('nô bộc')) id = 'no-boc';
          else if (titleLower.includes('quan lộc')) id = 'quan-loc';
          else if (titleLower.includes('điền trạch')) id = 'dien-trach';
          else if (titleLower.includes('tử tức')) id = 'tu-tuc';
          else if (titleLower.includes('huynh đệ')) id = 'huynh-de';
          else if (titleLower.includes('phúc đức')) id = 'phuc-duc';
          else if (titleLower.includes('khuyên') || titleLower.includes('tổng thể') || titleLower.includes('vận hạn')) id = 'loi-khuyen';
          
          subList.push({
            id,
            title: titleLine,
            content: contentLines,
            isPremium: isPrem
          });
        }
      }
      return subList;
    };

    const freeList = parseText(result, false);
    const premiumList = parseText(premiumResult || (isPaid ? null : premiumPlaceholderText), true);
    
    return [...freeList, ...premiumList];
  };

  const generateAudioForText = async (rawText: string): Promise<string> => {
    const cleanText = rawText.replace(/[#*`_]/g, '').trim();
    const response = await fetch("/api/generate-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleanText })
    });

    if (!response.ok) {
      throw new Error("Server TTS error");
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error("Empty audio file");
    }
    return URL.createObjectURL(blob);
  };

  const playSection = async (sectionId: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSynthesizingClient(false);

    const sections = getSections();
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    if (section.isPremium && !isPaid) {
      setShowPayment(true);
      setError("Mời đương số dâng ly cafe tùy hỷ (19k) để lão phu luận giải tinh tế và khai mở nốt 9 cung thâm sâu nhen.");
      return;
    }

    if (playingSectionId === sectionId) {
      if (audioPlayerRef.current) {
        if (isAudioPlaying) {
          audioPlayerRef.current.pause();
          setIsAudioPlaying(false);
        } else {
          audioPlayerRef.current.play()
            .then(() => setIsAudioPlaying(true))
            .catch(err => console.error("Play error:", err));
        }
      }
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsAudioPlaying(false);
    }

    if (audioCache[sectionId]) {
      setPlayingSectionId(sectionId);
      setIsAudioPlaying(true);
      setTimeout(() => {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = audioCache[sectionId];
          audioPlayerRef.current.play()
            .then(() => setIsAudioPlaying(true))
            .catch(err => console.error("Play cache error:", err));
        }
      }, 50);
      return;
    }

    setLoadingSectionId(sectionId);
    setError(null);

    const textToSpeak = `Luận về ${section.title}. ${section.content}`;

    try {
      const audioUrl = await generateAudioForText(textToSpeak);
      setAudioCache(prev => ({ ...prev, [sectionId]: audioUrl }));
      setPlayingSectionId(sectionId);
      setIsAudioPlaying(true);
      setTimeout(() => {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.src = audioUrl;
          audioPlayerRef.current.play()
            .then(() => setIsAudioPlaying(true))
            .catch(err => console.error("Play downloaded error:", err));
        }
      }, 50);
    } catch (err: any) {
      console.warn("Server TTS failed, using Web Speech Synthesis fallback:", err);
      playSectionWithWebSpeech(sectionId, textToSpeak);
    } finally {
      setLoadingSectionId(null);
    }
  };

  const playSectionWithWebSpeech = (sectionId: string, textToSpeak: string) => {
    if (!('speechSynthesis' in window)) {
      setError("Lão phu bị khản cổ và trình duyệt không hỗ trợ đọc tự động. Xin đương số tự xem vậy.");
      return;
    }

    setPlayingSectionId(sectionId);
    setIsSynthesizingClient(true);
    setSyntheticStatus("Thầy đang bấm niệm truyền âm...");

    const cleanText = textToSpeak
      .replace(/[#*`_:-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const sentences = cleanText.split(/([.!?\n]+)/).filter(s => s.trim().length > 0);
    let currentLineIdx = 0;

    const speakLine = () => {
      if (currentLineIdx >= sentences.length) {
        setIsSynthesizingClient(false);
        setIsAudioPlaying(false);
        handleAudioEnded(sectionId);
        return;
      }

      let sentence = sentences[currentLineIdx];
      if (sentence.match(/^[.!?\n\s]+$/)) {
        currentLineIdx++;
        speakLine();
        return;
      }

      currentLineIdx++;
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = 'vi-VN';
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(v => v.lang.toLowerCase().includes('vi'));
      if (viVoice) utterance.voice = viVoice;
      utterance.rate = 0.90;
      utterance.pitch = 0.95;

      utterance.onend = () => {
        speakLine();
      };
      utterance.onerror = () => {
        speakLine();
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    speakLine();
  };

  const handleAudioEnded = (endedId: string) => {
    setIsAudioPlaying(false);
    if (!autoPlayNext) return;

    const sections = getSections();
    const curIdx = sections.findIndex(s => s.id === endedId);
    if (curIdx !== -1 && curIdx + 1 < sections.length) {
      const nextSection = sections[curIdx + 1];
      if (nextSection.isPremium && !isPaid) {
        return;
      }
      playSection(nextSection.id);
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
    
    // Đảm bảo reset trạng thái thanh toán và âm thanh khi xem lá số mới
    setIsPaid(false);
    setShowPayment(false);
    setPremiumResult(null);
    setAudioCache({});
    setPlayingSectionId(null);
    setLoadingSectionId(null);
    setIsAudioPlaying(false);

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

      // Lưu chiêm viễn vào Firestore bảo bọc thống kê
      try {
        const divId = await saveDivination({
          gender,
          day,
          month,
          year,
          calendar,
          hour,
          minute,
          zodiacName: data.zodiacName || "Mệnh khuyết",
          hasPortrait: !!portraitImage,
          isPremium: false,
        });
        setCurrentDivinationId(divId);
      } catch (dbErr) {
        console.error("Lỗi lưu sổ gieo quẻ vận mệnh vào Firestore:", dbErr);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Có lỗi xảy ra trong quá trình bấm độn. Xin hãy thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPremiumResult = async (currentFreeResult: string) => {
    setLoadingPremium(true);
    setError(null);
    setPremiumResult(null);
    try {
      const response = await fetch("/api/analyze-premium-chart", {
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
          portraitImage,
          freeResult: currentFreeResult
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Mạng lưới vũ trụ chưa ổn định, lão phu chưa thể mở tiếp 9 cung mệnh. Đương số hãy tải lại trang sau.");
      }

      const data = await response.json();
      setPremiumResult(data.result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Có sự cố ngoài ý muốn khi lão phu tiếp tục bấm độn 9 cung tiếp theo.");
    } finally {
      setLoadingPremium(false);
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await getRecentDivinations();
      setStatsData(data);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu thống kê từ hệ thống:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleAdminVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = tempPasscode.trim();
    if (!cleanCode) return;

    setLoadingStats(true);
    setAdminLoginError("");
    try {
      const response = await fetch("/api/admin/verify-passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: cleanCode })
      });

      if (response.ok) {
        const data = await response.json();
        setIsAdminAuthenticated(true);
        setShowAdminButton(true);
        sessionStorage.setItem("thaybay_admin_authenticated", data.sessionToken || "true");
        setShowAdminLoginModal(false);
        setTempPasscode("");
        setAdminLoginError("");
        
        // Load stats of divinations immediately for admin dashboard
        await loadStats();
        setShowStats(true);
      } else {
        const data = await response.json();
        setAdminLoginError(data.error || "Thiên thư mật hiệu chưa đúng, xin mời nhập lại.");
      }
    } catch (err) {
      console.error("Lỗi xác thực quản trị viên:", err);
      setAdminLoginError("Không thể truyền tin mật hiệu sang máy chủ. Có lỗi kết nối xảy ra.");
    } finally {
      setLoadingStats(false);
    }
  };

  // Tính toán số liệu thống kê thần số học
  const totalQueries = statsData.length;
  const premiumQueries = statsData.filter(d => d.isPremium).length;
  const premiumRate = totalQueries > 0 ? ((premiumQueries / totalQueries) * 100).toFixed(1) : "0";

  const maleCount = statsData.filter(d => d.gender === 'Nam').length;
  const femaleCount = totalQueries - maleCount;
  const malePercent = totalQueries > 0 ? ((maleCount / totalQueries) * 100).toFixed(0) : "50";
  const femalePercent = totalQueries > 0 ? (100 - parseFloat(malePercent)).toFixed(0) : "50";

  const solarCount = statsData.filter(d => d.calendar === 'Dương lịch').length;
  const lunarCount = totalQueries - solarCount;
  const solarPercent = totalQueries > 0 ? ((solarCount / totalQueries) * 100).toFixed(0) : "50";
  const lunarPercent = totalQueries > 0 ? (100 - parseFloat(solarPercent)).toFixed(0) : "50";

  // Thống kê con giáp
  const zodiacCounts: Record<string, number> = {};
  statsData.forEach(d => {
    const rawVal = d.zodiacName || "Không rõ";
    const cleanZodiac = rawVal.includes(':') ? rawVal.split(':')[1]?.trim() : rawVal;
    zodiacCounts[cleanZodiac] = (zodiacCounts[cleanZodiac] || 0) + 1;
  });
  const sortedZodiacs = Object.entries(zodiacCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

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
            <h1 
              onDoubleClick={() => {
                setTempPasscode("");
                setAdminLoginError("");
                setShowAdminLoginModal(true);
              }}
              title="Nhấp đúp chuột để cấu hình quản trị viên"
              className="font-serif text-5xl md:text-7xl font-medium text-[var(--color-gold-500)] mb-4 tracking-tight select-none cursor-pointer"
            >
              Thầy Bảy Chợ Lớn
            </h1>
            <p className="text-lg md:text-xl text-[var(--color-paper)] opacity-70 font-light max-w-2xl mx-auto">
              Cung cấp ngày giờ sinh, tỏ thiên cơ. Lão phu sẽ giúp đương số nhìn thấu 12 cung mệnh vận, thấu hiểu nhân sinh.
            </p>
            {showAdminButton && (
              <div className="mt-6 flex justify-center">
                <button 
                  onClick={() => {
                    if (isAdminAuthenticated) {
                      loadStats();
                      setShowStats(true);
                    } else {
                      setTempPasscode("");
                      setAdminLoginError("");
                      setShowAdminLoginModal(true);
                    }
                  }} 
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-mystic-700)] border border-[var(--color-gold-500)]/30 text-[var(--color-gold-400)] text-sm font-serif transition-all hover:border-[var(--color-gold-500)] hover:bg-[var(--color-gold-600)]/15 active:translate-y-px cursor-pointer"
                  id="btn-destiny-stats"
                >
                  <BarChart3 className="w-4 h-4 text-[var(--color-gold-400)]" />
                  Lưu Lượng Thần Số (Báo Cáo Gieo Quẻ) - Admin
                </button>
              </div>
            )}
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
                          <><Sparkles className="w-6 h-6 text-[var(--color-gold-400)]" /> Xem Quẻ Ngay</>
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
                <p className="text-white/60">Thiên cơ đang dần hé lộ, vui lòng chờ chút nhé.</p>
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
                              <span className="block text-4xl mb-1 filter drop-shadow-[0_0_10px_rgba(212,175,55,0.7)]">☯️</span>
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

                    {/* Hidden Native Audio Element used by the player backend */}
                    <audio
                      ref={audioPlayerRef}
                      onEnded={() => handleAudioEnded(playingSectionId || '')}
                      className="hidden"
                    />

                    {/* Celestial Section-by-Section Audio Player Bar */}
                    <div className="mb-10 w-full bg-[#120d0a]/80 p-5 rounded-2xl border-2 border-[var(--color-gold-500)]/20 shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[var(--color-gold-400)]"></div>
                      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[var(--color-gold-400)]"></div>
                      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[var(--color-gold-400)]"></div>
                      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[var(--color-gold-400)]"></div>
                      
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Current Playing Indicator */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isAudioPlaying ? 'bg-[var(--color-gold-500)]/20 text-[var(--color-gold-400)] border border-[var(--color-gold-400)]/50 shadow-[0_0_8px_rgba(212,175,55,0.3)]' : 'bg-black/30 text-white/40 border border-white/5'}`}>
                            {isAudioPlaying ? (
                              <Volume2 className="w-5 h-5 text-[var(--color-gold-400)]" />
                            ) : (
                              <Music className="w-5 h-5" />
                            )}
                          </div>
                          <div className="text-left">
                            <span className="block text-[10px] uppercase tracking-wider text-white/50">Trình phát Giọng Thầy Bảy</span>
                            <span className="text-sm font-serif text-[var(--color-gold-400)] block font-semibold truncate max-w-[260px] md:max-w-[320px]">
                              {playingSectionId 
                                ? `Đang diễn xướng: ${getSections().find(s => s.id === playingSectionId)?.title || 'Lời Thầy dặn'}`
                                : 'Chưa chọn cung số để khởi xướng giọng...'}
                            </span>
                          </div>
                        </div>

                        {/* Player Controls */}
                        <div className="flex items-center gap-4">
                          {/* Prev Button */}
                          <button
                            onClick={() => {
                              const list = getSections();
                              const curIdx = list.findIndex(s => s.id === playingSectionId);
                              if (curIdx > 0) {
                                playSection(list[curIdx - 1].id);
                              }
                            }}
                            disabled={!playingSectionId || getSections().findIndex(s => s.id === playingSectionId) <= 0}
                            className="p-2.5 rounded-full bg-black/30 border border-white/5 text-[var(--color-paper)] hover:bg-black/50 hover:text-[var(--color-gold-400)] disabled:opacity-20 disabled:pointer-events-none transition-colors"
                            title="Cung trước đó"
                          >
                            <SkipBack className="w-4 h-4" />
                          </button>

                          {/* Play/Pause Button */}
                          <button
                            onClick={() => {
                              if (playingSectionId) {
                                playSection(playingSectionId);
                              } else {
                                // Tự động phát từ cung đầu tiên
                                const list = getSections();
                                if (list.length > 0) playSection(list[0].id);
                              }
                            }}
                            className="p-4 rounded-full bg-gradient-to-r from-[var(--color-gold-600)] to-[var(--color-gold-400)] text-black font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
                            title={isAudioPlaying ? "Tạm ngưng" : "Phát giọng thầy"}
                          >
                            {loadingSectionId ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : isAudioPlaying ? (
                              <Pause className="w-5 h-5 text-black fill-black" />
                            ) : (
                              <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                            )}
                          </button>

                          {/* Next Button */}
                          <button
                            onClick={() => {
                              const list = getSections();
                              const curIdx = list.findIndex(s => s.id === playingSectionId);
                              if (curIdx !== -1 && curIdx + 1 < list.length) {
                                playSection(list[curIdx + 1].id);
                              }
                            }}
                            disabled={!playingSectionId || getSections().findIndex(s => s.id === playingSectionId) >= getSections().length - 1}
                            className="p-2.5 rounded-full bg-black/30 border border-white/5 text-[var(--color-paper)] hover:bg-black/50 hover:text-[var(--color-gold-400)] disabled:opacity-20 disabled:pointer-events-none transition-colors"
                            title="Cung tiếp theo"
                          >
                            <SkipForward className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Auto Play Next Toggle */}
                        <div className="flex items-center gap-2 border-t border-dashed border-white/5 pt-3 md:pt-0 md:border-0 md:pl-4">
                          <button
                            onClick={() => setAutoPlayNext(!autoPlayNext)}
                            className={`px-3 py-1.5 rounded-full border text-xs font-serif transition-colors flex items-center gap-1.5 ${autoPlayNext ? 'bg-[var(--color-gold-600)]/15 border-[var(--color-gold-500)] text-[var(--color-gold-400)]' : 'bg-black/20 border-white/10 text-white/40'}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${autoPlayNext ? 'bg-[var(--color-gold-400)] shadow-[0_0_4px_var(--color-gold-400)]' : 'bg-white/20'}`}></span>
                            Tự động chuyển cung: {autoPlayNext ? 'Bật' : 'Tắt'}
                          </button>
                        </div>
                      </div>

                      {/* Web speech loading fallback label */}
                      {isSynthesizingClient && (
                        <div className="mt-3 text-center text-xs text-white/50 italic flex items-center justify-center gap-2 border-t border-white/5 pt-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--color-gold-400)] shadow-[0_0_4px_var(--color-gold-400)] animate-pulse" /> {syntheticStatus || 'Thầy đang truyền âm đọc cung số bằng thần thanh bản địa...'}
                        </div>
                      )}

                      {/* Horizon Playlist Quick List */}
                      <div className="mt-4 pt-3 border-t border-white/5 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                        {getSections().map((sec) => {
                          const isCurrent = sec.id === playingSectionId;
                          const isSecLoading = sec.id === loadingSectionId;
                          return (
                            <button
                              key={sec.id}
                              onClick={() => playSection(sec.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap flex items-center gap-1 border transition-all shrink-0 ${
                                isCurrent 
                                  ? 'bg-[var(--color-gold-600)]/30 border-[var(--color-gold-400)] text-[var(--color-gold-400)] font-serif shadow-[0_0_8px_rgba(212,175,55,0.2)]'
                                  : sec.isPremium && !isPaid
                                    ? 'bg-black/40 border-dashed border-white/10 text-white/30'
                                    : 'bg-black/20 border-white/10 text-white/60 hover:border-white/20'
                              }`}
                            >
                              {isSecLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin text-[var(--color-gold-400)]" />
                              ) : isCurrent && isAudioPlaying ? (
                                <Pause className="w-2.5 h-2.5 fill-current text-[var(--color-gold-400)]" />
                              ) : sec.isPremium && !isPaid ? (
                                <Lock className="w-2.5 h-2.5 text-white/30" />
                              ) : (
                                <Play className="w-2.5 h-2.5 text-white/40" />
                              )}
                              {sec.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Main Render Section by Section */}
                    <div className="space-y-8 text-left relative z-10">
                      {getSections().map((section, idx) => {
                        const isSectionPlaying = section.id === playingSectionId && isAudioPlaying;
                        const isSectionLoading = section.id === loadingSectionId;
                        const isLocked = section.isPremium && !isPaid;

                        return (
                          <motion.div
                            key={section.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: Math.min(idx * 0.05, 0.5) }}
                            className={`p-6 rounded-2xl bg-[#0f0a07]/60 border transition-all ${
                              isSectionPlaying 
                                ? 'border-[var(--color-gold-500)] shadow-[0_0_15px_rgba(212,175,55,0.1)] bg-[#120e0a]' 
                                : isLocked
                                  ? 'border-white/5 opacity-80'
                                  : 'border-[var(--color-gold-500)]/20 hover:border-[var(--color-gold-500)]/30'
                            }`}
                          >
                            {/* Section Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--color-gold-500)]/15 pb-4 mb-4">
                              <div className="flex items-center gap-3">
                                <h3 className="font-serif text-2xl font-medium text-[var(--color-gold-400)] tracking-wide">
                                  {section.title}
                                </h3>
                                
                                {/* VIP/Free Tag */}
                                <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium tracking-wider uppercase border ${
                                  isLocked 
                                    ? 'bg-black/40 border-white/10 text-white/40'
                                    : section.isPremium
                                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                                      : 'bg-sky-950/20 border-sky-500/30 text-sky-400'
                                }`}>
                                  {isLocked ? 'VIP Lớp Khóa' : section.isPremium ? 'VIP Đã Mở' : 'Giải Miễn Phí'}
                                </span>
                              </div>

                              {/* Section Speech Control Trigger */}
                              <button
                                onClick={() => playSection(section.id)}
                                className={`px-3 py-1.5 rounded-full border text-xs flex items-center gap-1.5 transition-all w-fit ${
                                  isSectionPlaying 
                                    ? 'bg-red-950/40 border-red-500/30 text-red-400 hover:bg-red-900/40' 
                                    : isLocked
                                      ? 'bg-black/30 border-white/10 text-white/30 cursor-pointer hover:border-white/30'
                                      : 'bg-[var(--color-gold-600)]/10 border-[var(--color-gold-500)]/40 text-[var(--color-gold-400)] hover:bg-[var(--color-gold-600)]/20 shadow-sm'
                                }`}
                              >
                                {isSectionLoading ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Lão phu đang niệm truyền âm...</span>
                                  </>
                                ) : isSectionPlaying ? (
                                  <>
                                    <span className="flex gap-0.5 items-end h-2.5 w-3 overflow-hidden shrink-0">
                                      <span className="w-0.5 bg-current animate-[equalizer_0.8s_ease-in-out_infinite]"></span>
                                      <span className="w-0.5 bg-current animate-[equalizer_0.6s_ease-in-out_infinite_0.15s]"></span>
                                      <span className="w-0.5 bg-current animate-[equalizer_1s_ease-in-out_infinite_0.3s]"></span>
                                    </span>
                                    <span>Tạm dừng</span>
                                  </>
                                ) : isLocked ? (
                                  <>
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Dâng lễ mở audio</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>Nghe Thầy đọc</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Section Content Block */}
                            <div className="markdown-body text-[var(--color-paper)]/95 relative">
                              {isLocked ? (
                                <div className="relative">
                                  {/* Blurred teaser content */}
                                  <div className="opacity-15 filter blur-xs select-none pointer-events-none transition-all duration-300">
                                    <ReactMarkdown>{section.content}</ReactMarkdown>
                                  </div>

                                  {/* Payment Trigger UI Frame inside card */}
                                  <div className="absolute inset-x-0 top-0 flex flex-col items-center justify-center py-4 bg-gradient-to-t from-black/80 to-transparent">
                                    <div className="bg-[#1c140e]/95 p-5 rounded-xl border border-[var(--color-gold-500)]/50 text-center shadow-lg max-w-sm">
                                      <Lock className="w-6 h-6 text-[var(--color-gold-400)] mx-auto mb-2" />
                                      <p className="text-sm text-white/90 mb-4 font-serif">
                                        Vận phận cung này thâm sâu khôn lường. Mời đương số dâng lễ ấm bụng ly cafe <strong>(19k)</strong> để nhận lời vàng ý ngọc khai tỏ thiên cơ trọn đời.
                                      </p>
                                      
                                      <button 
                                        onClick={() => setShowPayment(true)}
                                        className="w-full bg-gradient-to-r from-[var(--color-gold-600)] to-[var(--color-gold-400)] text-black font-bold text-xs py-2 px-4 rounded-full hover:shadow-[0_0_12px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-1"
                                      >
                                        Dâng Lễ Khai Mở Cung Mệnh Full VIP
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <ReactMarkdown>{section.content}</ReactMarkdown>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Footer Reset Button */}
                    <div className="mt-12 pt-8 border-t border-[var(--color-gold-500)]/20 flex justify-center relative z-10">
                      <button 
                        onClick={() => {
                          if ('speechSynthesis' in window) {
                            window.speechSynthesis.cancel();
                          }
                          setIsSynthesizingClient(false);
                          setResult(null); 
                          setZodiacImage(null); 
                          setAudioSrc(null); 
                          setIsPaid(false); 
                          setShowPayment(false);
                          setAudioCache({});
                          setPlayingSectionId(null);
                          setLoadingSectionId(null);
                          setIsAudioPlaying(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} 
                        className="flex items-center gap-2 px-8 py-3 rounded-full bg-transparent border border-[var(--color-gold-500)] text-[var(--color-gold-400)] hover:bg-[var(--color-gold-600)]/20 transition-colors"
                      >
                        <RefreshCw className="w-5 h-5" /> Lập Quẻ Khai Số Mới
                      </button>
                    </div>

                    {/* Equalizer animation css */}
                    <style>{`
                      @keyframes equalizer {
                        0%, 100% { height: 15%; }
                        50% { height: 100%; }
                      }
                    `}</style>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto scrollbar-none">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#16120e] p-4 sm:p-6 rounded-3xl border-2 border-[var(--color-gold-500)] shadow-[0_0_50px_rgba(212,175,55,0.25)] relative my-auto max-h-[94vh] flex flex-col overflow-y-auto scrollbar-thin"
            >
              <button 
                onClick={() => setShowPayment(false)} 
                className="absolute top-4 right-4 text-white/40 hover:text-[var(--color-gold-400)] transition-colors p-1 z-10"
                aria-label="Đóng"
              >
                <X className="w-6 h-6" />
              </button>

              {/* COMPONENT THANH TOÁN THẬT */}
              <PaymentScreen onPaidSuccess={async () => {
                setIsPaid(true);
                setShowPayment(false);
                if (currentDivinationId) {
                  try {
                    await updatePremiumStatus(currentDivinationId);
                  } catch (dbErr) {
                    console.error("Lỗi đồng bộ dâng lễ lên Firestore:", dbErr);
                  }
                }
                if (result) {
                  fetchPremiumResult(result);
                }
              }} />
              
              <button onClick={() => setShowPayment(false)} className="mt-4 w-full text-white/50 hover:text-[var(--color-gold-400)] transition-colors py-2 text-sm font-light border-t border-[var(--color-gold-500)]/15 shrink-0">
                Hủy bỏ / Quay lại
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Thống kê lưu lượng và chi tiết gieo quẻ */}
      <AnimatePresence>
        {showStats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto scrollbar-none">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-[#16120e] p-5 sm:p-8 rounded-3xl border-2 border-[var(--color-gold-500)] shadow-[0_0_50px_rgba(212,175,55,0.25)] relative my-auto max-h-[90vh] flex flex-col overflow-hidden"
            >
              <button 
                onClick={() => setShowStats(false)} 
                className="absolute top-4 right-4 text-white/40 hover:text-[var(--color-gold-400)] transition-colors p-1"
                aria-label="Đóng"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-3 border-b border-[var(--color-gold-500)]/15 pb-4 mb-5 shrink-0">
                <BarChart3 className="w-7 h-7 text-[var(--color-gold-400)]" />
                <div className="text-left">
                  <h3 className="font-serif text-2xl text-[var(--color-gold-400)]">Lưu Lượng Thần Số</h3>
                  <p className="text-xs text-stone-400 font-light">Thống kê chi tiết các lượt bấm độn gieo quẻ trên hệ thống</p>
                </div>
              </div>

              {loadingStats ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-10 h-10 text-[var(--color-gold-400)] animate-spin" />
                  <p className="text-sm text-white/50 italic font-serif">Thầy đang lục lọi sổ vận thiên tào để cập nhật số liệu...</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-1 space-y-6 scrollbar-thin text-left">
                  {/* HẠNG MỤC TỔNG QUAN */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-black/30 border border-white/5 p-4 rounded-2xl text-center">
                      <Users className="w-5 h-5 text-[var(--color-gold-500)] mx-auto mb-1.5" />
                      <div className="text-xs text-stone-400 font-light mb-0.5">Tổng Lượt Gieo Quẻ</div>
                      <div className="text-2xl font-mono text-[var(--color-paper)] font-bold">{totalQueries}</div>
                    </div>
                    
                    <div className="bg-black/30 border border-white/5 p-4 rounded-2xl text-center">
                      <Award className="w-5 h-5 text-[var(--color-gold-500)] mx-auto mb-1.5" />
                      <div className="text-xs text-stone-400 font-light mb-0.5">Đã Dâng Lễ (VIP)</div>
                      <div className="text-2xl font-mono text-[var(--color-paper)] font-bold">{premiumQueries}</div>
                    </div>

                    <div className="bg-black/30 border border-white/5 p-4 rounded-2xl text-center">
                      <Percent className="w-5 h-5 text-[var(--color-gold-500)] mx-auto mb-1.5" />
                      <div className="text-xs text-stone-400 font-light mb-0.5">Tỷ Lệ Thành Kính</div>
                      <div className="text-2xl font-mono text-[var(--color-paper)] font-bold">{premiumRate}%</div>
                    </div>
                  </div>

                  {/* THỐNG KÊ CHI TIẾT DỮ LIỆU */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* GIỚI TÍNH & LỊCH TRÌNH */}
                    <div className="space-y-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                      <h4 className="font-serif text-sm text-[var(--color-gold-400)] flex items-center gap-2 border-b border-white/5 pb-2">
                        <Activity className="w-4 h-4" /> Đặc Trưng Đương Số
                      </h4>
                      
                      {/* Gender Ratio */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-light text-stone-300">
                          <span>Giới Tính (Nam / Nữ)</span>
                          <span>{malePercent}% / {femalePercent}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-stone-800 overflow-hidden flex">
                          <div className="bg-blue-500 h-full transition-all" style={{ width: `${malePercent}%` }}></div>
                          <div className="bg-pink-500 h-full transition-all" style={{ width: `${femalePercent}%` }}></div>
                        </div>
                      </div>

                      {/* Calendar Ratio */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-light text-stone-300">
                          <span>Lịch Sử Dụng (Dương / Âm)</span>
                          <span>{solarPercent}% / {lunarPercent}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-stone-800 overflow-hidden flex">
                          <div className="bg-[var(--color-gold-500)] h-full transition-all" style={{ width: `${solarPercent}%` }}></div>
                          <div className="bg-purple-600 h-full transition-all" style={{ width: `${lunarPercent}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* CON GIÁP THẮNH THỊNH */}
                    <div className="space-y-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                      <h4 className="font-serif text-sm text-[var(--color-gold-400)] flex items-center gap-2 border-b border-white/5 pb-2">
                        <Heart className="w-4 h-4" /> Các Bản Mệnh Phổ Biến
                      </h4>
                      {sortedZodiacs.length > 0 ? (
                        <div className="space-y-2.5">
                          {sortedZodiacs.map(([zName, count]: [string, any], idx) => {
                            const ratio = totalQueries > 0 ? Math.round((count / totalQueries) * 100) : 0;
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs font-light text-stone-300">
                                  <span className="truncate max-w-[140px]">{zName}</span>
                                  <span>{count} lượt ({ratio}%)</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-stone-800 overflow-hidden">
                                  <div className="bg-[var(--color-gold-600)] h-full" style={{ width: `${ratio}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-stone-500 text-center py-4 italic font-light">Chưa có đủ số liệu thống kê</div>
                      )}
                    </div>
                  </div>

                  {/* LỊCH SỬ GIEO QUẺ TRỰC TUYẾN */}
                  <div className="space-y-3">
                    <h4 className="font-serif text-sm text-[var(--color-gold-400)] flex items-center gap-2 border-b border-white/5 pb-2">
                      <Clock className="w-4 h-4" /> Nhật Ký Gieo Quẻ Đồng Đạo (Live)
                    </h4>
                    
                    {statsData.length === 0 ? (
                      <div className="text-xs text-stone-500 text-center py-8 italic font-light">Chưa có lượt gieo quẻ nào được lưu lại.</div>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {statsData.map((record, idx) => (
                          <div key={record.id || idx} className="bg-black/20 border border-white/5 hover:border-white/10 px-3.5 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-[var(--color-gold-400)]">
                                {record.gender === "Nam" ? "♂️" : "♀️"}
                              </span>
                              <div>
                                <div className="text-xs font-medium text-stone-100 flex items-center gap-1.5 flex-wrap">
                                  Đương số {record.gender} ({record.day}/{record.month}/{record.year} • {record.calendar}) - Giờ {record.hour}:{record.minute}
                                  {record.isPremium && (
                                    <span className="text-[10px] bg-[var(--color-gold-500)]/20 text-[var(--color-gold-400)] px-1.5 py-0.5 rounded-full border border-[var(--color-gold-400)]/30 inline-flex items-center gap-0.5 font-light shrink-0">
                                      👑 Dâng Lễ
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-stone-400 font-serif mt-0.5">
                                  {record.zodiacName} {record.hasPortrait && "• Có chụp diện lý"}
                                </div>
                              </div>
                            </div>
                            <div className="text-[10px] text-stone-500 font-mono sm:text-right shrink-0">
                              {formatRelativeTime(record.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-[var(--color-gold-500)]/15 pt-4 mt-4 text-center shrink-0">
                <button 
                  onClick={() => setShowStats(false)} 
                  className="px-6 py-2 rounded-full bg-[var(--color-gold-600)]/15 border border-[var(--color-gold-500)]/30 text-[var(--color-gold-400)] text-xs font-serif transition-colors hover:bg-[var(--color-gold-500)]/20 hover:border-[var(--color-gold-500)] cursor-pointer"
                >
                  Khấu đầu rời cung thống kê
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal đăng nhập Quản Trị Viên */}
      <AnimatePresence>
        {showAdminLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#16120e] p-6 sm:p-8 rounded-3xl border-2 border-[var(--color-gold-500)] shadow-[0_0_50px_rgba(212,175,55,0.3)] relative text-left"
            >
              <button 
                onClick={() => {
                  setShowAdminLoginModal(false);
                  setTempPasscode("");
                  setAdminLoginError("");
                }} 
                className="absolute top-4 right-4 text-white/40 hover:text-[var(--color-gold-400)] transition-colors p-1"
                aria-label="Đóng"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-6">
                <span className="inline-block text-4xl mb-2 filter drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]">🔑</span>
                <h3 className="font-serif text-2xl text-[var(--color-gold-400)]">Truyền Âm Nhập Điện</h3>
                <p className="text-xs text-stone-400 font-light mt-1">Xin mời quản trị viên nhập thiên thư mật hiệu để mở điện</p>
              </div>

              <form onSubmit={handleAdminVerify} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1.5 font-sans font-light">Mật mã quản trị</label>
                  <input 
                    type="password"
                    value={tempPasscode}
                    onChange={(e) => setTempPasscode(e.target.value)}
                    placeholder="Nhập thiên thư mật hiệu..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-stone-200 text-sm focus:outline-none focus:border-[var(--color-gold-500)] focus:ring-1 focus:ring-[var(--color-gold-500)]/30 font-mono text-center tracking-widest"
                    autoFocus
                  />
                </div>

                {adminLoginError && (
                  <div className="text-xs text-red-400 italic text-center font-serif leading-relaxed">
                    ⚠️ {adminLoginError}
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowAdminLoginModal(false);
                      setTempPasscode("");
                      setAdminLoginError("");
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-stone-300 text-xs font-serif transition-colors hover:bg-white/10"
                  >
                    Rút lui
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[var(--color-gold-600)]/20 border border-[var(--color-gold-500)]/45 text-[var(--color-gold-400)] text-xs font-serif transition-all hover:bg-[var(--color-gold-500)]/35 hover:border-[var(--color-gold-500)] active:translate-y-px"
                  >
                    Xác nhận mật hiệu
                  </button>
                </div>
              </form>
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
      <h3 className="font-serif text-2xl text-[var(--color-gold-400)] mb-1 mt-1">Dâng Lễ Mở Cung</h3>
      <p className="text-xs text-stone-400 mb-4 font-light">Tùy hỷ 100.000đ để xem tiếp 11 cung mệnh</p>

      {/* Khung chứa iframe QR Code */}
      <div className="w-full h-[400px] md:h-[680px] bg-white rounded-xl p-1 mb-4 relative overflow-hidden flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)] border-2 border-[var(--color-gold-500)]">
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