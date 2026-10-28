import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

export const FPS = 25;
export const s = (sec: number) => Math.round(sec * FPS);
const YEL = '#FFD23F';
const BLUE_TOP = '#1f74f0';
const BLUE_BOT = '#0a3aa8';

export const fontCss = `
@font-face{font-family:'InterX';src:url(${staticFile('Inter-Bold.otf')});font-weight:700}
@font-face{font-family:'InterX';src:url(${staticFile('Inter-ExtraBold.otf')});font-weight:800}
@font-face{font-family:'InterX';src:url(${staticFile('Inter-SemiBold.otf')});font-weight:600}`;

export type Lang = 'ru' | 'en';
export type Line = {t: string; y?: boolean};
export const T: Record<Lang, {
  q1: Line[]; q2: Line[]; hook: Line[]; s3: Line[]; s4: Line[]; s5: Line[]; small: string; brand: string; get: string; store: string;
}> = {
  ru: {
    q1: [{t: 'Нет сил?'}],
    q2: [{t: 'Или ты просто', y: true}, {t: 'задохнулся?', y: true}],
    hook: [{t: 'Силы есть.'}, {t: 'Голова работает.'}, {t: 'А дышать не можешь?', y: true}],
    s3: [{t: 'Пройди тест.'}, {t: 'Узнай, в чём дело', y: true}],
    s4: [{t: 'Выполни'}, {t: 'упражнение', y: true}],
    s5: [{t: 'Тренируй дыхание'}, {t: 'каждый день', y: true}],
    small: 'Результат у каждого свой',
    brand: 'РобоТренер', get: 'Скачай бесплатно', store: 'в Google Play',
  },
  en: {
    q1: [{t: 'No strength?'}],
    q2: [{t: 'Or are you just', y: true}, {t: 'out of breath?', y: true}],
    hook: [{t: "You've got strength."}, {t: 'Your head is clear.'}, {t: "But you can't breathe?", y: true}],
    s3: [{t: 'Take the test.'}, {t: 'Find out why', y: true}],
    s4: [{t: 'Do the'}, {t: 'exercise', y: true}],
    s5: [{t: 'Train your breathing'}, {t: 'every day', y: true}],
    small: 'Individual results vary',
    brand: 'RoboTrainer', get: 'Get it free', store: 'on Google Play',
  },
};

// Each line pops in: rises, scales from 0.85 and the yellow ones get a glow sweep.
export const PopLines: React.FC<{lines: Line[]; size: number; delay?: number; stagger?: number; dark?: boolean}> = ({lines, size, delay = 0, stagger = 7, dark = true}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.12}}>
      {lines.map((l, i) => {
        const p = spring({frame: f - delay - i * stagger, fps, config: {damping: 12, stiffness: 160, mass: 0.7}});
        const glow = l.y ? interpolate(f - delay - i * stagger, [6, 16, 30], [0, 1, 0.55], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
        return (
          <div key={i} style={{
            fontFamily: 'InterX', fontWeight: 800, fontSize: size, lineHeight: 1.1, textAlign: 'center',
            color: l.y ? YEL : '#fff', opacity: p, letterSpacing: -0.5,
            transform: `translateY(${(1 - p) * 60}px) scale(${0.85 + 0.15 * p})`,
            textShadow: dark
              ? `0 4px 18px rgba(0,0,0,.65), 0 0 ${28 * glow}px rgba(255,210,63,${0.8 * glow})`
              : `0 4px 14px rgba(0,20,80,.35), 0 0 ${24 * glow}px rgba(255,210,63,${0.7 * glow})`,
          }}>{l.t}</div>
        );
      })}
    </div>
  );
};

export const TopShade: React.FC = () => (
  <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,10,40,.62) 0%, rgba(0,10,40,.25) 30%, rgba(0,0,0,0) 45%)'}} />
);

export const Live: React.FC<{src: string; grade?: boolean}> = ({src, grade}) => (
  <AbsoluteFill>
    <OffthreadVideo src={staticFile(src)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    {grade ? <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,.45) 100%)'}} /> : null}
  </AbsoluteFill>
);

