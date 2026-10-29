import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { theme } from '../config/theme';

const features = [
  {
    icon: '📋',
    title: '民事起诉状',
    subtitle: '专业法律文书',
    color: theme.colors.primary,
  },
  {
    icon: '📢',
    title: '举报文书',
    subtitle: '一键生成举报信',
    color: theme.colors.secondary,
  },
  {
    icon: '✉️',
    title: '协商函',
    subtitle: '正式维权沟通',
    color: '#22c55e',
  },
];

export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${theme.colors.background} 0%, #e0e7ff 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 80,
      }}
    >
      <div
        style={{
          fontSize: 56,
          fontWeight: 'bold',
          color: theme.colors.text,
          fontFamily: theme.fonts.main,
          marginBottom: 60,
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
        }}
      >
        三大核心功能
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 35,
          alignItems: 'center',
        }}
      >
        {features.map((feature, index) => {
          const delay = 30 + index * 30;
          const adjustedFrame = Math.max(0, frame - delay);

          const cardScale = spring({
            frame: adjustedFrame,
            fps,
            config: {
              damping: 12,
              stiffness: 80,
              mass: 0.6,
            },
          });

          const cardOpacity = interpolate(adjustedFrame, [0, 15], [0, 1], {
            extrapolateRight: 'clamp',
          });

          const slideX = interpolate(
            spring({
              frame: adjustedFrame,
              fps,
              config: { damping: 20, stiffness: 50 },
            }),
            [0, 1],
            [index % 2 === 0 ? -100 : 100, 0]
          );

          return (
            <div
              key={index}
              style={{
                width: 650,
                height: 180,
                backgroundColor: theme.colors.card,
                borderRadius: 28,
                padding: 35,
                display: 'flex',
                alignItems: 'center',
                gap: 35,
                boxShadow: `0 20px 60px ${feature.color}20`,
                border: `3px solid ${feature.color}40`,
                opacity: cardOpacity,
                transform: `scale(${cardScale}) translateX(${slideX}px)`,
              }}
            >
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 28,
                  backgroundColor: `${feature.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 55,
                }}
              >
                {feature.icon}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 'bold',
                    color: theme.colors.text,
                    fontFamily: theme.fonts.main,
                    marginBottom: 10,
                  }}
                >
                  {feature.title}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    color: theme.colors.textLight,
                    fontFamily: theme.fonts.main,
                  }}
                >
                  {feature.subtitle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
