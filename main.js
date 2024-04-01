import { html, render } from 'https://unpkg.com/lit-html';
import 'https://unpkg.com/@ircam/sc-components@latest';

import resumeAudioContext from './lib/resume-audio-context.js';

let OFFLINE_TEST = true;

function fib(n) {
    let a = 0, b = 1, c, i;
    if (n == 0) {
      return a;
    }
    for (i = 2; i <= n; i++) {
      c = a + b;
      a = b;
      b = c;
    }
    return b;
}

console.time('fib2000');
fib(1000000);
console.timeEnd('fib2000');


const onlineAudioContext = new AudioContext();
await resumeAudioContext(onlineAudioContext);
render(html`ok`, document.body);

const offlineAudioContext = new OfflineAudioContext(1, 48000, 48000);

const audioContext = OFFLINE_TEST ? offlineAudioContext : onlineAudioContext;


// audio chain
const scriptProcessor = audioContext.createScriptProcessor(256, 1, 1);

const freq = 300;
const phaseIncr = 2 * Math.PI * freq / audioContext.sampleRate;
let phase = 0;

scriptProcessor.addEventListener('audioprocess', e => {
  console.log('audioprocess called');
  // do some heavy work
  fib(1000000);

  const input = e.inputBuffer.getChannelData(0);
  const output = e.outputBuffer.getChannelData(0);

  for (let i = 0; i < input.length; i++) {
    const v = Math.sin(phase);
    phase += phaseIncr;

    output[i] = input[i] * 0.5 + v * 0.5;
  }
});

scriptProcessor.connect(audioContext.destination);

const sine = audioContext.createOscillator();
sine.frequency.value = 200;
sine.connect(scriptProcessor);
sine.start();

if (OFFLINE_TEST) {
  console.time('> offline context rendering duration');
  const output = await audioContext.startRendering();
  console.timeEnd('> offline context rendering duration');

  console.log(output.getChannelData(0));

  // find first non zero index
  let found = -1;
  const data = output.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== 0) {
      found = i;
      break;
    }
  }

  console.log('> non zero sample found at', found);

  // playback
  const src = onlineAudioContext.createBufferSource();
  src.buffer = output;
  src.connect(onlineAudioContext.destination);
  src.start();
}


