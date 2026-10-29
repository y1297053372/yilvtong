export const theme = {
  colors: {
    primary: '#1152d4',
    primaryLight: '#3b82f6',
    secondary: '#F97316',
    secondaryLight: '#fb923c',
    background: '#f8fafc',
    backgroundDark: '#0a1628',
    card: '#ffffff',
    text: '#1e293b',
    textLight: '#64748b',
    white: '#ffffff',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
  },
  fonts: {
    main: 'PingFang SC, Microsoft YaHei, sans-serif',
  },
  animation: {
    spring: {
      damping: 15,
      stiffness: 100,
      mass: 0.5,
    },
  },
};

export const videoConfig = {
  width: 1080,
  height: 1920,
  fps: 30,
  durationInFrames: 1350,
};

export const sceneTimings = {
  opening: {
    start: 0,
    duration: 150,
  },
  painPoint: {
    start: 150,
    duration: 300,
  },
  features: {
    start: 450,
    duration: 450,
  },
  flow: {
    start: 900,
    duration: 300,
  },
  ending: {
    start: 1200,
    duration: 150,
  },
};
