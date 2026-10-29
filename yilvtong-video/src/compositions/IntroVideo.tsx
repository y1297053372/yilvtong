import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { OpeningScene } from '../scenes/OpeningScene';
import { PainPointScene } from '../scenes/PainPointScene';
import { FeaturesScene } from '../scenes/FeaturesScene';
import { FlowScene } from '../scenes/FlowScene';
import { EndingScene } from '../scenes/EndingScene';
import { sceneTimings } from '../config/theme';

export const IntroVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#ffffff' }}>
      <Sequence
        from={sceneTimings.opening.start}
        durationInFrames={sceneTimings.opening.duration}
      >
        <OpeningScene />
      </Sequence>

      <Sequence
        from={sceneTimings.painPoint.start}
        durationInFrames={sceneTimings.painPoint.duration}
      >
        <PainPointScene />
      </Sequence>

      <Sequence
        from={sceneTimings.features.start}
        durationInFrames={sceneTimings.features.duration}
      >
        <FeaturesScene />
      </Sequence>

      <Sequence
        from={sceneTimings.flow.start}
        durationInFrames={sceneTimings.flow.duration}
      >
        <FlowScene />
      </Sequence>

      <Sequence
        from={sceneTimings.ending.start}
        durationInFrames={sceneTimings.ending.duration}
      >
        <EndingScene />
      </Sequence>
    </AbsoluteFill>
  );
};
