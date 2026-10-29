import React from 'react';
import { spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { theme } from '../config/theme';

interface LogoProps {
  size?: number;
  showText?: boolean;
  delay?: number;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 200, 
  showText = true, 
  delay = 0 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);

  const scale = spring({
    frame: adjustedFrame,
    fps,
    config: {
      damping: 12,
      stiffness: 100,
      mass: 0.8,
    },
  });

  const opacity = interpolate(adjustedFrame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const rotation = interpolate(
    spring({
      frame: adjustedFrame,
      fps,
      config: { damping: 20, stiffness: 50 },
    }),
    [0, 1],
    [-30, 0]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
        transform: `scale(${scale}) rotate(${rotation}deg)`,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.colors.primary} />
            <stop offset="100%" stopColor={theme.colors.primaryLight} />
          </linearGradient>
        </defs>
        
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="url(#logoGradient)"
          opacity="0.1"
        />
        
        <line
          x1="50"
          y1="15"
          x2="50"
          y2="25"
          stroke={theme.colors.primary}
          strokeWidth="4"
          strokeLinecap="round"
        />
        
        <line
          x1="25"
          y1="25"
          x2="75"
          y2="25"
          stroke={theme.colors.primary}
          strokeWidth="4"
          strokeLinecap="round"
        />
        
        <g transform="translate(20, 25)">
          <line
            x1="5"
            y1="0"
            x2="5"
            y2="40"
            stroke={theme.colors.primary}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle
            cx="5"
            cy="45"
            r="8"
            fill={theme.colors.primary}
          />
        </g>
        
        <g transform="translate(50, 25)">
          <line
            x1="5"
            y1="0"
            x2="5"
            y2="25"
            stroke={theme.colors.secondary}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle
            cx="5"
            cy="30"
            r="6"
            fill={theme.colors.secondary}
          />
        </g>
        
        <rect
          x="15"
          y="70"
          width="70"
          height="8"
          rx="4"
          fill={theme.colors.primary}
        />
      </svg>

      {showText && (
        <div
          style={{
            marginTop: 30,
            fontSize: size * 0.4,
            fontWeight: 'bold',
            color: theme.colors.primary,
            fontFamily: theme.fonts.main,
          }}
        >
          衣律通
        </div>
      )}
    </div>
  );
};
