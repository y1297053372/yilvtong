import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { theme } from '../config/theme';

const problems = [
  { emoji: '🛒', text: '买到假货？', color: '#ef4444' },
  { emoji: '💸', text: '商家拒绝退款？', color: '#f97316' },
  { emoji: '❓', text: '不知道如何维权？', color: '#eab308' },
];

export const PainPointScene: React.FC = () => {
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
        backgroundColor: theme.colors.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
      }}
    >
      <div
        style={{
          fontSize: 56,
          fontWeight: 'bold',
          color: theme.colors.text,
          fontFamily: theme.fonts.main,
          marginBottom: 80,
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
        }}
      >
        消费维权难题？
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 40,
        }}
      >
        {problems.map((problem, index) => {
          const delay = 30 + index * 25;
          const adjustedFrame = Math.max(0, frame - delay);

          const cardScale = spring({
            frame: adjustedFrame,
            fps,
            config: theme.animation.spring,
          });

          const cardOpacity = interpolate(adjustedFrame, [0, 15], [0, 1], {
            extrapolateRight: 'clamp',
          });

          const shakeOffset = Math.sin(adjustedFrame * 0.3) * 
            interpolate(adjustedFrame, [0, 60], [15, 0], {
              extrapolateRight: 'clamp',
            });

          return (
            <div
              key={index}
              style={{
                width: 700,
                height: 140,
                backgroundColor: theme.colors.card,
                borderRadius: 24,
                padding: '0 40px',
                display: 'flex',
                alignItems: 'center',
                gap: 30,
                boxShadow: `0 15px 50px ${problem.color}15`,
                border: `2px solid ${problem.color}30`,
                opacity: cardOpacity,
                transform: `scale(${cardScale}) translateX(${shakeOffset}px)`,
              }}
            >
              <div
                style={{
                  fontSize: 60,
                }}
              >
                {problem.emoji}
              </div>
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 'bold',
                  color: theme.colors.text,
                  fontFamily: theme.fonts.main,
                }}
              >
                {problem.text}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
