export default class Recorder
{
  constructor(stream, downloadButton)
  {
    var chunks = [];
    this.recorder = new MediaRecorder(stream);

    this.recorder.ondataavailable = function(event)
    {
      console.log("Pushing chunk.");
      chunks.push(event.data);
    }
    
    this.recorder.onstop = function()
    {
      var blob;

      console.log("Combining chunks.");
    
      if(!chunks) {console.log("Chunks not initialized"); return;}
      if(chunks.lenght == 0) {console.log("No chunks recorded"); return;}
      
      blob = new Blob(chunks, {type: chunks[0].type});
      downloadButton.href = URL.createObjectURL(blob);
      downloadButton.download = "recording.oga";
    }
  }

  start()
  {
    this.recorder.start();
  }

  stop()
  {
    this.recorder.stop();
  }
}
