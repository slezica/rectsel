var x11 = require('x11')

var Exposure = x11.eventMask.Exposure;
var PointerMotion = x11.eventMask.PointerMotion;
var ButtonPress = x11.eventMask.ButtonPress;
var ButtonRelease = x11.eventMask.ButtonRelease;

// TODO find this values inside x11:
var Xor              = 11
var IncludeInferiors = 1
var GrabModeSync     = 0
var GrabModeAsync    = 1
var None             = 0
var CurrentTime      = 0


x11.createClient(function(err, display) {
  if (err) {
    console.error("Error occured while initializing X11:")
    console.error(err.stack)
    return
  }

  start(display)
})


function start(display) {
  var white = display.screen[0].white_pixel;
  var black = display.screen[0].black_pixel;

  var X = display.client
  
  var rootWindowId = display.screen[0].root
  var contextId = X.AllocID()


  // 1. Initialization
  // Subscribe to root window events, create graphics context for rendering:

  X.ChangeWindowAttributes(rootWindowId, {
    eventMask: PointerMotion | Exposure | ButtonPress | ButtonRelease
  })

  X.GrabPointer(
    rootWindowId,  // grabWindow
    false,         // ownerEvents (false = normal event reporting)
    PointerMotion | ButtonPress | ButtonRelease,
    GrabModeAsync, // pointerMode
    GrabModeAsync, // keyboardMode
    None,          // confineTo
    None,          // cursor
    CurrentTime    // time
  )

  X.CreateGC(contextId, rootWindowId, {
    foregroundPixel: black,
    backgroundPixel: white,
    subwindowMode  : IncludeInferiors,
    function       : Xor,
    planeMask      : white ^ black
  })


  // 2. Interactive selection
  // Click and drag to draw a selection rectangle, click again to finish:

  var selectionStart, mousePos
  var lastDrawnRect
  
  function onMouseEvent(event) {
    mousePos = { x: event.x, y: event.y }
  }

  function onButtonPress(event) {
    onMouseEvent(event)
    selectionStart = mousePos
  }

  function onButtonRelease(event) {
    onMouseEvent(event)
    outputRectangle(rectangleBetween(selectionStart, mousePos))
    process.exit(0)
  }

  function onPointerMotion(event) {
    onMouseEvent(event)
    if (selectionStart == null) return
    
    var rect = rectangleBetween(selectionStart, mousePos)

    if (lastDrawnRect) {
      var r = lastDrawnRect
      X.ClearArea(rootWindowId, r[0], r[1], r[2], r[3], 0)
    }

    X.PolyFillRectangle(rootWindowId, contextId, rect)
    lastDrawnRect = rect
  }

  X.on('event', function(event) {
    switch(event.name) {
      case 'ButtonPress'  : return onButtonPress(event)
      case 'ButtonRelease': return onButtonRelease(event)
      case 'MotionNotify' : return onPointerMotion(event)
    }
  })

  X.on('error', function(error) {
    console.error(error)
    process.exit(1)
  })
}


function rectangleBetween(position1, position2) {
    var x = Math.min(position1.x, position2.x)
    var y = Math.min(position1.y, position2.y)
    var width = Math.abs(position1.x - position2.x)
    var height = Math.abs(position1.y - position2.y)

    return [ x, y, width, height ]
}


function outputRectangle(rect) {
  console.log.apply(console, rect)
}
