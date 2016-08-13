var x11 = require('x11')

var Exposure = x11.eventMask.Exposure;
var PointerMotion = x11.eventMask.PointerMotion;
var ButtonPress = x11.eventMask.ButtonPress;
var ButtonRelease = x11.eventMask.ButtonRelease;

// TODO find this values inside x11:
var GrabModeSync     = 0
var GrabModeAsync    = 1
var None             = 0
var CurrentTime      = 0
var TrueColor        = 4


x11.createClient(function(err, display) {
  if (err) {
    console.error("Error occured while initializing X11:")
    console.error(err.stack)
    return
  }

  start(display)
})


function start(display) {
  var X = display.client
  var rootWindowId = display.screen[0].root

  // Subscribe to mouse events via the root window:
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

  // Create a new window to act as selection rectangle:
  var selectionWindowId = X.AllocID()
  console.log(display.screen[0].white_pixel)
  X.CreateWindow(
    selectionWindowId,
    rootWindowId,
    1, 1, 1, 1, // x, y, width, height (initial values are not important)
    0, 0, 0, 0, // border, depth, class, visual (0 = CopyFromParent)
    {
      backgroundPixel: 0xf1e50a,
      overrideRedirect: true // will remove window decorations
    }
  )

  // Track mouse events and change selectionWindow geometry to draw a rectangle
  // on screen:
  var selection

  function onButtonPress(event) {
    selection = new SelectionRectangle(event.x, event.y)
    X.MapWindow(selectionWindowId)
  }

  function onPointerMotion(event) {
    if (selection == null) return
    selection.expandTo(event.x, event.y)

    X.MoveWindow(selectionWindowId, selection.x, selection.y)
    X.ResizeWindow(selectionWindowId, selection.width, selection.height)
  }

  function onButtonRelease(event) {
    console.log(selection.toArray())
    process.exit(0)
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


class SelectionRectangle {
  constructor(x, y) {
    this.originX = x
    this.originY = y
  }

  expandTo(x, y) {
    this.x = Math.min(this.originX, x)
    this.y = Math.min(this.originY, y)
    this.width = Math.abs(this.originX - x) || 1 // 0 is an invalid size for a Window
    this.height = Math.abs(this.originY - y) || 1
  }

  toArray() {
    return [ this.x, this.y, this.width, this.height ]
  }
}
