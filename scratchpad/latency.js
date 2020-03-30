'use strict';

var audioContext;

document.addEventListener("DOMContentLoaded", initDocument);

// We start by associating the event handlers to the frontend.
function initDocument()
{
  console.log("Adding event handlers to DOM.")
  document.getElementById("startButton").onclick = start;
  document.getElementById("printButton").onclick = print;
}

var f, f_s, R, analyser0, analyser90, dataArray0, dataArray90;

async function start()
{
  var mediaStream, audioContext, track;
  var tmp, REF_0deg, REF_90deg, X, Y0, Y90, Y0F, Y90F, i;

  const test = true;

  audioContext = new AudioContext();

  f = [        3000,
        1/   2*3000,
        3/   4*3000,
        5/   8*3000,
        9/  16*3000,
       17/  32*3000,
       17/  64*3000,
       41/ 128*3000,
       97/ 256*3000,
      225/ 512*3000,
      833/1024*3000,
     1793/2048*3000,
     3841/4096*3000];

  R = [0.0768, 0.0768, 0.0768, 0.0768, 0.0768,
       0.0768, 0.0768, 0.0768, 0.0768, 0.0768,
       0.0768, 0.0768, 0.0768]; 
  
  f_s = audioContext.sampleRate;
  const alpha = 0.99999;
  const feedforward = [1 - alpha];
  const feedback = [1, -alpha];

  console.log("Corner freqency: %.2f Hz.", -f_s*Math.log(alpha)/(2*Math.PI));
  

  // Dusan Ponikvar's STM32F407 project, see
  // https://www.fmf.uni-lj.si/~ponikvar/STM32f407.htm, Chapter 23.
  // (He also as a PDF
  // https://www.fmf.uni-lj.si/~ponikvar/PDFji/Phase%20angle%20measurements.pdf
  // with similar content, not read this one yet.)

  tmp       = [];
  REF_0deg  = [];
  REF_90deg = [];
  Y0        = [];
  Y90       = [];
  Y0F       = [];
  Y90F      = [];
  analyser0 = [];
  analyser90 = [];

  mediaStream =  await navigator.mediaDevices.getUserMedia({audio: {
    echoCancellation: false,
    noiseSuppression: false,
    channelCount:     1}});
  console.log(mediaStream);
  track = mediaStream.getAudioTracks()[0];
  X = new MediaStreamAudioSourceNode(audioContext, {mediaStream});

  if (test) X = new DelayNode(audioContext, {delayTime: 5/f_s});
  
  for (i = 0; i < 13; i++)
  {
    tmp      [i] = new OscillatorNode(audioContext, {frequency: f[i]});           
    REF_0deg [i] = new GainNode      (audioContext, {gain:      R[i]});
    REF_90deg[i] = new DelayNode     (audioContext, {delayTime: 0.25/f[i]});
    Y0       [i] = new GainNode      (audioContext, {gain:      0});
    Y90      [i] = new GainNode      (audioContext, {gain:      0});
    Y0F      [i] = new IIRFilterNode (audioContext, {feedforward, feedback});
    Y90F     [i] = new IIRFilterNode (audioContext, {feedforward, feedback});

    REF_0deg [i].connect(audioContext.destination);
    tmp      [i].connect(REF_0deg [i]);
    REF_0deg [i].connect(REF_90deg[i]);
    REF_0deg [i].connect(Y0       [i].gain);
    REF_90deg[i].connect(Y90      [i].gain);
    X           .connect(Y0       [i]);
    X           .connect(Y90      [i]);
    Y0       [i].connect(Y0F      [i]);
    Y90      [i].connect(Y90F     [i]);

    tmp[i].start();

    // Abuse analyser to get samples, as in the MDN oscilloscope examples.
    analyser0 [i] = new AnalyserNode(audioContext, {fftSize: 32});
    analyser90[i] = new AnalyserNode(audioContext, {fftSize: 32});
    Y0F       [i].connect(analyser0[i]);
    Y90F      [i].connect(analyser90[i]);
  }
  
  if (test) for (i = 0; i < 13; i++) REF_0deg[i].connect(X);
  
  dataArray0  = new Float32Array(1);
  dataArray90 = new Float32Array(1);
}

function print()
{
  var A, phi, i;

  console.log("---");

  for (i = 0; i < 13; i++)
  {
    analyser0[i].getFloatTimeDomainData(dataArray0);
    analyser90[i].getFloatTimeDomainData(dataArray90);

    A = 2/R[i]*Math.sqrt(dataArray0[0]**2 + dataArray90[0]**2);
    phi = Math.atan2(dataArray90[0], dataArray0[0]);
    
    console.log("%.0f Hz: channel gain: %.3f, latency = %.1f samples (of %.1f)",
      f[i], A/R[i], phi/(2*Math.PI)*f_s/f[i], f_s/f[i]);
  }
}

