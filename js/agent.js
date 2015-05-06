"use strict";

module.exports.agent = agent

var BYTES_TO_ENCODE = 4

function agent(opts) {

  (function setup_audio_context() {
    if (window.context === undefined) {
      console.log('creating new window.AudioContext()')

      if(window.AudioConext === undefined){
        window.context = new window.webkitAudioContext()
      } else {
        window.context = new window.AudioContext()
      }

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

  var freqRange = 20000
  var spread = (freqRange / n_osc)
  var initialFreq = 500

  var CURRENT_STATE = -1

  function tick() {

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

    console.log('registering peak ranges')

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
