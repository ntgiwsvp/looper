'use strict';

var signalingChannel, connection; // for RTC
var audioContext; // for Web Audio API

document.addEventListener("DOMContentLoaded", initDocument);

// We start by associating the event handlers to the frontend.
function initDocument()
{
  console.log("Adding event handlers to DOM.")
  document.getElementById("startButton").onclick = startStream;
}

// Once the start button is hit, the first step is to get access to the
// user's microphone.
function startStream()
{
  console.log("Creating audio contect.");
  audioContext = new AudioContext();

  console.log("Creating connection to signaling server.");
  signalingChannel = new WebSocket("ws://localhost:8080/");
  signalingChannel.addEventListener("message", receiveMessage);
  // XXX Dirty trick that needs to be corrected:  Time to setup WebSocket
  //     is hidden while user is approving media acces.  Should use
  //     WebSocket.onopen to make sure not to send messages too early.

  console.log("Getting user media.");
  navigator.mediaDevices
    .getUserMedia({audio: true})
    .then(startCall);
}

// Once we obtained the stream from the user's microphone, we create the
// RTC connection, register some event handlers, associate the stream,
// and create an offer.
function startCall(stream)
{
  console.log("Creating RTC connection.")
  connection = new RTCPeerConnection();
  connection.addEventListener('icecandidate', sendIceCandidate);
  connection.addEventListener("connectionstatechange",
    reportConnectionState);
  connection.addEventListener("addstream", gotRemoteMediaStream);

  console.log("Adding stream to connection.");
  connection.addStream(stream);

  console.log("Creating offer.")
  connection
    .createOffer({voiceActivityDetection: false})
    .then(sendOffer);
}

function receiveMessage(event)
{
  var data;

  data = JSON.parse(event.data);

  if (data.answer)
  {
    console.log("Received answer.")

    console.log("Setting remote description.")
    connection
      .setRemoteDescription(new RTCSessionDescription(data.answer))
      .then(() => console.log("Remote description set."));
  }

  if (data.candidate)
  {
    console.log("Received ICE candidate.")

    console.log("Adding ICE candidate to connection.")
    connection
      .addIceCandidate(data.iceCandidate)
      .then(() => console.log("ICE candidate added to connection."));
  }
}

function reportConnectionState(event)
{
  console.log("Connection state: %s.", connection.connectionState)
}

function sendOffer(description)
{
  console.log("Created offer.");

  console.log("Setting local description.");
  connection
    .setLocalDescription(description)
    .then(() => console.log("Local description set."));

  console.log("Sending offer.");
  signalingChannel.send(JSON.stringify({offer: description}));
}

function sendIceCandidate(event)
{
  if (event.candidate)
  {
    console.log("Sending ICE candidate to signaling server");
    signalingChannel.send(JSON.stringify({iceCandidate: event.candidate}));
  }
}

function gotRemoteMediaStream(event)
{
  var inputNode;

  console.log("Got remote media stream.")

  console.log("Creating audio nodes.")
  inputNode  = new MediaStreamAudioSourceNode     (audioContext, {mediaStream:  event.stream});

  console.log("Connecting audio nodes.")
  inputNode.connect(audioContext.destination)
}
