import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { theme } from '../config/theme';

const steps = [
  { icon: '📝', title: '填写信息', desc: '简单表单快速录入' },
  { icon: '🤖', title: '智能生成', desc: 'AI自动生成文书' },
  { icon: '📄', title: '导出PDF', desc: '专业格式一键下载' },
];

export const FlowScene: React.FC = () => {
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

  const stepDuration = 50;
  const currentStep = Math.floor(frame / stepDuration);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.background,
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
          marginBottom: 80,
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
        }}
      >
        简单三步 轻松维权
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 50,
          alignItems: 'center',
        }}
      >
        {steps.map((step, index) => {
          const stepStart = 30 + index * stepDuration;
          const adjustedFrame = Math.max(0, frame - stepStart);

          const isActive = index <= currentStep;
          const isCompleted = index < currentStep;

          const cardScale = spring({
            frame: adjustedFrame,
            fps,
            config: theme.animation.spring,
          });

          const cardOpacity = interpolate(adjustedFrame, [0, 15], [0, 1], {
            extrapolateRight: 'clamp',
          });

          const progressWidth = isCompleted
            ? 100
            : isActive
            ? interpolate(
                spring({
                  frame: adjustedFrame,
                  fps,
                  config: { damping: 15, stiffness: 50 },
                }),
                [0, 1],
                [0, 100]
              )
            : 0;

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 40,
                opacity: cardOpacity,
                transform: `scale(${cardScale})`,
              }}
            >
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  backgroundColor: isActive ? theme.colors.primary : '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 50,
                  boxShadow: isActive
                    ? `0 15px 40px ${theme.colors.primary}40`
                    : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {isCompleted ? '✓' : step.icon}
              </div>

              <div
                style={{
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 400,
                    height: 14,
                    backgroundColor: '#e2e8f0',
                    borderRadius: 7,
                    overflow: 'hidden',
                    marginBottom: 15,
                  }}
                >
                  <div
                    style={{
                      width: `${progressWidth}%`,
                      height: '100%',
                      backgroundColor: theme.colors.primary,
                      borderRadius: 7,
                    }}
                  />
                </div>

                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 'bold',
                    color: isActive ? theme.colors.text : theme.colors.textLight,
                    fontFamily: theme.fonts.main,
                    marginBottom: 8,
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    color: theme.colors.textLight,
                    fontFamily: theme.fonts.main,
                  }}
                >
                  {step.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
