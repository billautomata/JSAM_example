var scriptProcessor
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

  modem.setup_transmitter(1)

  var ifaces = modem.get_interfaces()

  window.recorder = new Recorder(ifaces.master_gain)

  // ifaces.master_gain.connect(ifaces.analyser)

  var display_bob = View_Controller.view_controller('test_modem')
  display_bob.connect(modem)
  display_bob.setup_svg()

  var bufferSize = 1024 * 16
  scriptProcessor = context.createScriptProcessor(bufferSize, 1, 1)

  var g = context.createGain()
    // g.gain.value = 0.2

  // ifaces.master_gain.connect(scriptProcessor)
  scriptProcessor.connect(g)
  g.connect(ifaces.analyser)

  // scriptProcessor.connect(context.destination)

  window.huh = true

  // Give the node a function to process audio events
  scriptProcessor.onaudioprocess = function (audioProcessingEvent) {

    sample_idx = 0

    // console.log((Date.now()-_t))

    // console.log(audioProcessingEvent.inputBuffer.length)
    // console.log('here')

    // The input buffer is the song we loaded earlier
    var inputBuffer = audioProcessingEvent.inputBuffer;

    // The output buffer contains the samples that will be modified and played
    var outputBuffer = audioProcessingEvent.outputBuffer;

    // Loop through the output channels (in this case there is only one)
    for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {

      var inputData = inputBuffer.getChannelData(channel);
      var outputData = outputBuffer.getChannelData(channel);

      for (var sample = 0; sample < inputBuffer.length; sample++) {

        outputData[sample] = Math.sin(sample_idx / (1 + start_time)) * 0.1
        sample_idx++
        start_time += (0.01/inputBuffer.length)

      }

    }

    console.log(start_time)
    if(start_time > 0.1){
      start_time = 0.001
    }
    _t = Date.now()

  }

  scriptProcessor.ontime

  function interval_tick() {

    modem.analyse()
    display_bob.tick(true)

    // var n = m.get_interfaces().osc_bank[0].frequency.value
    // n += 100
    // if(n > 20000){
    //   n = 100
    // }

    // m.get_interfaces().osc_bank[0].frequency.value = n
    // m.get_interfaces().osc_bank[0].frequency.value = m.get_interfaces().osc_bank[0].frequency.value + 100

    window.requestAnimationFrame(interval_tick)
  }

  interval_tick()

  window.m = modem

  m.get_interfaces().gain_bank[0].gain.value = 0.1

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
