window.onload = function () {

  if (window.screen.width < 400) {

    d3.select('div#mobile_begin').on('click', function () {
      d3.select(this).style('display', 'none')
    })

  } else {

    d3.select('div#mobile_begin').remove()
    begin()
  }

}

var Modem = require('./modem2.js')

function begin(){

  var config = {
    baud: 1
  }
  var modem = Modem.modem(config)

  var encoded_message = '01011'

  var AudioBuffer = modem.encode(encoded_message) // returns an audio buffer
  var decoded_message = modem.decode(AudioBuffer,encoded_message.length)

  console.log(encoded_message,decoded_message)

  window.recorder = new Recorder(context.createGain(), {numChannels: 1})

  recorder.setBuffer([AudioBuffer.getChannelData(0)], function(){
    console.log('done setting buffer')
  })

  setTimeout(createDownloadLink,100)

  function createDownloadLink() {
    recorder && recorder.exportWAV(function (blob) {
      var url = URL.createObjectURL(blob);
      var li = document.createElement('div');
      var au = document.createElement('audio');
      var hf = document.createElement('a');

      au.controls = true;
      au.src = url;
      hf.href = url;
      hf.download = new Date().toISOString() + '.wav';
      hf.innerHTML = '<br>'+hf.download;
      li.appendChild(au);
      li.appendChild(hf);
      d3.select('body').append('div').node().appendChild(li);
    });
  }

  window.m = modem

}
