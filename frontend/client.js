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

  console.log("Creating connection to signaling server.");
  signalingChannel = new WebSocket("wss://loopersignaling.azurewebsites.net/");
  signalingChannel.onmessage         = receiveMessage;
  // XXX Dirty trick that needs to be corrected:  Time to setup WebSocket
  //     is hidden while user is approving media acces.  Should use
  //     WebSocket.onopen to make sure not to send messages too early.

  console.log("Creating RTC connection.")
  connection = new RTCPeerConnection({iceServers: [
    {urls: "stun:stun.l.google.com:19302"}]});
  connection.onicecandidate          = sendIceCandidate;
  connection.ontrack                 = gotRemoteTrack;
  connection.onconnectionstatechange = reportConnectionState;

  console.log("Getting user media.");
  stream = await navigator.mediaDevices.getUserMedia({audio: true});

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

async function receiveMessage(message)
{
  var data;

  data = JSON.parse(message.data);

  if (data.id)
  {
    ownId = data.id;
    console.log("Received own ID: %d.", ownId);
  }

  if (data.answer)
  {
    console.log("Received answer.")
    console.log(data.answer);

    console.log("Setting remote description.")
    await connection.setRemoteDescription(data.answer);
    console.log("Remote description set.");
  }

  if (data.iceCandidate)
  {
    console.log("Received ICE candidate.");
    console.log(data.iceCandidate);

    console.log("Adding ICE candidate to connection.");
    await connection.addIceCandidate(data.iceCandidate);
    console.log("ICE candidate added to connection.");
  }
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
  var inputNode;

  console.log("Got remote media stream.")

  console.log("Creating audio nodes.")
  inputNode  = new MediaStreamTrackAudioSourceNode(audioContext,
    {mediaStreamTrack: event.track});

  console.log("Connecting audio nodes.")
  inputNode.connect(audioContext.destination)
}

function signal(message)
{
  message.to = sessionId;
  message.from = ownId;
  signalingChannel.send(JSON.stringify(message));
}
