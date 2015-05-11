var assert = require('assert').equal

module.exports = function(){

  var assert = function(){}

  var amessage = '011001011101101010101101010101010010111101'
  var message = amessage

  console.log('message length', message.length)

  // var byte_string =z require('./example_wav_b64.js')
  // // console.log(byte_string)
  // var preloaded_buffer = new ArrayBuffer(byte_string.length*2)
  // var preloaded_buffer_view = new Uint16Array(preloaded_buffer,0,preloaded_buffer.length)
  // for(var i = 0; i < byte_string.length; i++){
  //   preloaded_buffer_view[i] = byte_string.charCodeAt(i)
  //   // console.log(preloaded_buffer_view[i])
  // }
  //
  // console.log(preloaded_buffer_view.length)
  //
  // console.log(context)
  //
  // context.decodeAudioData(preloaded_buffer,function(b,q,d){
  //   console.log(b,q,d)
  //
  //   console.log('here')
  //   console.log(b)
  //   var s = contex.createBufferSource()
  //   s.buffer = b
  //   s.connect(context.destination)
  //   s.start(0)
  //
  // }, function(b,q,d){
  //
  //   console.log(b,q,d)
  // })


  function getData() {
    window.source = context.createBufferSource();
    request = new XMLHttpRequest();

    request.open('GET', 'example.wav', true);

    request.responseType = 'arraybuffer';


    request.onload = function() {
      var audioData = request.response;

      context.decodeAudioData(audioData, function(buffer) {
        console.log(buffer)
          source.buffer = buffer;

          // source.connect(context.destination);
          // source.loop = true;
          source.start(0)
        },

        function(e){"Error with decoding audio data" + e.err});

    }

    request.send();
  }


  getData(0)

  var n_channels = 1
  var n_seconds = 2.0
  var sample_rate = context.sampleRate

  var n_samples = n_seconds * sample_rate

  console.log('n_samples',n_samples)
  console.log('target baud', message.length/n_seconds)

  var sample_to_message_idx = d3.scale.linear().domain([0,n_samples]).range([0,message.length])

  var audio_buffer = context.createBuffer(n_channels, n_samples, sample_rate)
  var dataArray = audio_buffer.getChannelData(0)

  assert(dataArray.length, n_samples)

  var frequencies = [1000, 2000]

  for(var sample = 0; sample < dataArray.length; sample++){
    dataArray[sample] = 0

    var message_idx = Math.floor(sample_to_message_idx(sample))

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

    console.time('running dft')

    offset = Math.floor(offset)
    console.log('offset', offset)
    console.log('spare_room',Math.abs(offset+dft_size - dataArray.length) - dft_size)

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

    console.timeEnd('running dft')

    return [dft.spectrum[12],dft.spectrum[23],dft.spectrum[116]]

  }
  //
  // for(var letter_idx = 0; letter_idx < message.length; letter_idx++){
  //   console.log(letter_idx,message[letter_idx])
  //
  //   var result = run_dft(sample_to_message_idx.invert(letter_idx))
  //
  //   console.log(result)
  //
  //   if(message[letter_idx] === '0'){
  //     assert(result[0] > 0.2, true)
  //     assert(result[1] < 0.2, true)
  //     assert(result[2] > 0.2, true)
  //   } else {
  //     assert(result[0] < 0.2, true)
  //     assert(result[1] > 0.2, true)
  //     assert(result[2] < 0.2, true)
  //   }
  //
  //
  // }

  window.recorder = new Recorder(context.createGain(), {numChannels: 1})

  console.log(Object.keys(audio_buffer))

  recorder.setBuffer([dataArray], function(){
    console.log('done setting buffer')
  })

  setTimeout(createDownloadLink,100)

  window.createDownloadLink = function createDownloadLink() {
    recorder && recorder.exportWAV(function (blob) {
      var url = URL.createObjectURL(blob);
      var li = document.createElement('li');
      var au = document.createElement('audio');
      var hf = document.createElement('a');

      au.controls = true;
      au.src = url;
      hf.href = url;
      hf.download = new Date().toISOString() + '.wav';
      hf.innerHTML = hf.download;
      li.appendChild(au);
      li.appendChild(hf);
      d3.select('body').append('div').node().appendChild(li);
    });
  }


}
