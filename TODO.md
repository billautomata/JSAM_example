##todo

new modem api

var modem = Modem.modem(config)

var AudioBuffer = modem.encode('message') // returns an audio buffer
var message = modem.decode(AudioBuffer)




- [x] example AFSK mod/demod using script processor
- [x] encode to wav/mp3/cassette, json to cassette
- [x] extend to bit-level transfer
- [x] examine uneven frequency spread
- [x] byte verification routine
- [ ] bbs
- [ ] image transmission mode (PNG/JPEG/GIF)
- [encode to tape example]
