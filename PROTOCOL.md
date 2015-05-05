## one-way modes

### broadcast mode (passive)
* `STATE A`
  * agent broadcasts and performs signaling at a constant rate.  

Agent does not listen for any signals.

It is up to the client to configure the frequency bands to be read to decode the signal.

### listen mode (passive)
`STATE A` Agent polls for signaling and decodes bytes as they arrive.

Agent does not broadcast any signals.

## two-way modes

### triggered broadcast mode (semi-passive)
* `STATE A`
  * agent broadcasts full gain on all frequencies
  * each tick
    * if agent hears client transmit on identifying bands
      * `GOTO` `STATE B`
* `STATE B`
  * agent broadcasts and performs signaling at a constant rate.  



### triggered listen mode (semi-passive)
* `STATE A`
  * agent broadcasts full gain on all frequencies
  * each tick
    * agent polls for signaling and decodes bytes as they arrive
    * if agent finds signaling
      * agent zeros gain on all broadcast frequencies
      * `GOTO` `STATE B`
* `STATE B`
  * agent polls for signaling and decodes bytes as they arrive

### mutual stepped broadcast mode (active)

### mutual stepped listen mode (active)


--[] error checked
