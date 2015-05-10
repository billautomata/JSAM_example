window.scriptProcessor
window.start_time

window.onload = function () {



  var sample_idx = 0
  start_time = 0
  var _t = Date.now()

  // console.log = function(){}

  var Modem = require('./modem.js')
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

  ifaces.gain_bank.forEach(function (b) {
    b.gain.value = 0.1
      // b.connect(ifaces.analyser)
  })

  var analyser = ifaces.analyser
  var freqDomain = new Float32Array(analyser.frequencyBinCount);
  var freqDomainB = new Uint8Array(analyser.frequencyBinCount);

  window.gf = function getFrequencyValue(frequency) {
    analyser.getFloatFrequencyData(freqDomain);
    analyser.getByteFrequencyData(freqDomainB);

    var nyquist = context.sampleRate / 2;
    var index = Math.round(frequency / nyquist * freqDomain.length);
    return freqDomain[index];
  }

  window.recorder = new Recorder(ifaces.master_gain)

  ifaces.master_gain.connect(ifaces.analyser)

  var display_bob = View_Controller.view_controller('test_modem')
  display_bob.connect(modem)
  display_bob.setup_svg()


  var use_interval = false
  var interval_time = 50

  window.interval

  var mean = 180

  var n_errors = 0

  function interval_tick() {

    // console.log('////')
    modem.analyse()
      //
      // ifaces.peaks.forEach(function(peak_value,peak_idx){
      //
      //   if(ifaces.gain_bank[peak_idx].gain.value > 0 && peak_value <= mean){
      //     console.log(peak_value)
      //     console.log('err too low!!!!' + peak_idx+' '+n_errors)
      //     n_errors ++
      //   }
      //   if(ifaces.gain_bank[peak_idx].gain.value === 0.0 && peak_value > mean){
      //     console.log(peak_value)
      //     console.log('err too high!!!!' + peak_idx+' '+n_errors)
      //     n_errors ++
      //   }
      //
      // })

    // console.log(ifaces.peaks)
    // var peaks = modem.get_interfaces().peaks


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
