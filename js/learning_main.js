window.scriptProcessor
window.start_time

window.onload = function () {

  var Modem = require('./modem.js')

  if (window.screen.width < 400) {

    d3.select('div#mobile_begin').on('click', function () {
      console.log('zomg wtf')
      d3.select(this).style('display', 'none')
      require('./encode_decode_dft.js')()
    })
  } else {
    d3.select('div#mobile_begin').remove()
    require('./encode_decode_dft.js')()
  }


  return;

  var sample_idx = 0
  start_time = 0
  var _t = Date.now()

  // console.log = function(){}

  // var Modem = require('./modem.js')
  var View_Controller = require('./modem_view.js')

  var modem = Modem.modem({
    name: 'modem',
    type: 'normy',
    id: 'modemA'
  })

  modem.setup_analyser()
  modem.analyse()

  modem.setup_transmitter()

  var ifaces = modem.get_interfaces()

  var analyser = ifaces.analyser


  // create very long buffer
  var n_seconds = 1
  var long_buf = context.createBuffer(1,n_seconds*44100,44100)
  console.log(long_buf)
  var channel_data = long_buf.getChannelData(0)

  window.lb = long_buf
  window.channel_data = channel_data

  console.log(channel_data)

  var programmed_freqs = [12000, 13000, 14000]

  for(var i = 0; i < channel_data.length; i++){

    programmed_freqs.forEach(function (hz, idx) {

      if(i > channel_data.length / 2){
        hz *= 0.5
      }

      multi = (context.sampleRate / 2) / hz / Math.PI

      channel_data[i] += Math.sin(i / multi)

    })
    channel_data[i] *= 1 / (programmed_freqs.length + 1)
  }

  var n_to_transfer = 1024*2
  window.kk = new Float32Array(n_to_transfer)
  for(var p = 0; p < n_to_transfer; p++){
    window.kk[p] = channel_data[p]
  }

  var source = context.createBufferSource();
  // set the buffer in the AudioBufferSourceNode
  source.buffer = long_buf;
  // connect the AudioBufferSourceNode to the
  // destination so we can hear the sound
  source.connect(analyser);
  // start the source playing

  source.loopStart = 0.1
  source.loopEnd = 0.11
  source.loop = true

  source.start();

  window.zomg = source

  // var freqDomain = new Float32Array(analyser.frequencyBinCount);
  // var freqDomainB = new Uint8Array(analyser.frequencyBinCount);
  //
  // window.gf = function getFrequencyValue(frequency) {
  //   analyser.getFloatFrequencyData(freqDomain);
  //   analyser.getByteFrequencyData(freqDomainB);
  //
  //   var nyquist = context.sampleRate / 2;
  //   var index = Math.round(frequency / nyquist * freqDomain.length);
  //   return freqDomain[index];
  // }

  window.recorder = new Recorder(ifaces.master_gain)

  ifaces.master_gain.connect(ifaces.analyser)

  var display_bob = View_Controller.view_controller('test_modem')
  display_bob.connect(modem)
  display_bob.setup_svg()

  var use_interval = true
  var interval_time = 100

  window.interval

  var mean = 127

  var n_errors = 0

  function interval_tick() {

    modem.analyse()

    display_bob.tick(true)

    if (!use_interval) {
      window.requestAnimationFrame(interval_tick)
    }

  }

  if (!use_interval) {
    interval_tick()
  } else {
    window.interval = setInterval(interval_tick, interval_time)
  }

  window.m = modem

  return;

}




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
