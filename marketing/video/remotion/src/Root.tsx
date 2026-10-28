import React from 'react';
import {Composition} from 'remotion';
import {Lestnica, TOTAL} from './Lestnica';
import {Boks, BOKS_TOTAL} from './Boks';
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="lestnica-ru" component={Lestnica} durationInFrames={TOTAL} fps={25} width={1080} height={1920} defaultProps={{lang: 'ru' as const}} />
    <Composition id="lestnica-en" component={Lestnica} durationInFrames={TOTAL} fps={25} width={1080} height={1920} defaultProps={{lang: 'en' as const}} />
    <Composition id="boks-ru" component={Boks} durationInFrames={BOKS_TOTAL} fps={25} width={1080} height={1920} defaultProps={{lang: 'ru' as const}} />
    <Composition id="boks-en" component={Boks} durationInFrames={BOKS_TOTAL} fps={25} width={1080} height={1920} defaultProps={{lang: 'en' as const}} />
  </>
);
