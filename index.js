var WaveStream = require('wav/lib/writer')
var Buffer = require('buffer').Buffer
var util = require('util')

module.exports = WaveRecorder

util.inherits(WaveRecorder, WaveStream);

function WaveRecorder(audioContext, opt) {
  if (!(this instanceof WaveRecorder)){
    return new WaveRecorder(audioContext, opt)
  }

  var opt = opt || {}
  opt.channels = opt.channels || 2

  WaveStream.call(this, {
    sampleRate: audioContext.destination.sampleRate, 
    bitDepth: 16,
    channels: opt.channels
  })

  var self = this
  var bufferLength = opt && opt.bufferLength || 4096
  var bytesPerChannel = 16 / 8
  var bytesPerFrame = bytesPerChannel * opt.channels

  this.input = audioContext.createScriptProcessor(bufferLength, opt.channels, 1)
  this.input.onaudioprocess = function(e){
    var buffer = new Buffer(e.inputBuffer.length * bytesPerFrame)
    for (var c=0;c<e.inputBuffer.numberOfChannels;c++){
      var channel = e.inputBuffer.getChannelData(c)
      var channelOffset = c * bytesPerChannel
      for (var i=0;i<channel.length;i++){
        var offset = i * bytesPerFrame + channelOffset
        write16BitPCM(buffer, offset, channel[i])
      }
    }
    self.write(buffer)
  }

  this.on('end', function(){
    self.input.onaudioprocess = null
    self.input = null
  })

  // required to make data flow, will be 0
  this.input.connect(audioContext.destination)
}

function write16BitPCM(output, offset, data){
  var s = Math.max(-1, Math.min(1, data))
  output.writeInt16LE(Math.floor(s < 0 ? s * 0x8000 : s * 0x7FFF), offset)
}
