"use strict";

import Metronome from "./metronome.js";

var signalingChannel, ownId, clientId; // for Websocket 
var connection; // For RTC
var audioContext, clientOutputNode, gainNode, delayNode, channelMergerNode,
  sampleRate, loopGain; // for Web Audio API

document.addEventListener("DOMContentLoaded", initDocument);

function initDocument()
{
  console.log("Adding event handlers to DOM.");
  document.getElementById("startServerButton").onclick = startServer;
}

async function startServer()
{
  var metronome, clickBuffer, loopLength, loopBeats, tempo;

  sampleRate = document.getElementById("sampleRate").value * 1;
  document.getElementById("sampleRate").disabled = true;
  console.log("Sample rate: %.0f Hz.", sampleRate);

  tempo      = document.getElementById("tempo").value * 1;
  loopBeats  = document.getElementById("loopBeats").value * 1;
  loopLength = 60/tempo*loopBeats; // Theoretical loop lengh, but
  loopLength = Math.round(loopLength*sampleRate/128)*128/sampleRate;
  tempo      = 60/loopLength*loopBeats;
  // according to the Web Audio API specification, "If DelayNode is part of a
  // cycle, then the value of the delayTime attribute is clamped to a minimum
  // of one render quantum."  We do this explicitly here so we can sync the
  // metronome.
  document.getElementById("loopBeats").disabled = true;
  document.getElementById("tempo").disabled = true;
  console.log("Loop lengh is %.5f s, tempos is %.1f bpm.", loopLength, tempo);

  loopGain = document.getElementById("loopGain").value;
  document.getElementById("loopGain").disabled = true;

  document.getElementById("startServerButton").disabled = true;

  console.log("Creating audio context.");
  audioContext = new AudioContext({sampleRate});

  console.log("Creating gain node.");
  gainNode = new GainNode(audioContext, {gain: loopGain});

  console.log("Creating delay node.");
  delayNode = new DelayNode(audioContext, {
    delayTime:    loopLength,
    maxDelayTime: loopLength});
  gainNode.connect(delayNode);
  delayNode.connect(gainNode);

  console.log("Creating channel merger node.");
  channelMergerNode = new ChannelMergerNode(audioContext, {numberOfInputs: 2});
  gainNode.connect(channelMergerNode, 0, 0);

  console.log("Creating client output node.");
  clientOutputNode = new MediaStreamAudioDestinationNode(audioContext);
  channelMergerNode.connect(clientOutputNode);

/*
CLIENT           |                                  A
-----------------+----------------------------------+-------------------------
SERVER           V                                  |
          clientInputNode(s)*                clientOutputNode(s)*
                 |                                  A
                 V                                  |
        channelSplitterNode(s)* -----1-----> channelMergerNode(s)*
                 |                                  |
                 V                                  |
           clientGainNode(s)*                       |
                 |                                  |
                 +-----0------> gainNode -----0-----+
                                 |    A             |
                                 V    |             |
                                delayNode        metronome

                                                  *created on demand
*/

  clickBuffer = await loadAudioBuffer("snd/CYCdh_K1close_ClHat-07.wav");
  console.log("Starting metronome.")
  metronome = new Metronome(audioContext, channelMergerNode, tempo,
    clickBuffer, 0);
  metronome.start();

  console.log("Creating connection to signaling server.");
  signalingChannel = new WebSocket(signalingServerUrl)
  signalingChannel.onmessage         = receiveMessage;

  console.log("Waiting for offers.")
}

function reportConnectionState(event)
{
  console.log("Connection state: %s.", connection.connectionState)
}

function receiveMessage(message)
{
  var data;

  data = JSON.parse(message.data);

  if (data.id)           receiveIdMessage(data);
  if (data.offer)        receiveOfferMessage(data);
  if (data.iceCandidate) receiveIceCandidateMessage(data);
}

function receiveIdMessage(data)
{
  ownId = data.id;
  console.log("Received own ID: %d.", ownId);
  document.getElementById("sessionId").innerHTML = ownId;
}

async function receiveOfferMessage(data)
{
  var description;

  clientId = data.from;
  
  console.log("Received offer from %s.", clientId)
  console.log(data.offer);

  console.log("Creating RTC connection");
  connection  = new RTCPeerConnection({iceServers: [{urls: stunServerUrl}]});
  connection.onicecandidate          = sendIceCandidate;
  connection.ontrack                 = gotRemoteTrack
  connection.onconnectionstatechange = reportConnectionState;
  
  console.log("Sending output to client.");
  connection.addTrack(clientOutputNode.stream.getAudioTracks()[0]);

  console.log("Setting remote description.");
  await connection.setRemoteDescription(data.offer);
  console.log("Remote description set.");

  console.log("Creating answer.");
  description = await connection.createAnswer();

  console.log("Setting local description.")
  await connection.setLocalDescription(description);
  console.log("Local description set.");

  console.log("Sending answer.")
  signal({answer: description});
}

async function receiveIceCandidateMessage(data)
{
  console.log("Received ICE candidate.");
  console.log(data.iceCandidate);

  console.log("Adding ICE candidate to connection.");
  await connection.addIceCandidate(data.iceCandidate);
  console.log("ICE candidate added to connection.");
}

function sendIceCandidate(event)
{
  if (event.candidate)
  {
    console.log("Sending ICE candidate to signaling server");
    console.log(event.candidate);
    signal({iceCandidate: event.candidate});
  }
}

function gotRemoteTrack(event)
{
  var mediaStream, clientInputNode, channelSplitterNode, clientGainNode;

  console.log("Got remote media stream track.")

  console.log("Creating media stream.")
  mediaStream = new MediaStream([event.track]);

  console.log("Creating client input node.")
  clientInputNode = new MediaStreamAudioSourceNode(audioContext, {mediaStream});

  console.log("Creating channel splitter node.")
  channelSplitterNode = new ChannelSplitterNode(audioContext, {numberOfOutputs: 2});
  clientInputNode.connect(channelSplitterNode);
  channelSplitterNode.connect(channelMergerNode, 1, 1);

  console.log("Creating client gain node.")
  clientGainNode = new GainNode(audioContext, {gain: 0});
  clientGainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.5);
  clientGainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 1);
  channelSplitterNode.connect(clientGainNode, 0);
  clientGainNode.connect(gainNode);
  // This is to get rid of the initial "click" when new clients connect.
  // New clients will be silenced for 0.5 seconds, then brought to full volume
  // for another 0.5 seconds.
}

function signal(message)
{
  message.to = clientId;
  message.from = ownId;
  signalingChannel.send(JSON.stringify(message));
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
