/**
 * -----------------------------------------------------------------------------
 * 状态归一化核心逻辑 (Status Normalization Logic)
 * -----------------------------------------------------------------------------
 * 负责判定每一条巡检记录的健康度级别，并在不同端保持 UI 颜色与图标的统一。
 * 
 * 判定优先级 (Priority):
 *  1. isManualFlag (用户按了屏幕上的🚩标记按钮) → 最高危 'flagged' (必须处理)
 *  2. condition 没有包含 "good" 或良好字眼 → 疑似异常 'abnormal' (可能存在磨损或损坏)
 *  3. condition 包含 "good" 及其同义词 → 'normal' (正常)
 */

export type RecordStatus = 'flagged' | 'abnormal' | 'normal';

export function getRecordStatus(
  condition: string,
  isManualFlag?: boolean
): RecordStatus {
  // 1. 最高优先级：人为强力干预
  if (isManualFlag) return 'flagged';
  
  const c = (condition || '').toLowerCase();
  
  // 2. 匹配英文的 'good'，同时兜底兼容由于 AI 发疯可能吐出来的中文“良好”描述
  // 提示词里我们虽强调了 MUST BE IN ENGLISH，但在移动端真实场景里 AI 偶尔会受中文对话影响
  const isGood = c.includes('good') ||
    c.includes('new') ||
    c.includes('\u826f\u597d') || // 良好
    c.includes('\u6b63\u5e38') || // 正常
    c.includes('\u5b8c\u597d') || // 完好
    c.includes('\u6ca1\u6709\u95ee\u9898') || // 没有问题
    c.includes('\u65e0\u635f\u574f');   // 无损坏
    
  if (!condition || !isGood) return 'abnormal';
  
  return 'normal';
}

// ─── React-safe Icon components (returns JSX-style object data, not JSX) ──────
// We return config objects so this file has zero React imports and stays portable.

export interface StatusBadgeConfig {
  icon: string;      // emoji or unicode symbol
  label: string;
  color: string;     // CSS hex / var
  bg: string;        // CSS background
  border: string;    // CSS border
}

export const STATUS_CONFIG: Record<RecordStatus, StatusBadgeConfig> = {
  flagged: {
    icon: '🚩',
    label: 'Flagged',
    color: '#dc2626',       // red-600
    bg: 'rgba(220,38,38,0.15)',
    border: 'rgba(220,38,38,0.4)',
  },
  abnormal: {
    icon: '⚠️',
    label: 'Issue',
    color: '#ca8a04',       // amber-600
    bg: 'rgba(202,138,4,0.15)',
    border: 'rgba(202,138,4,0.4)',
  },
  normal: {
    icon: '✅',
    label: 'Normal',
    color: '#16a34a',       // green-600
    bg: 'rgba(22,163,74,0.15)',
    border: 'rgba(22,163,74,0.4)',
  },
};
