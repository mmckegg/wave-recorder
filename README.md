wave-recorder
===

Pipe Web Audio API nodes into 16bit PCM Wave files.

## Install

```bash
$ npm install wave-recorder
```

## Example

```js
var WaveRecorder = require('wave-recorder')
var WebFS = require('web-fs')

navigator.webkitPersistentStorage.requestQuota(1024*1024, function(grantedBytes) {
  window.webkitRequestFileSystem(PERSISTENT, grantedBytes, onInit)
})

function onInit(fileSystem){
  var fs = WebFS(fileSystem.root)
  var audioContext = new AudioContext()

  navigator.webkitGetUserMedia({audio:true}, function(stream) {
    
    // get the mic input
    var audioInput = audioContext.createMediaStreamSource(stream)
    var recorder = WaveRecorder(audioContext, {channels: 2})

    audioInput.connect(recorder.input)

    var filePath = 'test.wav'
    var fileStream = fs.createWriteStream(filePath)
    recorder.pipe(fileStream)

    // optionally go back and rewrite header with updated length
    recorder.on('header', function(header){ 
      fs.write(filePath, header, 0, header.length, 0, function(err){
        // done!
      })
    })

    // record for 10 seconds then stop
    setTimeout(function(){
      recorder.end()
    }, 10000)
  })
}
```