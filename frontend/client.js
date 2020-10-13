'use strict';

import Metronome from "./metronome.js";
import Correlator from "./correlator.js";
import Recorder from "./recorder.js";
import { signalingServerUrl, stunServerUrl } from "./constants.js";
import "https://webrtc.github.io/adapter/adapter-latest.js"
import { initServer, initOTSession } from './vonangeAPI.session.js'

var signalingChannel, ownId, sessionId; // for Websocket
var connection; // for RTC
var audioContext; // for Web Audio API
var clickBuffer; // click for latency detection
var delayNode, userLatency; // needs to be global to access from processAudio
var sampleRate;
var loopLength;
var recorder;

document.addEventListener("DOMContentLoaded", initDocument);

// We start by associating the event handlers to the frontend.
async function initDocument() {
  // Adding event handlers to DOM
  document.getElementById("startButton").onclick = startStream;
  document.getElementById("stopButton").onclick = stopStream;

  // Creating connection to signaling server
  signalingChannel = new WebSocket(signalingServerUrl);
  signalingChannel.onmessage = receiveMessage;
  signalingChannel.onopen = () =>
    document.getElementById("startButton").disabled = false;


  const { session, token } = await initOTSession()
  console.log('session init', session)
  //session.on("signal", function (event) {
  //  console.log("Signal sent from connection " + event.from.id);
  // Process the event.data property, if there is any data.
  //});

}

/*                                               * created in gotRemoteStream

USER                        |                  A
----------------------------+------------------+------------------------------
CLIENT                      |                  |
                            V                  |
                     userInputNode        destination
                            |                  A
                            V                  |
                       delay Node              +---------> recordingNode*
                            |                  |
               1            V 0                | 0          1
metronome -----> channelMergerNode     channelSplitterNode* ----> correlator*
                            |                  A
                            V                  |
                    serverOutputNode    serverInputNode*
CLIENT                      |                  A
----------------------------+------------------+------------------------------
SERVER                      V                  |
*/

async function startStream() {
  var userInputStream, description, userInputNode, serverOutputNode,
    channelMergerNode, metronome, tempo, loopBeats;

  // Disable UI
  document.getElementById("sessionId").disabled = true;
  document.getElementById("sampleRate").disabled = true;
  document.getElementById("loopBeats").disabled = true;
  document.getElementById("tempo").disabled = true;
  document.getElementById("latency").disabled = true
  document.getElementById("startButton").disabled = true;

  // Get user input
  sessionId = document.getElementById("sessionId").value;
  sampleRate = document.getElementById("sampleRate").value * 1;
  tempo = document.getElementById("tempo").value * 1;
  userLatency = document.getElementById("latency").value / 1000;
  loopBeats = document.getElementById("loopBeats").value * 1;

  // Calculate loop lenght
  loopLength = 60 / tempo * loopBeats; // Theoretical loop lengh, but
  loopLength = Math.round(loopLength * sampleRate / 128) * 128 / sampleRate;
  tempo = 60 / loopLength * loopBeats;
  // according to the Web Audio API specification, "If DelayNode is part of a
  // cycle, then the value of the delayTime attribute is clamped to a minimum
  // of one render quantum."  We do this explicitly here so we can sync the
  // metronome.
  console.log("Loop lengh is %.5f s, tempos is %.1f bpm.", loopLength, tempo);

  // Getting user media
  userInputStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      channelCount: 1
    }
  });

  // TODO: Assign handler to userInputStream.oninactive

  // Create Web Audio
  audioContext = new AudioContext({ sampleRate });

  clickBuffer = await loadAudioBuffer("snd/Closed_Hat.wav");

  userInputNode = new MediaStreamAudioSourceNode(audioContext, { mediaStream: userInputStream });
  delayNode = new DelayNode(audioContext, { maxDelayTime: loopLength })
  channelMergerNode = new ChannelMergerNode(audioContext, { numberOfInputs: 2 });
  serverOutputNode = new MediaStreamAudioDestinationNode(audioContext);
  metronome = new Metronome(audioContext, channelMergerNode, 60, clickBuffer, 1);

  userInputNode.connect(delayNode);
  delayNode.connect(channelMergerNode, 0, 0);
  channelMergerNode.connect(serverOutputNode);

  metronome.start(-1);

  // Creating RTC connection
  connection = new RTCPeerConnection({ iceServers: [{ urls: stunServerUrl }] });

  connection.onicecandidate = sendIceCandidate;
  connection.ontrack = gotRemoteStream;
  connection.onconnectionstatechange = reportConnectionState;

  connection.addTrack(serverOutputNode.stream.getAudioTracks()[0],
    serverOutputNode.stream);

  // Creating offer
  description = await connection.createOffer({ voiceActivityDetection: false });

  // Workaround for Chrome, see https://bugs.chromium.org/p/webrtc/issues/detail?id=8133#c25
  description.sdp = description.sdp.replace("minptime=10",
    "minptime=10;stereo=1;sprop-stereo=1");

  console.log("Offer SDP:\n%s", description.sdp)
  await connection.setLocalDescription(description);
  signal({ offer: description, to: sessionId });
}

