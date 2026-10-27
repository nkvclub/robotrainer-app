#!/bin/bash
set -e
cd /tmp/claude-0/-home-user/7ee84d24-b793-5835-98bb-2b2195a428be/scratchpad
L=$1; O=build/$L; mkdir -p $O
ENC="-c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -r 25 -an"
V="scale=1080:2048,crop=1080:1920:0:64,setsar=1,fps=25"
# 1-2: everyone climbs easily
ffmpeg -v error -y -ss 1.5 -t 3.0 -i hd/7877145_1080.mp4 -vf "$V,fade=in:0:8" $ENC $O/a.mp4
ffmpeg -v error -y -ss 2.6 -t 2.4 -i hd/7877150_1080.mp4 -vf "$V" $ENC $O/b.mp4
# 3: he stops, can't catch breath (normal, then slowed); hook text
ffmpeg -v error -y -ss 4.0 -t 2.6 -i hd/7876928_1080.mp4 -vf "$V" $ENC $O/c1.mp4
ffmpeg -v error -y -ss 6.6 -t 3.2 -i hd/7876928_1080.mp4 -loop 1 -t 5.3 -i build/${L}_hook.png -filter_complex "[0:v]$V,setpts=PTS/0.6,fps=25[v];[1:v]format=rgba,fade=in:st=0:d=0.4:alpha=1[t];[v][t]overlay=0:0:shortest=1" -t 5.3 $ENC $O/c2.mp4
# 4-6: app screens with slow zoom
i=0; for n in 3 4 5; do
ffmpeg -v error -y -i build/${L}_s$n.png -vf "scale=1188:2112,zoompan=z='1+0.03*on/60':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=60:s=1080x1920:fps=25,fade=in:0:5" $ENC $O/s$n.mp4; done
# 7: he climbs easily + small note
ffmpeg -v error -y -ss 2.3 -t 2.7 -i hd/7877141_1080.mp4 -i build/${L}_small.png -filter_complex "[0:v]$V,setpts=PTS/0.85,fps=25[v];[v][1:v]overlay=0:0" -t 3.1 $ENC $O/g.mp4
# 8: end card
ffmpeg -v error -y -loop 1 -t 3.0 -i end_$L.png -vf "scale=1080:1920,setsar=1,fade=in:0:6" $ENC $O/h.mp4
printf "file '%s'\n" a.mp4 b.mp4 c1.mp4 c2.mp4 s3.mp4 s4.mp4 s5.mp4 g.mp4 h.mp4 > $O/list.txt
ffmpeg -v error -y -f concat -safe 0 -i $O/list.txt -c copy -movflags +faststart build/lestnica-zhivoe-$L.mp4
ffprobe -v error -show_entries format=duration,size -of csv=p=0 build/lestnica-zhivoe-$L.mp4
