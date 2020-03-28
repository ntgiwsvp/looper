'use strict';

var signalingChannel, ownId, clientId; // for Websocket 
var connection; // For RTC
var audioContext, outputNode, gainNode, delayNode; // for Web Audio API

const sampleRate = 44100;

document.addEventListener("DOMContentLoaded", initDocument);

function initDocument()
{
  console.log("Adding event handlers to DOM.");
  document.getElementById("startServerButton").onclick = startServer;
}

function startServer()
{
  console.log("Creating audio contect.");
  audioContext = new AudioContext({sampleRate});

  console.log("Creating audio nodes.")
  outputNode = new MediaStreamAudioDestinationNode(audioContext);
  gainNode   = new GainNode(audioContext, {gain: 0.9});
  delayNode  = new DelayNode(audioContext, {delayTime: 1.0, maxDelayTime: 1.0});

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

  console.log("Creating RTC connection");
  connection  = new RTCPeerConnection({iceServers: [
    {urls: "stun:stun.l.google.com:19302"}]});
  connection.onicecandidate          = sendIceCandidate;
  connection.ontrack                 = gotRemoteTrack
  connection.onconnectionstatechange = reportConnectionState;
  
  console.log("Creating connection to signaling server.");
  signalingChannel = new WebSocket("wss://loopersignaling.azurewebsites.net/")
  signalingChannel.onmessage         = receiveMessage;

  console.log("Waiting for offers.")
}

function reportConnectionState(event)
{
  console.log("Connection state: %s.", connection.connectionState)
}

async function receiveMessage(message)
{
  var data, description;

  data = JSON.parse(message.data);

  if (data.id)
  {
    ownId = data.id;
    console.log("Received own ID: %d.", ownId);
    document.getElementById("sessionId").innerHTML = ownId;
  }

  if (data.offer)
  {
    clientId = data.from;
    
    console.log("Received offer from %s.", clientId)
    console.log(data.offer);

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

  if (data.iceCandidate)
  {
    console.log("Received ICE candidate.");
    console.log(data.iceCandidate);

    console.log("Adding ICE candidate to connection.");
    await connection.addIceCandidate(data.iceCandidate);
    console.log("ICE candidate added to connection.");
  }
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
  var inputNode, tracks;

  console.log("Got remote media stream track.")

  console.log("Creating audio nodes.")
  inputNode  = new MediaStreamTrackAudioSourceNode(audioContext,
    {mediaStreamTrack: event.track});
  
  console.log("Connecting audio nodes.")
  inputNode.connect(gainNode);

  console.log("Sending output to client.");
  tracks = outputNode.stream.getAudioTracks();
  connection.addTrack(tracks[0]);
}

function signal(message)
{
  message.to = clientId;
  message.from = ownId;
  signalingChannel.send(JSON.stringify(message));
}
