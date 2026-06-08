export const dictionaries = {
  zh: {
    app: {
      title: 'AI 房产巡检',
      subtitle: '智能识别 · 自动报告',
    },
    setup: {
      step_title: '巡检前准备',
      upload_floorplan: '上传房型图 (可选)',
      upload_desc: '帮助 AI 更好地理解房屋空间结构',
      address_label: '房屋地址',
      address_placeholder: '请输入房屋地址 (如 54 Carmel Street)',
      notes_label: '重点关注事项',
      notes_placeholder: '例如：主卧有新增宠物抓痕',
      start_btn: '开始巡检',
    },
    inspection: {
      mode_realtime: '实时交互模式',
      mode_async: '离线录制模式',
      status_connecting: '连接中...',
      status_live: 'AI 已就绪 (实时分析中)',
      status_offline: '离线录制中...',
      log_title: 'AI 实时记录',
      finish_btn: '结束巡检并生成报告',
      mic_on: '麦克风开',
      mic_off: '麦克风关',
    }
  },
  en: {
    app: {
      title: 'AI Property Inspection',
      subtitle: 'Smart Recognition · Auto Report',
    },
    setup: {
      step_title: 'Pre-Inspection Setup',
      upload_floorplan: 'Upload Floor Plan (Optional)',
      upload_desc: 'Helps AI understand spatial structure better',
      address_label: 'Property Address',
      address_placeholder: 'Enter property address',
      notes_label: 'Key Focus Areas',
      notes_placeholder: 'e.g. Look out for new pet scratches in Master Bedroom',
      start_btn: 'Start Inspection',
    },
    inspection: {
      mode_realtime: 'Live Interactive Mode',
      mode_async: 'Offline Record Mode',
      status_connecting: 'Connecting...',
      status_live: 'AI Ready (Live Analysis)',
      status_offline: 'Recording Offline...',
      log_title: 'AI Live Logs',
      finish_btn: 'Finish & Generate Report',
      mic_on: 'Mic On',
      mic_off: 'Mic Off',
    }
  }
};

export type Language = 'zh' | 'en';
export type Dictionary = typeof dictionaries.zh;
