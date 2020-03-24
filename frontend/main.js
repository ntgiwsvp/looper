'use strict';

var recorder, chunks;

document.addEventListener("DOMContentLoaded", initDocument);

function initDocument()
{
  console.log("Adding event handlers to DOM.")
  document.getElementById("startStreamButton")  .onclick = startStream;
  document.getElementById("stopRecordingButton").onclick = stopRecording;
}

function startStream()
{
  console.log("Starting stream.");
  navigator.mediaDevices.getUserMedia({audio: true}).then(startRecording).catch(console.log);
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
  //chunks = undefined;  Does Blob() create a copy?
  downloadButton = document.getElementById("downloadButton");
  downloadButton.href = URL.createObjectURL(blob);
  downloadButton.download = "recording.oga";
}
