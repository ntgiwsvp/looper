"use strict";

import Metronome from "./metronome.js";

var audioContext; // for Web Audio API

document.addEventListener("DOMContentLoaded", initDocument);

// We start by associating the event handlers to the frontend.
function initDocument()
{
  console.log("Adding event handlers to DOM.")
  document.getElementById("startButton").onclick = start;
}

async function start()
{
  var metronome, convolverNode, clickBuffer, reverseBuffer, scriptProcessor;
  var inputNode, mediaStream;

  audioContext = new AudioContext({sampleRate});
  console.log("Audio context sample rate: %.0f Hz.", audioContext.sampleRate);

  // Input
  mediaStream =  await navigator.mediaDevices.getUserMedia({audio: {
    echoCancellation: false,
    noiseSuppression: false,
    channelCount:     1}});
  inputNode = new MediaStreamAudioSourceNode(audioContext, {mediaStream});

  clickBuffer = await loadAudioBuffer("snd/CYCdh_K1close_ClHat-07.wav");
  reverseBuffer = revertBuffer(clickBuffer);
  convolverNode = new ConvolverNode(audioContext, {buffer: reverseBuffer});

  metronome = new Metronome(audioContext, audioContext.destination,
    60*sampleRate/16384, clickBuffer);
  metronome.start();

  scriptProcessor = audioContext.createScriptProcessor(16384, 1, 0);
  scriptProcessor.onaudioprocess = processAudio;

  inputNode.connect(convolverNode);
  convolverNode.connect(scriptProcessor);

  console.log("running...")
}

function processAudio(event)
{
  var array, i, argmax, max, latency;

  array = event.inputBuffer.getChannelData(0);

  argmax = 0;
  max = array[0];

  for (i = 1; i < 16384; i++)
  {
    if (array[i] > max)
    {
      argmax = i;
      max = array[i];
    }
  }

  latency = argmax/sampleRate;

  document.getElementById("outputSpan").innerHTML = Math.round(1000*latency) + " ms"
}

function revertBuffer(buffer)
{
  var i, array, reverseBuffer;

  reverseBuffer = audioContext.createBuffer(buffer.numberOfChannels,
      buffer.length, buffer.sampleRate);

  array = new Float32Array(buffer.length);
  
  for (i = 0; i < buffer.numberOfChannels; i++)
  {
    buffer.copyFromChannel(array, i, 0);
    array.reverse();
    reverseBuffer.copyToChannel(array, i, 0);
  }

  return reverseBuffer;
}

async function loadAudioBuffer(url)
{
  var response, audioData, buffer;

  console.log("Loading audio data from %s.", url);
  response = await fetch(url);
  audioData = await response.arrayBuffer();
  buffer = await audioContext.decodeAudioData(audioData);
  console.log("Loaded audio data from %s.", url);  
  return buffer;
}
