"use strict";

document.addEventListener("DOMContentLoaded", initDocument);

function initDocument()
{
  document.getElementById("startButton").onclick = start;
  document.getElementById("setButton").onclick = setFrequency;
  document.getElementById("logButton").onclick = logFrequencyData;
}

const sampleRate            = 48000;
const fftSize               = 32768;
const smoothingTimeConstant = 0;

// From RFC 7587
const narrowBand    = Math.round( 4000/sampleRate*fftSize);
const mediumBand    = Math.round( 6000/sampleRate*fftSize);
const wideBand      = Math.round( 8000/sampleRate*fftSize);
const superWideBand = Math.round(12000/sampleRate*fftSize);
const fullBand      = Math.round(20000/sampleRate*fftSize);

var oscillatorNode, analyserNode;

async function start()
{
  document.getElementById("startButton").disabled = true;

  const audioContext = new AudioContext({sampleRate});

  oscillatorNode = new OscillatorNode(audioContext);
  oscillatorNode.start()

  const mediaStream = await navigator.mediaDevices.getUserMedia({audio: true});
  const userInputNode = new MediaStreamAudioSourceNode(audioContext, {mediaStream});

  analyserNode = new AnalyserNode(audioContext, {fftSize, smoothingTimeConstant});
  oscillatorNode.connect(analyserNode);
  userInputNode.connect(analyserNode);

  document.getElementById("setButton").disabled = false;
  document.getElementById("logButton").disabled = false;
}

function setFrequency()
{
  const frequency = document.getElementById("frequencyInput").value
  oscillatorNode.frequency.value = frequency;
  console.log(frequency/sampleRate*fftSize);

}

function logFrequencyData()
{
  const Y = new Uint8Array(fftSize/2);
  analyserNode.getByteFrequencyData(Y)

  const narrowBandMax    = arraySliceMax(Y, 0            , narrowBand   );
  const mediumBandMax    = arraySliceMax(Y, narrowBand   , mediumBand   );
  const wideBandMax      = arraySliceMax(Y, mediumBand   , wideBand     );
  const superWideBandMax = arraySliceMax(Y, wideBand     , superWideBand);
  const fullBandMax      = arraySliceMax(Y, superWideBand, fullBand     );

  console.log("%d %d %d %d %d", narrowBandMax, mediumBandMax, wideBandMax,
    superWideBandMax, fullBandMax);
}

function arraySliceMax(array, start, end)
{
  return array.slice(start, end).reduce((a, b) => Math.max(a, b));
}
