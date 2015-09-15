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

  if (opt.startSilent && opt.silenceDuration) {
    silentFor = opt.silenceDuration
  }

  WaveStream.call(this, {
    sampleRate: audioContext.sampleRate, 
    bitDepth: opt.bitDepth,
    channels: opt.channels,
    format: opt.bitDepth === 32 ? 3 : 1
  })

  var self = this
  var bufferLength = opt.bufferLength || 8192
  var chunkLength = opt.chunkLength || 256

  var recordLength = 8192

  var bytesPerChannel = opt.bitDepth / 8
  var bytesPerFrame = bytesPerChannel * opt.channels

  this.input = audioContext.createScriptProcessor(bufferLength, opt.channels, 1)

  this.input.onaudioprocess = function (e) {
    var slices = e.inputBuffer.length / chunkLength
    for (var i = 0; i < slices; i++) {
      var data = []
      var start = i * chunkLength
      var end = (i + 1) * chunkLength
      for (var c = 0; c < opt.channels; c++) {
        data.push(e.inputBuffer.getChannelData(c).subarray(start, end))
      }
      enqueue(data)
    }
  }

  var chunkId = 0
  var queue = []
  var processing = false

  function enqueue (data) {
    queue.push(data)
    if (!processing) {
      processing = true
      process.nextTick(nextChunk)
    }
  }

  function nextChunk () {
    var data = queue.shift()

    var isSilent = true
    var buffer = new Buffer(data[0].length * bytesPerFrame)
    for (var c=0;c<opt.channels;c++){
      var channel = data[c]
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
      silentFor += data[0].length / audioContext.sampleRate
    } else {
      silentFor = 0
    }

    if (!isSilent || !opt.silenceDuration || opt.silenceDuration > silentFor) {
      self.write(buffer)
      self.emit('chunk', chunkId, true)
    } else {
      self.emit('chunk', chunkId, false)
    }

    chunkId += 1

    if (queue.length) {
      processing = true
      process.nextTick(nextChunk)
    } else {
      processing = false
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

function hasSignal(value){
  return value > 0.0001 || value < -0.0001
}
