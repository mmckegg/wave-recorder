var WaveFileStream = require('wave-file-stream')

module.exports = function(source){

  var recorder = {}

  var context = source.context

  var bufferLen = 4096
  var recorderNode = context.createJavaScriptNode(bufferLen, 2, 2)
  var outstream = null

  window.recorders = window.recorders || []
  window.recorders.push(recorderNode)

  recorderNode.onaudioprocess = function(e){
    if (!outstream) return
    outstream.write([
      e.inputBuffer.getChannelData(0),
      e.inputBuffer.getChannelData(1)
    ])
  }

  recorder.record = function(filepath, callback){
    outstream = WaveFileStream(filepath, context.sampleRate)
    return {
      stop: function(){
        outstream.end()
        callback&&callback(null, outstream.url)
        outstream = null
      },
      filePath: filepath
    } 
  }

  source.connect(recorderNode)
  recorderNode.connect(context.destination) //this should not be necessary

  return recorder

}