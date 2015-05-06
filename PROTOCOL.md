## async modes

### constant broadcast mode
* `STATE A` `encoding`
  * agent broadcasts and performs signaling at a constant rate  
Agent does not listen for any signals.


### passive listen mode
* `STATE A` `decoding`
  * agent polls for signaling and decodes bytes as they arrive

This mode is for listening to a constant broadcast mode transmitter.


## sync modes


### triggered broadcast mode
* `STATE A` `idle` `listening for connection`
  * agent broadcasts full gain on all frequencies
  * each tick
    * agent listens for identifying bands on input
    * if agent hears client transmit on identifying bands
      * `GOTO` `STATE B`
* `STATE B` `encoding`
  * agent encodes bytes and performs signaling at a constant rate.  


### triggered listen mode
* `STATE A` `idle` `polling for signaling`
  * agent broadcasts full gain on all frequencies
  * each tick
    * agent polls for signaling and decodes bytes as they arrive
    * if agent finds signaling
      * agent zeros gain on all broadcast frequencies
      * `GOTO` `STATE B`
* `STATE B` `decoding`
  * agent polls for signaling and decodes bytes as they arrive

### mutual stepped broadcast mode (active)

### mutual stepped listen mode (active)

### error checked mode
