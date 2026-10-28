import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {BreathPulse, EndCard, Lang, Live, PopLines, ScreenScene, SmallNote, T, TextTop, TopShade, fontCss, s} from './Lestnica';

// The missed kick: slow motion, then a white flash, a shake and a drop to grey at the impact.
const IMPACT = 1.75;
const Impact: React.FC = () => {
  const f = useCurrentFrame();
  const at = s(IMPACT);
  const flash = interpolate(f, [at - 1, at, at + 6], [0, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const shake = f >= at && f < at + 10 ? Math.sin(f * 2.7) * (10 - (f - at)) * 2.2 : 0;
  const grey = interpolate(f, [at, at + 12], [0, 0.7], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `translate(${shake}px, ${shake * 0.6}px) scale(${1.04})`, filter: `grayscale(${grey})`}}>
        <Live src="wb_c2.mp4" />
      </AbsoluteFill>
      <AbsoluteFill style={{backgroundColor: `rgba(255,255,255,${flash})`}} />
    </AbsoluteFill>
  );
};

const D = {a: 3.0, b: 2.5, c1: 2.0, c2: 3.4, d: 5.0, e: 2.4, f: 3.0, s3: 2.4, s4: 2.4, s5: 2.4, g: 3.0, h: 3.2};
const order = Object.keys(D) as (keyof typeof D)[];
const start: Record<string, number> = {};
let acc = 0;
for (const k of order) { start[k] = acc; acc += s(D[k]); }
export const BOKS_TOTAL = acc;

export const Boks: React.FC<{lang: Lang}> = ({lang}) => {
  // The fighter here is a woman, so the Russian question is in the feminine form.
  const t = lang === 'ru' ? {...T.ru, q2: [{t: 'Или ты просто', y: true}, {t: 'задохнулась?', y: true}]} : T[lang];
  const seq = (k: keyof typeof D, el: React.ReactNode) => <Sequence key={k} from={start[k]} durationInFrames={s(D[k])}>{el}</Sequence>;
  const hit = start.c2 + s(IMPACT);
  const breathLen = start.s3 - hit;
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <style>{fontCss}</style>
      {seq('a', <Live src="wb_a.mp4" />)}
      {seq('b', <Live src="wb_b.mp4" />)}
      {seq('c1', <Live src="wb_c1.mp4" />)}
      {seq('c2', <Impact />)}
      {seq('d', <><Live src="wb_d.mp4" /><BreathPulse /><TopShade /><TextTop top={100}><PopLines lines={t.q1} size={96} delay={4} /><PopLines lines={t.q2} size={96} delay={s(1.6)} /></TextTop></>)}
      {seq('e', <><Live src="wb_e.mp4" /><TopShade /><TextTop top={110}><PopLines lines={t.hook} size={80} delay={2} stagger={6} /></TextTop></>)}
      {seq('f', <><Live src="wb_f.mp4" /><BreathPulse /><TopShade /><TextTop top={110}><PopLines lines={t.hook} size={80} delay={-100} /></TextTop></>)}
      <Sequence from={start.s3 - 8} durationInFrames={s(D.s3) + 8}><ScreenScene img={`${lang}_scr3.png`} lines={t.s3} reveal /></Sequence>
      {seq('s4', <ScreenScene img={`${lang}_scr4.png`} lines={t.s4} />)}
      {seq('s5', <ScreenScene img={`${lang}_scr5.png`} lines={t.s5} />)}
      {seq('g', <><Live src="wb_g.mp4" /><SmallNote text={t.small} /></>)}
      {seq('h', <EndCard lang={lang} />)}
      <Sequence from={hit - 2} durationInFrames={s(1.2)}><Audio src={staticFile('punch.mp3')} volume={1} /></Sequence>
      <Sequence from={hit + 6} durationInFrames={breathLen - 6}>
        <Audio src={staticFile('breath.mp3')} loop volume={(fr) => interpolate(fr, [0, 12, breathLen - 20, breathLen - 6], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} />
      </Sequence>
    </AbsoluteFill>
  );
};
