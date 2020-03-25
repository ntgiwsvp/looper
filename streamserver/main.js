'use strict';

var signalingChannel, connection, recorder, chunks;

document.addEventListener("DOMContentLoaded", initDocument);

function initDocument()
{
  console.log("Adding event handlers to DOM.");
  document.getElementById("startServerButton").onclick = startServer;
  document.getElementById("stopRecordingButton").onclick = stopRecording;
}

function startServer()
{
  console.log("Creating RTC connection");
  connection = new RTCPeerConnection();
  connection.addEventListener('icecandidate', sendIceCandidate);
  connection.addEventListener('addstream', gotRemoteMediaStream);
  connection.addEventListener("connectionstatechange",
    reportConnectionState);
  
  console.log("Creating connection to signaling server.");
  signalingChannel = new WebSocket("ws://localhost:8080/")
  signalingChannel.addEventListener("message", receiveMessage);

  console.log("Waiting for offers.")
}

function reportConnectionState(event)
{
  console.log("Connection state: %s.", connection.connectionState)
}

function receiveMessage(event)
{
  var data;

  data = JSON.parse(event.data);

  if (data.offer)
  {
    console.log("Received offer.")

    console.log("Setting remote description.");
    connection
      .setRemoteDescription(new RTCSessionDescription(data.offer))
      .then(() => console.log("Remote description set."))
      .catch((err) => console.error(err));
  
    console.log("Creating answer.");
    connection
      .createAnswer()
      .then(sendAnswer)
      .catch((err) => console.error(err));
  }

  if (data.iceCandidate)
  {
    console.log("Received ICE candidate.")

    console.log("Adding ICE candidate to connection.")
    connection.addIceCandidate(data.iceCandidate)
      .then(() => console.log("ICE candidate added to connection."))
      .catch((err) => console.error(err))
  }
}

function sendAnswer(description)
{
  console.log("Created answer.");

  console.log("Setting local description.")
  connection
    .setLocalDescription(description)
    .then(() => console.log("Local description set."))
    .catch((err) => console.error(err));

  console.log("Sending answer.")
  signalingChannel.send(JSON.stringify({"answer": description}));
}

function sendIceCandidate(event)
{
  if (event.candidate)
  {
    console.log("Sending ICE candidate to signaling server");
    signalingChannel.send(JSON.stringify({"iceCandidate": event.candidate}));
  }
}

function gotRemoteMediaStream(event)
{
  console.log("Got remote media stream.")
  startRecording(event.stream);
}

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
  downloadButton = document.getElementById("downloadButton");
  downloadButton.href = URL.createObjectURL(blob);
  downloadButton.download = "recording.oga";
}
