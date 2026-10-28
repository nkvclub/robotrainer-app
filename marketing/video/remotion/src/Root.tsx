import React from 'react';
import {Composition} from 'remotion';
import {Lestnica, TOTAL} from './Lestnica';
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="lestnica-ru" component={Lestnica} durationInFrames={TOTAL} fps={25} width={1080} height={1920} defaultProps={{lang: 'ru' as const}} />
    <Composition id="lestnica-en" component={Lestnica} durationInFrames={TOTAL} fps={25} width={1080} height={1920} defaultProps={{lang: 'en' as const}} />
  </>
);
