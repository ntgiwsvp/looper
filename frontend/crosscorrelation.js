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

const test = true;
var clickBufferDuration;

async function start()
{
  var metronome, convolverNode, clickBuffer, reverseBuffer, scriptProcessor;
  var inputNode, mediaStream;

  audioContext = new AudioContext({sampleRate});
  console.log("Audio context sample rate: %.0f Hz.", audioContext.sampleRate);

  // metronome and input node
  clickBuffer = await loadAudioBuffer("snd/CYCdh_K1close_ClHat-07.wav");
  clickBufferDuration = clickBuffer.duration;
  console.log("click buffer duration: %.1f ms.", 1000*clickBufferDuration);

  if (test)
  {
    console.log("Working in simulation mode.")
    inputNode = new DelayNode(audioContext, {delayTime: 0/sampleRate});
    inputNode.connect(audioContext.destination); // for monitoring

    metronome = new Metronome(audioContext, inputNode, 60, clickBuffer);
  }
  else
  {
    console.log("Working actual mode.")

    mediaStream =  await navigator.mediaDevices.getUserMedia({audio: {
      echoCancellation: false,
      noiseSuppression: false,
      channelCount:     1}});
    inputNode = new MediaStreamAudioSourceNode(audioContext, {mediaStream});

    metronome = new Metronome(audioContext, audioContext.destination, 60,
      clickBuffer);
  }

  metronome.start(-1);

  // convolver node
  reverseBuffer = revertBuffer(clickBuffer);
  convolverNode = new ConvolverNode(audioContext, {buffer: reverseBuffer});
  inputNode.connect(convolverNode);

  // script processor node
  scriptProcessor = audioContext.createScriptProcessor(16384, 1, 1);
  scriptProcessor.onaudioprocess = processAudio;
  convolverNode.connect(scriptProcessor);
  scriptProcessor.connect(audioContext.destination);
  // Need to connect script processor to destination, otherwise
  // onaudioprocess would not be fired in Chrome.  See
  // https://stackoverflow.com/q/27324608

  console.log("running...")
}

var max, argmax, initialPlaybackTime;

function processAudio(event)
{
  var array, i, latency, bufferSize, bufferDuration;
  var startSecond, endSecond, boundarySample, currentPlaybackTime;
  var playbackTimeAdjustment;

  array          = event.inputBuffer.getChannelData(0);
  bufferSize     = event.inputBuffer.length;
  bufferDuration = event.inputBuffer.duration;
  startSecond    = Math.floor(event.playbackTime);
  endSecond      = Math.floor(event.playbackTime + bufferDuration);

  if (!max) {max = argmax = -1};

  // Dirty trick
  currentPlaybackTime = Math.round(event.playbackTime*sampleRate) % 16384;
  if (!initialPlaybackTime) initialPlaybackTime = currentPlaybackTime;
  playbackTimeAdjustment = (currentPlaybackTime - initialPlaybackTime) % 16384;

  if (startSecond == endSecond) // Buffer contained within one second
  {
    for (i = 0; i < bufferSize; i++) if (array[i] > max)
    {
      argmax = frac(event.playbackTime + i/sampleRate);
      max    = array[i];
    }
  }
  else // Buffer spans two seconds
  {
    // Process part of buffer in start second
    boundarySample = Math.round((endSecond - event.playbackTime)*sampleRate);

    for (i = 0; i < boundarySample; i++) if (array[i] > max)
    {
      argmax = frac(event.playbackTime + i/sampleRate);
      max = array[i];
    }

    // Perform calculation
    latency = frac(argmax - clickBufferDuration - bufferDuration - playbackTimeAdjustment/sampleRate);
    if (latency > 0.95) latency -= 1; // underflow should not happen, but I have seen it! :-)

    console.log("Latency: %.2f ms = %.0f samples",
      1000*latency, Math.round(latency*sampleRate));

    const startSample = Math.round(event.playbackTime*sampleRate);
    console.log("Playback time is %d * 16384 + %d * 128 + %d samples",
      Math.floor(startSample/16384),
      Math.floor((startSample % 16384)/128),
      startSample % 128);

    console.log("Playback time adjustment is %d * 128 + %d samples",
      Math.floor(playbackTimeAdjustment/128),
      playbackTimeAdjustment % 128);

    document.getElementById("outputSpan").innerHTML =
      Math.round(1000*latency) + " ms"

    // Process part of buffer in end second
    max = argmax = -1;
    for (i = boundarySample; i < bufferSize; i++) if (array[i] > max)
    {
      argmax = frac(event.playbackTime + i/sampleRate);
      max = array[i];
    }

  }
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

function frac(x)
{
  return x - Math.floor(x);
}
