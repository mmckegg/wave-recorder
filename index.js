var WaveStream = require('wav').Writer
var util = require('util');

module.exports = WaveRecorder

util.inherits(WaveRecorder, WaveStream);

function WaveRecorder(audioContext, opt) {
  if (!(this instanceof WaveRecorder)){
    return new WaveRecorder(audioContext, opt)
  }

  WaveStream.call(this, {
    sampleRate: audioContext.destination.sampleRate, 
    bitDepth: 16,
    channelCount: 2
  })

  var self = this
  var bufferLength = opt && opt.bufferLength || 4096
  this.input = audioContext.createJavaScriptNode(bufferLength, 2, 2)
  this.input.onaudioprocess = function(e){
    var data = [e.inputBuffer.getChannelData(0), e.inputBuffer.getChannelData(1)]
    var buffer = new Buffer(data[0].length * 4)
    for (var i=0;i<data[0].length;i++){
      var offset = i * 4
      write16BitPCM(buffer, offset, data[0][i])
      write16BitPCM(buffer, offset + 2, data[1][i])
    }
    self.write(buffer)
  }

  this.on('end', function(){
    self.input.onaudioprocess = null
    self.input = null
  })

  // required to make data flow - shouldn't be neccesary
  this.input.connect(audioContext.destination)
}

function write16BitPCM(output, offset, data){
  var s = Math.max(-1, Math.min(1, data));
  output.writeInt16LE(Math.floor(s < 0 ? s * 0x8000 : s * 0x7FFF), offset);
}
