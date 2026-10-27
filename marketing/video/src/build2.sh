#!/bin/bash
set -e
cd /tmp/claude-0/-home-user/7ee84d24-b793-5835-98bb-2b2195a428be/scratchpad
L=$1; O=build/v2$L; mkdir -p $O
ENC="-c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r 25 -an"
V="scale=1080:2048,crop=1080:1920:0:64,setsar=1,fps=25"
H4="crop=1215:2160:XX:0,scale=1080:1920,setsar=1,fps=25"
txt(){ # in.mp4 overlay.png dur out fadein_start
 ffmpeg -v error -y -i $1 -loop 1 -t $3 -i $2 -filter_complex "[1:v]format=rgba,fade=in:st=$5:d=${6:-0.35}:alpha=1[t];[0:v][t]overlay=0:0:shortest=1" -t $3 $ENC $4; }
ffmpeg -v error -y -ss 1.8 -t 2.5 -i hd/7877145_1080.mp4 -vf "$V,fade=in:0:6" $ENC $O/a.mp4
ffmpeg -v error -y -ss 2.8 -t 2.0 -i hd/7877150_1080.mp4 -vf "$V" $ENC $O/b.mp4
ffmpeg -v error -y -ss 4.0 -t 2.6 -i hd/7876928_1080.mp4 -vf "$V" $ENC $O/c1.mp4
# he stops: slow, "No strength?"
ffmpeg -v error -y -ss 6.6 -t 2.4 -i hd/7876928_1080.mp4 -vf "$V,setpts=PTS/0.6,fps=25,eq=saturation=0.8" -t 4.0 $ENC $O/c2r.mp4
txt $O/c2r.mp4 build/${L}_q1.png 4.0 $O/c2.mp4 0.3
# other angle, bent, breathing: "Or are you just out of breath?"
ffmpeg -v error -y -ss 6.6 -t 3.2 -i hd/7876573_4k.mp4 -vf "${H4/XX/1500},setpts=PTS/0.75,fps=25,eq=saturation=0.8" -t 4.2 $ENC $O/dr.mp4
txt $O/dr.mp4 build/${L}_q2.png 4.2 $O/d.mp4 0.4
# she keeps running up, he can't
ffmpeg -v error -y -ss 2.0 -t 2.2 -i hd/7876915_4k.mp4 -vf "${H4/XX/1440}" $ENC $O/er.mp4
txt $O/er.mp4 build/${L}_hook.png 2.2 $O/e.mp4 0.2
# close-up on him, slow push-in
ffmpeg -v error -y -ss 7.4 -t 1.6 -i hd/7876928_4k.mp4 -vf "crop=1080:1920:700:1000,setsar=1,fps=25,setpts=PTS/0.55,fps=25,eq=saturation=0.8,zoompan=z='1+0.06*on/75':x='iw/2-(iw/zoom/2)':y='ih/3-(ih/zoom/3)':d=1:s=1080x1920:fps=25" -t 2.9 $ENC $O/fr.mp4
txt $O/fr.mp4 build/${L}_hook.png 2.9 $O/f.mp4 0 0.04
for n in 3 4 5; do
ffmpeg -v error -y -i build/${L}_s$n.png -vf "scale=1188:2112,zoompan=z='1+0.03*on/55':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=55:s=1080x1920:fps=25,fade=in:0:5" $ENC $O/s$n.mp4; done
ffmpeg -v error -y -ss 2.3 -t 2.7 -i hd/7877141_1080.mp4 -i build/${L}_small.png -filter_complex "[0:v]$V,setpts=PTS/0.85,fps=25[v];[v][1:v]overlay=0:0" -t 3.1 $ENC $O/g.mp4
ffmpeg -v error -y -loop 1 -t 3.0 -i end_$L.png -vf "scale=1080:1920,setsar=1,fade=in:0:6" $ENC $O/h.mp4
printf "file '%s'\n" a.mp4 b.mp4 c1.mp4 c2.mp4 d.mp4 e.mp4 f.mp4 s3.mp4 s4.mp4 s5.mp4 g.mp4 h.mp4 > $O/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $O/list.txt -c copy $O/silent.mp4
# breathing sound from the moment he stops until the close-up ends
st=$(echo "2.5+2.0+2.0" | bc); dur=$(echo "0.6+4.0+4.2+2.2+2.9" | bc)
ffmpeg -v error -y -i $O/silent.mp4 -stream_loop -1 -i mk/breath2232.mp3 -filter_complex "[1:a]atrim=0:$dur,asetpts=PTS-STARTPTS,volume=1.6,afade=in:0:d=0.5,afade=out:st=$(echo "$dur-0.6"|bc):d=0.6,adelay=$(echo "$st*1000"|bc|cut -d. -f1):all=1,apad[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 128k -shortest -movflags +faststart build/lestnica-zhivoe-v2-$L.mp4
ffprobe -v error -show_entries format=duration,size -of csv=p=0 build/lestnica-zhivoe-v2-$L.mp4
