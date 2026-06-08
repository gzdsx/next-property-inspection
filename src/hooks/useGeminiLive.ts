import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

/**
 * 巡检记录的数据结构定义
 * 用于在前端状态和本地存储中维护每一条识别出的缺陷或记录
 */
export interface InspectionRecord {
  id: string;             // 唯一标识符，通常用时间戳生成
  room_name: string;      // 房间或区域名称（如：客厅、厨房）
  item_name: string;      // 物品名称（如：沙发、天花板）
  description?: string;   // 物品材质或损坏情况的具体描述
  condition: string;      // 状况（如：良好、破损、需要维修等）
  severity?: string;      // 严重程度（目前保留字段）
  timestamp: Date;        // 记录生成的时间
  elapsedSeconds?: number; // 相对于视频开始录制经过的秒数，用于在后台与视频时间轴同步
  photoBase64?: string;   // 记录瞬间抓取的高清截图（Base64格式）
  isManualFlag?: boolean; // 是否是用户手动点击🚩标记的高危记录
}

/**
 * 核心 Hook：useGeminiLive
 * 负责管理与 Gemini Live API 的双向 WebSocket 通信、音视频流的处理、录制以及数据状态的管理。
 * 这个 Hook 是整个 AI 巡检应用的心脏。
 */
export function useGeminiLive() {
  // ---------------------------------------------------------------------------
  // 核心状态管理
  // ---------------------------------------------------------------------------
  const [isConnected, setIsConnected] = useState(false); // WebSocket 是否已连接
  const [isConnecting, setIsConnecting] = useState(false); // 是否正在握手连接中
  const [aiStatus, setAiStatus] = useState<'listening' | 'speaking' | 'processing'>('listening'); // AI 说话/倾听的状态机
  const [uploadReportId, setUploadReportId] = useState<string | null>(null); // 最终上传到服务器后返回的报告 ID
  const [isUploading, setIsUploading] = useState(false); // 是否正在上传中
  
  const [logs, setLogs] = useState<string[]>([]); // 终端调试日志，展示在界面底部
  const [records, setRecords] = useState<InspectionRecord[]>([]); // 巡检缺陷/状况记录的数组

  // 使用 Ref 追踪初始挂载，防止 useEffect 在第一次渲染时错误地将空数组写入 localStorage
  const isInitialRecordsMountRef = useRef(true);
  // 使用 Ref 保存最新的 records，以便在非 React 渲染周期（如 WebSocket 回调或上传）中能拿到最新数据
  const recordsRef = useRef<InspectionRecord[]>([]);

  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem('inspection_records');
      if (savedRecords && savedRecords !== '[]') setRecords(JSON.parse(savedRecords));
    } catch (e) {
      console.error('Failed to load from local storage', e);
    }
  }, []);

  useEffect(() => {
    recordsRef.current = records;
    if (isInitialRecordsMountRef.current) {
      isInitialRecordsMountRef.current = false;
      return;
    }
    localStorage.setItem('inspection_records', JSON.stringify(records));
  }, [records]);



  // ---------------------------------------------------------------------------
  // 底层流媒体与时间轴 Refs
  // ---------------------------------------------------------------------------
  const sessionRef = useRef<any>(null); // 保存 Gemini API 的 session 实例
  const audioContextRef = useRef<AudioContext | null>(null); // 用于将系统的 Base64 PCM 转换为实际声音播放
  const activeAudioNodesRef = useRef<AudioBufferSourceNode[]>([]); // 追踪正在播放的音频节点，用于支持“用户打断(Barge-in)”功能
  const nextPlayTimeRef = useRef<number>(0); // 连续音频流的时间调度，确保声音播放不会断断续续
  
  // 暂停时间跟踪系统 (极其重要)：
  // 解决 bug "视频中断导致时间轴错位"：因为视频录制暂停时，现实时间（Date.now）还在走，
  // 所以在计算 elapsedSeconds 时必须扣除总的暂停时间，才能让记录的时间戳与合并后的视频完全对齐。
  const totalPausedTimeRef = useRef<number>(0); 
  const pauseStartTimeRef = useRef<number>(0);
  
  const mediaStreamRef = useRef<MediaStream | null>(null); // 摄像头的原始视频流
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null); // 定时截屏发送给 AI 的定时器
  const videoElementRef = useRef<HTMLVideoElement | null>(null); // 绑定的 Video 标签，用于在 Canvas 上截屏
  // 离屏复用 Canvas，避免每帧 GC（在手机上每 2s 创建一次 Canvas 会累积 GC 压力）
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // 用于缓存手动标记（Flag）时的高清原图。
  // AI 响应通常会有几秒延迟，缓存可以保证 AI 最终调用工具时，能匹配上当时拍下的这张图，而不是几秒后的图。
  const recentFlaggedPhotoRef = useRef<{photo: string, elapsed: number} | undefined>(undefined);
  const flaggedPhotoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ---------------------------------------------------------------------------
  // 视频录制 Refs (MediaRecorder)
  // ---------------------------------------------------------------------------
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // 视频录制实例
  const recordedChunksRef = useRef<BlobPart[]>([]); // 存放每一秒切割出来的 WebM 视频数据块
  const inspectionStartTimeRef = useRef<number>(0); // 第一次按下启动按钮的时间戳

  const addLog = useCallback((msg: string) => {
    setLogs(prev => {
      const newLogs = [...prev, `${new Date().toLocaleTimeString()} - ${msg}`];
      // Keep only last 50 logs to avoid bloating local storage
      return newLogs.slice(-50);
    });
  }, []);

  /**
   * 截取普清视频帧发送给 AI 进行连续分析。
   * 为了平衡网络带宽和 AI 理解能力，宽度固定为 800px。
   * 复用离屏 Canvas 以减少 GC 压力（移动端关键优化）。
   */
  const captureVideoFrame = useCallback((): string | undefined => {
    const video = videoElementRef.current;
    if (!video || video.readyState < 2) return undefined;
    try {
      // 复用同一个离屏 Canvas，避免每次 GC
      if (!offscreenCanvasRef.current) {
        offscreenCanvasRef.current = document.createElement('canvas');
      }
      const canvas = offscreenCanvasRef.current;
      canvas.width = 800;
      canvas.height = Math.floor(800 * (video.videoHeight / video.videoWidth));
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.75).split(',')[1]; // 返回不带前缀的 base64
    } catch {
      return undefined;
    }
  }, []);

  /**
   * 截取设备原生的全尺寸高清截图。
   * 主要用于生成 PDF 报告和用户手动标记缺陷时，保证照片清晰度。
   */
  const captureHDFrame = useCallback((): string | undefined => {
    const video = videoElementRef.current;
    if (!video || video.readyState < 2) return undefined;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;   
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.92).split(',')[1]; 
    } catch {
      return undefined;
    }
  }, []);

  /**
   * 核心功能：手动标记问题点（Flag Issue）
   * 当用户发现明显问题但 AI 没注意到时使用，会立刻截取高清图并强行命令 AI 分析。
   */
  const flagIssue = useCallback((lang: string): string | undefined => {
    const hdPhoto = captureHDFrame();
    if (!hdPhoto) return undefined;

    // 精确计算录像已经走过的秒数，必须减去中间核对（Review）模式的暂停时间
    const elapsedSeconds = inspectionStartTimeRef.current > 0 
      ? Math.floor((Date.now() - inspectionStartTimeRef.current - totalPausedTimeRef.current) / 1000) 
      : 0;

    // 缓存这张高清图 15 秒。因为我们要求 AI 分析完马上调用 record_inspection_item，
    // 当工具执行时，我们会去最近的缓存里取这张图绑定给记录。
    recentFlaggedPhotoRef.current = { photo: hdPhoto, elapsed: elapsedSeconds };
    if (flaggedPhotoTimeoutRef.current) clearTimeout(flaggedPhotoTimeoutRef.current);
    flaggedPhotoTimeoutRef.current = setTimeout(() => {
      recentFlaggedPhotoRef.current = undefined;
    }, 15000);

    // 绕过标准 SDK 限制，直接利用底层 WebSocket 强行下发包含图片的系统级别 Prompt
    if (sessionRef.current?.conn) {
      const prompt = lang === 'zh'
        ? '⚠️ 巡检员标记了一个问题点。请仔细分析这张高清照片，详细描述你看到的任何损坏、污渍、划痕或需要关注的地方，并立即调用 record_inspection_item 工具记录下来。'
        : '⚠️ Inspector has flagged a potential issue. Please carefully examine this high-resolution image for any damage, stains, scratches, or defects. Describe what you see in detail and immediately call record_inspection_item to document it.';

      const message = {
        clientContent: {
          turns: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { data: hdPhoto, mimeType: 'image/jpeg' } }
            ]
          }],
          turnComplete: true
        }
      };
      try {
        sessionRef.current.conn.send(JSON.stringify(message));
      } catch {
        // session might be closed
      }
    }
    return hdPhoto; // return for UI flash preview
  }, [captureHDFrame]);

  const clearSessionData = useCallback(() => {
    setRecords([]);
    setLogs([]);
    localStorage.removeItem('inspection_records');
    localStorage.removeItem('inspection_logs');
    localStorage.removeItem('property_cover_photo');
  }, []);

  const stopAudioPlayback = () => {
    activeAudioNodesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
    });
    activeAudioNodesRef.current = [];
    if (audioContextRef.current) {
      nextPlayTimeRef.current = audioContextRef.current.currentTime;
    }
  };

  /**
   * 音频播放函数：将来自 AI 的 base64 格式的 PCM 音频数据转换为可以播放的声波。
   * 此方法直接使用 Web Audio API，无需通过 SDK，减少延迟。
   */
  const playPCMBase64Chunk = (base64Str: string) => {
    if (!audioContextRef.current) return;
    
    // 1. 解码 Base64 为二进制流
    const binaryString = window.atob(base64Str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // 2. 将 16-bit PCM (Google API 返回格式) 转换为 Float32 (Web Audio API 播放格式)
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = audioContextRef.current.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    const currentTime = audioContextRef.current.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;

    // Track active nodes for barge-in
    source.onended = () => {
      activeAudioNodesRef.current = activeAudioNodesRef.current.filter(n => n !== source);
      if (activeAudioNodesRef.current.length === 0) {
        setAiStatus(prev => prev === 'speaking' ? 'listening' : prev);
      }
    };
    activeAudioNodesRef.current.push(source);
  };

  /**
   * 启动巡检核心流程：
   * 1. 建立音频上下文 (规避浏览器自动播放限制)
   * 2. 获取一次性的鉴权 Token
   * 3. 呼出手机摄像头/麦克风
   * 4. 开启底层视频流切片录制 (MediaRecorder)
   * 5. 建立到 Gemini 3.1 Flash Live API 的双向 WebSocket 链接
   */
  const startSession = async (videoElement: HTMLVideoElement, language: string) => {
    try {
      // 在用户交互发生的这一个事件循环内同步初始化 AudioContext，
      // 防止 Safari/Chrome 的自动静音策略拦截 AI 声音。
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new window.AudioContext({ sampleRate: 24000 });
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      nextPlayTimeRef.current = audioContextRef.current.currentTime;

      setIsConnecting(true);
      addLog('Fetching ephemeral token...');
      
      const res = await fetch('/api/genai/ephemeral-token', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to get token');
      const { token } = await res.json();
      
      addLog('Connecting to Gemini Live API...');
      const ai = new GoogleGenAI({ 
        apiKey: token,
        httpOptions: { apiVersion: 'v1alpha' } // 必须使用 v1alpha 才能访问 Live API
      });
      
      // 捕获摄像头流。此处请求调用后置摄像头 (environment)，并开启麦克风硬件回声消除。
      let stream = mediaStreamRef.current;
      if (!stream || !stream.active) {
        // 浏览器安全策略：navigator.mediaDevices 仅在 HTTPS 或 localhost 下可用。
        // 当通过 HTTP + 局域网 IP 访问时，此 API 会被浏览器完全隐藏。
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          const isHTTP = window.location.protocol === 'http:';
          const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
          if (isHTTP && !isLocalhost) {
            throw new Error(
              `Camera blocked by browser security.\n\n` +
              `Your browser requires HTTPS to access the camera on non-localhost addresses.\n\n` +
              `Current URL: ${window.location.origin}\n\n` +
              `Solutions:\n` +
              `1. Use a Cloudflare tunnel (HTTPS) to access this app\n` +
              `2. Or open http://localhost:3333 directly on this device`
            );
          } else {
            throw new Error('Camera / microphone not supported by this browser. Please try Chrome or Safari.');
          }
        }

        // 限制视频分辨率上限为 720p (1280×720)。
        // 不加限制时部分 iOS / Android 旗舰机会默认拉起 4K 甚至更高分辨率，
        // 导致视频帧处理时 CPU 占用飙升、手机发热，进而引发帧率卡顿。
        // 720p 对 Gemini AI 来说视觉信息已经完全充分，且大幅降低系统负担。
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 },
            frameRate: { ideal: 24, max: 30 }
          }, 
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
        });
        mediaStreamRef.current = stream;
        videoElement.srcObject = stream;
        videoElementRef.current = videoElement;


        // 初始化视频录像机 (MediaRecorder) 用于后台生成最终同步用的 MP4/WebM
        try {
          // 适配部分 iOS/Mac 浏览器，如果不支持 video/webm 则去掉 mimeType 回退到默认
          const options = { mimeType: 'video/webm' };
          if (!MediaRecorder.isTypeSupported('video/webm')) {
            delete (options as any).mimeType; 
          }
          const mediaRecorder = new MediaRecorder(stream, options);
          mediaRecorderRef.current = mediaRecorder;
          recordedChunksRef.current = [];
          
          // 当录制产生数据块时，将其存入数组
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              recordedChunksRef.current.push(e.data);
            }
          };
          
          // 极其重要：传入 timeslice 参数（1000ms），强迫浏览器每秒吐出一次录像数据。
          // 这样即使应用意外断开，这几秒钟的数据也不会因为一直缓存在内存里而全部丢失。
          mediaRecorder.start(1000); 
          inspectionStartTimeRef.current = Date.now();
          totalPausedTimeRef.current = 0;
          pauseStartTimeRef.current = 0;
          addLog("Started background video recording.");
        } catch (err) {
          console.error("Failed to start MediaRecorder", err);
        }
      } else {
        // 如果 stream 还活着，说明是从“复核（Review）模式”返回继续巡检。
        videoElement.srcObject = stream;
        videoElementRef.current = videoElement;
        
        // 恢复录像，并计算期间暂停消耗了多少毫秒
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
          mediaRecorderRef.current.resume();
          if (pauseStartTimeRef.current > 0) {
            totalPausedTimeRef.current += (Date.now() - pauseStartTimeRef.current);
            pauseStartTimeRef.current = 0;
          }
          addLog("Resumed background video recording.");
        }
      }

      // Removed zoom reset and objectFit overrides to exactly match the reference project.
      // Note: Video frames are captured via offscreenCanvasRef (shared with captureVideoFrame).

      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO]
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            addLog('Connected successfully. You can start speaking.');
          },
          onmessage: (msg: any) => {
            console.log("RECEIVED MSG:", msg);
            
            if (msg.serverContent?.turnComplete) {
              if (activeAudioNodesRef.current.length === 0) {
                setAiStatus(prev => prev === 'speaking' ? 'listening' : prev);
              }
            }

            // 如果用户中途打断（Barge-in）说话，服务器会发送 interrupted 信号
            if (msg.serverContent?.interrupted) {
              stopAudioPlayback(); // 立刻切断当前正在播放的音频，实现真实的真人沟通体验
              addLog('AI: [Interrupted by user]');
            }

            // Play Audio Output
            const parts = msg.serverContent?.modelTurn?.parts || [];
            if (parts.length > 0) {
              setAiStatus('speaking');
            }
            for (const part of parts) {
              if (part.inlineData?.mimeType?.startsWith('audio')) {
                playPCMBase64Chunk(part.inlineData.data);
              }
              if (part.text) {
                addLog(`AI: ${part.text}`);
              }
            }

            // -------------------------------------------------------------------------
            // 拦截 AI 调用工具 (Function Calling)
            // -------------------------------------------------------------------------
            if (msg.toolCall?.functionCalls?.length) {
              setAiStatus('processing');
              for (const call of msg.toolCall.functionCalls) {
                // 监听 AI 是否决定记录一条缺陷
                if (call.name === 'record_inspection_item') {
                  const args = call.args;
                  
                  let photoBase64: string | undefined;
                  let elapsedSeconds: number | undefined;
                  let isManualFlag = false;
                  
                  // 1. 优先检查是否命中用户刚刚手动截取的高清“高危照片”缓存
                  if (recentFlaggedPhotoRef.current) {
                    photoBase64 = recentFlaggedPhotoRef.current.photo;
                    elapsedSeconds = recentFlaggedPhotoRef.current.elapsed;
                    isManualFlag = true;
                    recentFlaggedPhotoRef.current = undefined; // 消费掉这张图
                    if (flaggedPhotoTimeoutRef.current) clearTimeout(flaggedPhotoTimeoutRef.current);
                    addLog(`[HD Photo Attached to Record]`);
                  } else {
                    // 2. 否则，截取当前这一瞬间的一般清晰度视频画面作为证据
                    photoBase64 = captureVideoFrame();
                    elapsedSeconds = inspectionStartTimeRef.current > 0 
                      ? Math.floor((Date.now() - inspectionStartTimeRef.current - totalPausedTimeRef.current) / 1000) 
                      : 0;
                  }

                  // 构建记录对象，准备保存到本地和后续渲染到列表中
                  const newRecord: InspectionRecord = {
                    id: Math.random().toString(36).substring(7),
                    room_name: args.room_name,
                    item_name: args.item_name,
                    description: args.description,
                    condition: args.condition,
                    severity: args.severity,
                    timestamp: new Date(),
                    elapsedSeconds,
                    photoBase64,
                    isManualFlag,
                  };
                  setRecords(prev => [...prev, newRecord]);
                  addLog(`AI Recorded: [${args.room_name}] ${args.item_name} - ${args.condition}`);
                  
                  // 极其重要：根据 Live API 的底层 WebSocket 协议，
                  // 每当 AI 调用了 Function，客户端必须发送 toolResponse，否则 AI 会彻底卡死等待。
                  if (sessionRef.current && sessionRef.current.conn) {
                    sessionRef.current.conn.send(JSON.stringify({
                      toolResponse: {
                        functionResponses: [{
                          id: call.id,
                          name: call.name,
                          response: { result: { success: true } } // 告诉 AI 记录已成功保存
                        }]
                      }
                    }));
                  } else {
                     // 容错处理：如果连接对象未挂载完毕，稍后重试
                     setTimeout(() => {
                       if (sessionRef.current?.conn) {
                         sessionRef.current.conn.send(JSON.stringify({
                           toolResponse: {
                             functionResponses: [{
                               id: call.id,
                               name: call.name,
                               response: { result: { success: true } }
                             }]
                           }
                         }));
                       }
                     }, 100);
                  }
                }
              }
            }
          },
          onclose: () => {
            setIsConnected(false);
            addLog('Connection closed.');
          },
          onerror: (err: any) => {
            console.error(err);
            setIsConnected(false);
            addLog(`Error: ${err.message || 'Unknown error'}`);
          }
        }
      });

      sessionRef.current = session;

      // -----------------------------------------------------------------------
      // 动态注入上下文与主动打招呼机制 (Proactive Greeting & Context Injection)
      // -----------------------------------------------------------------------
      // 如果当前不是重新开始，而是中断恢复（例如从修改页面回来，或断网重连），我们需要把之前的记录传给 AI。
      const previousRecordsStr = records.length > 0 ? `\n\n【PREVIOUS RECORDS】\nThese items are already recorded. Acknowledge that we are resuming the inspection. DO NOT ask to start from the beginning. Records so far: ${JSON.stringify(
        records.map(r => ({ room: r.room_name, item: r.item_name, desc: r.description, condition: r.condition }))
      )}` : "";
      
      // 如果存在旧房产的知识库（如老报告的分析结果），将其作为全局指令强插进来。
      const preInspectionKb = localStorage.getItem('pre_inspection_kb');
      const kbStr = preInspectionKb ? `\n\n【PRE-INSPECTION KNOWLEDGE BASE】\nThis was synthesized from the old inspection report, floorplan, and inspector notes. You MUST use this to guide the inspector:\n${preInspectionKb}\n\nCRITICAL DIRECTIVE: Use the "Inspection Route & Room Checklist" from the knowledge base to guide the user from room to room so nothing is missed.\n` : "";

      // 强行命令 AI 打破僵局主动开口，并遵守指定的语言。
      let greetingPrompt = "";
      if (records.length > 0) {
        greetingPrompt = language === 'zh'
          ? `系统指令：巡检助手已恢复连接。${kbStr}请用简短自然的人类口吻用中文打个招呼，说明你已经恢复了之前的记录，并询问我们现在继续检查哪个区域。保持极度简短。`
          : `System directive: Inspection assistant connection restored. ${kbStr}Please greet the user naturally in English, acknowledge that you have the previous records, and ask which area we are continuing with. Keep it extremely brief.`;
      } else {
        greetingPrompt = language === 'zh' 
          ? `系统指令：巡检助手已启动。${kbStr}请用简短自然的人类口吻用中文打个招呼，并询问我们是从屋外还是屋内开始。保持极度简短。` 
          : `System directive: Inspection assistant has started. ${kbStr}Please greet the user naturally in English, and ask if we are starting outside or inside. Keep it extremely brief.`;
      }
      
      try {
        // 利用 Live API WebSocket 协议的 clientContent/turnComplete 原语发送系统指令
        session.conn.send(JSON.stringify({
          clientContent: {
            turns: [
              { role: "user", parts: [{ text: greetingPrompt + previousRecordsStr }] }
            ],
            turnComplete: true
          }
        }));
      } catch (e) {
        console.error("Failed to send initial greeting", e);
      }
      
      // -----------------------------------------------------------------------
      // 视频抽帧发送机制 (Visual Input to AI)
      // -----------------------------------------------------------------------
      // 采用低频率抽帧 (0.5 fps) 发送低分辨率 (640px) 图片给 AI，因为高频抽帧不仅会消耗大量流量，
      // 更会使得多模态上下文 Token 迅速爆满，导致 AI 失去之前记忆。对于高清细节依赖前面的 flagIssue 机制。
      // 重要：复用 offscreenCanvasRef 中的同一 Canvas 实例，与 captureVideoFrame 共享，减少内存分配。
      videoIntervalRef.current = setInterval(() => {
        if (videoElement.readyState >= 2) {
          if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
          }
          const intervalCanvas = offscreenCanvasRef.current;
          intervalCanvas.width = 640;
          intervalCanvas.height = Math.floor(640 * (videoElement.videoHeight / videoElement.videoWidth));
          const intervalCtx = intervalCanvas.getContext('2d');
          if (!intervalCtx) return;
          intervalCtx.drawImage(videoElement, 0, 0, intervalCanvas.width, intervalCanvas.height);
          const base64Jpeg = intervalCanvas.toDataURL('image/jpeg', 0.5).split(',')[1];
          try {
            session.conn.send(JSON.stringify({
              realtimeInput: {
                video: {
                  mimeType: "image/jpeg",
                  data: base64Jpeg
                }
              }
            }));
          } catch (err) {
            console.error("Video send error:", err);
          }
        }
      }, 2000); // 1 frame every 2 seconds

      sessionRef.current = session;
      
      // Note: We need to also send mic audio to `session.sendRealtimeInput`.
      // For simplicity in this Web prototype, we're doing video-only input first, 
      // but let's hook up audio via ScriptProcessor or AudioWorklet.
      setupAudioCapture(stream, session);

    } catch (error: any) {
      console.error(error);
      setIsConnecting(false);
      addLog(`Failed to connect: ${error.message}`);
      cleanup();
    }
  };

  const setupAudioCapture = (stream: MediaStream, session: any) => {
    // A simplified audio capture for 16kHz PCM
    // In production, an AudioWorklet is preferred.
    const audioCtx = new window.AudioContext({ sampleRate: 16000 });
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    
    // Voice Activity Detection (VAD) state
    let isSpeaking = false;
    let silenceFrames = 0;
    // 0.01 is a bit more sensitive to catch soft speech and "um/ah" thinking sounds
    const VAD_THRESHOLD = 0.01; 
    // buffer size 4096 @ 16kHz = 0.256s per frame. 
    // 8 frames = ~2.0s hangover time.
    const SILENCE_FRAMES_MAX = 8; 

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate RMS (volume level)
      let sumSquares = 0;
      for (let i = 0; i < inputData.length; i++) {
        sumSquares += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sumSquares / inputData.length);

      // Simple VAD Logic: detect intentional speech
      if (rms > VAD_THRESHOLD) {
        isSpeaking = true;
        silenceFrames = 0;
      } else {
        silenceFrames++;
        if (silenceFrames > SILENCE_FRAMES_MAX) {
          isSpeaking = false;
        }
      }

      // Convert Float32 to Int16
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        // If not speaking, send absolute silence (0) to allow the server's VAD 
        // to instantly detect end-of-speech and reply. Dropping frames pauses the server's clock!
        let s = isSpeaking ? inputData[i] : 0;
        s = Math.max(-1, Math.min(1, s));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      // Convert to base64
      const uint8 = new Uint8Array(pcm16.buffer);
      let binary = '';
      for (let i = 0; i < uint8.byteLength; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const base64Audio = window.btoa(binary);
      
      try {
        session.conn.send(JSON.stringify({
          realtimeInput: {
            audio: {
              mimeType: "audio/pcm;rate=16000",
              data: base64Audio
            }
          }
        }));
      } catch (e) {
        // ignore
      }
    };
    
    source.connect(processor);
    processor.connect(audioCtx.destination);
    
    // Attach to ref for cleanup
    (sessionRef.current as any).audioCtx = audioCtx;
  };

  /**
   * 同步上传到服务器 (Video Portal)
   * 收集录制的 WebM 视频片段、巡检记录 JSON、以及包含巡检员信息的 Meta 数据，一次性提交。
   */
  const uploadToServer = async () => {
    // 1. 如果相机还在录像/暂停状态，必须强行停止以触发最后一段 dataavailable 事件
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      // 等待 100ms 确保浏览器底层完成最后的切片封装
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (recordedChunksRef.current.length === 0) return;
    setIsUploading(true);
    addLog('Uploading video and records to server...');

    try {
      const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const recordsJson = JSON.stringify(recordsRef.current, null, 2);
      const dataBlob = new Blob([recordsJson], { type: 'application/json' });

      const formData = new FormData();
      formData.append('video', videoBlob, 'video.webm');
      formData.append('json', dataBlob, 'records.json');

      try {
        const address = localStorage.getItem('inspection_address') || '';
        let inspectorName = '';
        let companyName = '';
        let phone = '';
        let email = '';
        let reference = '';
        const profileRaw = localStorage.getItem('inspector_profile');
        if (profileRaw) {
          const profile = JSON.parse(profileRaw);
          inspectorName = profile.inspectorName || '';
          companyName = profile.companyName || '';
          phone = profile.phone || '';
          email = profile.email || '';
          reference = profile.reference || '';
        }
        // Cover photo is stored as full data URL; strip prefix, keep raw base64 only
        const coverPhotoRaw = localStorage.getItem('property_cover_photo') || '';
        const coverPhotoBase64 = coverPhotoRaw.startsWith('data:')
          ? coverPhotoRaw.split(',')[1] || ''
          : coverPhotoRaw;

        const metaJson = JSON.stringify({ address, inspectorName, companyName, phone, email, reference, coverPhotoBase64 });
        const metaBlob = new Blob([metaJson], { type: 'application/json' });
        formData.append('meta', metaBlob, 'meta.json');
      } catch (e) {
        console.warn('Failed to attach metadata', e);
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setUploadReportId(data.reportId);
      addLog('Upload successful! Report ID: ' + data.reportId);
      
      // ✅ 上传成功后：清空 localStorage 中的巡检记录，防止下次打开 App 时
      // 错误地弹出"发现历史记录"的恢复提示框（这次已经成功上传了，不需要恢复）。
      localStorage.removeItem('inspection_records');
      localStorage.removeItem('pre_inspection_kb');
    } catch (err: any) {
      console.error(err);
      addLog('Upload error: ' + err.message);
      // ❌ 上传失败时：不清除记录，保留在 localStorage，确保下次打开时可以恢复继续。
    } finally {
      setIsUploading(false);
      recordedChunksRef.current = []; // Clear video chunks
    }
  };

  /**
   * 资源清理函数：负责释放摄像头和定时器。
   * @param isReviewing 如果为 true，表示进入“核对模式”，此时仅暂停视频录像，不销毁摄像头流；
   *                    如果为 false，表示彻底结束，全面释放所有硬件资源。
   */
  const cleanup = (isReviewing = false) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (isReviewing) {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.pause();
          pauseStartTimeRef.current = Date.now(); // 开始计时“暂停了多久”
        }
      } else {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
    }

    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    
    // 如果不是去复核（而是彻底退出），强行断开所有摄像头硬件连接，避免系统后台红灯常亮
    if (!isReviewing && mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
    }
    if (sessionRef.current?.audioCtx && sessionRef.current.audioCtx.state !== 'closed') {
      sessionRef.current.audioCtx.close().catch(console.error);
    }
    
    sessionRef.current = null;
    setIsConnected(false);
    setIsConnecting(false);
  };

  /**
   * 中止当前会话。由 UI 的停止按钮调用。
   * 断开 WebSocket，停止麦克风播放，并调用 cleanup 释放相应的资源。
   */
  const stopSession = (isReviewing = true) => {
    if (sessionRef.current) {
      // 关闭连接。由于我们已经取消了在 WebSocket onclose 中的强制清空逻辑，
      // 所以这里的 close 不会误杀复核模式的缓存数据（录像等）。
      if (typeof sessionRef.current.close === 'function') {
        sessionRef.current.close();
      } else if (sessionRef.current.conn && typeof sessionRef.current.conn.close === 'function') {
        sessionRef.current.conn.close();
      }
    }
    
    cleanup(isReviewing);
  };

  const deleteRecord = (id: string) => {
    // Find the record before removing it so we can inform the AI
    const deleted = recordsRef.current.find(r => r.id === id);
    setRecords(prev => prev.filter(r => r.id !== id));

    // Notify the AI so it knows this record no longer exists and should re-record if asked
    if (deleted && sessionRef.current?.conn) {
      const notice = `[SYSTEM NOTICE] The inspector deleted the record for "${deleted.room_name} - ${deleted.item_name}". It is NO LONGER recorded. You must re-evaluate and call record_inspection_item again when the inspector shows it to you.`;
      try {
        sessionRef.current.conn.send(JSON.stringify({
          clientContent: {
            turns: [{ role: 'user', parts: [{ text: notice }] }],
            turnComplete: false
          }
        }));
      } catch (e) {
        console.warn('Failed to notify AI of deletion', e);
      }
    }
  };

  const updateRecord = (id: string, updates: Partial<InspectionRecord>) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  return {
    isConnected,
    isConnecting,
    aiStatus,
    logs,
    records,
    uploadReportId,
    isUploading,
    startSession,
    stopSession,
    clearSessionData,
    captureVideoFrame,
    flagIssue,
    deleteRecord,
    updateRecord,
    uploadToServer,
  };
}
