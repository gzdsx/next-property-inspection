'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureBase64: string) => void;
  onClose: () => void;
  label?: string;
}

export default function SignaturePad({ onSave, onClose, label = 'Tenant Initials' }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Style
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    lastPosRef.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e, canvas);
    const last = lastPosRef.current;
    if (!last) return;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPosRef.current = pos;
    setHasDrawn(true);
  }, []);

  const stopDraw = useCallback(() => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl.split(',')[1]); // return base64 only
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end justify-center sm:items-center p-0 sm:p-6">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Electronic Signature</h3>
            <p className="text-sm text-slate-500 mt-0.5">{label}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="px-6 pt-4 pb-2">
          <p className="text-xs text-slate-400 mb-2 text-center tracking-wide uppercase">Sign below</p>
          <div className="relative border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden bg-slate-50" style={{ touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              className="w-full block cursor-crosshair"
              style={{ height: '160px' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            {/* Signature line */}
            <div className="absolute bottom-8 left-6 right-6 border-b border-slate-300 pointer-events-none" />
            <p className="absolute bottom-2 left-6 text-[10px] text-slate-400 pointer-events-none">× _____________________</p>
            {!hasDrawn && (
              <p className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm pointer-events-none">
                Draw your signature here
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 py-5">
          <button
            onClick={clearCanvas}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-2xl transition-colors text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </button>
          <button
            onClick={handleSave}
            disabled={!hasDrawn}
            className="flex-[2] flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          >
            <Check className="w-4 h-4" />
            Save Signature
          </button>
        </div>
      </div>
    </div>
  );
}
