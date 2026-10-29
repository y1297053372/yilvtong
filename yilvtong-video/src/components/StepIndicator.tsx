import React from 'react';
import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../config/theme';

interface StepIndicatorProps {
  steps: string[];
  currentStep?: number;
  delay?: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep = 0,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 30,
      }}
    >
      {steps.map((step, index) => {
        const stepDelay = index * 20;
        const stepFrame = Math.max(0, adjustedFrame - stepDelay);

        const scale = spring({
          frame: stepFrame,
          fps,
          config: theme.animation.spring,
        });

        const opacity = interpolate(stepFrame, [0, 15], [0, 1], {
          extrapolateRight: 'clamp',
        });

        const isActive = index <= currentStep;
        const progress = index < currentStep
          ? 1
          : index === currentStep
          ? spring({
              frame: stepFrame,
              fps,
              config: { damping: 20, stiffness: 50 },
            })
          : 0;

        return (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 25,
              opacity,
              transform: `scale(${scale})`,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: isActive ? theme.colors.primary : '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                fontWeight: 'bold',
                color: isActive ? theme.colors.white : theme.colors.textLight,
                fontFamily: theme.fonts.main,
                boxShadow: isActive
                  ? `0 10px 30px ${theme.colors.primary}40`
                  : 'none',
              }}
            >
              {index < currentStep ? '✓' : index + 1}
            </div>

            <div
              style={{
                flex: 1,
                height: 8,
                backgroundColor: '#e2e8f0',
                borderRadius: 4,
                overflow: 'hidden',
                width: 300,
              }}
            >
              <div
                style={{
                  width: `${progress * 100}%`,
                  height: '100%',
                  backgroundColor: theme.colors.primary,
                  borderRadius: 4,
                }}
              />
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: isActive ? 'bold' : 'normal',
                color: isActive ? theme.colors.text : theme.colors.textLight,
                fontFamily: theme.fonts.main,
                width: 200,
              }}
            >
              {step}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface AnimatedStepProps {
  steps: string[];
  delay?: number;
  stepDuration?: number;
}

export const AnimatedSteps: React.FC<AnimatedStepProps> = ({
  steps,
  delay = 0,
  stepDuration = 60,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = Math.max(0, frame - delay);
  const currentStep = Math.floor(adjustedFrame / stepDuration);

  return (
    <StepIndicator
      steps={steps}
      currentStep={Math.min(currentStep, steps.length)}
      delay={0}
    />
  );
};
