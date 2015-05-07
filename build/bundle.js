(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

module.exports.agent = agent

var BYTES_TO_ENCODE = 1

function agent(opts) {

  var myAudio = document.querySelector('audio');

  (function setup_audio_context() {
    if (window.context === undefined) {
      console.log('creating new window.AudioContext()')

      navigator.getMedia = (
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia
      );

      window.AudioContext = (
        window.AudioContext ||
        window.webkitAudioContext ||
        window.mozAudioContext ||
        window.msAudioContext
      );


      // if(window.AudioConext === undefined){
      //   window.context = new window.webkitAudioContext()
      // } else {
        window.context = new window.AudioContext()
      // }

    }
    console.log('done.')
  })()

  //
  var ERROR_RATE

  var MESSAGE
  var MESSAGE_IDX = 0

  var LAST_SENT_MESSAGE = ''
  var CURRENT_ENCODED_MESSAGE = ''

  var LATEST_RX_BLOB = ''
  var PREV_RX_BLOB = ''

  var RX_BUFFER = ''
  var CONNECTED_AT


  var name
  var type

  var analyser = context.createAnalyser()
  var analyserDataArray // the buffer the analyser writes to
  var bufferLength // the length of the analyserDataArray

  var localAnalyser = context.createAnalyser()
  var localAnalyserDataArray // the buffer the analyser writes to

  var peak_ranges // flat list of indexes of detected peak ranges
  var grouped_peak_ranges // clustered groups of peak ranges
  var mean // the threshold for determining if a band is peaked

  var flip_flop = true

  var prev_high_channel = -1
  var current_high_channel = 0
  var SYNC_COUNT = 0

  var osc_bank = []
  var gain_bank = []
  var filter_bank = []

  var master_gain

  // var n_osc = 44
  var n_osc = (8*BYTES_TO_ENCODE) + 3

  if(BYTES_TO_ENCODE === 1){
    n_osc = 14
  }

  var freqRange = 10000
  var spread = (freqRange / n_osc)
  var initialFreq = 200

  var CURRENT_STATE = -1

  function tick() {

    console.log(name,CURRENT_STATE)

    var ret_obj = {
      new_data: false,
      data: ''
    }

    if (CURRENT_STATE < 0) {

      // performing initialization process, do nothing
      return;

    } else {

      if (CURRENT_STATE === 0) {

        register_peak_ranges()

        if(grouped_peak_ranges !== undefined){
          if (grouped_peak_ranges.length === n_osc) {
            CURRENT_STATE = 1
          }
        }

      } else if (CURRENT_STATE === 1) {

        perform_signaling()
        look_for_signaling()

        if (SYNC_COUNT > 2) {
          CURRENT_STATE = 2
          CONNECTED_AT = Date.now()
        }

      } else if (CURRENT_STATE === 2) {

        // encode byte
        // var byte_to_send = MESSAGE[MESSAGE_IDX].charCodeAt(0)
        // encode_byte(byte_to_send)

        // encode byte array
        var substring = MESSAGE.substr(MESSAGE_IDX,BYTES_TO_ENCODE)
        encode_string(substring)

        if (look_for_signaling()) {

          // read byte
          //RX_BUFFER += String.fromCharCode(read_byte_from_signal())
          var bytes_on_wire_string = read_byte_array_from_signal(BYTES_TO_ENCODE)

          PREV_RX_BLOB = LATEST_RX_BLOB
          LATEST_RX_BLOB = bytes_on_wire_string
          RX_BUFFER += bytes_on_wire_string
          // console.log(RX_BUFFER)

          if (type === 'client') {
            ret_obj.new_data = true
            ret_obj.data = String.fromCharCode(read_byte_from_signal(BYTES_TO_ENCODE))
          }

          // increment byte to encode
          MESSAGE_IDX += BYTES_TO_ENCODE
          if(MESSAGE_IDX >= MESSAGE.length){
            MESSAGE_IDX = 0
          }
          // MESSAGE_IDX = MESSAGE_IDX % MESSAGE.length

          // setTimeout(function(){
            perform_signaling()
          // },2)


        }

      } // end of CURRENT_STATE === 2

    }

    return ret_obj

  }

  function look_for_signaling() {

    var valid_ranges = validate_ranges()
    if (valid_ranges[8] === true && valid_ranges[9] === false) {
      current_high_channel = 8
    } else {
      current_high_channel = 9
    }

    var difference_found = false

    if (current_high_channel !== prev_high_channel) {
      difference_found = true
      SYNC_COUNT += 1
    }

    prev_high_channel = current_high_channel

    return difference_found

  }

  function init(opts) {

    name = opts.name

    if(opts.type === 'mic'){

      navigator.getMedia = (
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia
      );

      navigator.getMedia (
            // constraints: audio and video for this app
            {
               audio: true,
               video: false
            },

            // Success callback
            function(stream) {
              //  video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;
              //  video.onloadedmetadata = function(e) {
              //     video.play();
              //     video.muted = 'true';
              //  };

               // Create a MediaStreamAudioSourceNode
               // Feed the HTMLMediaElement into it
               var source = context.createMediaStreamSource(stream);
               source.connect(analyser)
               CURRENT_STATE = 0
               console.log('done connecting ',name)
                // Create a biquadfilter
                // var biquadFilter = audioCtx.createBiquadFilter();
                // biquadFilter.type = "lowshelf";
                // biquadFilter.frequency.value = 1000;
                // biquadFilter.gain.value = range.value;

                // connect the AudioBufferSourceNode to the gainNode
                // and the gainNode to the destination, so we can play the
                // music and adjust the volume using the mouse cursor
                // source.connect(biquadFilter);
                // biquadFilter.connect(audioCtx.destination);

                // Get new mouse pointer coordinates when mouse is moved
                // then set new gain value

                // range.oninput = function() {
                //     biquadFilter.gain.value = range.value;
                // }

            },

            // Error callback
            function(err) {
               console.log('The following gUM error occured: ' + err);
            }
         );

    }

    master_gain = context.createGain()
    master_gain.gain.value = 0
    master_gain.connect(context.destination)

    MESSAGE = opts.message
    type = opts.type

    // create osc + gain banks
    for (var idx = 0; idx < n_osc; idx++) {

      var local_osc = context.createOscillator()
      local_osc.frequency.value = (idx * spread) + initialFreq

      var local_gain = context.createGain()
      local_gain.gain.value = 1.0 / (n_osc-1)

      // var local_filter = context.createBiquadFilter()
      // local_filter.type = 'bandpass'
      // local_filter.frequency.value = (idx * spread) + initialFreq
      // local_filter.Q.value = 1.0
      //
      // window.d = local_filter

      local_osc.connect(local_gain)

      // local_gain.connect(local_filter)

      local_gain.connect(localAnalyser)
      local_gain.connect(master_gain)
      // local_gain.connect(context.destination)

      local_osc.start(0)
      // local_osc.noteOn(100)

      osc_bank.push(local_osc)
      gain_bank.push(local_gain)
      // filter_bank.push(local_filter)

    }

    var fftSize = 512

    analyser.fftSize = fftSize
    analyser.smoothingTimeConstant = 0
    bufferLength = analyser.frequencyBinCount
    analyserDataArray = new Uint8Array(bufferLength)

    localAnalyser.fftSize = fftSize
    localAnalyser.smoothingTimeConstant = 0
    localAnalyserDataArray = new Uint8Array(bufferLength)

  }

  function connect(other_agent) {

    var other_gain_bank = other_agent.get_gain_bank()

    other_gain_bank.forEach(function (gainNode) {
      gainNode.connect(analyser)
    })

    // var other_filter_bank = other_agent.get_filter_bank()
    //
    // other_filter_bank.forEach(function(filterNode){
    //   filterNode.connect(analyser)
    // })

    getBuffer()

    setTimeout(function () {
      console.log('done connecting')
      CURRENT_STATE = 0
    }, 200)

  }

  function set_message(msg){
    MESSAGE = msg
    MESSAGE_IDX = 0
  }

  function n_channels() {
    return n_osc
  }

  function get_groups() {
    return grouped_peak_ranges
  }

  function getBuffer() {
    analyser.getByteFrequencyData(analyserDataArray)
    return analyserDataArray
  }
  function get_local_frequency_data_buffer() {
    localAnalyser.getByteFrequencyData(localAnalyserDataArray)
    return localAnalyserDataArray
  }

  function get_gain_bank() {
    return gain_bank
  }

  function get_filter_bank() {
    return filter_bank
  }


  function get_analyser() {
    return analyser
  }


  function read_byte_from_signal() {

    var ranges = validate_ranges()
    // console.log(ranges)

    var binary_string = ''
    for (var i = 0; i < 8; i++) {
      if (ranges[i]) {
        binary_string += '1'
      } else {
        binary_string += '0'
      }
    }

    return parseInt(binary_string, 2)

  }


  function read_byte_array_from_signal(byte_count) {

    var return_array = ''

    var ranges = validate_ranges()
    // console.log(ranges)

    for(var byte_count_idx = 0; byte_count_idx < byte_count; byte_count_idx++){

      var offset = 0
      if(byte_count_idx > 0){
        offset += 2 + (byte_count_idx*8)
      }

      var binary_string = ''
      for (var i = 0+offset; i < 8+offset; i++) {
        if (ranges[i]) {
          binary_string += '1'
        } else {
          binary_string += '0'
        }
      }

      var byte = parseInt(binary_string, 2)
      return_array += String.fromCharCode(byte)
    }

    // console.log(return_array)
    return return_array

  }

  function register_peak_ranges() {

    console.log('registering peak ranges ' + name)

    getBuffer()
    console.log(analyserDataArray)

    // push on to new array for sorting
    var d = []
    for (var i = 0; i < bufferLength; i++) {
      if (analyserDataArray[i] > 0) {
        d.push(analyserDataArray[i])
      }
    }
    d.sort(function (a, b) {
      return a - b
    })
    console.log('Mean: ' + d[Math.floor(d.length / 2)])

    mean = d[Math.floor(d.length / 2)]

    //
    peak_ranges = []
    for (var i = 0; i < bufferLength; i++) {
      if (analyserDataArray[i] > mean) {
        peak_ranges.push(i)
      }
    }

    // window.p = peak_ranges

    group_peak_ranges()

  }

  function check_peak_ranges() {

    getBuffer()

    var hits = []
    peak_ranges.forEach(function (dataArray_idx) {
      if (analyserDataArray[dataArray_idx] > mean) {
        hits.push(true)
      } else {
        hits.push(false)
      }
    })

    return hits

  }

  function group_peak_ranges() {

    if (peak_ranges === undefined || peak_ranges.length === 0) {
      return;
    }

    var groups = [] // [ [1,2,3], [8,9,10], [30,31,32]  ]

    var current_group_idx = 0

    var local_group = new Array()

    peak_ranges.forEach(function (peak_idx, idx) {

      // if the Math.abs(peak_idx - peak_ranges[idx+1]) === 1
      //    push peak_idx on to local_group
      // else
      //    push local_group on to groups
      //    clear local_group
      //    push peak_idx on to local_group

      if (idx === peak_ranges.length - 1) {
        // console.log('here')
        return;
      }

      if (Math.abs(peak_idx - peak_ranges[idx + 1]) <= 2) {
        local_group.push(peak_idx)
      } else {
        local_group.push(peak_idx)
        groups.push(local_group)
        local_group = new Array()
      }

    })

    groups.push(local_group)

    grouped_peak_ranges = groups

    return groups

  }

  function set_gain(channel, value) {
    gain_bank[channel].gain.value = value
  }

  function set_volume(v){
    if(v >= 1){
      v=1.0
    }
    master_gain.gain.value = v
  }

  function validate_ranges() {

    if (grouped_peak_ranges === undefined) {
      return;
    }

    getBuffer()

    var valid_groups = []

    grouped_peak_ranges.forEach(function (group) {

      var hits = 0

      group.forEach(function (idx) {
        if (analyserDataArray[idx] >= mean) {
          hits += 1
        }
      })

      if (hits >= group.length / 2) {
        valid_groups.push(true)
      } else {
        valid_groups.push(false)
      }

    })

    return valid_groups

  }

  function encode_byte(byte) {

    var chars = get_encoded_byte_array(byte)

    // console.log(chars)

    chars.forEach(function (c, idx) {
      if (c === '0') {
        set_gain(idx, 0)
      } else {
        set_gain(idx, 1 / (n_osc-2))
      }
    })

  }

  function encode_string(string){

    var bytes = string.split('')
    // console.log(string,bytes)

    while(bytes.length < BYTES_TO_ENCODE){
      bytes.push('+')
    }

    LAST_SENT_MESSAGE = CURRENT_ENCODED_MESSAGE
    CURRENT_ENCODED_MESSAGE = bytes.join('')

    bytes.forEach(function(byte,byte_idx){

      var offset = (byte_idx * 8) + 2
      if(byte_idx === 0){
        offset = 0
      }

      byte = byte.charCodeAt(0)

      var chars = get_encoded_byte_array(byte)

      // console.log(chars)

      chars.forEach(function (c, idx) {
        if (c === '0') {
          set_gain(idx+offset, 0)
        } else {
          set_gain(idx+offset, 1 / n_osc)
        }
      })

    })



  }

  function perform_signaling() {
    flip_flop = !flip_flop
    if (flip_flop) {
      set_gain(8, 1 / n_osc)
      set_gain(9, 0)
    } else {
      set_gain(9, 1 / n_osc)
      set_gain(8, 0)
    }
  }

  function get_encoded_byte_array(byte) {
    return pad(byte.toString(2), 8).split('')
  }

  function pad(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
  }

  function get_state() {
    return {
      buffer: getBuffer(),
      local_buffer: get_local_frequency_data_buffer(),
      RX_BUFFER: RX_BUFFER,
      CURRENT_STATE: CURRENT_STATE,
      SYNC_COUNT: SYNC_COUNT,
      MESSAGE: MESSAGE,
      MESSAGE_IDX: MESSAGE_IDX,
      CONNECTED_AT: CONNECTED_AT,
      CURRENT_ENCODED_MESSAGE: CURRENT_ENCODED_MESSAGE,
      LAST_SENT_MESSAGE: LAST_SENT_MESSAGE,
      LATEST_RX_BLOB: LATEST_RX_BLOB,
      PREV_RX_BLOB: PREV_RX_BLOB
    }
  }

  function reset_baud_count(){
    RX_BUFFER = ''
    CONNECTED_AT = Date.now()
  }

  return {
    check_peak_ranges: check_peak_ranges,
    connect: connect,
    encode_range: encode_byte,
    getBuffer: getBuffer,
    get_analyser: get_analyser,
    get_encoded_byte_array: get_encoded_byte_array,
    get_filter_bank: get_filter_bank,
    get_gain_bank: get_gain_bank,
    get_groups: get_groups,
    get_local_frequency_data_buffer: get_local_frequency_data_buffer,
    get_state: get_state,
    group_peak_ranges: group_peak_ranges,
    init: init,
    n_channels: n_channels,
    set_gain: set_gain,
    set_message: set_message,
    set_volume: set_volume,
    read_byte_from_signal: read_byte_from_signal,
    reset_baud_count: reset_baud_count,
    tick: tick,
    validate_ranges: validate_ranges,
    perform_signaling: perform_signaling
  };

}

},{}],2:[function(require,module,exports){
window.onload = function () {
  
  window.console.time = function () {};
  window.console.timeEnd = function () {};
  window.console.log = function(){};

  var DO_DRAW = true
  window.BAUD_RATE = 300

  console.log(window.screen.width)

  if (window.screen.width < 400) {
    d3.select('div#mobile_begin').on('click', function () {
      BAUD_RATE = 300
      d3.select(this).style('display', 'none')
      init_routine()
    })
  } else {
    BAUD_RATE = 100
    d3.select('div#mobile_begin').remove()
    init_routine()
  }

  function init_routine() {

    var udp_mode = true

    console.log('main.js / init_routine()')

    var parent_baud_rate = d3.select('div#baud_rate').append('div').attr('class', 'col-md-8 col-md-offset-2')

    parent_baud_rate.append('h4').attr('class', 'text-center').html('modem speed')
    var baud_scale = d3.scale.linear().domain([100, 0]).range([BAUD_RATE / 3.5, BAUD_RATE * 10])
    var baud_slider = parent_baud_rate.append('input').attr('type', 'range')
      .attr('min', 0.0)
      .attr('max', 100.0)
      .attr('value', baud_scale.invert(BAUD_RATE))

    baud_slider.on('input', function () {
      // console.log(d3.event)
      var v = d3.select(this).node().value

      console.log(v)

      BAUD_RATE = baud_scale(v)

      window.alice.reset_baud_count()
      window.bob.reset_baud_count()

    })

    var message_to_send = '0987654321--testing--1234567890--!!--abcdefghijklmnopqrstuvwxyz'
      // message_to_send = '01234567'
    var output_msg = ''

    var Agent = require('./agent.js')
    var View_Controller = require('./view_controller.js')

    window.alice = Agent.agent()
    alice.init({
      name: 'alice',
      type: 'client',
      message: 'I am alice listen to me send data using web audio api.'
    })

    window.bob = Agent.agent()
    bob.init({
      name: 'bob',
      type: 'server',
      message: 'This be bob, listen to ME send data using the web audio api.'
    })


    var display_bob = View_Controller.view_controller('bob_modem')
    display_bob.connect(bob)

    var display_alice = View_Controller.view_controller('alice_modem')
    display_alice.connect(alice)


    alice.connect(bob)
    bob.connect(alice)

    setTimeout(draw, 500)

    function draw() {

        console.time('test')
        alice.tick()
        bob.tick()
        console.timeEnd('test')

        display_alice.tick(DO_DRAW)
        display_bob.tick(DO_DRAW)

        // console.log(bob.get_state().LATEST_RX_BLOB, alice.get_state().LAST_SENT_MESSAGE )

        var alice_state = alice.get_state()
        var bob_state = bob.get_state()

        // console.log(bob_state.LATEST_RX_BLOB.length, alice_state.LAST_SENT_MESSAGE.length)


        if ((bob_state.LATEST_RX_BLOB.length !== alice_state.LAST_SENT_MESSAGE.length) || (bob_state.LATEST_RX_BLOB === alice_state.LAST_SENT_MESSAGE)) {
          // if(bob_state.LATEST_RX_BLOB === alice_state.LAST_SENT_MESSAGE){
          setTimeout(draw, BAUD_RATE)
            // } else {

          // }
        } else {

          console.log(bob_state.LATEST_RX_BLOB, alice_state.LAST_SENT_MESSAGE)

          console.log('err')

          setTimeout(function () {
            bob.perform_signaling()
            setTimeout(draw, BAUD_RATE * 2)
          })


        }
      }
      // window.requestAnimationFrame(draw);
  }


}

},{"./agent.js":1,"./view_controller.js":3}],3:[function(require,module,exports){
module.exports.view_controller = view_controller

function view_controller(div_id) {

  "use strict";

  var name = div_id

  var agent
  var parent = d3.select('div#' + div_id)

  // display
  //    current state
  //    sync count
  //    oscilloscope of output & input
  //    fft bars of output & input
  //    current baud
  //    rx buffer

  var svg
  var div_sync_count
  var sync_indicator
  var div_rx_buffer
  var div_baud_meter
  var bars = []

  var WIDTH = 1024
  var HEIGHT = 256

  var barWidth
  var bufferLength
    // var barHeight

  // create svg
  function setup_svg() {

    var state = agent.get_state()

    WIDTH = bufferLength
    HEIGHT = WIDTH / 4

    barWidth = (WIDTH / bufferLength)

    parent.append('h1').attr('class', 'text-center').html(name)

    svg = parent.append('svg')
      .attr('class', 'img-responsive')
      .attr('width', '100%')
      // .attr('height', HEIGHT)
      .attr('preserveAspectRatio', 'xMidYMid')
      .attr('viewBox', '0 0 ' + WIDTH + ' ' + HEIGHT)
      .style('background-color', 'rgba(0,0,0,0.1)')

    svg.append('text')
      .text('receiver spectrum')
      .attr('x', WIDTH)
      .attr('y', 12)
      .attr('dx', '-4px')
      .style('font-size', 12)
      .style('text-anchor', 'end')
      .attr('fill', 'rgba(0,0,0,0.1)')


    bars = []
    for (var svgbars = 0; svgbars < bufferLength; svgbars++) {
      var bar = svg.append('rect')
        .attr('x', barWidth * svgbars)
        .attr('y', 0)
        .attr('width', barWidth)
        .attr('height', 0)
        .attr('fill', 'green')
        .attr('stroke', 'none')

      var bar_idx = svgbars
      bar.on('mouseover', function () {
        console.log(bar_idx)
      })

      bars.push(bar)
    }

    // sync count
    div_sync_count = parent.append('div')
      .attr('class', 'col-md-4')
      .style('outline', '1px dotted rgba(0,0,0,0.1)')

    div_sync_count.append('h4').attr('class', 'text-center').html('synchronization counts')
    sync_indicator = div_sync_count.append('div').attr('class', 'text-center sync_count')

    // baud meter
    var parent_baud_meter = parent.append('div').attr('class', 'col-md-4')
      .style('outline', '1px dotted rgba(0,0,0,0.1)')

    parent_baud_meter.append('h4').attr('class', 'text-center').html('baud')
    div_baud_meter = parent_baud_meter.append('div').attr('class', 'text-center')


    var parent_input_slider = parent.append('div').attr('class', 'col-md-4')

    parent_input_slider.append('h4').attr('class', 'text-center').html('transmitter volume')

    var slider_itself = parent_input_slider.append('input').attr('type', 'range')
      .attr('min', 0.0)
      .attr('max', 100.0)
      .attr('value', 0.0)

    slider_itself.on('input', function () {
      // console.log(d3.event)
      var v = d3.select(this).node().value
      agent.set_volume(v / 100.0)
    })

    // message to send
    var parent_message_to_send = parent.append('div').attr('class', 'col-md-12')

    parent_message_to_send.append('h4').attr('class', 'text-center').html('sending this message')

    var input_field = parent_message_to_send.append('input')
      .attr('type', 'text')
      .attr('class', 'msg_input')

    input_field.node().value = state.MESSAGE

    input_field.on('keyup', function () {
      var v = input_field.node().value
      if (v === '') {
        v = ' '
      }

      agent.set_message(v)
    })

    // rx buffer
    var div_rx_buffer_parent = parent.append('div')
      .attr('class', 'col-md-12')

    div_rx_buffer_parent.append('h4').attr('class', 'text-center').html('rx buffer')

    div_rx_buffer = div_rx_buffer_parent.append('pre').attr('class', 'rx_buffer')



    //

  }

  function connect(remote_agent) {
    agent = remote_agent
    bufferLength = remote_agent.get_state().buffer.length
  }

  function tick(draw_bars) {

    if (bars.length === 0) {
      setup_svg()
      return;
    }

    var state = agent.get_state()

    if (draw_bars === true) {
      var dataArray = state.buffer

      for (var i = 0; i < bufferLength; i++) {
        bars[i].attr('height', (dataArray[i] / 255) * HEIGHT)
      }

    }

    sync_indicator.html(state.SYNC_COUNT)
    div_rx_buffer.html(state.RX_BUFFER)

    var baud = 8 * (state.RX_BUFFER.length / ((Date.now() - state.CONNECTED_AT) / 1000.0))
    div_baud_meter.html(baud.toFixed(2))

    //
    // console.log(agent.get_state().SYNC_COUNT)

  }

  return {
    tick: tick,
    connect: connect
  }

}

},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJqcy9hZ2VudC5qcyIsImpzL21haW4uanMiLCJqcy92aWV3X2NvbnRyb2xsZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDanJCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cy5hZ2VudCA9IGFnZW50XG5cbnZhciBCWVRFU19UT19FTkNPREUgPSAxXG5cbmZ1bmN0aW9uIGFnZW50KG9wdHMpIHtcblxuICB2YXIgbXlBdWRpbyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2F1ZGlvJyk7XG5cbiAgKGZ1bmN0aW9uIHNldHVwX2F1ZGlvX2NvbnRleHQoKSB7XG4gICAgaWYgKHdpbmRvdy5jb250ZXh0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdjcmVhdGluZyBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpJylcblxuICAgICAgbmF2aWdhdG9yLmdldE1lZGlhID0gKFxuICAgICAgICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIHx8XG4gICAgICAgIG5hdmlnYXRvci53ZWJraXRHZXRVc2VyTWVkaWEgfHxcbiAgICAgICAgbmF2aWdhdG9yLm1vekdldFVzZXJNZWRpYSB8fFxuICAgICAgICBuYXZpZ2F0b3IubXNHZXRVc2VyTWVkaWFcbiAgICAgICk7XG5cbiAgICAgIHdpbmRvdy5BdWRpb0NvbnRleHQgPSAoXG4gICAgICAgIHdpbmRvdy5BdWRpb0NvbnRleHQgfHxcbiAgICAgICAgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dCB8fFxuICAgICAgICB3aW5kb3cubW96QXVkaW9Db250ZXh0IHx8XG4gICAgICAgIHdpbmRvdy5tc0F1ZGlvQ29udGV4dFxuICAgICAgKTtcblxuXG4gICAgICAvLyBpZih3aW5kb3cuQXVkaW9Db25leHQgPT09IHVuZGVmaW5lZCl7XG4gICAgICAvLyAgIHdpbmRvdy5jb250ZXh0ID0gbmV3IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQoKVxuICAgICAgLy8gfSBlbHNlIHtcbiAgICAgICAgd2luZG93LmNvbnRleHQgPSBuZXcgd2luZG93LkF1ZGlvQ29udGV4dCgpXG4gICAgICAvLyB9XG5cbiAgICB9XG4gICAgY29uc29sZS5sb2coJ2RvbmUuJylcbiAgfSkoKVxuXG4gIC8vXG4gIHZhciBFUlJPUl9SQVRFXG5cbiAgdmFyIE1FU1NBR0VcbiAgdmFyIE1FU1NBR0VfSURYID0gMFxuXG4gIHZhciBMQVNUX1NFTlRfTUVTU0FHRSA9ICcnXG4gIHZhciBDVVJSRU5UX0VOQ09ERURfTUVTU0FHRSA9ICcnXG5cbiAgdmFyIExBVEVTVF9SWF9CTE9CID0gJydcbiAgdmFyIFBSRVZfUlhfQkxPQiA9ICcnXG5cbiAgdmFyIFJYX0JVRkZFUiA9ICcnXG4gIHZhciBDT05ORUNURURfQVRcblxuXG4gIHZhciBuYW1lXG4gIHZhciB0eXBlXG5cbiAgdmFyIGFuYWx5c2VyID0gY29udGV4dC5jcmVhdGVBbmFseXNlcigpXG4gIHZhciBhbmFseXNlckRhdGFBcnJheSAvLyB0aGUgYnVmZmVyIHRoZSBhbmFseXNlciB3cml0ZXMgdG9cbiAgdmFyIGJ1ZmZlckxlbmd0aCAvLyB0aGUgbGVuZ3RoIG9mIHRoZSBhbmFseXNlckRhdGFBcnJheVxuXG4gIHZhciBsb2NhbEFuYWx5c2VyID0gY29udGV4dC5jcmVhdGVBbmFseXNlcigpXG4gIHZhciBsb2NhbEFuYWx5c2VyRGF0YUFycmF5IC8vIHRoZSBidWZmZXIgdGhlIGFuYWx5c2VyIHdyaXRlcyB0b1xuXG4gIHZhciBwZWFrX3JhbmdlcyAvLyBmbGF0IGxpc3Qgb2YgaW5kZXhlcyBvZiBkZXRlY3RlZCBwZWFrIHJhbmdlc1xuICB2YXIgZ3JvdXBlZF9wZWFrX3JhbmdlcyAvLyBjbHVzdGVyZWQgZ3JvdXBzIG9mIHBlYWsgcmFuZ2VzXG4gIHZhciBtZWFuIC8vIHRoZSB0aHJlc2hvbGQgZm9yIGRldGVybWluaW5nIGlmIGEgYmFuZCBpcyBwZWFrZWRcblxuICB2YXIgZmxpcF9mbG9wID0gdHJ1ZVxuXG4gIHZhciBwcmV2X2hpZ2hfY2hhbm5lbCA9IC0xXG4gIHZhciBjdXJyZW50X2hpZ2hfY2hhbm5lbCA9IDBcbiAgdmFyIFNZTkNfQ09VTlQgPSAwXG5cbiAgdmFyIG9zY19iYW5rID0gW11cbiAgdmFyIGdhaW5fYmFuayA9IFtdXG4gIHZhciBmaWx0ZXJfYmFuayA9IFtdXG5cbiAgdmFyIG1hc3Rlcl9nYWluXG5cbiAgLy8gdmFyIG5fb3NjID0gNDRcbiAgdmFyIG5fb3NjID0gKDgqQllURVNfVE9fRU5DT0RFKSArIDNcblxuICBpZihCWVRFU19UT19FTkNPREUgPT09IDEpe1xuICAgIG5fb3NjID0gMTRcbiAgfVxuXG4gIHZhciBmcmVxUmFuZ2UgPSAxMDAwMFxuICB2YXIgc3ByZWFkID0gKGZyZXFSYW5nZSAvIG5fb3NjKVxuICB2YXIgaW5pdGlhbEZyZXEgPSAyMDBcblxuICB2YXIgQ1VSUkVOVF9TVEFURSA9IC0xXG5cbiAgZnVuY3Rpb24gdGljaygpIHtcblxuICAgIGNvbnNvbGUubG9nKG5hbWUsQ1VSUkVOVF9TVEFURSlcblxuICAgIHZhciByZXRfb2JqID0ge1xuICAgICAgbmV3X2RhdGE6IGZhbHNlLFxuICAgICAgZGF0YTogJydcbiAgICB9XG5cbiAgICBpZiAoQ1VSUkVOVF9TVEFURSA8IDApIHtcblxuICAgICAgLy8gcGVyZm9ybWluZyBpbml0aWFsaXphdGlvbiBwcm9jZXNzLCBkbyBub3RoaW5nXG4gICAgICByZXR1cm47XG5cbiAgICB9IGVsc2Uge1xuXG4gICAgICBpZiAoQ1VSUkVOVF9TVEFURSA9PT0gMCkge1xuXG4gICAgICAgIHJlZ2lzdGVyX3BlYWtfcmFuZ2VzKClcblxuICAgICAgICBpZihncm91cGVkX3BlYWtfcmFuZ2VzICE9PSB1bmRlZmluZWQpe1xuICAgICAgICAgIGlmIChncm91cGVkX3BlYWtfcmFuZ2VzLmxlbmd0aCA9PT0gbl9vc2MpIHtcbiAgICAgICAgICAgIENVUlJFTlRfU1RBVEUgPSAxXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSBpZiAoQ1VSUkVOVF9TVEFURSA9PT0gMSkge1xuXG4gICAgICAgIHBlcmZvcm1fc2lnbmFsaW5nKClcbiAgICAgICAgbG9va19mb3Jfc2lnbmFsaW5nKClcblxuICAgICAgICBpZiAoU1lOQ19DT1VOVCA+IDIpIHtcbiAgICAgICAgICBDVVJSRU5UX1NUQVRFID0gMlxuICAgICAgICAgIENPTk5FQ1RFRF9BVCA9IERhdGUubm93KClcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2UgaWYgKENVUlJFTlRfU1RBVEUgPT09IDIpIHtcblxuICAgICAgICAvLyBlbmNvZGUgYnl0ZVxuICAgICAgICAvLyB2YXIgYnl0ZV90b19zZW5kID0gTUVTU0FHRVtNRVNTQUdFX0lEWF0uY2hhckNvZGVBdCgwKVxuICAgICAgICAvLyBlbmNvZGVfYnl0ZShieXRlX3RvX3NlbmQpXG5cbiAgICAgICAgLy8gZW5jb2RlIGJ5dGUgYXJyYXlcbiAgICAgICAgdmFyIHN1YnN0cmluZyA9IE1FU1NBR0Uuc3Vic3RyKE1FU1NBR0VfSURYLEJZVEVTX1RPX0VOQ09ERSlcbiAgICAgICAgZW5jb2RlX3N0cmluZyhzdWJzdHJpbmcpXG5cbiAgICAgICAgaWYgKGxvb2tfZm9yX3NpZ25hbGluZygpKSB7XG5cbiAgICAgICAgICAvLyByZWFkIGJ5dGVcbiAgICAgICAgICAvL1JYX0JVRkZFUiArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJlYWRfYnl0ZV9mcm9tX3NpZ25hbCgpKVxuICAgICAgICAgIHZhciBieXRlc19vbl93aXJlX3N0cmluZyA9IHJlYWRfYnl0ZV9hcnJheV9mcm9tX3NpZ25hbChCWVRFU19UT19FTkNPREUpXG5cbiAgICAgICAgICBQUkVWX1JYX0JMT0IgPSBMQVRFU1RfUlhfQkxPQlxuICAgICAgICAgIExBVEVTVF9SWF9CTE9CID0gYnl0ZXNfb25fd2lyZV9zdHJpbmdcbiAgICAgICAgICBSWF9CVUZGRVIgKz0gYnl0ZXNfb25fd2lyZV9zdHJpbmdcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhSWF9CVUZGRVIpXG5cbiAgICAgICAgICBpZiAodHlwZSA9PT0gJ2NsaWVudCcpIHtcbiAgICAgICAgICAgIHJldF9vYmoubmV3X2RhdGEgPSB0cnVlXG4gICAgICAgICAgICByZXRfb2JqLmRhdGEgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKHJlYWRfYnl0ZV9mcm9tX3NpZ25hbChCWVRFU19UT19FTkNPREUpKVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGluY3JlbWVudCBieXRlIHRvIGVuY29kZVxuICAgICAgICAgIE1FU1NBR0VfSURYICs9IEJZVEVTX1RPX0VOQ09ERVxuICAgICAgICAgIGlmKE1FU1NBR0VfSURYID49IE1FU1NBR0UubGVuZ3RoKXtcbiAgICAgICAgICAgIE1FU1NBR0VfSURYID0gMFxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBNRVNTQUdFX0lEWCA9IE1FU1NBR0VfSURYICUgTUVTU0FHRS5sZW5ndGhcblxuICAgICAgICAgIC8vIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHBlcmZvcm1fc2lnbmFsaW5nKClcbiAgICAgICAgICAvLyB9LDIpXG5cblxuICAgICAgICB9XG5cbiAgICAgIH0gLy8gZW5kIG9mIENVUlJFTlRfU1RBVEUgPT09IDJcblxuICAgIH1cblxuICAgIHJldHVybiByZXRfb2JqXG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGxvb2tfZm9yX3NpZ25hbGluZygpIHtcblxuICAgIHZhciB2YWxpZF9yYW5nZXMgPSB2YWxpZGF0ZV9yYW5nZXMoKVxuICAgIGlmICh2YWxpZF9yYW5nZXNbOF0gPT09IHRydWUgJiYgdmFsaWRfcmFuZ2VzWzldID09PSBmYWxzZSkge1xuICAgICAgY3VycmVudF9oaWdoX2NoYW5uZWwgPSA4XG4gICAgfSBlbHNlIHtcbiAgICAgIGN1cnJlbnRfaGlnaF9jaGFubmVsID0gOVxuICAgIH1cblxuICAgIHZhciBkaWZmZXJlbmNlX2ZvdW5kID0gZmFsc2VcblxuICAgIGlmIChjdXJyZW50X2hpZ2hfY2hhbm5lbCAhPT0gcHJldl9oaWdoX2NoYW5uZWwpIHtcbiAgICAgIGRpZmZlcmVuY2VfZm91bmQgPSB0cnVlXG4gICAgICBTWU5DX0NPVU5UICs9IDFcbiAgICB9XG5cbiAgICBwcmV2X2hpZ2hfY2hhbm5lbCA9IGN1cnJlbnRfaGlnaF9jaGFubmVsXG5cbiAgICByZXR1cm4gZGlmZmVyZW5jZV9mb3VuZFxuXG4gIH1cblxuICBmdW5jdGlvbiBpbml0KG9wdHMpIHtcblxuICAgIG5hbWUgPSBvcHRzLm5hbWVcblxuICAgIGlmKG9wdHMudHlwZSA9PT0gJ21pYycpe1xuXG4gICAgICBuYXZpZ2F0b3IuZ2V0TWVkaWEgPSAoXG4gICAgICAgIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHxcbiAgICAgICAgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYSB8fFxuICAgICAgICBuYXZpZ2F0b3IubW96R2V0VXNlck1lZGlhIHx8XG4gICAgICAgIG5hdmlnYXRvci5tc0dldFVzZXJNZWRpYVxuICAgICAgKTtcblxuICAgICAgbmF2aWdhdG9yLmdldE1lZGlhIChcbiAgICAgICAgICAgIC8vIGNvbnN0cmFpbnRzOiBhdWRpbyBhbmQgdmlkZW8gZm9yIHRoaXMgYXBwXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICBhdWRpbzogdHJ1ZSxcbiAgICAgICAgICAgICAgIHZpZGVvOiBmYWxzZVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gU3VjY2VzcyBjYWxsYmFja1xuICAgICAgICAgICAgZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgICAgICAgICAgIC8vICB2aWRlby5zcmMgPSAod2luZG93LlVSTCAmJiB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChzdHJlYW0pKSB8fCBzdHJlYW07XG4gICAgICAgICAgICAgIC8vICB2aWRlby5vbmxvYWRlZG1ldGFkYXRhID0gZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAvLyAgICAgdmlkZW8ucGxheSgpO1xuICAgICAgICAgICAgICAvLyAgICAgdmlkZW8ubXV0ZWQgPSAndHJ1ZSc7XG4gICAgICAgICAgICAgIC8vICB9O1xuXG4gICAgICAgICAgICAgICAvLyBDcmVhdGUgYSBNZWRpYVN0cmVhbUF1ZGlvU291cmNlTm9kZVxuICAgICAgICAgICAgICAgLy8gRmVlZCB0aGUgSFRNTE1lZGlhRWxlbWVudCBpbnRvIGl0XG4gICAgICAgICAgICAgICB2YXIgc291cmNlID0gY29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZShzdHJlYW0pO1xuICAgICAgICAgICAgICAgc291cmNlLmNvbm5lY3QoYW5hbHlzZXIpXG4gICAgICAgICAgICAgICBDVVJSRU5UX1NUQVRFID0gMFxuICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2RvbmUgY29ubmVjdGluZyAnLG5hbWUpXG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGEgYmlxdWFkZmlsdGVyXG4gICAgICAgICAgICAgICAgLy8gdmFyIGJpcXVhZEZpbHRlciA9IGF1ZGlvQ3R4LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICAgICAgICAgICAgICAgIC8vIGJpcXVhZEZpbHRlci50eXBlID0gXCJsb3dzaGVsZlwiO1xuICAgICAgICAgICAgICAgIC8vIGJpcXVhZEZpbHRlci5mcmVxdWVuY3kudmFsdWUgPSAxMDAwO1xuICAgICAgICAgICAgICAgIC8vIGJpcXVhZEZpbHRlci5nYWluLnZhbHVlID0gcmFuZ2UudmFsdWU7XG5cbiAgICAgICAgICAgICAgICAvLyBjb25uZWN0IHRoZSBBdWRpb0J1ZmZlclNvdXJjZU5vZGUgdG8gdGhlIGdhaW5Ob2RlXG4gICAgICAgICAgICAgICAgLy8gYW5kIHRoZSBnYWluTm9kZSB0byB0aGUgZGVzdGluYXRpb24sIHNvIHdlIGNhbiBwbGF5IHRoZVxuICAgICAgICAgICAgICAgIC8vIG11c2ljIGFuZCBhZGp1c3QgdGhlIHZvbHVtZSB1c2luZyB0aGUgbW91c2UgY3Vyc29yXG4gICAgICAgICAgICAgICAgLy8gc291cmNlLmNvbm5lY3QoYmlxdWFkRmlsdGVyKTtcbiAgICAgICAgICAgICAgICAvLyBiaXF1YWRGaWx0ZXIuY29ubmVjdChhdWRpb0N0eC5kZXN0aW5hdGlvbik7XG5cbiAgICAgICAgICAgICAgICAvLyBHZXQgbmV3IG1vdXNlIHBvaW50ZXIgY29vcmRpbmF0ZXMgd2hlbiBtb3VzZSBpcyBtb3ZlZFxuICAgICAgICAgICAgICAgIC8vIHRoZW4gc2V0IG5ldyBnYWluIHZhbHVlXG5cbiAgICAgICAgICAgICAgICAvLyByYW5nZS5vbmlucHV0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gICAgIGJpcXVhZEZpbHRlci5nYWluLnZhbHVlID0gcmFuZ2UudmFsdWU7XG4gICAgICAgICAgICAgICAgLy8gfVxuXG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyBFcnJvciBjYWxsYmFja1xuICAgICAgICAgICAgZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVGhlIGZvbGxvd2luZyBnVU0gZXJyb3Igb2NjdXJlZDogJyArIGVycik7XG4gICAgICAgICAgICB9XG4gICAgICAgICApO1xuXG4gICAgfVxuXG4gICAgbWFzdGVyX2dhaW4gPSBjb250ZXh0LmNyZWF0ZUdhaW4oKVxuICAgIG1hc3Rlcl9nYWluLmdhaW4udmFsdWUgPSAwXG4gICAgbWFzdGVyX2dhaW4uY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKVxuXG4gICAgTUVTU0FHRSA9IG9wdHMubWVzc2FnZVxuICAgIHR5cGUgPSBvcHRzLnR5cGVcblxuICAgIC8vIGNyZWF0ZSBvc2MgKyBnYWluIGJhbmtzXG4gICAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgbl9vc2M7IGlkeCsrKSB7XG5cbiAgICAgIHZhciBsb2NhbF9vc2MgPSBjb250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKVxuICAgICAgbG9jYWxfb3NjLmZyZXF1ZW5jeS52YWx1ZSA9IChpZHggKiBzcHJlYWQpICsgaW5pdGlhbEZyZXFcblxuICAgICAgdmFyIGxvY2FsX2dhaW4gPSBjb250ZXh0LmNyZWF0ZUdhaW4oKVxuICAgICAgbG9jYWxfZ2Fpbi5nYWluLnZhbHVlID0gMS4wIC8gKG5fb3NjLTEpXG5cbiAgICAgIC8vIHZhciBsb2NhbF9maWx0ZXIgPSBjb250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpXG4gICAgICAvLyBsb2NhbF9maWx0ZXIudHlwZSA9ICdiYW5kcGFzcydcbiAgICAgIC8vIGxvY2FsX2ZpbHRlci5mcmVxdWVuY3kudmFsdWUgPSAoaWR4ICogc3ByZWFkKSArIGluaXRpYWxGcmVxXG4gICAgICAvLyBsb2NhbF9maWx0ZXIuUS52YWx1ZSA9IDEuMFxuICAgICAgLy9cbiAgICAgIC8vIHdpbmRvdy5kID0gbG9jYWxfZmlsdGVyXG5cbiAgICAgIGxvY2FsX29zYy5jb25uZWN0KGxvY2FsX2dhaW4pXG5cbiAgICAgIC8vIGxvY2FsX2dhaW4uY29ubmVjdChsb2NhbF9maWx0ZXIpXG5cbiAgICAgIGxvY2FsX2dhaW4uY29ubmVjdChsb2NhbEFuYWx5c2VyKVxuICAgICAgbG9jYWxfZ2Fpbi5jb25uZWN0KG1hc3Rlcl9nYWluKVxuICAgICAgLy8gbG9jYWxfZ2Fpbi5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pXG5cbiAgICAgIGxvY2FsX29zYy5zdGFydCgwKVxuICAgICAgLy8gbG9jYWxfb3NjLm5vdGVPbigxMDApXG5cbiAgICAgIG9zY19iYW5rLnB1c2gobG9jYWxfb3NjKVxuICAgICAgZ2Fpbl9iYW5rLnB1c2gobG9jYWxfZ2FpbilcbiAgICAgIC8vIGZpbHRlcl9iYW5rLnB1c2gobG9jYWxfZmlsdGVyKVxuXG4gICAgfVxuXG4gICAgdmFyIGZmdFNpemUgPSA1MTJcblxuICAgIGFuYWx5c2VyLmZmdFNpemUgPSBmZnRTaXplXG4gICAgYW5hbHlzZXIuc21vb3RoaW5nVGltZUNvbnN0YW50ID0gMFxuICAgIGJ1ZmZlckxlbmd0aCA9IGFuYWx5c2VyLmZyZXF1ZW5jeUJpbkNvdW50XG4gICAgYW5hbHlzZXJEYXRhQXJyYXkgPSBuZXcgVWludDhBcnJheShidWZmZXJMZW5ndGgpXG5cbiAgICBsb2NhbEFuYWx5c2VyLmZmdFNpemUgPSBmZnRTaXplXG4gICAgbG9jYWxBbmFseXNlci5zbW9vdGhpbmdUaW1lQ29uc3RhbnQgPSAwXG4gICAgbG9jYWxBbmFseXNlckRhdGFBcnJheSA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlckxlbmd0aClcblxuICB9XG5cbiAgZnVuY3Rpb24gY29ubmVjdChvdGhlcl9hZ2VudCkge1xuXG4gICAgdmFyIG90aGVyX2dhaW5fYmFuayA9IG90aGVyX2FnZW50LmdldF9nYWluX2JhbmsoKVxuXG4gICAgb3RoZXJfZ2Fpbl9iYW5rLmZvckVhY2goZnVuY3Rpb24gKGdhaW5Ob2RlKSB7XG4gICAgICBnYWluTm9kZS5jb25uZWN0KGFuYWx5c2VyKVxuICAgIH0pXG5cbiAgICAvLyB2YXIgb3RoZXJfZmlsdGVyX2JhbmsgPSBvdGhlcl9hZ2VudC5nZXRfZmlsdGVyX2JhbmsoKVxuICAgIC8vXG4gICAgLy8gb3RoZXJfZmlsdGVyX2JhbmsuZm9yRWFjaChmdW5jdGlvbihmaWx0ZXJOb2RlKXtcbiAgICAvLyAgIGZpbHRlck5vZGUuY29ubmVjdChhbmFseXNlcilcbiAgICAvLyB9KVxuXG4gICAgZ2V0QnVmZmVyKClcblxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgY29uc29sZS5sb2coJ2RvbmUgY29ubmVjdGluZycpXG4gICAgICBDVVJSRU5UX1NUQVRFID0gMFxuICAgIH0sIDIwMClcblxuICB9XG5cbiAgZnVuY3Rpb24gc2V0X21lc3NhZ2UobXNnKXtcbiAgICBNRVNTQUdFID0gbXNnXG4gICAgTUVTU0FHRV9JRFggPSAwXG4gIH1cblxuICBmdW5jdGlvbiBuX2NoYW5uZWxzKCkge1xuICAgIHJldHVybiBuX29zY1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0X2dyb3VwcygpIHtcbiAgICByZXR1cm4gZ3JvdXBlZF9wZWFrX3Jhbmdlc1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0QnVmZmVyKCkge1xuICAgIGFuYWx5c2VyLmdldEJ5dGVGcmVxdWVuY3lEYXRhKGFuYWx5c2VyRGF0YUFycmF5KVxuICAgIHJldHVybiBhbmFseXNlckRhdGFBcnJheVxuICB9XG4gIGZ1bmN0aW9uIGdldF9sb2NhbF9mcmVxdWVuY3lfZGF0YV9idWZmZXIoKSB7XG4gICAgbG9jYWxBbmFseXNlci5nZXRCeXRlRnJlcXVlbmN5RGF0YShsb2NhbEFuYWx5c2VyRGF0YUFycmF5KVxuICAgIHJldHVybiBsb2NhbEFuYWx5c2VyRGF0YUFycmF5XG4gIH1cblxuICBmdW5jdGlvbiBnZXRfZ2Fpbl9iYW5rKCkge1xuICAgIHJldHVybiBnYWluX2JhbmtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldF9maWx0ZXJfYmFuaygpIHtcbiAgICByZXR1cm4gZmlsdGVyX2JhbmtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gZ2V0X2FuYWx5c2VyKCkge1xuICAgIHJldHVybiBhbmFseXNlclxuICB9XG5cblxuICBmdW5jdGlvbiByZWFkX2J5dGVfZnJvbV9zaWduYWwoKSB7XG5cbiAgICB2YXIgcmFuZ2VzID0gdmFsaWRhdGVfcmFuZ2VzKClcbiAgICAvLyBjb25zb2xlLmxvZyhyYW5nZXMpXG5cbiAgICB2YXIgYmluYXJ5X3N0cmluZyA9ICcnXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCA4OyBpKyspIHtcbiAgICAgIGlmIChyYW5nZXNbaV0pIHtcbiAgICAgICAgYmluYXJ5X3N0cmluZyArPSAnMSdcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJpbmFyeV9zdHJpbmcgKz0gJzAnXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcnNlSW50KGJpbmFyeV9zdHJpbmcsIDIpXG5cbiAgfVxuXG5cbiAgZnVuY3Rpb24gcmVhZF9ieXRlX2FycmF5X2Zyb21fc2lnbmFsKGJ5dGVfY291bnQpIHtcblxuICAgIHZhciByZXR1cm5fYXJyYXkgPSAnJ1xuXG4gICAgdmFyIHJhbmdlcyA9IHZhbGlkYXRlX3JhbmdlcygpXG4gICAgLy8gY29uc29sZS5sb2cocmFuZ2VzKVxuXG4gICAgZm9yKHZhciBieXRlX2NvdW50X2lkeCA9IDA7IGJ5dGVfY291bnRfaWR4IDwgYnl0ZV9jb3VudDsgYnl0ZV9jb3VudF9pZHgrKyl7XG5cbiAgICAgIHZhciBvZmZzZXQgPSAwXG4gICAgICBpZihieXRlX2NvdW50X2lkeCA+IDApe1xuICAgICAgICBvZmZzZXQgKz0gMiArIChieXRlX2NvdW50X2lkeCo4KVxuICAgICAgfVxuXG4gICAgICB2YXIgYmluYXJ5X3N0cmluZyA9ICcnXG4gICAgICBmb3IgKHZhciBpID0gMCtvZmZzZXQ7IGkgPCA4K29mZnNldDsgaSsrKSB7XG4gICAgICAgIGlmIChyYW5nZXNbaV0pIHtcbiAgICAgICAgICBiaW5hcnlfc3RyaW5nICs9ICcxJ1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJpbmFyeV9zdHJpbmcgKz0gJzAnXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIGJ5dGUgPSBwYXJzZUludChiaW5hcnlfc3RyaW5nLCAyKVxuICAgICAgcmV0dXJuX2FycmF5ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZSlcbiAgICB9XG5cbiAgICAvLyBjb25zb2xlLmxvZyhyZXR1cm5fYXJyYXkpXG4gICAgcmV0dXJuIHJldHVybl9hcnJheVxuXG4gIH1cblxuICBmdW5jdGlvbiByZWdpc3Rlcl9wZWFrX3JhbmdlcygpIHtcblxuICAgIGNvbnNvbGUubG9nKCdyZWdpc3RlcmluZyBwZWFrIHJhbmdlcyAnICsgbmFtZSlcblxuICAgIGdldEJ1ZmZlcigpXG4gICAgY29uc29sZS5sb2coYW5hbHlzZXJEYXRhQXJyYXkpXG5cbiAgICAvLyBwdXNoIG9uIHRvIG5ldyBhcnJheSBmb3Igc29ydGluZ1xuICAgIHZhciBkID0gW11cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1ZmZlckxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYW5hbHlzZXJEYXRhQXJyYXlbaV0gPiAwKSB7XG4gICAgICAgIGQucHVzaChhbmFseXNlckRhdGFBcnJheVtpXSlcbiAgICAgIH1cbiAgICB9XG4gICAgZC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICByZXR1cm4gYSAtIGJcbiAgICB9KVxuICAgIGNvbnNvbGUubG9nKCdNZWFuOiAnICsgZFtNYXRoLmZsb29yKGQubGVuZ3RoIC8gMildKVxuXG4gICAgbWVhbiA9IGRbTWF0aC5mbG9vcihkLmxlbmd0aCAvIDIpXVxuXG4gICAgLy9cbiAgICBwZWFrX3JhbmdlcyA9IFtdXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBidWZmZXJMZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGFuYWx5c2VyRGF0YUFycmF5W2ldID4gbWVhbikge1xuICAgICAgICBwZWFrX3Jhbmdlcy5wdXNoKGkpXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gd2luZG93LnAgPSBwZWFrX3Jhbmdlc1xuXG4gICAgZ3JvdXBfcGVha19yYW5nZXMoKVxuXG4gIH1cblxuICBmdW5jdGlvbiBjaGVja19wZWFrX3JhbmdlcygpIHtcblxuICAgIGdldEJ1ZmZlcigpXG5cbiAgICB2YXIgaGl0cyA9IFtdXG4gICAgcGVha19yYW5nZXMuZm9yRWFjaChmdW5jdGlvbiAoZGF0YUFycmF5X2lkeCkge1xuICAgICAgaWYgKGFuYWx5c2VyRGF0YUFycmF5W2RhdGFBcnJheV9pZHhdID4gbWVhbikge1xuICAgICAgICBoaXRzLnB1c2godHJ1ZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhpdHMucHVzaChmYWxzZSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgcmV0dXJuIGhpdHNcblxuICB9XG5cbiAgZnVuY3Rpb24gZ3JvdXBfcGVha19yYW5nZXMoKSB7XG5cbiAgICBpZiAocGVha19yYW5nZXMgPT09IHVuZGVmaW5lZCB8fCBwZWFrX3Jhbmdlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgZ3JvdXBzID0gW10gLy8gWyBbMSwyLDNdLCBbOCw5LDEwXSwgWzMwLDMxLDMyXSAgXVxuXG4gICAgdmFyIGN1cnJlbnRfZ3JvdXBfaWR4ID0gMFxuXG4gICAgdmFyIGxvY2FsX2dyb3VwID0gbmV3IEFycmF5KClcblxuICAgIHBlYWtfcmFuZ2VzLmZvckVhY2goZnVuY3Rpb24gKHBlYWtfaWR4LCBpZHgpIHtcblxuICAgICAgLy8gaWYgdGhlIE1hdGguYWJzKHBlYWtfaWR4IC0gcGVha19yYW5nZXNbaWR4KzFdKSA9PT0gMVxuICAgICAgLy8gICAgcHVzaCBwZWFrX2lkeCBvbiB0byBsb2NhbF9ncm91cFxuICAgICAgLy8gZWxzZVxuICAgICAgLy8gICAgcHVzaCBsb2NhbF9ncm91cCBvbiB0byBncm91cHNcbiAgICAgIC8vICAgIGNsZWFyIGxvY2FsX2dyb3VwXG4gICAgICAvLyAgICBwdXNoIHBlYWtfaWR4IG9uIHRvIGxvY2FsX2dyb3VwXG5cbiAgICAgIGlmIChpZHggPT09IHBlYWtfcmFuZ2VzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ2hlcmUnKVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChNYXRoLmFicyhwZWFrX2lkeCAtIHBlYWtfcmFuZ2VzW2lkeCArIDFdKSA8PSAyKSB7XG4gICAgICAgIGxvY2FsX2dyb3VwLnB1c2gocGVha19pZHgpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2NhbF9ncm91cC5wdXNoKHBlYWtfaWR4KVxuICAgICAgICBncm91cHMucHVzaChsb2NhbF9ncm91cClcbiAgICAgICAgbG9jYWxfZ3JvdXAgPSBuZXcgQXJyYXkoKVxuICAgICAgfVxuXG4gICAgfSlcblxuICAgIGdyb3Vwcy5wdXNoKGxvY2FsX2dyb3VwKVxuXG4gICAgZ3JvdXBlZF9wZWFrX3JhbmdlcyA9IGdyb3Vwc1xuXG4gICAgcmV0dXJuIGdyb3Vwc1xuXG4gIH1cblxuICBmdW5jdGlvbiBzZXRfZ2FpbihjaGFubmVsLCB2YWx1ZSkge1xuICAgIGdhaW5fYmFua1tjaGFubmVsXS5nYWluLnZhbHVlID0gdmFsdWVcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldF92b2x1bWUodil7XG4gICAgaWYodiA+PSAxKXtcbiAgICAgIHY9MS4wXG4gICAgfVxuICAgIG1hc3Rlcl9nYWluLmdhaW4udmFsdWUgPSB2XG4gIH1cblxuICBmdW5jdGlvbiB2YWxpZGF0ZV9yYW5nZXMoKSB7XG5cbiAgICBpZiAoZ3JvdXBlZF9wZWFrX3JhbmdlcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZ2V0QnVmZmVyKClcblxuICAgIHZhciB2YWxpZF9ncm91cHMgPSBbXVxuXG4gICAgZ3JvdXBlZF9wZWFrX3Jhbmdlcy5mb3JFYWNoKGZ1bmN0aW9uIChncm91cCkge1xuXG4gICAgICB2YXIgaGl0cyA9IDBcblxuICAgICAgZ3JvdXAuZm9yRWFjaChmdW5jdGlvbiAoaWR4KSB7XG4gICAgICAgIGlmIChhbmFseXNlckRhdGFBcnJheVtpZHhdID49IG1lYW4pIHtcbiAgICAgICAgICBoaXRzICs9IDFcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgaWYgKGhpdHMgPj0gZ3JvdXAubGVuZ3RoIC8gMikge1xuICAgICAgICB2YWxpZF9ncm91cHMucHVzaCh0cnVlKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsaWRfZ3JvdXBzLnB1c2goZmFsc2UpXG4gICAgICB9XG5cbiAgICB9KVxuXG4gICAgcmV0dXJuIHZhbGlkX2dyb3Vwc1xuXG4gIH1cblxuICBmdW5jdGlvbiBlbmNvZGVfYnl0ZShieXRlKSB7XG5cbiAgICB2YXIgY2hhcnMgPSBnZXRfZW5jb2RlZF9ieXRlX2FycmF5KGJ5dGUpXG5cbiAgICAvLyBjb25zb2xlLmxvZyhjaGFycylcblxuICAgIGNoYXJzLmZvckVhY2goZnVuY3Rpb24gKGMsIGlkeCkge1xuICAgICAgaWYgKGMgPT09ICcwJykge1xuICAgICAgICBzZXRfZ2FpbihpZHgsIDApXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXRfZ2FpbihpZHgsIDEgLyAobl9vc2MtMikpXG4gICAgICB9XG4gICAgfSlcblxuICB9XG5cbiAgZnVuY3Rpb24gZW5jb2RlX3N0cmluZyhzdHJpbmcpe1xuXG4gICAgdmFyIGJ5dGVzID0gc3RyaW5nLnNwbGl0KCcnKVxuICAgIC8vIGNvbnNvbGUubG9nKHN0cmluZyxieXRlcylcblxuICAgIHdoaWxlKGJ5dGVzLmxlbmd0aCA8IEJZVEVTX1RPX0VOQ09ERSl7XG4gICAgICBieXRlcy5wdXNoKCcrJylcbiAgICB9XG5cbiAgICBMQVNUX1NFTlRfTUVTU0FHRSA9IENVUlJFTlRfRU5DT0RFRF9NRVNTQUdFXG4gICAgQ1VSUkVOVF9FTkNPREVEX01FU1NBR0UgPSBieXRlcy5qb2luKCcnKVxuXG4gICAgYnl0ZXMuZm9yRWFjaChmdW5jdGlvbihieXRlLGJ5dGVfaWR4KXtcblxuICAgICAgdmFyIG9mZnNldCA9IChieXRlX2lkeCAqIDgpICsgMlxuICAgICAgaWYoYnl0ZV9pZHggPT09IDApe1xuICAgICAgICBvZmZzZXQgPSAwXG4gICAgICB9XG5cbiAgICAgIGJ5dGUgPSBieXRlLmNoYXJDb2RlQXQoMClcblxuICAgICAgdmFyIGNoYXJzID0gZ2V0X2VuY29kZWRfYnl0ZV9hcnJheShieXRlKVxuXG4gICAgICAvLyBjb25zb2xlLmxvZyhjaGFycylcblxuICAgICAgY2hhcnMuZm9yRWFjaChmdW5jdGlvbiAoYywgaWR4KSB7XG4gICAgICAgIGlmIChjID09PSAnMCcpIHtcbiAgICAgICAgICBzZXRfZ2FpbihpZHgrb2Zmc2V0LCAwKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNldF9nYWluKGlkeCtvZmZzZXQsIDEgLyBuX29zYylcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgIH0pXG5cblxuXG4gIH1cblxuICBmdW5jdGlvbiBwZXJmb3JtX3NpZ25hbGluZygpIHtcbiAgICBmbGlwX2Zsb3AgPSAhZmxpcF9mbG9wXG4gICAgaWYgKGZsaXBfZmxvcCkge1xuICAgICAgc2V0X2dhaW4oOCwgMSAvIG5fb3NjKVxuICAgICAgc2V0X2dhaW4oOSwgMClcbiAgICB9IGVsc2Uge1xuICAgICAgc2V0X2dhaW4oOSwgMSAvIG5fb3NjKVxuICAgICAgc2V0X2dhaW4oOCwgMClcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRfZW5jb2RlZF9ieXRlX2FycmF5KGJ5dGUpIHtcbiAgICByZXR1cm4gcGFkKGJ5dGUudG9TdHJpbmcoMiksIDgpLnNwbGl0KCcnKVxuICB9XG5cbiAgZnVuY3Rpb24gcGFkKG4sIHdpZHRoLCB6KSB7XG4gICAgeiA9IHogfHwgJzAnO1xuICAgIG4gPSBuICsgJyc7XG4gICAgcmV0dXJuIG4ubGVuZ3RoID49IHdpZHRoID8gbiA6IG5ldyBBcnJheSh3aWR0aCAtIG4ubGVuZ3RoICsgMSkuam9pbih6KSArIG47XG4gIH1cblxuICBmdW5jdGlvbiBnZXRfc3RhdGUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJ1ZmZlcjogZ2V0QnVmZmVyKCksXG4gICAgICBsb2NhbF9idWZmZXI6IGdldF9sb2NhbF9mcmVxdWVuY3lfZGF0YV9idWZmZXIoKSxcbiAgICAgIFJYX0JVRkZFUjogUlhfQlVGRkVSLFxuICAgICAgQ1VSUkVOVF9TVEFURTogQ1VSUkVOVF9TVEFURSxcbiAgICAgIFNZTkNfQ09VTlQ6IFNZTkNfQ09VTlQsXG4gICAgICBNRVNTQUdFOiBNRVNTQUdFLFxuICAgICAgTUVTU0FHRV9JRFg6IE1FU1NBR0VfSURYLFxuICAgICAgQ09OTkVDVEVEX0FUOiBDT05ORUNURURfQVQsXG4gICAgICBDVVJSRU5UX0VOQ09ERURfTUVTU0FHRTogQ1VSUkVOVF9FTkNPREVEX01FU1NBR0UsXG4gICAgICBMQVNUX1NFTlRfTUVTU0FHRTogTEFTVF9TRU5UX01FU1NBR0UsXG4gICAgICBMQVRFU1RfUlhfQkxPQjogTEFURVNUX1JYX0JMT0IsXG4gICAgICBQUkVWX1JYX0JMT0I6IFBSRVZfUlhfQkxPQlxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc2V0X2JhdWRfY291bnQoKXtcbiAgICBSWF9CVUZGRVIgPSAnJ1xuICAgIENPTk5FQ1RFRF9BVCA9IERhdGUubm93KClcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgY2hlY2tfcGVha19yYW5nZXM6IGNoZWNrX3BlYWtfcmFuZ2VzLFxuICAgIGNvbm5lY3Q6IGNvbm5lY3QsXG4gICAgZW5jb2RlX3JhbmdlOiBlbmNvZGVfYnl0ZSxcbiAgICBnZXRCdWZmZXI6IGdldEJ1ZmZlcixcbiAgICBnZXRfYW5hbHlzZXI6IGdldF9hbmFseXNlcixcbiAgICBnZXRfZW5jb2RlZF9ieXRlX2FycmF5OiBnZXRfZW5jb2RlZF9ieXRlX2FycmF5LFxuICAgIGdldF9maWx0ZXJfYmFuazogZ2V0X2ZpbHRlcl9iYW5rLFxuICAgIGdldF9nYWluX2Jhbms6IGdldF9nYWluX2JhbmssXG4gICAgZ2V0X2dyb3VwczogZ2V0X2dyb3VwcyxcbiAgICBnZXRfbG9jYWxfZnJlcXVlbmN5X2RhdGFfYnVmZmVyOiBnZXRfbG9jYWxfZnJlcXVlbmN5X2RhdGFfYnVmZmVyLFxuICAgIGdldF9zdGF0ZTogZ2V0X3N0YXRlLFxuICAgIGdyb3VwX3BlYWtfcmFuZ2VzOiBncm91cF9wZWFrX3JhbmdlcyxcbiAgICBpbml0OiBpbml0LFxuICAgIG5fY2hhbm5lbHM6IG5fY2hhbm5lbHMsXG4gICAgc2V0X2dhaW46IHNldF9nYWluLFxuICAgIHNldF9tZXNzYWdlOiBzZXRfbWVzc2FnZSxcbiAgICBzZXRfdm9sdW1lOiBzZXRfdm9sdW1lLFxuICAgIHJlYWRfYnl0ZV9mcm9tX3NpZ25hbDogcmVhZF9ieXRlX2Zyb21fc2lnbmFsLFxuICAgIHJlc2V0X2JhdWRfY291bnQ6IHJlc2V0X2JhdWRfY291bnQsXG4gICAgdGljazogdGljayxcbiAgICB2YWxpZGF0ZV9yYW5nZXM6IHZhbGlkYXRlX3JhbmdlcyxcbiAgICBwZXJmb3JtX3NpZ25hbGluZzogcGVyZm9ybV9zaWduYWxpbmdcbiAgfTtcblxufVxuIiwid2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgXG4gIHdpbmRvdy5jb25zb2xlLnRpbWUgPSBmdW5jdGlvbiAoKSB7fTtcbiAgd2luZG93LmNvbnNvbGUudGltZUVuZCA9IGZ1bmN0aW9uICgpIHt9O1xuICB3aW5kb3cuY29uc29sZS5sb2cgPSBmdW5jdGlvbigpe307XG5cbiAgdmFyIERPX0RSQVcgPSB0cnVlXG4gIHdpbmRvdy5CQVVEX1JBVEUgPSAzMDBcblxuICBjb25zb2xlLmxvZyh3aW5kb3cuc2NyZWVuLndpZHRoKVxuXG4gIGlmICh3aW5kb3cuc2NyZWVuLndpZHRoIDwgNDAwKSB7XG4gICAgZDMuc2VsZWN0KCdkaXYjbW9iaWxlX2JlZ2luJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgQkFVRF9SQVRFID0gMzAwXG4gICAgICBkMy5zZWxlY3QodGhpcykuc3R5bGUoJ2Rpc3BsYXknLCAnbm9uZScpXG4gICAgICBpbml0X3JvdXRpbmUoKVxuICAgIH0pXG4gIH0gZWxzZSB7XG4gICAgQkFVRF9SQVRFID0gMTAwXG4gICAgZDMuc2VsZWN0KCdkaXYjbW9iaWxlX2JlZ2luJykucmVtb3ZlKClcbiAgICBpbml0X3JvdXRpbmUoKVxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdF9yb3V0aW5lKCkge1xuXG4gICAgdmFyIHVkcF9tb2RlID0gdHJ1ZVxuXG4gICAgY29uc29sZS5sb2coJ21haW4uanMgLyBpbml0X3JvdXRpbmUoKScpXG5cbiAgICB2YXIgcGFyZW50X2JhdWRfcmF0ZSA9IGQzLnNlbGVjdCgnZGl2I2JhdWRfcmF0ZScpLmFwcGVuZCgnZGl2JykuYXR0cignY2xhc3MnLCAnY29sLW1kLTggY29sLW1kLW9mZnNldC0yJylcblxuICAgIHBhcmVudF9iYXVkX3JhdGUuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgnbW9kZW0gc3BlZWQnKVxuICAgIHZhciBiYXVkX3NjYWxlID0gZDMuc2NhbGUubGluZWFyKCkuZG9tYWluKFsxMDAsIDBdKS5yYW5nZShbQkFVRF9SQVRFIC8gMy41LCBCQVVEX1JBVEUgKiAxMF0pXG4gICAgdmFyIGJhdWRfc2xpZGVyID0gcGFyZW50X2JhdWRfcmF0ZS5hcHBlbmQoJ2lucHV0JykuYXR0cigndHlwZScsICdyYW5nZScpXG4gICAgICAuYXR0cignbWluJywgMC4wKVxuICAgICAgLmF0dHIoJ21heCcsIDEwMC4wKVxuICAgICAgLmF0dHIoJ3ZhbHVlJywgYmF1ZF9zY2FsZS5pbnZlcnQoQkFVRF9SQVRFKSlcblxuICAgIGJhdWRfc2xpZGVyLm9uKCdpbnB1dCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGQzLmV2ZW50KVxuICAgICAgdmFyIHYgPSBkMy5zZWxlY3QodGhpcykubm9kZSgpLnZhbHVlXG5cbiAgICAgIGNvbnNvbGUubG9nKHYpXG5cbiAgICAgIEJBVURfUkFURSA9IGJhdWRfc2NhbGUodilcblxuICAgICAgd2luZG93LmFsaWNlLnJlc2V0X2JhdWRfY291bnQoKVxuICAgICAgd2luZG93LmJvYi5yZXNldF9iYXVkX2NvdW50KClcblxuICAgIH0pXG5cbiAgICB2YXIgbWVzc2FnZV90b19zZW5kID0gJzA5ODc2NTQzMjEtLXRlc3RpbmctLTEyMzQ1Njc4OTAtLSEhLS1hYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eidcbiAgICAgIC8vIG1lc3NhZ2VfdG9fc2VuZCA9ICcwMTIzNDU2NydcbiAgICB2YXIgb3V0cHV0X21zZyA9ICcnXG5cbiAgICB2YXIgQWdlbnQgPSByZXF1aXJlKCcuL2FnZW50LmpzJylcbiAgICB2YXIgVmlld19Db250cm9sbGVyID0gcmVxdWlyZSgnLi92aWV3X2NvbnRyb2xsZXIuanMnKVxuXG4gICAgd2luZG93LmFsaWNlID0gQWdlbnQuYWdlbnQoKVxuICAgIGFsaWNlLmluaXQoe1xuICAgICAgbmFtZTogJ2FsaWNlJyxcbiAgICAgIHR5cGU6ICdjbGllbnQnLFxuICAgICAgbWVzc2FnZTogJ0kgYW0gYWxpY2UgbGlzdGVuIHRvIG1lIHNlbmQgZGF0YSB1c2luZyB3ZWIgYXVkaW8gYXBpLidcbiAgICB9KVxuXG4gICAgd2luZG93LmJvYiA9IEFnZW50LmFnZW50KClcbiAgICBib2IuaW5pdCh7XG4gICAgICBuYW1lOiAnYm9iJyxcbiAgICAgIHR5cGU6ICdzZXJ2ZXInLFxuICAgICAgbWVzc2FnZTogJ1RoaXMgYmUgYm9iLCBsaXN0ZW4gdG8gTUUgc2VuZCBkYXRhIHVzaW5nIHRoZSB3ZWIgYXVkaW8gYXBpLidcbiAgICB9KVxuXG5cbiAgICB2YXIgZGlzcGxheV9ib2IgPSBWaWV3X0NvbnRyb2xsZXIudmlld19jb250cm9sbGVyKCdib2JfbW9kZW0nKVxuICAgIGRpc3BsYXlfYm9iLmNvbm5lY3QoYm9iKVxuXG4gICAgdmFyIGRpc3BsYXlfYWxpY2UgPSBWaWV3X0NvbnRyb2xsZXIudmlld19jb250cm9sbGVyKCdhbGljZV9tb2RlbScpXG4gICAgZGlzcGxheV9hbGljZS5jb25uZWN0KGFsaWNlKVxuXG5cbiAgICBhbGljZS5jb25uZWN0KGJvYilcbiAgICBib2IuY29ubmVjdChhbGljZSlcblxuICAgIHNldFRpbWVvdXQoZHJhdywgNTAwKVxuXG4gICAgZnVuY3Rpb24gZHJhdygpIHtcblxuICAgICAgICBjb25zb2xlLnRpbWUoJ3Rlc3QnKVxuICAgICAgICBhbGljZS50aWNrKClcbiAgICAgICAgYm9iLnRpY2soKVxuICAgICAgICBjb25zb2xlLnRpbWVFbmQoJ3Rlc3QnKVxuXG4gICAgICAgIGRpc3BsYXlfYWxpY2UudGljayhET19EUkFXKVxuICAgICAgICBkaXNwbGF5X2JvYi50aWNrKERPX0RSQVcpXG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coYm9iLmdldF9zdGF0ZSgpLkxBVEVTVF9SWF9CTE9CLCBhbGljZS5nZXRfc3RhdGUoKS5MQVNUX1NFTlRfTUVTU0FHRSApXG5cbiAgICAgICAgdmFyIGFsaWNlX3N0YXRlID0gYWxpY2UuZ2V0X3N0YXRlKClcbiAgICAgICAgdmFyIGJvYl9zdGF0ZSA9IGJvYi5nZXRfc3RhdGUoKVxuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKGJvYl9zdGF0ZS5MQVRFU1RfUlhfQkxPQi5sZW5ndGgsIGFsaWNlX3N0YXRlLkxBU1RfU0VOVF9NRVNTQUdFLmxlbmd0aClcblxuXG4gICAgICAgIGlmICgoYm9iX3N0YXRlLkxBVEVTVF9SWF9CTE9CLmxlbmd0aCAhPT0gYWxpY2Vfc3RhdGUuTEFTVF9TRU5UX01FU1NBR0UubGVuZ3RoKSB8fCAoYm9iX3N0YXRlLkxBVEVTVF9SWF9CTE9CID09PSBhbGljZV9zdGF0ZS5MQVNUX1NFTlRfTUVTU0FHRSkpIHtcbiAgICAgICAgICAvLyBpZihib2Jfc3RhdGUuTEFURVNUX1JYX0JMT0IgPT09IGFsaWNlX3N0YXRlLkxBU1RfU0VOVF9NRVNTQUdFKXtcbiAgICAgICAgICBzZXRUaW1lb3V0KGRyYXcsIEJBVURfUkFURSlcbiAgICAgICAgICAgIC8vIH0gZWxzZSB7XG5cbiAgICAgICAgICAvLyB9XG4gICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICBjb25zb2xlLmxvZyhib2Jfc3RhdGUuTEFURVNUX1JYX0JMT0IsIGFsaWNlX3N0YXRlLkxBU1RfU0VOVF9NRVNTQUdFKVxuXG4gICAgICAgICAgY29uc29sZS5sb2coJ2VycicpXG5cbiAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGJvYi5wZXJmb3JtX3NpZ25hbGluZygpXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGRyYXcsIEJBVURfUkFURSAqIDIpXG4gICAgICAgICAgfSlcblxuXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZHJhdyk7XG4gIH1cblxuXG59XG4iLCJtb2R1bGUuZXhwb3J0cy52aWV3X2NvbnRyb2xsZXIgPSB2aWV3X2NvbnRyb2xsZXJcblxuZnVuY3Rpb24gdmlld19jb250cm9sbGVyKGRpdl9pZCkge1xuXG4gIFwidXNlIHN0cmljdFwiO1xuXG4gIHZhciBuYW1lID0gZGl2X2lkXG5cbiAgdmFyIGFnZW50XG4gIHZhciBwYXJlbnQgPSBkMy5zZWxlY3QoJ2RpdiMnICsgZGl2X2lkKVxuXG4gIC8vIGRpc3BsYXlcbiAgLy8gICAgY3VycmVudCBzdGF0ZVxuICAvLyAgICBzeW5jIGNvdW50XG4gIC8vICAgIG9zY2lsbG9zY29wZSBvZiBvdXRwdXQgJiBpbnB1dFxuICAvLyAgICBmZnQgYmFycyBvZiBvdXRwdXQgJiBpbnB1dFxuICAvLyAgICBjdXJyZW50IGJhdWRcbiAgLy8gICAgcnggYnVmZmVyXG5cbiAgdmFyIHN2Z1xuICB2YXIgZGl2X3N5bmNfY291bnRcbiAgdmFyIHN5bmNfaW5kaWNhdG9yXG4gIHZhciBkaXZfcnhfYnVmZmVyXG4gIHZhciBkaXZfYmF1ZF9tZXRlclxuICB2YXIgYmFycyA9IFtdXG5cbiAgdmFyIFdJRFRIID0gMTAyNFxuICB2YXIgSEVJR0hUID0gMjU2XG5cbiAgdmFyIGJhcldpZHRoXG4gIHZhciBidWZmZXJMZW5ndGhcbiAgICAvLyB2YXIgYmFySGVpZ2h0XG5cbiAgLy8gY3JlYXRlIHN2Z1xuICBmdW5jdGlvbiBzZXR1cF9zdmcoKSB7XG5cbiAgICB2YXIgc3RhdGUgPSBhZ2VudC5nZXRfc3RhdGUoKVxuXG4gICAgV0lEVEggPSBidWZmZXJMZW5ndGhcbiAgICBIRUlHSFQgPSBXSURUSCAvIDRcblxuICAgIGJhcldpZHRoID0gKFdJRFRIIC8gYnVmZmVyTGVuZ3RoKVxuXG4gICAgcGFyZW50LmFwcGVuZCgnaDEnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwobmFtZSlcblxuICAgIHN2ZyA9IHBhcmVudC5hcHBlbmQoJ3N2ZycpXG4gICAgICAuYXR0cignY2xhc3MnLCAnaW1nLXJlc3BvbnNpdmUnKVxuICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxuICAgICAgLy8gLmF0dHIoJ2hlaWdodCcsIEhFSUdIVClcbiAgICAgIC5hdHRyKCdwcmVzZXJ2ZUFzcGVjdFJhdGlvJywgJ3hNaWRZTWlkJylcbiAgICAgIC5hdHRyKCd2aWV3Qm94JywgJzAgMCAnICsgV0lEVEggKyAnICcgKyBIRUlHSFQpXG4gICAgICAuc3R5bGUoJ2JhY2tncm91bmQtY29sb3InLCAncmdiYSgwLDAsMCwwLjEpJylcblxuICAgIHN2Zy5hcHBlbmQoJ3RleHQnKVxuICAgICAgLnRleHQoJ3JlY2VpdmVyIHNwZWN0cnVtJylcbiAgICAgIC5hdHRyKCd4JywgV0lEVEgpXG4gICAgICAuYXR0cigneScsIDEyKVxuICAgICAgLmF0dHIoJ2R4JywgJy00cHgnKVxuICAgICAgLnN0eWxlKCdmb250LXNpemUnLCAxMilcbiAgICAgIC5zdHlsZSgndGV4dC1hbmNob3InLCAnZW5kJylcbiAgICAgIC5hdHRyKCdmaWxsJywgJ3JnYmEoMCwwLDAsMC4xKScpXG5cblxuICAgIGJhcnMgPSBbXVxuICAgIGZvciAodmFyIHN2Z2JhcnMgPSAwOyBzdmdiYXJzIDwgYnVmZmVyTGVuZ3RoOyBzdmdiYXJzKyspIHtcbiAgICAgIHZhciBiYXIgPSBzdmcuYXBwZW5kKCdyZWN0JylcbiAgICAgICAgLmF0dHIoJ3gnLCBiYXJXaWR0aCAqIHN2Z2JhcnMpXG4gICAgICAgIC5hdHRyKCd5JywgMClcbiAgICAgICAgLmF0dHIoJ3dpZHRoJywgYmFyV2lkdGgpXG4gICAgICAgIC5hdHRyKCdoZWlnaHQnLCAwKVxuICAgICAgICAuYXR0cignZmlsbCcsICdncmVlbicpXG4gICAgICAgIC5hdHRyKCdzdHJva2UnLCAnbm9uZScpXG5cbiAgICAgIHZhciBiYXJfaWR4ID0gc3ZnYmFyc1xuICAgICAgYmFyLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGJhcl9pZHgpXG4gICAgICB9KVxuXG4gICAgICBiYXJzLnB1c2goYmFyKVxuICAgIH1cblxuICAgIC8vIHN5bmMgY291bnRcbiAgICBkaXZfc3luY19jb3VudCA9IHBhcmVudC5hcHBlbmQoJ2RpdicpXG4gICAgICAuYXR0cignY2xhc3MnLCAnY29sLW1kLTQnKVxuICAgICAgLnN0eWxlKCdvdXRsaW5lJywgJzFweCBkb3R0ZWQgcmdiYSgwLDAsMCwwLjEpJylcblxuICAgIGRpdl9zeW5jX2NvdW50LmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3N5bmNocm9uaXphdGlvbiBjb3VudHMnKVxuICAgIHN5bmNfaW5kaWNhdG9yID0gZGl2X3N5bmNfY291bnQuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlciBzeW5jX2NvdW50JylcblxuICAgIC8vIGJhdWQgbWV0ZXJcbiAgICB2YXIgcGFyZW50X2JhdWRfbWV0ZXIgPSBwYXJlbnQuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICdjb2wtbWQtNCcpXG4gICAgICAuc3R5bGUoJ291dGxpbmUnLCAnMXB4IGRvdHRlZCByZ2JhKDAsMCwwLDAuMSknKVxuXG4gICAgcGFyZW50X2JhdWRfbWV0ZXIuYXBwZW5kKCdoNCcpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJykuaHRtbCgnYmF1ZCcpXG4gICAgZGl2X2JhdWRfbWV0ZXIgPSBwYXJlbnRfYmF1ZF9tZXRlci5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ3RleHQtY2VudGVyJylcblxuXG4gICAgdmFyIHBhcmVudF9pbnB1dF9zbGlkZXIgPSBwYXJlbnQuYXBwZW5kKCdkaXYnKS5hdHRyKCdjbGFzcycsICdjb2wtbWQtNCcpXG5cbiAgICBwYXJlbnRfaW5wdXRfc2xpZGVyLmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3RyYW5zbWl0dGVyIHZvbHVtZScpXG5cbiAgICB2YXIgc2xpZGVyX2l0c2VsZiA9IHBhcmVudF9pbnB1dF9zbGlkZXIuYXBwZW5kKCdpbnB1dCcpLmF0dHIoJ3R5cGUnLCAncmFuZ2UnKVxuICAgICAgLmF0dHIoJ21pbicsIDAuMClcbiAgICAgIC5hdHRyKCdtYXgnLCAxMDAuMClcbiAgICAgIC5hdHRyKCd2YWx1ZScsIDAuMClcblxuICAgIHNsaWRlcl9pdHNlbGYub24oJ2lucHV0JywgZnVuY3Rpb24gKCkge1xuICAgICAgLy8gY29uc29sZS5sb2coZDMuZXZlbnQpXG4gICAgICB2YXIgdiA9IGQzLnNlbGVjdCh0aGlzKS5ub2RlKCkudmFsdWVcbiAgICAgIGFnZW50LnNldF92b2x1bWUodiAvIDEwMC4wKVxuICAgIH0pXG5cbiAgICAvLyBtZXNzYWdlIHRvIHNlbmRcbiAgICB2YXIgcGFyZW50X21lc3NhZ2VfdG9fc2VuZCA9IHBhcmVudC5hcHBlbmQoJ2RpdicpLmF0dHIoJ2NsYXNzJywgJ2NvbC1tZC0xMicpXG5cbiAgICBwYXJlbnRfbWVzc2FnZV90b19zZW5kLmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3NlbmRpbmcgdGhpcyBtZXNzYWdlJylcblxuICAgIHZhciBpbnB1dF9maWVsZCA9IHBhcmVudF9tZXNzYWdlX3RvX3NlbmQuYXBwZW5kKCdpbnB1dCcpXG4gICAgICAuYXR0cigndHlwZScsICd0ZXh0JylcbiAgICAgIC5hdHRyKCdjbGFzcycsICdtc2dfaW5wdXQnKVxuXG4gICAgaW5wdXRfZmllbGQubm9kZSgpLnZhbHVlID0gc3RhdGUuTUVTU0FHRVxuXG4gICAgaW5wdXRfZmllbGQub24oJ2tleXVwJywgZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHYgPSBpbnB1dF9maWVsZC5ub2RlKCkudmFsdWVcbiAgICAgIGlmICh2ID09PSAnJykge1xuICAgICAgICB2ID0gJyAnXG4gICAgICB9XG5cbiAgICAgIGFnZW50LnNldF9tZXNzYWdlKHYpXG4gICAgfSlcblxuICAgIC8vIHJ4IGJ1ZmZlclxuICAgIHZhciBkaXZfcnhfYnVmZmVyX3BhcmVudCA9IHBhcmVudC5hcHBlbmQoJ2RpdicpXG4gICAgICAuYXR0cignY2xhc3MnLCAnY29sLW1kLTEyJylcblxuICAgIGRpdl9yeF9idWZmZXJfcGFyZW50LmFwcGVuZCgnaDQnKS5hdHRyKCdjbGFzcycsICd0ZXh0LWNlbnRlcicpLmh0bWwoJ3J4IGJ1ZmZlcicpXG5cbiAgICBkaXZfcnhfYnVmZmVyID0gZGl2X3J4X2J1ZmZlcl9wYXJlbnQuYXBwZW5kKCdwcmUnKS5hdHRyKCdjbGFzcycsICdyeF9idWZmZXInKVxuXG5cblxuICAgIC8vXG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbm5lY3QocmVtb3RlX2FnZW50KSB7XG4gICAgYWdlbnQgPSByZW1vdGVfYWdlbnRcbiAgICBidWZmZXJMZW5ndGggPSByZW1vdGVfYWdlbnQuZ2V0X3N0YXRlKCkuYnVmZmVyLmxlbmd0aFxuICB9XG5cbiAgZnVuY3Rpb24gdGljayhkcmF3X2JhcnMpIHtcblxuICAgIGlmIChiYXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgc2V0dXBfc3ZnKClcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgc3RhdGUgPSBhZ2VudC5nZXRfc3RhdGUoKVxuXG4gICAgaWYgKGRyYXdfYmFycyA9PT0gdHJ1ZSkge1xuICAgICAgdmFyIGRhdGFBcnJheSA9IHN0YXRlLmJ1ZmZlclxuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1ZmZlckxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGJhcnNbaV0uYXR0cignaGVpZ2h0JywgKGRhdGFBcnJheVtpXSAvIDI1NSkgKiBIRUlHSFQpXG4gICAgICB9XG5cbiAgICB9XG5cbiAgICBzeW5jX2luZGljYXRvci5odG1sKHN0YXRlLlNZTkNfQ09VTlQpXG4gICAgZGl2X3J4X2J1ZmZlci5odG1sKHN0YXRlLlJYX0JVRkZFUilcblxuICAgIHZhciBiYXVkID0gOCAqIChzdGF0ZS5SWF9CVUZGRVIubGVuZ3RoIC8gKChEYXRlLm5vdygpIC0gc3RhdGUuQ09OTkVDVEVEX0FUKSAvIDEwMDAuMCkpXG4gICAgZGl2X2JhdWRfbWV0ZXIuaHRtbChiYXVkLnRvRml4ZWQoMikpXG5cbiAgICAvL1xuICAgIC8vIGNvbnNvbGUubG9nKGFnZW50LmdldF9zdGF0ZSgpLlNZTkNfQ09VTlQpXG5cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdGljazogdGljayxcbiAgICBjb25uZWN0OiBjb25uZWN0XG4gIH1cblxufVxuIl19
