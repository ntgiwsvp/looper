'use strict';

import Metronome from "./metronome.js";
import Correlator from "./correlator.js";

var signalingChannel, ownId, sessionId; // for Websocket
var connection; // for RTC
var audioContext; // for Web Audio API
var clickBuffer; // click for latency detection
var delayNode, userLatency; // needs to be global to access from processAudio
var sampleRate;
var loopLength;

document.addEventListener("DOMContentLoaded", initDocument);

// We start by associating the event handlers to the frontend.
function initDocument()
{
  console.log("Adding event handlers to DOM.")
  document.getElementById("startButton").onclick = startStream;
}

/*                                               * created in gotRemoteTrack

USER                        |                  A
----------------------------+------------------+------------------------------
CLIENT                      V                  |
                     userInputNode       destination      scriptProcessor*
                            |                  A                 A
                            V                  |                 |
                       delay Node              |            convolverNode*
                            |                  | 0               A
            1               V 0                |                 |
metronome -----> channelMergerNode     channelSplitterNode* -----+
                            |                  A              1
                            V                  |
                    serverOutputNode    serverInputNode*
CLIENT                      |                  A
----------------------------+------------------+------------------------------
SERVER                      V                  |
*/
async function startStream()
{
  var userInputStream, description, userInputNode, serverOutputNode,
    channelMergerNode, metronome, tempo, loopBeats;

  sessionId = document.getElementById("sessionId").value;
  document.getElementById("sessionId").disabled = true;
  console.log("Joining session %s.", sessionId);

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

  userLatency = document.getElementById("latency").value / 1000;
  document.getElementById("latency").disabled = true
  console.log("User latency is %.2f ms.", 1000*userLatency);

  document.getElementById("startButton").disabled = true;
  
  console.log("Creating audio context.");
  audioContext = new AudioContext({sampleRate});
  console.log("Audio context sample rate: %f", audioContext.sampleRate);
  
  console.log("Creating connection to signaling server.");
  signalingChannel = new WebSocket(signalingServerUrl);
  signalingChannel.onmessage         = receiveMessage;
  // XXX Dirty trick that needs to be corrected:  Time to setup WebSocket
  //     is hidden while user is approving media acces.  Should use
  //     WebSocket.onopen to make sure not to send messages too early.

  console.log("Creating RTC connection.")
  connection = new RTCPeerConnection({iceServers: [{urls: stunServerUrl}]});
  connection.onicecandidate          = sendIceCandidate;
  connection.ontrack                 = gotRemoteTrack;
  connection.onconnectionstatechange = reportConnectionState;

  console.log("Getting user media.");
  userInputStream = await navigator.mediaDevices.getUserMedia({audio: {
    echoCancellation: false,
    noiseSuppression: false,
    channelCount:     1}});

  console.log("Creating user input node.");
  userInputNode = new MediaStreamAudioSourceNode(audioContext, {mediaStream: userInputStream});

  console.log("Creating delay node");
  delayNode = new DelayNode(audioContext, {maxDelayTime: loopLength})
  userInputNode.connect(delayNode);
    
  console.log("Creating channel merger node.");
  channelMergerNode = new ChannelMergerNode(audioContext, {numberOfInputs: 2});
  delayNode.connect(channelMergerNode, 0, 0);

  console.log("Creating metronome.")
  clickBuffer = await loadAudioBuffer("snd/CYCdh_K1close_ClHat-07.wav");
  metronome = new Metronome(audioContext, channelMergerNode, 60, clickBuffer, 1);
  metronome.start(-1);

  console.log("Creating server output node.")
  serverOutputNode = new MediaStreamAudioDestinationNode(audioContext);
  channelMergerNode.connect(serverOutputNode);

  console.log("Adding track to connection.");
  connection.addTrack(serverOutputNode.stream.getAudioTracks()[0]);

  console.log("Creating offer.")
  description = await connection.createOffer({voiceActivityDetection: false});
  console.log("Created offer.");

  console.log("Setting local description.");
  await connection.setLocalDescription(description);
  console.log("Local description set.");

  console.log("Sending offer.");
  signal({offer: description});
}

function receiveMessage(message)
{
  var data;

  data = JSON.parse(message.data);

  if (data.id)           receiveIdMessage(data);
  if (data.answer)       receiveAnswerMessage(data);
  if (data.iceCandidate) receiveIceCandidateMessage(data);
}

function receiveIdMessage(data)
{
  ownId = data.id;
  console.log("Received own ID: %d.", ownId);
}

async function receiveAnswerMessage(data)
{
  console.log("Received answer.")
  console.log(data.answer);

  console.log("Setting remote description.")
  await connection.setRemoteDescription(data.answer);
  console.log("Remote description set.");
}

async function receiveIceCandidateMessage(data)
{
  console.log("Received ICE candidate.");
  console.log(data.iceCandidate);

  console.log("Adding ICE candidate to connection.");
  await connection.addIceCandidate(data.iceCandidate);
  console.log("ICE candidate added to connection.");
}

function reportConnectionState(event)
{
  console.log("Connection state: %s.", connection.connectionState)
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
  var mediaStream, serverInputNode, channelSplitterNode;

  console.log("Got remote media stream track.")

  console.log("Creating media stream.")
  mediaStream = new MediaStream([event.track]);

  console.log("Creating server input node.")
  serverInputNode = new MediaStreamAudioSourceNode(audioContext, {mediaStream});

  console.log("Creating channel splitter node.")
  channelSplitterNode = new ChannelSplitterNode(audioContext, {numberOfOutputs: 2});
  serverInputNode.connect(channelSplitterNode);
  channelSplitterNode.connect(audioContext.destination, 0);

  console.log("Creating correlator")
  new Correlator(audioContext, channelSplitterNode, clickBuffer,
    updateDelayNode, 1);
}

function updateDelayNode(networkLatency)
{
  const totalLatency = userLatency + networkLatency;

  console.log("Latency: %.2f ms (user) + %.2f ms (network) = %.2f ms.",
    1000*userLatency,
    1000*networkLatency,
    1000*totalLatency);

  delayNode.delayTime.value = loopLength - totalLatency;
}

function signal(message)
{
  message.to = sessionId;
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