function receiveMessage(event) {
  const data = JSON.parse(event.data);

  if (data.id) { console.log("Received own ID: %d.", data.id); ownId = data.id; }
  if (data.answer) { console.log("Answer SDP:\n%s", data.answer.sdp); connection.setRemoteDescription(data.answer); }
  if (data.iceCandidate) { console.log("Received ICE candidate: %s", data.iceCandidate.candidate); connection.addIceCandidate(data.iceCandidate); }
}

function reportConnectionState() {
  console.log("Connection state: %s.", connection.connectionState)
}

function sendIceCandidate(event) {
  if (event.candidate) {
    console.log("Sending ICE candidate to signaling server: %s",
      event.candidate.candidate);
    signal({ iceCandidate: event.candidate, to: sessionId });
  }
}

function gotRemoteStream(event) {
  var mediaStream, serverInputNode, channelSplitterNode;

  console.log("Got remote media stream.")
  mediaStream = event.streams[0];

  // Workaround for Chrome from https://stackoverflow.com/a/54781147
  new Audio().srcObject = mediaStream;

  console.log("Creating server input node.")
  serverInputNode = new MediaStreamAudioSourceNode(audioContext, { mediaStream });

  console.log("Creating channel splitter node.")
  channelSplitterNode = new ChannelSplitterNode(audioContext, { numberOfOutputs: 2 });
  serverInputNode.connect(channelSplitterNode);
  channelSplitterNode.connect(audioContext.destination, 0);

  console.log("Creating correlator")
  new Correlator(audioContext, channelSplitterNode, clickBuffer,
    updateDelayNode, 1);

  console.log("Creating recorder");
  const recordingNode = new MediaStreamAudioDestinationNode(audioContext);
  channelSplitterNode.connect(recordingNode, 0);
  const downloadButton = document.getElementById("downloadButton");
  recorder = new Recorder(recordingNode.stream, downloadButton);
  recorder.start();

  document.getElementById("stopButton").disabled = false;
}

function updateDelayNode(networkLatency) {
  const totalLatency = userLatency + networkLatency;

  console.log("Latency: %.2f ms (user) + %.2f ms (network) = %.2f ms.",
    1000 * userLatency,
    1000 * networkLatency,
    1000 * totalLatency);

  delayNode.delayTime.value = loopLength - totalLatency;
}

function signal(message) {
  message.from = ownId;
  signalingChannel.send(JSON.stringify(message));
}

async function loadAudioBuffer(url) {
  var response, audioData, buffer;

  console.log("Loading audio data from %s.", url);
  response = await fetch(url);
  audioData = await response.arrayBuffer();
  buffer = await audioContext.decodeAudioData(audioData);
  console.log("Loaded audio data from %s.", url);
  return buffer;
}

function stopStream() {
  document.getElementById("stopButton").disabled = true;
  console.log("Leaving the session");
  recorder.stop();
  connection.close();
}