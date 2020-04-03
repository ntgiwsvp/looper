export default class Metronome
{
  constructor(audioContext, outputNode, tempo, buffer, outputNodeInput = 0,
    gain = 1.0)
  {
    this.audioContext    = audioContext;
    this.outputNode      = outputNode;
    this.period          = 60/tempo;
    this.buffer          = buffer;
    this.outputNodeInput = outputNodeInput;
    this.gain            = gain;
  }

  playClick(t = 0)
  {
    var node;
    var gainNode;
  
    node = new AudioBufferSourceNode(this.audioContext, {buffer: this.buffer});
    gainNode = new GainNode(this.audioContext, {gain: this.gain});
    node.connect(gainNode);
    gainNode.connect(this.outputNode, 0, this.outputNodeInput);
    node.start(t)
  }
  
  // Use when =  0 to start playback immediately.
  // Use when = -1 to start playback as soon as possible but in sync with
  //               currentTime.
  start(when = 0)
  {
    var t, now;

    now = this.audioContext.currentTime;
    
    if (when ==  0) when = now;
    if (when == -1) when = Math.ceil(now/this.period)*this.period;

    for (t = when; t < now + 2; t += this.period)
      this.playClick(t);

    setTimeout(() => this.start(t), 1000);
  }
}
