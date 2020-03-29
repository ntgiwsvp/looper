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

var f, R, analyser0, analyser90, dataArray0, dataArray90;

function start()
{
  var audioContext, tmp, REF_0deg, REF_90deg, X, Y0, Y90, Y0F, Y90F;

  const f_s = 100000;
  const alpha = 0.99999;
  console.log("Corner freqency: %.2f Hz.", -f_s*Math.log(alpha)/(2*Math.PI));
  
  const feedforward = [1 - alpha];
  const feedback = [1, -alpha];

  f = 1000; // frequency of reference signal
  R = 0.7;    // amplitude of reference signal

  audioContext = new AudioContext({sampleRate: f_s});
  // Dusan Ponikvar's STM32F407 project, see
  // https://www.fmf.uni-lj.si/~ponikvar/STM32f407.htm, Chapter 23.
  // (He also as a PDF
  // https://www.fmf.uni-lj.si/~ponikvar/PDFji/Phase%20angle%20measurements.pdf
  // with similar content, not read this one yet.)

  tmp       = new OscillatorNode(audioContext, {frequency: f});           
  REF_0deg  = new GainNode      (audioContext, {gain:      R});
  REF_90deg = new DelayNode     (audioContext, {delayTime: 0.25/f});
  X         = new DelayNode     (audioContext, {delayTime: 0.123/f});
  Y0        = new GainNode      (audioContext, {gain:      0});
  Y90       = new GainNode      (audioContext, {gain:      0});
  Y0F       = new IIRFilterNode (audioContext, {feedforward, feedback});
  Y90F      = new IIRFilterNode (audioContext, {feedforward, feedback});

  tmp      .connect(REF_0deg);
  REF_0deg .connect(REF_90deg);
  REF_0deg .connect(X);
  REF_0deg .connect(Y0.gain);
  REF_90deg.connect(Y90.gain);
  X        .connect(Y0);
  X        .connect(Y90);
  Y0       .connect(Y0F);
  Y90      .connect(Y90F);

  tmp.start();

  // Abuse analyser to get samples, as in the MDN oscilloscope examples.
  analyser0  = new AnalyserNode(audioContext, {fftSize: 32});
  analyser90 = new AnalyserNode(audioContext, {fftSize: 32});
  Y0F.connect(analyser0);
  Y90F.connect(analyser90);
  dataArray0 = new Float32Array(1);
  dataArray90 = new Float32Array(1);
}

function print()
{
  var A, phi;

  analyser0.getFloatTimeDomainData(dataArray0);
  analyser90.getFloatTimeDomainData(dataArray90);

  A = 2/R*Math.sqrt(dataArray0[0]**2 + dataArray90[0]**2);
  phi = Math.atan2(dataArray90[0], dataArray0[0]);
  
  console.log("channel gain: %.3f, phi/(2 pi) = %.3f.", A/R, phi/(2*Math.PI));
}
