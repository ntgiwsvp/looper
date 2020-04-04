"use strict";

document.addEventListener("DOMContentLoaded", initDocument);

function initDocument()
{
  document.getElementById("startButton").onclick = start;
  document.getElementById("setButton").onclick = setFrequency;
  document.getElementById("logButton").onclick = logFrequencyData;
}

const sampleRate = 48000;
const fftSize = 2048;
var oscillatorNode, analyserNode;

function start()
{
  document.getElementById("startButton").disabled = true;

  const audioContext = new AudioContext({sampleRate});
  oscillatorNode = new OscillatorNode(audioContext);
  oscillatorNode.start();
  analyserNode = new AnalyserNode(audioContext, {fftSize});
  oscillatorNode.connect(analyserNode);

  document.getElementById("setButton").disabled = false;
}

function setFrequency()
{
  const frequency = document.getElementById("frequencyInput").value
  oscillatorNode.frequency.value = frequency;
  console.log(frequency/sampleRate*fftSize);

  document.getElementById("logButton").disabled = false;
}

function logFrequencyData()
{
  const Y = new Uint8Array(fftSize/2);
  analyserNode.getByteFrequencyData(Y)
  console.log(Y);
}
