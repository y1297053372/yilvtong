import React from 'react';
import { Composition } from 'remotion';
import { IntroVideo } from './compositions/IntroVideo';
import { MiniAppHomeScene } from './scenes/MiniAppHomeScene';
import { videoConfig } from './config/theme';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="IntroVideo"
        component={IntroVideo}
        durationInFrames={videoConfig.durationInFrames}
        fps={videoConfig.fps}
        width={videoConfig.width}
        height={videoConfig.height}
      />
      <Composition
        id="MiniAppDemo"
        component={MiniAppHomeScene}
        durationInFrames={180}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};
