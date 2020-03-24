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
  navigator.mediaDevices.getUserMedia({audio: true}).
    then(startCall).
    catch((err) => console.error(err));
}

function startCall(stream)
{
  console.log("Creating connection.")
  connection = new RTCPeerConnection();

  // connection.addEventListener('icecandidate', XXX);
  // connection.addEventListener('iceconnectionstatechange', XXX);

  console.log("Adding stream to connection.");
  connection.addStream(stream);

  console.log("Creating offer.")
  connection.createOffer({voiceActivityDetection: false}).
    then(setLocalDescription).
    catch((err) => console.error(err));

  // REMOTE CONNECTION IS FAKE, JUST FOR TESTING PURPOSES.  THIS WILL BE ON THE SERVER

  console.log("REMOTE: Creating connection.");
  remoteConnection = new RTCPeerConnection();

  // event lisenters to be added here (three ones, in addition also addstream) XXX
}

function setLocalDescription(description)
{
  console.log("Setting local description.");
  connection.setLocalDescription(description).
    then(() => console.log("Local description set.")).
    catch((err) => console.error(err));

  // REMOTE CONNECTION IS FAKE, JUST FOR TESTING PURPOSES.  THIS WILL BE ON THE SERVER

  console.log("REMOTE: Setting remote description.");
  remoteConnection.setRemoteDescription(description).
    then(() => console.log("REMOTE: Remote description set.")).
    catch((err) => console.error(err));

  console.log("REMOTE: Creating answer.");
  remoteConnection.createAnswer().
    then(createdAnswer).
    catch((err) => console.error(err));
}

function createdAnswer(description)
{
  console.log("REMOTE: Setting local description.")
  remoteConnection.setLocalDescription(description).
    then(() => console.log("REMOTE: Local description set.")).
    catch((err) => console.error(err));

  // CONNECTIION IS FAKE, JUST FOR TESTING PURPOSES.  THIS WILL BE ON THE CLIENT

  console.log("Setting remote description.")
  connection.setRemoteDescription(description).
    then(() => console.log("Remote description set.")).
    catch((err) => console.error(err));
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
