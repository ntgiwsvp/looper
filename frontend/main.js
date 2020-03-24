var stream, recorder, chunks;

function startStream() {
  if (stream) {console.log("Stream already started."); return;}

  console.log("Starting stream...");
  navigator.mediaDevices.getUserMedia({video: false, audio: true})
  .then(function(new_stream) {
    stream = new_stream;
    console.log("Stream started.");
  })
  .catch(function(err) {
    console.log(err);
  })
}

function startRecording()
{
  if (!stream)  {console.log("Steam not yet started.");    return;}
  if (recorder) {console.log("Recorder already started."); return;}

  recorder = new MediaRecorder(stream);
  chunks = [];
  recorder.ondataavailable = function(e) {chunks.push(e.data)}
  recorder.start()
}

function stopRecording()
{
  recorder.onstop = saveBlob;
  recorder.stop();
}

function saveBlob()
{
  var downloadButton;

  if(!chunks)            {console.log("Chunks not initialized"); return;}
  if(chunks.lenght == 0) {console.log("No chunks recorded");     return;}
  
  blob = new Blob(chunks, {type: chunks[0].type})
  //chunks = undefined;  Does Blob() create a copy?
  downloadButton = document.getElementById("downloadButton");
  downloadButton.href = URL.createObjectURL(blob)
  downloadButton.download = "recording.oga"
}
