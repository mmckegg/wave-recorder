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
  opt.bitDepth = opt.bitDepth || 32

  if (opt.bitDepth !== 32 && opt.bitDepth !== 16){
    throw new Error('bitDepth must be either 16 or 32')
  }

  var silentFor = 0

  WaveStream.call(this, {
    sampleRate: audioContext.sampleRate, 
    bitDepth: opt.bitDepth,
    channels: opt.channels,
    format: opt.bitDepth === 32 ? 3 : 1
  })

  var self = this
  var bufferLength = opt.bufferLength || 4096

  var bytesPerChannel = opt.bitDepth / 8
  var bytesPerFrame = bytesPerChannel * opt.channels

  this.input = audioContext.createScriptProcessor(bufferLength, opt.channels, 1)

  this.input.onaudioprocess = function(e){
    var isSilent = true
    var buffer = new Buffer(e.inputBuffer.length * bytesPerFrame)
    for (var c=0;c<e.inputBuffer.numberOfChannels;c++){
      var channel = e.inputBuffer.getChannelData(c)
      var channelOffset = c * bytesPerChannel
      for (var i=0;i<channel.length;i++){
        var offset = i * bytesPerFrame + channelOffset

        if (opt.bitDepth === 32){
          buffer.writeFloatLE(channel[i], offset)
        } else if (opt.bitDepth === 16){
          write16BitPCM(buffer, offset, channel[i])
        }

        if (isSilent && hasSignal(channel[i])) {
          isSilent = false
        }
      }
    }

    if (isSilent){
      silentFor += e.inputBuffer.duration
    } else {
      silentFor = 0
    }

    if (!isSilent || !opt.silenceDuration || opt.silenceDuration > silentFor){
      self.write(buffer)
      self._emitHeader()
    }
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

WaveRecorder.prototype._emitHeader = function () {
  var dataLength = this.bytesProcessed
  var headerLength = this.headerLength
  var header = this._header
  header['writeUInt32' + this.endianness](dataLength + headerLength - 8, 4)
  header['writeUInt32' + this.endianness](dataLength, headerLength - 4)
  this.emit('header', header)
}

function hasSignal(value){
  return value > 0.0001 || value < -0.0001
}
