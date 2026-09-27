import { execFileSync } from 'child_process';
import ffmpeg from 'ffmpeg-static';
import path from 'path';
const input = path.resolve('./public/localhost-recorded-walkthrough.webm');
const output = path.resolve('./public/localhost-recorded-walkthrough.mp4');
console.log(`Converting ${input} to MP4 (${output})...`);
const args = [
  '-y',
  '-i', input,
  '-c:v', 'libx264',
  '-preset', 'fast',
  '-crf', '22',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  output
];
execFileSync(ffmpeg, args, { stdio: 'inherit' });
console.log('Successfully generated mobile-compatible MP4!');
