'use strict';

var recorder, chunks, connection, remoteConnection;

document.addEventListener("DOMContentLoaded", initDocument);

// We start by associating the event handlers to the frontend.
function initDocument()
{
  console.log("Adding event handlers to DOM.")
  document.getElementById("startStreamButton")  .onclick = startStream;
  document.getElementById("stopRecordingButton").onclick = stopRecording;
}

// Once the start button is hit, the first step is to get access to the
// user's microphone.
function startStream()
{
  console.log("Getting user media.");
  navigator.mediaDevices
    .getUserMedia({audio: true})
    .then(startCall)
    .catch((err) => console.error(err));
}

// Once we obtained the stream from the user's microphone, we create the
// RTC connection, register some event handlers, associate the stream,
// and create an offer.
// THIS FUNCTION ALSO CONTAINS SOME CODE TO BE RUN ON THE REMOTE SIDE
function startCall(stream)
{
  console.log("Creating connection.")
  connection = new RTCPeerConnection();

  connection.addEventListener('icecandidate', sendIceCandidate);

  console.log("Adding stream to connection.");
  connection.addStream(stream);

  console.log("Creating offer.")
  connection
    .createOffer({voiceActivityDetection: false})
    .then(setLocalDescription)
    .catch((err) => console.error(err));

  // REMOTE CONNECTION IS FAKE.  THIS WILL BE ON THE SERVER

  console.log("REMOTE: Creating connection.");
  remoteConnection = new RTCPeerConnection();

  remoteConnection.addEventListener('icecandidate', handleRemoteConnection);
  remoteConnection.addEventListener('addstream', gotRemoteMediaStream);
}

// Once the offer has been created, we set the local description.
// THIS FUNCTION ALSO CONTAINS SOME CODE TO BE RUN ON THE REMOTE SIDE
function setLocalDescription(description)
{
  console.log("Setting local description.");
  connection
    .setLocalDescription(description)
    .then(() => console.log("Local description set."))
    .catch((err) => console.error(err));

  // REMOTE CONNECTION IS FAKE, JUST FOR TESTING PURPOSES.  THIS WILL BE ON THE SERVER

  console.log("REMOTE: Setting remote description.");
  remoteConnection
    .setRemoteDescription(description)
    .then(() => console.log("REMOTE: Remote description set."))
    .catch((err) => console.error(err));

  console.log("REMOTE: Creating answer.");
  remoteConnection
    .createAnswer()
    .then(createdAnswer)
    .catch((err) => console.error(err));
}

// This is to be run on the REMOTE side.  Once a stream is added to the
// remote connection, recording starts.
function gotRemoteMediaStream(event)
{
  console.log("REMOTE EVENT addstream")
  startRecording(event.stream);
}

// This is to be run on the REMOTE side.  Just a stream recorder.
function startRecording(stream)
{
  console.log("Starting recording.")
  recorder = new MediaRecorder(stream);
  chunks = [];
  recorder.ondataavailable = pushChunk;
  recorder.onstop = combineChunks;
  recorder.start();
}

function sendIceCandidate(event)
{
  console.log("EVENT icecandidate()")

  if (event.candidate)
  {
    remoteConnection  // FAKE
      .addIceCandidate(new RTCIceCandidate(event.candidate))
      .then(() => console.log("Connection successful."))
      .catch(() => console.log("Connection failed"))
  }
}

function createdAnswer(description)
{
  console.log("REMOTE: Setting local description.")
  remoteConnection
    .setLocalDescription(description)
    .then(() => console.log("REMOTE: Local description set."))
    .catch((err) => console.error(err));

  // CONNECTIION IS FAKE, JUST FOR TESTING PURPOSES.  THIS WILL BE ON THE CLIENT

  console.log("Setting remote description.")
  connection
    .setRemoteDescription(description)
    .then(() => console.log("Remote description set."))
    .catch((err) => console.error(err));
}

function handleRemoteConnection(event)
{
  console.log("REMOTE EVENT icecandidate()")

  if (event.candidate)
  {
    connection  // FAKE
      .addIceCandidate(new RTCIceCandidate(event.candidate))
      .then(() => console.log("REMOTE Connection successful."))
      .catch(() => console.log("REMOTE Connection failed"))
  }
}

function pushChunk(event)
{
  console.log("Pushing chunk.");
  chunks.push(event.data);
}

function stopRecording()
{
  recorder.stop();
}

function combineChunks()
{
  console.log("Combining chunks.");
  var downloadButton, blob;

  if(!chunks)            {console.log("Chunks not initialized"); return;}
  if(chunks.lenght == 0) {console.log("No chunks recorded");     return;}
  
  blob = new Blob(chunks, {type: chunks[0].type});
  downloadButton = document.getElementById("downloadButton");
  downloadButton.href = URL.createObjectURL(blob);
  downloadButton.download = "recording.oga";
}
