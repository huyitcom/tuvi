export interface FrameSlot {
  id: string;
  imageUri: string | null;
  zoom: number; // 1 to 3
  offsetX: number; // -100 to 100 percentage
  offsetY: number; // -100 to 100 percentage
  filter: string; // 'none' | 'vintage' | 'warm' | 'bw' | 'airy' | 'film'
  rotation?: number; // 0, 90, 180, 270
}

export interface TextConfig {
  tagline: string;
  taglineFont: string;
  taglineFontSize: number;
  taglineColor: string;
  taglineLetterSpacing: number;

  dateText: string;
  dateFont: string;
  dateFontSize: number;
  dateColor: string;
  dateLetterSpacing: number;

  groomName: string;
  brideName: string;
  connector: string;
  namesFont: string;
  connectorFont: string;
  namesFontSize: number;
  namesColor: string;

  subtext: string;
  subtextFont: string;
  subtextFontSize: number;
  subtextColor: string;

  textAlign: 'center' | 'left' | 'right';
  textUppercase: boolean;
}

export type AspectRatioType = '2:3' | '3:2' | '3:4' | '1:1' | '9:16' | '22:30';

export interface PosterSettings {
  bgColor: string; // hex or preset name
  bgPattern: 'solid' | 'canvas' | 'marble' | 'linen' | 'soft-rose';
  gap: number; // in pixels (e.g. 8 to 24)
  outerMargin: number; // in pixels (e.g. 16 to 48)
  cornerRadius: number; // 0 to 24
  borderStyle: 'none' | 'thin-line' | 'gold-border' | 'double-frame';
  borderColor: string;
  blockBgColor?: string;
  aspectRatio: AspectRatioType;
}

export type TemplateId =
  | 'classic-10'
  | 'hero-mosaic-13'
  | 'editorial-5'
  | 'asymmetric-6'
  | 'love-banner-8'
  | 'heart-mosaic-18'
  | 'landscape-trio-10'
  | 'landscape-duo-6'
  | 'landscape-story-8'
  | 'landscape-london-11'
  | 'grid-8-center-text'
  | 'hero-trio-3'
  | 'magazine-8'
  | 'asymmetric-7';

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
  slotCount: number;
  aspectRatio: AspectRatioType;
  previewThumbnail?: string;
}
