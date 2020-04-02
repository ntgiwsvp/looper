"use strict";

import Metronome from "./metronome.js";

var signalingChannel, ownId, clientId; // for Websocket 
var connection; // For RTC
var audioContext, clientOutputNode, gainNode, delayNode, channelMergerNode,
  sampleRate; // for Web Audio API

document.addEventListener("DOMContentLoaded", initDocument);

function initDocument()
{
  console.log("Adding event handlers to DOM.");
  document.getElementById("startServerButton").onclick = startServer;
}

async function startServer()
{
  var metronome, clickBuffer;

  sampleRate = document.getElementById("sampleRate").value * 1;
  document.getElementById("sampleRate").disabled = true;
  console.log("Sample rate: %.0f Hz.", sampleRate);

  document.getElementById("startServerButton").disabled = true;

  console.log("Creating audio context.");
  audioContext = new AudioContext({sampleRate});

  console.log("Creating gain node.");
  gainNode = new GainNode(audioContext, {gain: 0.9});

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
                 +-----0------> gainNode -----0-----+
                                 |    A             |
                                 V    |             |
                                delayNode        metronome

                                                  *created on demand
*/





  // Starting metronome at 120 bpm.
  clickBuffer = await loadAudioBuffer("snd/CYCdh_K1close_ClHat-07.wav");
  metronome = new Metronome(audioContext, channelMergerNode, 120,
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
  var mediaStream, clientInputNode, channelSplitterNode;

  console.log("Got remote media stream track.")

  console.log("Creating media stream.")
  mediaStream = new MediaStream([event.track]);

  console.log("Creating client input node.")
  clientInputNode = new MediaStreamAudioSourceNode(audioContext, {mediaStream});

  console.log("Creating channel splitter node.")
  channelSplitterNode = new ChannelSplitterNode(audioContext, {numberOfOutputs: 2});
  clientInputNode.connect(channelSplitterNode);
  channelSplitterNode.connect(gainNode, 0);
  channelSplitterNode.connect(channelMergerNode, 1, 1);
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
