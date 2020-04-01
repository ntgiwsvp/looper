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
    inputNode = new DelayNode(audioContext, {delayTime: 0.000});
    inputNode.connect(audioContext.destination); // for monitoring

    metronome = new Metronome(audioContext, inputNode,
      60*sampleRate/16384, clickBuffer);
  }
  else
  {
    console.log("Working actual mode.")
    mediaStream =  await navigator.mediaDevices.getUserMedia({audio: {
      echoCancellation: false,
      noiseSuppression: false,
      channelCount:     1}});

    inputNode = new MediaStreamAudioSourceNode(audioContext, {mediaStream});

    metronome = new Metronome(audioContext, audioContext.destination,
      60*sampleRate/16384, clickBuffer);
  }

  metronome.start(-1);

  // convolver node
  reverseBuffer = revertBuffer(clickBuffer);
  convolverNode = new ConvolverNode(audioContext, {buffer: reverseBuffer});
  inputNode.connect(convolverNode);

  // script processor node
  scriptProcessor = audioContext.createScriptProcessor(16384, 1, 0);
  scriptProcessor.onaudioprocess = processAudio;
  convolverNode.connect(scriptProcessor);
  // BUG: onaudioprocess will not be fired in Chrome.  See
  // https://stackoverflow.com/q/27324608
  // Fix would be to connect a 0 buffer to the destination node.  However this 
  // Would increase latency, at least with current strategy to have a huge
  // buffer.  Maybe solution is to reduce buffer size and have another
  // round of maxing via static/global variables or similar.
  console.log("running...")
}

function processAudio(event)
{
  var array, i, argmax, max, latency;
  var relativeArgmax, relativePlaybackTime, relativeClickBufferDuration, phase;

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

  relativeArgmax = frac(argmax/16384);
  relativePlaybackTime = frac(event.playbackTime*sampleRate/16384);
  relativeClickBufferDuration = frac(clickBufferDuration*sampleRate/16384);
  phase = frac(relativeArgmax + relativePlaybackTime - relativeClickBufferDuration);

  if (phase > 0.9) phase -= 1; // underflow should not happen, but I have seen it! :-)

  console.log("arg max = %.3f,  playback time = %.3f, click buffer duration = %.3f, phase =  %.3f.",
    relativeArgmax, relativePlaybackTime, relativeClickBufferDuration, phase);

  latency = phase*16384/sampleRate;

  document.getElementById("outputSpan").innerHTML =
    Math.round(1000*latency) + " ms"

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