// Slow "breathing" pulse of a dark vignette: makes the out-of-breath moment heavier.
export const BreathPulse: React.FC = () => {
  const f = useCurrentFrame();
  const a = 0.18 + 0.14 * (0.5 + 0.5 * Math.sin(f / 9));
  return <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,${a + 0.25}) 100%)`}} />;
};

export const TextTop: React.FC<{children: React.ReactNode; top?: number}> = ({children, top = 110}) => (
  <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center', paddingTop: top}}>{children}</AbsoluteFill>
);

const Bubbles: React.FC = () => {
  const f = useCurrentFrame();
  const b = [[120, 260, 90], [930, 520, 140], [80, 1350, 120], [990, 1500, 70], [520, 120, 50]];
  return <>{b.map(([x, y, r], i) => (
    <div key={i} style={{position: 'absolute', left: x - r, top: y - r + Math.sin((f + i * 20) / 22) * 14, width: r * 2, height: r * 2, borderRadius: '50%', background: 'rgba(255,255,255,.08)'}} />
  ))}</>;
};

const BlueBg: React.FC = () => (
  <AbsoluteFill style={{background: `linear-gradient(180deg, ${BLUE_TOP} 0%, ${BLUE_BOT} 100%)`}}><Bubbles /></AbsoluteFill>
);

export const ScreenScene: React.FC<{img: string; lines: Line[]; reveal?: boolean}> = ({img, lines, reveal}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const inP = spring({frame: f - 3, fps, config: {damping: 14, stiffness: 110}});
  const float = Math.sin(f / 14) * 8;
  const enter = spring({frame: f, fps, config: {damping: 200}});
  const r = interpolate(f, [0, 10], [0, 120], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{clipPath: reveal ? `circle(${r}% at 50% 55%)` : undefined}}>
      <BlueBg />
      <AbsoluteFill style={{transform: `translateX(${reveal ? 0 : (1 - enter) * 1080}px)`}}>
      <TextTop top={150}><PopLines lines={lines} size={92} delay={6} dark={false} /></TextTop>
      <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center'}}>
        <Img src={staticFile(img)} style={{
          width: 1080, transform: `translateY(${(1 - inP) * 900 + float}px) scale(${1 + 0.03 * f / durationInFrames})`,
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 9%), linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%)',
          WebkitMaskComposite: 'source-in',
        }} />
      </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const SmallNote: React.FC<{text: string}> = ({text}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [8, 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 120}}>
      <div style={{opacity: o, fontFamily: 'InterX', fontWeight: 600, fontSize: 38, color: '#fff', background: 'rgba(0,20,60,.6)', padding: '14px 30px', borderRadius: 40}}>{text}</div>
    </AbsoluteFill>
  );
};

export const EndCard: React.FC<{lang: Lang}> = ({lang}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = T[lang];
  const sp = (d: number, c = {damping: 11, stiffness: 150}) => spring({frame: f - d, fps, config: c});
  const icon = sp(0), get = sp(6), pill = sp(12), face = sp(16, {damping: 9, stiffness: 120});
  const pulse = 1 + 0.05 * Math.max(0, Math.sin((f - 20) / 5));
  return (
    <AbsoluteFill>
      <BlueBg />
      <AbsoluteFill style={{alignItems: 'center', paddingTop: 230}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 26, transform: `scale(${icon})`}}>
          <Img src={staticFile('icon.png')} style={{width: 130, height: 130, borderRadius: 30, boxShadow: '0 10px 30px rgba(0,0,0,.3)'}} />
          <div style={{fontFamily: 'InterX', fontWeight: 700, fontSize: 70, color: '#fff'}}>{t.brand}</div>
        </div>
        <div style={{marginTop: 80, fontFamily: 'InterX', fontWeight: 800, fontSize: 92, color: '#fff', opacity: get, transform: `translateY(${(1 - get) * 50}px)`, textShadow: '0 4px 14px rgba(0,20,80,.35)'}}>{t.get}</div>
        <div style={{marginTop: 26, fontFamily: 'InterX', fontWeight: 800, fontSize: 60, color: '#10204a', background: YEL, padding: '16px 46px', borderRadius: 60,
          transform: `scale(${pill * pulse})`, boxShadow: `0 0 ${30 * (pulse - 1) * 20}px rgba(255,210,63,.7)`}}>{t.store}</div>
        <Img src={staticFile(`${lang}_face.png`)} style={{marginTop: 110, width: 560, height: 560, transform: `scale(${face}) translateY(${Math.sin(f / 10) * 10}px)`, filter: 'drop-shadow(0 20px 40px rgba(0,0,30,.4))'}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Scene lengths in seconds.
const D = {a: 2.5, b: 2.0, c1: 2.6, c2: 4.0, d: 4.2, e: 2.2, f: 2.9, s3: 2.4, s4: 2.4, s5: 2.4, g: 3.1, h: 3.2};
const order = Object.keys(D) as (keyof typeof D)[];
const start: Record<string, number> = {};
let acc = 0;
for (const k of order) { start[k] = acc; acc += s(D[k]); }
export const TOTAL = acc;

export const Lestnica: React.FC<{lang: Lang}> = ({lang}) => {
  const t = T[lang];
  const seq = (k: keyof typeof D, el: React.ReactNode) => <Sequence key={k} from={start[k]} durationInFrames={s(D[k])}>{el}</Sequence>;
  const breathFrom = start.c1 + s(2.0);
  const breathLen = start.s3 - breathFrom;
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <style>{fontCss}</style>
      {seq('a', <Live src="a.mp4" />)}
      {seq('b', <Live src="b.mp4" />)}
      {seq('c1', <Live src="c1.mp4" />)}
      {seq('c2', <><Live src="c2r.mp4" /><BreathPulse /><TopShade /><TextTop top={110}><PopLines lines={t.q1} size={104} delay={4} /></TextTop></>)}
      {seq('d', <><Live src="dr.mp4" /><BreathPulse /><TopShade /><TextTop top={90}><PopLines lines={t.q1} size={92} delay={-100} /><PopLines lines={t.q2} size={92} delay={6} /></TextTop></>)}
      {seq('e', <><Live src="er.mp4" /><TopShade /><TextTop top={110}><PopLines lines={t.hook} size={80} delay={2} stagger={6} /></TextTop></>)}
      {seq('f', <><Live src="fr.mp4" /><BreathPulse /><TopShade /><TextTop top={110}><PopLines lines={t.hook} size={80} delay={-100} /></TextTop></>)}
      <Sequence from={start.s3 - 8} durationInFrames={s(D.s3) + 8}><ScreenScene img={`${lang}_scr3.png`} lines={t.s3} reveal /></Sequence>
      {seq('s4', <ScreenScene img={`${lang}_scr4.png`} lines={t.s4} />)}
      {seq('s5', <ScreenScene img={`${lang}_scr5.png`} lines={t.s5} />)}
      {seq('g', <><Live src="g.mp4" /><SmallNote text={t.small} /></>)}
      {seq('h', <EndCard lang={lang} />)}
      <Sequence from={breathFrom} durationInFrames={breathLen}>
        <Audio src={staticFile('breath.mp3')} loop volume={(fr) => interpolate(fr, [0, 12, breathLen - 15, breathLen], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} />
      </Sequence>
    </AbsoluteFill>
  );
};
