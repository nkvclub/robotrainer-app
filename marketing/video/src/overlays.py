import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H=1080,1920
B='/usr/share/fonts/opentype/inter/Inter-Bold.otf'
S='/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
out=sys.argv[1]; rk='/mnt/project-files/store/reklama'
T={'ru':dict(hook=['Силы есть.','Голова работает.','А дышать не можешь?'],
  s3=['Пройди тест.','Узнай, в чём дело'],s4=['Выполни','упражнение'],s5=['Тренируй дыхание','каждый день'],
  small='Результат у каждого свой'),
 'en':dict(hook=["You've got strength.",'Your head is clear.',"But you can't breathe?"],
  s3=['Take the test.','Find out why'],s4=['Do the','exercise'],s5=['Train your breathing','every day'],
  small='Individual results vary')}
YEL=(255,210,63,255)
def text_block(d,lines,y,size,colors=None,shadow=True,img=None):
    f=ImageFont.truetype(B,size); lh=int(size*1.2)
    for i,l in enumerate(lines):
        w=d.textlength(l,font=f); x=(W-w)/2; c=(colors[i] if colors else (255,255,255,255))
        d.text((x,y+i*lh),l,font=f,fill=c)
    return y+len(lines)*lh
def shadowed(lines,y,size,colors=None,grad=True):
    im=Image.new('RGBA',(W,H),(0,0,0,0))
    if grad:
        g=Image.new('RGBA',(W,H),(0,0,0,0)); gd=ImageDraw.Draw(g)
        for yy in range(0,900):
            a=int(150*(1-yy/900)**1.3); gd.line([(0,yy),(W,yy)],fill=(0,10,40,a))
        im=Image.alpha_composite(im,g)
    sh=Image.new('RGBA',(W,H),(0,0,0,0)); text_block(ImageDraw.Draw(sh),lines,y+4,size,[(0,0,0,200)]*len(lines))
    sh=sh.filter(ImageFilter.GaussianBlur(8)); im=Image.alpha_composite(im,sh)
    text_block(ImageDraw.Draw(im),lines,y,size,colors); return im
for L in ('ru','en'):
    t=T[L]
    shadowed(t['hook'],120,84,[(255,255,255,255),(255,255,255,255),YEL]).save(f'{out}/{L}_hook.png')
    # small bottom note
    im=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(im); f=ImageFont.truetype(S,38)
    w=d.textlength(t['small'],font=f); x=(W-w)/2; y=1760
    d.rounded_rectangle([x-28,y-16,x+w+28,y+56],radius=36,fill=(0,20,60,150))
    d.text((x,y),t['small'],font=f,fill=(255,255,255,235)); im.save(f'{out}/{L}_small.png')
    for n,cover in ({'ru':((3,770),(4,800),(5,640)),'en':((3,630),(4,690),(5,620))}[L]):
        src=Image.open(f'{rk}/{L}/android/{n}.png').convert('RGBA').resize((W,H))
        px=src.load(); bg=Image.new('RGBA',(W,cover+80))
        bd=ImageDraw.Draw(bg)
        for yy in range(cover+80):
            # colour at the edges of this row, averaged
            r=[px[3,yy],px[W-4,yy]]; c=tuple(int((r[0][k]+r[1][k])/2) for k in range(3))+(255,)
            bd.line([(0,yy),(W,yy)],fill=c)
        mask=Image.new('L',(W,cover+80),255); md=ImageDraw.Draw(mask)
        for yy in range(cover,cover+80): md.line([(0,yy),(W,yy)],fill=int(255*(1-(yy-cover)/80)))
        src.paste(bg,(0,0),mask)
        lines=t[f's{n}']; size=92 if max(len(s) for s in lines)<18 else 84
        lh=int(size*1.2); y0=(min(cover,700)-len(lines)*lh)//2+30
        sh=Image.new('RGBA',(W,H),(0,0,0,0)); text_block(ImageDraw.Draw(sh),lines,y0+4,size,[(0,0,60,120)]*len(lines))
        src=Image.alpha_composite(src,sh.filter(ImageFilter.GaussianBlur(6)))
        text_block(ImageDraw.Draw(src),lines,y0,size,[(255,255,255,255)]*(len(lines)-1)+[YEL] if n==3 else None)
        src.convert('RGB').save(f'{out}/{L}_s{n}.png')
