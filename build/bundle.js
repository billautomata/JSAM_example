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

  var config = {}
  var modem = Modem.modem(config)

  var encoded_message = '01011'

  var AudioBuffer = modem.encode(encoded_message) // returns an audio buffer
  var decoded_message = modem.decode(AudioBuffer,encoded_message.length)

  console.log(encoded_message,decoded_message)

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

  // encoder

  var n_channels
  var n_seconds
  var sample_rate
  var n_samples
  var sample_to_message_idx
  var message

  function encode(_message) {

    message = _message

    n_channels = 1
    n_seconds = 2.0
    sample_rate = context.sampleRate

    n_samples = n_seconds * sample_rate

    console.log('n_samples', n_samples)
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

      var l = dft.spectrum.length
      for (var spectrum_idx = 0; spectrum_idx < l; spectrum_idx++) {
        // console.log(spectrum_idx,dft.spectrum[spectrum_idx])
      }

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9tb2RlbTIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIndpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG5cbiAgaWYgKHdpbmRvdy5zY3JlZW4ud2lkdGggPCA0MDApIHtcblxuICAgIGQzLnNlbGVjdCgnZGl2I21vYmlsZV9iZWdpbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGQzLnNlbGVjdCh0aGlzKS5zdHlsZSgnZGlzcGxheScsICdub25lJylcbiAgICB9KVxuXG4gIH0gZWxzZSB7XG5cbiAgICBkMy5zZWxlY3QoJ2RpdiNtb2JpbGVfYmVnaW4nKS5yZW1vdmUoKVxuICAgIGJlZ2luKClcbiAgfVxuXG59XG5cbnZhciBNb2RlbSA9IHJlcXVpcmUoJy4vbW9kZW0yLmpzJylcblxuZnVuY3Rpb24gYmVnaW4oKXtcblxuICB2YXIgY29uZmlnID0ge31cbiAgdmFyIG1vZGVtID0gTW9kZW0ubW9kZW0oY29uZmlnKVxuXG4gIHZhciBlbmNvZGVkX21lc3NhZ2UgPSAnMDEwMTEnXG5cbiAgdmFyIEF1ZGlvQnVmZmVyID0gbW9kZW0uZW5jb2RlKGVuY29kZWRfbWVzc2FnZSkgLy8gcmV0dXJucyBhbiBhdWRpbyBidWZmZXJcbiAgdmFyIGRlY29kZWRfbWVzc2FnZSA9IG1vZGVtLmRlY29kZShBdWRpb0J1ZmZlcixlbmNvZGVkX21lc3NhZ2UubGVuZ3RoKVxuXG4gIGNvbnNvbGUubG9nKGVuY29kZWRfbWVzc2FnZSxkZWNvZGVkX21lc3NhZ2UpXG5cbiAgd2luZG93Lm0gPSBtb2RlbVxuXG59XG4iLCJtb2R1bGUuZXhwb3J0cy5tb2RlbSA9IE1vZGVtXG5cbjtcbihmdW5jdGlvbiBzZXR1cF9nbG9iYWxfYXVkaW9fY29udGV4dCgpIHtcbiAgaWYgKHdpbmRvdy5jb250ZXh0ID09PSB1bmRlZmluZWQpIHtcbiAgICBjb25zb2xlLmxvZygnY3JlYXRpbmcgbmV3IHdpbmRvdy5BdWRpb0NvbnRleHQoKSBhdCB3aW5kb3cuY29udGV4dCcpXG4gICAgd2luZG93LkF1ZGlvQ29udGV4dCA9IChcbiAgICAgIHdpbmRvdy5BdWRpb0NvbnRleHQgfHxcbiAgICAgIHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQgfHxcbiAgICAgIHdpbmRvdy5tb3pBdWRpb0NvbnRleHQgfHxcbiAgICAgIHdpbmRvdy5tc0F1ZGlvQ29udGV4dFxuICAgIClcbiAgICB3aW5kb3cuY29udGV4dCA9IG5ldyB3aW5kb3cuQXVkaW9Db250ZXh0KClcbiAgfVxufSkoKVxuXG5mdW5jdGlvbiBNb2RlbShjb25maWcpIHtcblxuICAvLyBlbmNvZGVyXG5cbiAgdmFyIG5fY2hhbm5lbHNcbiAgdmFyIG5fc2Vjb25kc1xuICB2YXIgc2FtcGxlX3JhdGVcbiAgdmFyIG5fc2FtcGxlc1xuICB2YXIgc2FtcGxlX3RvX21lc3NhZ2VfaWR4XG4gIHZhciBtZXNzYWdlXG5cbiAgZnVuY3Rpb24gZW5jb2RlKF9tZXNzYWdlKSB7XG5cbiAgICBtZXNzYWdlID0gX21lc3NhZ2VcblxuICAgIG5fY2hhbm5lbHMgPSAxXG4gICAgbl9zZWNvbmRzID0gMi4wXG4gICAgc2FtcGxlX3JhdGUgPSBjb250ZXh0LnNhbXBsZVJhdGVcblxuICAgIG5fc2FtcGxlcyA9IG5fc2Vjb25kcyAqIHNhbXBsZV9yYXRlXG5cbiAgICBjb25zb2xlLmxvZygnbl9zYW1wbGVzJywgbl9zYW1wbGVzKVxuICAgIGNvbnNvbGUubG9nKCd0YXJnZXQgYmF1ZCcsIG1lc3NhZ2UubGVuZ3RoIC8gbl9zZWNvbmRzKVxuXG4gICAgc2FtcGxlX3RvX21lc3NhZ2VfaWR4ID0gZDMuc2NhbGUubGluZWFyKCkuZG9tYWluKFswLCBuX3NhbXBsZXNdKS5yYW5nZShbMCwgbWVzc2FnZS5sZW5ndGhdKVxuXG4gICAgdmFyIGF1ZGlvX2J1ZmZlciA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKG5fY2hhbm5lbHMsIG5fc2FtcGxlcywgc2FtcGxlX3JhdGUpXG4gICAgdmFyIGRhdGFBcnJheSA9IGF1ZGlvX2J1ZmZlci5nZXRDaGFubmVsRGF0YSgwKVxuXG4gICAgdmFyIGZyZXF1ZW5jaWVzID0gWzEwMDAsIDIwMDBdXG5cbiAgICBmb3IgKHZhciBzYW1wbGUgPSAwOyBzYW1wbGUgPCBkYXRhQXJyYXkubGVuZ3RoOyBzYW1wbGUrKykge1xuICAgICAgZGF0YUFycmF5W3NhbXBsZV0gPSAwXG5cbiAgICAgIHZhciBtZXNzYWdlX2lkeCA9IE1hdGguZmxvb3Ioc2FtcGxlX3RvX21lc3NhZ2VfaWR4KHNhbXBsZSkpXG5cbiAgICAgIGlmIChtZXNzYWdlW21lc3NhZ2VfaWR4XSA9PT0gJzAnKSB7XG4gICAgICAgIGZyZXF1ZW5jaWVzID0gWzEwMDAsIDEwMDAwXVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZnJlcXVlbmNpZXMgPSBbMjAwMF1cbiAgICAgIH1cblxuICAgICAgZnJlcXVlbmNpZXMuZm9yRWFjaChmdW5jdGlvbiAoaHosIGlkeCkge1xuICAgICAgICBkYXRhQXJyYXlbc2FtcGxlXSArPSBNYXRoLnNpbihzYW1wbGUgLyAoKHNhbXBsZV9yYXRlIC8gMikgLyBoeiAvIE1hdGguUEkpKVxuICAgICAgfSlcbiAgICAgIGRhdGFBcnJheVtzYW1wbGVdICo9IDEuMCAvIChmcmVxdWVuY2llcy5sZW5ndGggKyAxKVxuXG4gICAgICAvLyBjb25zb2xlLmxvZyhkYXRhQXJyYXlbc2FtcGxlXSlcbiAgICB9XG5cbiAgICByZXR1cm4gYXVkaW9fYnVmZmVyO1xuXG4gIH1cblxuICAvLyBkZWNvZGVyXG4gIGZ1bmN0aW9uIGRlY29kZShidWZmZXIsIG1lc3NhZ2VfbGVuZ3RoKSB7XG5cbiAgICB2YXIgZGVjb2RlZF9tZXNzYWdlID0gJydcblxuICAgIHZhciBkYXRhQXJyYXkgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMClcblxuICAgIHZhciBkZnRfc2l6ZSA9IDUxMlxuICAgIHZhciBkZnQgPSBuZXcgREZUKGRmdF9zaXplLCBzYW1wbGVfcmF0ZSlcblxuICAgIGZ1bmN0aW9uIHJ1bl9kZnQob2Zmc2V0KSB7XG5cbiAgICAgIGNvbnNvbGUudGltZSgncnVubmluZyBkZnQnKVxuXG4gICAgICBvZmZzZXQgPSBNYXRoLmZsb29yKG9mZnNldClcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdvZmZzZXQnLCBvZmZzZXQpXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdzcGFyZV9yb29tJyxNYXRoLmFicyhvZmZzZXQrZGZ0X3NpemUgLSBkYXRhQXJyYXkubGVuZ3RoKSAtIGRmdF9zaXplKVxuXG4gICAgICB2YXIgZGZ0X2xvY2FsX2RhdGFBcnJheSA9IG5ldyBGbG9hdDMyQXJyYXkoZGZ0X3NpemUpXG4gICAgICBmb3IgKHZhciBzYW1wbGUgPSAwOyBzYW1wbGUgPCBkZnRfbG9jYWxfZGF0YUFycmF5Lmxlbmd0aDsgc2FtcGxlKyspIHtcblxuICAgICAgICAvLyBhc3NlcnQoc2FtcGxlK29mZnNldCA8IGRhdGFBcnJheS5sZW5ndGgsdHJ1ZSlcblxuICAgICAgICBkZnRfbG9jYWxfZGF0YUFycmF5W3NhbXBsZV0gPSBkYXRhQXJyYXlbc2FtcGxlICsgb2Zmc2V0XVxuICAgICAgfVxuXG4gICAgICBkZnQuZm9yd2FyZChkZnRfbG9jYWxfZGF0YUFycmF5KVxuXG4gICAgICB2YXIgbCA9IGRmdC5zcGVjdHJ1bS5sZW5ndGhcbiAgICAgIGZvciAodmFyIHNwZWN0cnVtX2lkeCA9IDA7IHNwZWN0cnVtX2lkeCA8IGw7IHNwZWN0cnVtX2lkeCsrKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHNwZWN0cnVtX2lkeCxkZnQuc3BlY3RydW1bc3BlY3RydW1faWR4XSlcbiAgICAgIH1cblxuICAgICAgY29uc29sZS50aW1lRW5kKCdydW5uaW5nIGRmdCcpXG5cbiAgICAgIHJldHVybiBbZGZ0LnNwZWN0cnVtWzEyXSwgZGZ0LnNwZWN0cnVtWzIzXSwgZGZ0LnNwZWN0cnVtWzExNl1dXG5cbiAgICB9XG5cbiAgICBmb3IgKHZhciBsZXR0ZXJfaWR4ID0gMDsgbGV0dGVyX2lkeCA8IG1lc3NhZ2VfbGVuZ3RoOyBsZXR0ZXJfaWR4KyspIHtcblxuICAgICAgdmFyIHJlc3VsdCA9IHJ1bl9kZnQoc2FtcGxlX3RvX21lc3NhZ2VfaWR4LmludmVydChsZXR0ZXJfaWR4KSlcblxuICAgICAgLy8gY29uc29sZS5sb2cocmVzdWx0KVxuXG4gICAgICB2YXIgbGltID0gMC4yXG5cbiAgICAgIGlmIChyZXN1bHRbMF0gPiBsaW0gJiYgcmVzdWx0WzFdIDwgbGltICYmIHJlc3VsdFsyXSA+IGxpbSkge1xuICAgICAgICBkZWNvZGVkX21lc3NhZ2UgKz0gJzAnXG4gICAgICB9IGVsc2UgaWYgKHJlc3VsdFswXSA8IGxpbSAmJiByZXN1bHRbMV0gPiBsaW0gJiYgcmVzdWx0WzJdIDwgbGltKSB7XG4gICAgICAgIGRlY29kZWRfbWVzc2FnZSArPSAnMSdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdlcnJvciBkZWNvZGluZycpXG4gICAgICB9XG5cblxuICAgIH1cblxuICAgIHJldHVybiBkZWNvZGVkX21lc3NhZ2VcblxuICB9XG5cblxuXG5cblxuICByZXR1cm4ge1xuICAgIGVuY29kZTogZW5jb2RlLFxuICAgIGRlY29kZTogZGVjb2RlXG4gIH1cblxuXG59XG4iXX0=
