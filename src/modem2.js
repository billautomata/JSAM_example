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
