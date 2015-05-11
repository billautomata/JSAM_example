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
