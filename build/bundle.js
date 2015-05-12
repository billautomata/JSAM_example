(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./modem2.js":2}],2:[function(require,module,exports){
module.exports.modem = Modem

;
(function setup_global_audio_context() {
  if (window.context === undefined) {
    console.log('creating new window.AudioContext() at window.context')
    window.AudioContext = (
      window.AudioContext ||
      window.webkitAudioContext ||
      window.mozAudioContext ||
      window.msAudioContext
    )
    window.context = new window.AudioContext()
  }
})()

function Modem(config) {

  var baud = config.baud || 4

  var n_channels = 1
  var sample_rate = context.sampleRate

  var samples_per_bit = sample_rate / baud

  var n_seconds
  var n_samples

  var sample_to_message_idx
  var message

  // encoder
  function encode(_message) {

    message = _message


    console.log('samples per bit',samples_per_bit)



    // n_channels = 1
    n_samples = samples_per_bit * message.length
    n_seconds = n_samples / sample_rate

    console.log('n_samples', n_samples)
    console.log('n_seconds', n_seconds)
    console.log('target baud', message.length / n_seconds)

    sample_to_message_idx = d3.scale.linear().domain([0, n_samples]).range([0, message.length])

    var audio_buffer = context.createBuffer(n_channels, n_samples, sample_rate)
    var dataArray = audio_buffer.getChannelData(0)

    var frequencies = [1000, 2000]

    for (var sample = 0; sample < dataArray.length; sample++) {
      dataArray[sample] = 0

      var message_idx = Math.floor(sample_to_message_idx(sample))

      if (message[message_idx] === '0') {
        frequencies = [1000, 10000]
      } else {
        frequencies = [2000]
      }

      frequencies.forEach(function (hz, idx) {
        dataArray[sample] += Math.sin(sample / ((sample_rate / 2) / hz / Math.PI))
      })
      dataArray[sample] *= 1.0 / (frequencies.length + 1)

      // console.log(dataArray[sample])
    }

    return audio_buffer;

  }

  // decoder
  function decode(buffer, message_length) {

    var decoded_message = ''

    var dataArray = buffer.getChannelData(0)

    var dft_size = 512
    var dft = new DFT(dft_size, sample_rate)

    function run_dft(offset) {

      console.time('running dft')

      offset = Math.floor(offset)
      // console.log('offset', offset)
      // console.log('spare_room',Math.abs(offset+dft_size - dataArray.length) - dft_size)

      var dft_local_dataArray = new Float32Array(dft_size)
      for (var sample = 0; sample < dft_local_dataArray.length; sample++) {

        // assert(sample+offset < dataArray.length,true)

        dft_local_dataArray[sample] = dataArray[sample + offset]
      }

      dft.forward(dft_local_dataArray)

      console.timeEnd('running dft')

      return [dft.spectrum[12], dft.spectrum[23], dft.spectrum[116]]

    }

    for (var letter_idx = 0; letter_idx < message_length; letter_idx++) {

      var result = run_dft(sample_to_message_idx.invert(letter_idx))

      // console.log(result)

      var lim = 0.2

      if (result[0] > lim && result[1] < lim && result[2] > lim) {
        decoded_message += '0'
      } else if (result[0] < lim && result[1] > lim && result[2] < lim) {
        decoded_message += '1'
      } else {
        console.log('error decoding')
      }


    }

    return decoded_message

  }

  return {
    encode: encode,
    decode: decode
  }


}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9tb2RlbTIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ3aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuXG4gIGlmICh3aW5kb3cuc2NyZWVuLndpZHRoIDwgNDAwKSB7XG5cbiAgICBkMy5zZWxlY3QoJ2RpdiNtb2JpbGVfYmVnaW4nKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICBkMy5zZWxlY3QodGhpcykuc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpXG4gICAgfSlcblxuICB9IGVsc2Uge1xuXG4gICAgZDMuc2VsZWN0KCdkaXYjbW9iaWxlX2JlZ2luJykucmVtb3ZlKClcbiAgICBiZWdpbigpXG4gIH1cblxufVxuXG52YXIgTW9kZW0gPSByZXF1aXJlKCcuL21vZGVtMi5qcycpXG5cbmZ1bmN0aW9uIGJlZ2luKCl7XG5cbiAgdmFyIGNvbmZpZyA9IHtcbiAgICBiYXVkOiAxXG4gIH1cbiAgXG4gIHZhciBtb2RlbSA9IE1vZGVtLm1vZGVtKGNvbmZpZylcblxuICB2YXIgZW5jb2RlZF9tZXNzYWdlID0gJzAxMDExJ1xuXG4gIHZhciBBdWRpb0J1ZmZlciA9IG1vZGVtLmVuY29kZShlbmNvZGVkX21lc3NhZ2UpIC8vIHJldHVybnMgYW4gYXVkaW8gYnVmZmVyXG4gIHZhciBkZWNvZGVkX21lc3NhZ2UgPSBtb2RlbS5kZWNvZGUoQXVkaW9CdWZmZXIsZW5jb2RlZF9tZXNzYWdlLmxlbmd0aClcblxuICBjb25zb2xlLmxvZyhlbmNvZGVkX21lc3NhZ2UsZGVjb2RlZF9tZXNzYWdlKVxuXG4gIHdpbmRvdy5yZWNvcmRlciA9IG5ldyBSZWNvcmRlcihjb250ZXh0LmNyZWF0ZUdhaW4oKSwge251bUNoYW5uZWxzOiAxfSlcblxuICByZWNvcmRlci5zZXRCdWZmZXIoW0F1ZGlvQnVmZmVyLmdldENoYW5uZWxEYXRhKDApXSwgZnVuY3Rpb24oKXtcbiAgICBjb25zb2xlLmxvZygnZG9uZSBzZXR0aW5nIGJ1ZmZlcicpXG4gIH0pXG5cbiAgc2V0VGltZW91dChjcmVhdGVEb3dubG9hZExpbmssMTAwKVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZURvd25sb2FkTGluaygpIHtcbiAgICByZWNvcmRlciAmJiByZWNvcmRlci5leHBvcnRXQVYoZnVuY3Rpb24gKGJsb2IpIHtcbiAgICAgIHZhciB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgdmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICB2YXIgYXUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhdWRpbycpO1xuICAgICAgdmFyIGhmID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXG4gICAgICBhdS5jb250cm9scyA9IHRydWU7XG4gICAgICBhdS5zcmMgPSB1cmw7XG4gICAgICBoZi5ocmVmID0gdXJsO1xuICAgICAgaGYuZG93bmxvYWQgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgKyAnLndhdic7XG4gICAgICBoZi5pbm5lckhUTUwgPSAnPGJyPicraGYuZG93bmxvYWQ7XG4gICAgICBsaS5hcHBlbmRDaGlsZChhdSk7XG4gICAgICBsaS5hcHBlbmRDaGlsZChoZik7XG4gICAgICBkMy5zZWxlY3QoJ2JvZHknKS5hcHBlbmQoJ2RpdicpLm5vZGUoKS5hcHBlbmRDaGlsZChsaSk7XG4gICAgfSk7XG4gIH1cblxuICB3aW5kb3cubSA9IG1vZGVtXG5cbn1cbiIsIm1vZHVsZS5leHBvcnRzLm1vZGVtID0gTW9kZW1cblxuO1xuKGZ1bmN0aW9uIHNldHVwX2dsb2JhbF9hdWRpb19jb250ZXh0KCkge1xuICBpZiAod2luZG93LmNvbnRleHQgPT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnNvbGUubG9nKCdjcmVhdGluZyBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpIGF0IHdpbmRvdy5jb250ZXh0JylcbiAgICB3aW5kb3cuQXVkaW9Db250ZXh0ID0gKFxuICAgICAgd2luZG93LkF1ZGlvQ29udGV4dCB8fFxuICAgICAgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCB8fFxuICAgICAgd2luZG93Lm1vekF1ZGlvQ29udGV4dCB8fFxuICAgICAgd2luZG93Lm1zQXVkaW9Db250ZXh0XG4gICAgKVxuICAgIHdpbmRvdy5jb250ZXh0ID0gbmV3IHdpbmRvdy5BdWRpb0NvbnRleHQoKVxuICB9XG59KSgpXG5cbmZ1bmN0aW9uIE1vZGVtKGNvbmZpZykge1xuXG4gIHZhciBiYXVkID0gY29uZmlnLmJhdWQgfHwgNFxuXG4gIHZhciBuX2NoYW5uZWxzID0gMVxuICB2YXIgc2FtcGxlX3JhdGUgPSBjb250ZXh0LnNhbXBsZVJhdGVcblxuICB2YXIgc2FtcGxlc19wZXJfYml0ID0gc2FtcGxlX3JhdGUgLyBiYXVkXG5cbiAgdmFyIG5fc2Vjb25kc1xuICB2YXIgbl9zYW1wbGVzXG5cbiAgdmFyIHNhbXBsZV90b19tZXNzYWdlX2lkeFxuICB2YXIgbWVzc2FnZVxuXG4gIC8vIGVuY29kZXJcbiAgZnVuY3Rpb24gZW5jb2RlKF9tZXNzYWdlKSB7XG5cbiAgICBtZXNzYWdlID0gX21lc3NhZ2VcblxuXG4gICAgY29uc29sZS5sb2coJ3NhbXBsZXMgcGVyIGJpdCcsc2FtcGxlc19wZXJfYml0KVxuXG5cblxuICAgIC8vIG5fY2hhbm5lbHMgPSAxXG4gICAgbl9zYW1wbGVzID0gc2FtcGxlc19wZXJfYml0ICogbWVzc2FnZS5sZW5ndGhcbiAgICBuX3NlY29uZHMgPSBuX3NhbXBsZXMgLyBzYW1wbGVfcmF0ZVxuXG4gICAgY29uc29sZS5sb2coJ25fc2FtcGxlcycsIG5fc2FtcGxlcylcbiAgICBjb25zb2xlLmxvZygnbl9zZWNvbmRzJywgbl9zZWNvbmRzKVxuICAgIGNvbnNvbGUubG9nKCd0YXJnZXQgYmF1ZCcsIG1lc3NhZ2UubGVuZ3RoIC8gbl9zZWNvbmRzKVxuXG4gICAgc2FtcGxlX3RvX21lc3NhZ2VfaWR4ID0gZDMuc2NhbGUubGluZWFyKCkuZG9tYWluKFswLCBuX3NhbXBsZXNdKS5yYW5nZShbMCwgbWVzc2FnZS5sZW5ndGhdKVxuXG4gICAgdmFyIGF1ZGlvX2J1ZmZlciA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKG5fY2hhbm5lbHMsIG5fc2FtcGxlcywgc2FtcGxlX3JhdGUpXG4gICAgdmFyIGRhdGFBcnJheSA9IGF1ZGlvX2J1ZmZlci5nZXRDaGFubmVsRGF0YSgwKVxuXG4gICAgdmFyIGZyZXF1ZW5jaWVzID0gWzEwMDAsIDIwMDBdXG5cbiAgICBmb3IgKHZhciBzYW1wbGUgPSAwOyBzYW1wbGUgPCBkYXRhQXJyYXkubGVuZ3RoOyBzYW1wbGUrKykge1xuICAgICAgZGF0YUFycmF5W3NhbXBsZV0gPSAwXG5cbiAgICAgIHZhciBtZXNzYWdlX2lkeCA9IE1hdGguZmxvb3Ioc2FtcGxlX3RvX21lc3NhZ2VfaWR4KHNhbXBsZSkpXG5cbiAgICAgIGlmIChtZXNzYWdlW21lc3NhZ2VfaWR4XSA9PT0gJzAnKSB7XG4gICAgICAgIGZyZXF1ZW5jaWVzID0gWzEwMDAsIDEwMDAwXVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZnJlcXVlbmNpZXMgPSBbMjAwMF1cbiAgICAgIH1cblxuICAgICAgZnJlcXVlbmNpZXMuZm9yRWFjaChmdW5jdGlvbiAoaHosIGlkeCkge1xuICAgICAgICBkYXRhQXJyYXlbc2FtcGxlXSArPSBNYXRoLnNpbihzYW1wbGUgLyAoKHNhbXBsZV9yYXRlIC8gMikgLyBoeiAvIE1hdGguUEkpKVxuICAgICAgfSlcbiAgICAgIGRhdGFBcnJheVtzYW1wbGVdICo9IDEuMCAvIChmcmVxdWVuY2llcy5sZW5ndGggKyAxKVxuXG4gICAgICAvLyBjb25zb2xlLmxvZyhkYXRhQXJyYXlbc2FtcGxlXSlcbiAgICB9XG5cbiAgICByZXR1cm4gYXVkaW9fYnVmZmVyO1xuXG4gIH1cblxuICAvLyBkZWNvZGVyXG4gIGZ1bmN0aW9uIGRlY29kZShidWZmZXIsIG1lc3NhZ2VfbGVuZ3RoKSB7XG5cbiAgICB2YXIgZGVjb2RlZF9tZXNzYWdlID0gJydcblxuICAgIHZhciBkYXRhQXJyYXkgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMClcblxuICAgIHZhciBkZnRfc2l6ZSA9IDUxMlxuICAgIHZhciBkZnQgPSBuZXcgREZUKGRmdF9zaXplLCBzYW1wbGVfcmF0ZSlcblxuICAgIGZ1bmN0aW9uIHJ1bl9kZnQob2Zmc2V0KSB7XG5cbiAgICAgIGNvbnNvbGUudGltZSgncnVubmluZyBkZnQnKVxuXG4gICAgICBvZmZzZXQgPSBNYXRoLmZsb29yKG9mZnNldClcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdvZmZzZXQnLCBvZmZzZXQpXG4gICAgICAvLyBjb25zb2xlLmxvZygnc3BhcmVfcm9vbScsTWF0aC5hYnMob2Zmc2V0K2RmdF9zaXplIC0gZGF0YUFycmF5Lmxlbmd0aCkgLSBkZnRfc2l6ZSlcblxuICAgICAgdmFyIGRmdF9sb2NhbF9kYXRhQXJyYXkgPSBuZXcgRmxvYXQzMkFycmF5KGRmdF9zaXplKVxuICAgICAgZm9yICh2YXIgc2FtcGxlID0gMDsgc2FtcGxlIDwgZGZ0X2xvY2FsX2RhdGFBcnJheS5sZW5ndGg7IHNhbXBsZSsrKSB7XG5cbiAgICAgICAgLy8gYXNzZXJ0KHNhbXBsZStvZmZzZXQgPCBkYXRhQXJyYXkubGVuZ3RoLHRydWUpXG5cbiAgICAgICAgZGZ0X2xvY2FsX2RhdGFBcnJheVtzYW1wbGVdID0gZGF0YUFycmF5W3NhbXBsZSArIG9mZnNldF1cbiAgICAgIH1cblxuICAgICAgZGZ0LmZvcndhcmQoZGZ0X2xvY2FsX2RhdGFBcnJheSlcblxuICAgICAgY29uc29sZS50aW1lRW5kKCdydW5uaW5nIGRmdCcpXG5cbiAgICAgIHJldHVybiBbZGZ0LnNwZWN0cnVtWzEyXSwgZGZ0LnNwZWN0cnVtWzIzXSwgZGZ0LnNwZWN0cnVtWzExNl1dXG5cbiAgICB9XG5cbiAgICBmb3IgKHZhciBsZXR0ZXJfaWR4ID0gMDsgbGV0dGVyX2lkeCA8IG1lc3NhZ2VfbGVuZ3RoOyBsZXR0ZXJfaWR4KyspIHtcblxuICAgICAgdmFyIHJlc3VsdCA9IHJ1bl9kZnQoc2FtcGxlX3RvX21lc3NhZ2VfaWR4LmludmVydChsZXR0ZXJfaWR4KSlcblxuICAgICAgLy8gY29uc29sZS5sb2cocmVzdWx0KVxuXG4gICAgICB2YXIgbGltID0gMC4yXG5cbiAgICAgIGlmIChyZXN1bHRbMF0gPiBsaW0gJiYgcmVzdWx0WzFdIDwgbGltICYmIHJlc3VsdFsyXSA+IGxpbSkge1xuICAgICAgICBkZWNvZGVkX21lc3NhZ2UgKz0gJzAnXG4gICAgICB9IGVsc2UgaWYgKHJlc3VsdFswXSA8IGxpbSAmJiByZXN1bHRbMV0gPiBsaW0gJiYgcmVzdWx0WzJdIDwgbGltKSB7XG4gICAgICAgIGRlY29kZWRfbWVzc2FnZSArPSAnMSdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdlcnJvciBkZWNvZGluZycpXG4gICAgICB9XG5cblxuICAgIH1cblxuICAgIHJldHVybiBkZWNvZGVkX21lc3NhZ2VcblxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBlbmNvZGU6IGVuY29kZSxcbiAgICBkZWNvZGU6IGRlY29kZVxuICB9XG5cblxufVxuIl19
