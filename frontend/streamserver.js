"use strict";

import Metronome from "./metronome.js";

var signalingChannel, ownId, clientId; // for Websocket 
var connection; // For RTC
var audioContext, outputNode, gainNode, delayNode; // for Web Audio API

document.addEventListener("DOMContentLoaded", initDocument);

function initDocument()
{
  console.log("Adding event handlers to DOM.");
  document.getElementById("startServerButton").onclick = startServer;
}

async function startServer()
{
  var metronome, clickBuffer;

  console.log("Creating audio contect.");
  audioContext = new AudioContext({sampleRate});
  console.log("Audio context sample rate: %.0f Hz.", audioContext.sampleRate);

  console.log("Creating audio nodes.")
  outputNode = new MediaStreamAudioDestinationNode(audioContext);
  gainNode   = new GainNode(audioContext, {gain: 0.9});
  delayNode  = new DelayNode(audioContext, {delayTime:    loopLength,
                                            maxDelayTime: loopLength});

  console.log("Connecting audio nodes.")
  delayNode.connect(gainNode);
  gainNode .connect(delayNode);
  gainNode .connect(outputNode);
  //                   delayNode
  //                    |    A
  //                    V    |
  //     inputNodes -> gainNode -> outputNode
  //
  // (inputNodes are created when remote tracks are received.)

  // Starting metronome at 120 bpm.
  clickBuffer = await loadAudioBuffer("snd/CYCdh_K1close_ClHat-07.wav");
  metronome = new Metronome(audioContext, outputNode, 120, clickBuffer);
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
  connection.addTrack(outputNode.stream.getAudioTracks()[0]);

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
