var assert = require('assert').equal

module.exports = function(){

  var message = '011001'

  console.log(context)

  var n_channels = 1
  var n_seconds = 1.0
  var sample_rate = context.sampleRate

  var n_samples = n_seconds * sample_rate

  console.log('n_samples',n_samples)

  var sample_to_message_idx = d3.scale.linear().domain([0,n_samples]).range([0,message.length])

  var audio_buffer = context.createBuffer(n_channels, n_samples, sample_rate)
  var dataArray = audio_buffer.getChannelData(0)

  assert(dataArray.length, n_samples)

  var frequencies = [1000, 2000]

  for(var sample = 0; sample < dataArray.length; sample++){
    dataArray[sample] = 0

    var message_idx = Math.floor(sample_to_message_idx(sample))

    // console.log(message_idx)

    if(message[message_idx] === '0'){

      frequencies = [1000,10000]
    } else {
      frequencies = [2000]
    }

    frequencies.forEach(function (hz, idx) {
      dataArray[sample] += Math.sin(sample / ((sample_rate / 2) / hz / Math.PI))
    })
    dataArray[sample] *= 1.0 / (frequencies.length+1)

    // console.log(dataArray[sample])
  }

  // copy frames of the data to the dft

  var dft_size = 512
  var dft = new DFT(dft_size, sample_rate)


  function run_dft(offset){

    console.log(offset+dft_size - dataArray.length)

    var dft_local_dataArray = new Float32Array(dft_size)
    for(var sample = 0; sample < dft_local_dataArray.length; sample++){

      assert(sample+offset < dataArray.length,true)

      dft_local_dataArray[sample] = dataArray[sample+offset]
    }

    dft.forward(dft_local_dataArray)

    var l = dft.spectrum.length
    for(var spectrum_idx = 0; spectrum_idx < l; spectrum_idx++){
      // console.log(spectrum_idx,dft.spectrum[spectrum_idx])
    }

    return [dft.spectrum[12],dft.spectrum[23],dft.spectrum[116]]

  }

  for(var letter_idx = 0; letter_idx < message.length; letter_idx++){
    console.log(letter_idx,message[letter_idx])

    var result = run_dft(sample_to_message_idx.invert(letter_idx))

    console.log(result)


    if(message[letter_idx] === '0'){
      assert(result[0] > 0.2, true)
      assert(result[1] < 0.2, true)
      assert(result[2] > 0.2, true)
    } else {
      assert(result[0] < 0.2, true)
      assert(result[1] > 0.2, true)
      assert(result[2] < 0.2, true)
    }


  }


}
