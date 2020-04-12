"use strict";

import Metronome from "./metronome.js";
import Correlator from "./correlator.js";
import "https://webrtc.github.io/adapter/adapter-latest.js"

var audioContext, sampleRate; // for Web Audio API

document.addEventListener("DOMContentLoaded", initDocument);

// We start by associating the event handlers to the frontend.
function initDocument()
{
  console.log("Adding event handlers to DOM.")
  document.getElementById("startButton").onclick = start;
}

const test = false;
var clickBufferDuration;

async function start()
{
  var metronome, clickBuffer;
  var inputNode, mediaStream;

  sampleRate = document.getElementById("sampleRate").value * 1;
  document.getElementById("sampleRate").disabled = true;
  console.log("Sample rate: %.0f Hz.", sampleRate);

  document.getElementById("startButton").disabled = true;

  console.log("Creating audio context.");
  audioContext = new AudioContext({sampleRate});

  // metronome and input node
  clickBuffer = await loadAudioBuffer("snd/CYCdh_K1close_ClHat-07.wav");
  clickBufferDuration = clickBuffer.duration;
  console.log("click buffer duration: %.1f ms.", 1000*clickBufferDuration);

  if (test)
  {
    console.log("Working in simulation mode.")
    inputNode = new DelayNode(audioContext, {delayTime: 12345/sampleRate});
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

  console.log("Creating correlator")
  new Correlator(audioContext, inputNode, clickBuffer, updateOutput);

  console.log("running...")
}

function updateOutput(latency)
{
  console.log("Latency: %.2f ms = %.0f samples",
    1000*latency, Math.round(latency*sampleRate));

  document.getElementById("outputSpan").innerHTML =
    Math.round(1000*latency) + " ms"
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
