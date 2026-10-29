import React from 'react';
import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../config/theme';

interface CardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  backgroundColor?: string;
  delay?: number;
  width?: number;
  height?: number;
  shake?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  icon,
  backgroundColor = theme.colors.card,
  delay = 0,
  width = 300,
  height = 150,
  shake = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);

  const scale = spring({
    frame: adjustedFrame,
    fps,
    config: theme.animation.spring,
  });

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const shakeOffset = shake
    ? Math.sin(adjustedFrame * 0.5) * interpolate(adjustedFrame, [0, 30], [10, 0], {
        extrapolateRight: 'clamp',
      })
    : 0;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor,
        borderRadius: 20,
        padding: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        opacity,
        transform: `scale(${scale}) translateX(${shakeOffset}px)`,
      }}
    >
      {icon && (
        <div style={{ marginBottom: 15, fontSize: 40 }}>
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: theme.colors.text,
          fontFamily: theme.fonts.main,
          textAlign: 'center',
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 18,
            color: theme.colors.textLight,
            fontFamily: theme.fonts.main,
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};

interface FeatureCardProps {
  title: string;
  icon: string;
  color: string;
  delay?: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  icon,
  color,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);

  const scale = spring({
    frame: adjustedFrame,
    fps,
    config: {
      damping: 12,
      stiffness: 80,
      mass: 0.6,
    },
  });

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: 280,
        height: 320,
        backgroundColor: theme.colors.card,
        borderRadius: 24,
        padding: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 20px 60px ${color}20`,
        border: `3px solid ${color}30`,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: 25,
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 50,
          marginBottom: 25,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 'bold',
          color: theme.colors.text,
          fontFamily: theme.fonts.main,
          textAlign: 'center',
        }}
      >
        {title}
      </div>
    </div>
  );
};
