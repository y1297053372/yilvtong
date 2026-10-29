import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { Logo } from '../components/Logo';
import { theme } from '../config/theme';

export const EndingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const backgroundOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const sloganOpacity = interpolate(frame, [30, 60], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const sloganY = interpolate(frame, [30, 60], [30, 0], {
    extrapolateRight: 'clamp',
  });

  const qrOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const qrScale = spring({
    frame: Math.max(0, frame - 60),
    fps,
    config: { damping: 15, stiffness: 60 },
  });

  const pulseScale = 1 + Math.sin(frame * 0.1) * 0.02;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${theme.colors.backgroundDark} 0%, ${theme.colors.primary} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: backgroundOpacity,
      }}
    >
      <div
        style={{
          transform: `scale(${logoScale * pulseScale})`,
        }}
      >
        <Logo size={200} showText={true} delay={0} />
      </div>

      <div
        style={{
          marginTop: 50,
          fontSize: 52,
          fontWeight: 'bold',
          color: theme.colors.white,
          fontFamily: theme.fonts.main,
          opacity: sloganOpacity,
          transform: `translateY(${sloganY}px)`,
          textAlign: 'center',
        }}
      >
        让维权更简单
      </div>

      <div
        style={{
          marginTop: 60,
          width: 220,
          height: 220,
          backgroundColor: theme.colors.white,
          borderRadius: 24,
          padding: 15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: qrOpacity,
          transform: `scale(${qrScale})`,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#f0f0f0',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: theme.colors.textLight,
            fontFamily: theme.fonts.main,
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 60 }}>📱</div>
          <div>扫码体验</div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 80,
          fontSize: 24,
          color: 'rgba(255, 255, 255, 0.6)',
          fontFamily: theme.fonts.main,
          opacity: qrOpacity,
        }}
      >
        微信小程序 · 衣律通
      </div>
    </AbsoluteFill>
  );
};
