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
  recorder.stop();
}
