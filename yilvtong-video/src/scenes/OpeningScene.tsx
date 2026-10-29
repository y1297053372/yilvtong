import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { Logo } from '../components/Logo';
import { theme } from '../config/theme';

export const OpeningScene: React.FC = () => {
  const frame = useCurrentFrame();

  const backgroundOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const subtitleOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const subtitleY = interpolate(frame, [60, 90], [30, 0], {
    extrapolateRight: 'clamp',
  });

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
      <Logo size={250} delay={20} />

      <div
        style={{
          marginTop: 40,
          fontSize: 42,
          color: theme.colors.white,
          fontFamily: theme.fonts.main,
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          textAlign: 'center',
        }}
      >
        消费维权 智能助手
      </div>

      <div
        style={{
          marginTop: 20,
          fontSize: 24,
          color: 'rgba(255, 255, 255, 0.7)',
          fontFamily: theme.fonts.main,
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
        }}
      >
        让维权更简单
      </div>
    </AbsoluteFill>
  );
};
