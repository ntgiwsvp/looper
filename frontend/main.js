'use strict';

var recorder, chunks, connection, remoteConnection;

document.addEventListener("DOMContentLoaded", initDocument);

function initDocument()
{
  console.log("Adding event handlers to DOM.")
  document.getElementById("startStreamButton")  .onclick = startStream;
  document.getElementById("stopRecordingButton").onclick = stopRecording;
}

function startStream()
{
  console.log("Getting user media.");
  //navigator.mediaDevices.getUserMedia({audio: true}).then(startRecording).catch(console.log);
  navigator.mediaDevices
    .getUserMedia({audio: true})
    .then(startCall)
    .catch((err) => console.error(err));
}

function startCall(stream)
{
  console.log("Creating connection.")
  connection = new RTCPeerConnection();

  connection.addEventListener('icecandidate', handleConnection);
  connection.addEventListener('iceconnectionstatechange', handleConnectionChange);

  console.log("Adding stream to connection.");
  connection.addStream(stream);

  console.log("Creating offer.")
  connection
    .createOffer({voiceActivityDetection: false})
    .then(setLocalDescription)
    .catch((err) => console.error(err));

  // REMOTE CONNECTION IS FAKE, JUST FOR TESTING PURPOSES.  THIS WILL BE ON THE SERVER

  console.log("REMOTE: Creating connection.");
  remoteConnection = new RTCPeerConnection();

  remoteConnection.addEventListener('icecandidate', handleRemoteConnection);
  remoteConnection.addEventListener('iceconnectionstatechange', handleRemoteConnectionChange);
  remoteConnection.addEventListener('addstream', gotRemoteMediaStream);
}

function handleConnection(event)
{
  console.log("EVENT icecandidate()")

  if (event.candidate)
  {
    remoteConnection  // FAKE
      .addIceCandidate(new RTCIceCandidate(event.candidate))
      .then(() => console.log("Connection successful."))
      .catch(() => console.log("Connection failed"))
  }
  else
  {
    console.log("This handler not in the original code - ???")
  }
}

function handleConnectionChange(event)
{
  console.log("EVENT iceconnectionstatechange")
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
  else
  {
    console.log("This handler not in the original code - ???")
  }
}

function handleRemoteConnectionChange(event)
{
  console.log("REMOTE EVENT iceconnectionstatechange")
}

function gotRemoteMediaStream(event)
{
  console.log("REMOTE EVENT addstream")
}

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

//----------------------------------------

function startRecording(stream)
{
  console.log("Starting recording.")
  recorder = new MediaRecorder(stream);
  chunks = [];
  recorder.ondataavailable = pushChunk;
  recorder.onstop = combineChunks;
  recorder.start();
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
  //chunks = undefined;  Does Blob() create a copy?
  downloadButton = document.getElementById("downloadButton");
  downloadButton.href = URL.createObjectURL(blob);
  downloadButton.download = "recording.oga";
}
