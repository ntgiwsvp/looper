'use strict';

var signalingChannel, ownId, sessionId; // for Websocket
var connection; // for RTC
var audioContext; // for Web Audio API

document.addEventListener("DOMContentLoaded", initDocument);

// We start by associating the event handlers to the frontend.
function initDocument()
{
  console.log("Adding event handlers to DOM.")
  document.getElementById("startButton").onclick = startStream;
}

async function startStream()
{
  var stream, tracks, description;

  sessionId = document.getElementById("sessionId").value;
  console.log("Joining session %s.", sessionId);

  console.log("Creating audio contect.");
  audioContext = new AudioContext({sampleRate});
  console.log("Audio context sample rate: %.0f Hz.", audioContext.sampleRate);

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
  stream = await navigator.mediaDevices.getUserMedia({audio: {
    echoCancellation: false,
    noiseSuppression: false,
    channelCount:     1}});

  console.log("Adding track to connection.");
  tracks = stream.getAudioTracks();
  connection.addTrack(tracks[0]);

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
  var mediaStream, inputNode, delayNode;

  console.log("Got remote media stream track.")

  console.log("Creating media stream.")
  mediaStream = new MediaStream([event.track]);

  console.log("Creating audio nodes.")
  inputNode  = new MediaStreamAudioSourceNode(audioContext, {mediaStream});
  latency    = document.getElementById("latency").value / 1000;
  delayNode  = new DelayNode(audioContext, {
    delayTime:    loopLength - latency,
    maxDelayTime: loopLength          })
  console.log("Latency is %.0f ms, delaying output by %.0f ms.",
    1000*latency,
    1000*(loopLength - latency));

  console.log("Connecting audio nodes.")
  inputNode.connect(delayNode);
  delayNode.connect(audioContext.destination);
}

function signal(message)
{
  message.to = sessionId;
  message.from = ownId;
  signalingChannel.send(JSON.stringify(message));
}
