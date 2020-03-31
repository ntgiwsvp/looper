export default class Metronome
{
  constructor(audioContext, outputNode, tempo, buffer)
  {
    this.audioContext = audioContext;
    this.outputNode   = outputNode;
    this.period       = 60/tempo;
    this.buffer       = buffer;
  }

  playClick(t = 0)
  {
    var node;
  
    node = new AudioBufferSourceNode(this.audioContext, {buffer: this.buffer});
    node.connect(this.outputNode);
    node.start(t)
  }
  
  start(when = 0)
  {
    var t, now;

    now = this.audioContext.currentTime;
    
    if (when == 0) when = now;


    for (t = when; t < now + 2; t += this.period)
    {
      console.log("scheduling at %.3f s", t)
      this.playClick(t);
    }

    setTimeout(() => this.start(t), 1000);
  }
}
