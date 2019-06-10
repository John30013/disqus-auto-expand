(function() {

  // Class to track vertical scrolling on the window.
  class ScrollTracker {

    constructor() {
      this._startY = 0;
      this._endY = 0;
      this._distance = 0;
      this._startTime = 0;
      this._endTime = 0;
      this._duration = 0;
      this._interval = 50;
      this._isScrolling = false;
      this._timer = null;
    }

    start(onScrollEnd, _interval) {
      // let me = this;
      if (typeof _interval === "number" && _interval > 0) {
        this.stop();
        interval = _interval;
      }
      this._startY = this._endY = window.scrollY;
      this._distance = this._duration = 0;
      this._startTime = this._endTime = Date.now();
      this._timer = window.setInterval(_trackScrolling.bind(this), this._interval);

      function _trackScrolling() {
        if (window.scrollY !== this._endY) {
          if (!this._isScrolling) {
            // Scrolling has started.
            this._startY = this._endY;
            this._startTime = Date.now();
            this._distance = this._duration = 0;
            this._isScrolling = true;
          }
          this._endY = window.scrollY;
          this._endTime = Date.now();
        } else if (this._isScrolling) {
          this._isScrolling = false;
          this._distance = this._endY - this._startY;
          this._duration = this._endTime - this._startTime;
          onScrollEnd(this);
        }
      }
    }

    stop() {
      if (this._timer) {
        window.clearInterval(this._timer);
      }
    }

    toString() {
      return JSON.stringify(this.data);
    }

    get data() {
      return ({
        "startPos": this.startPos,
        "endPos": this.endPos,
        "distance": this.distance,
        "startTime": this.startTime,
        "endTime": this.endTime,
        "duration": this.duration,
        "isScrolling": this.isScrolling
      });
    }
    get startPos() {
      return this._startY;
    }
    get endPos() {
      return this._endY;
    }
    get distance() {
      return this._distance;
    }
    get startTime() {
      return this._startTime;
    }
    get endTime() {
      return this._endTime;
    }
    get duration() {
      return this._duration;
    }
    get isScrolling() {
      return this._isScrolling;
    }
  }

  let _userInteraction = '';
  let _lastUserEvent = {'type': '', 'time': 0, 'ueHasStart': false};
  let _allowJumpCorrection = true;

  const _maxScrollJump =
      10 * parseInt(getComputedStyle(document.body).fontSize, 10);
  const _scrollTracker = new ScrollTracker(window);
  const _scrollTimingAllowance = 500;

  _scrollTracker.start(handleScrollEnd);

  daxOptions.doDebug &&
    console.debug(
      "stopPageJumps: initalScrollTop ~= %d; scrollMax = %d",
      _scrollTracker.startPos, _maxScrollJump
    );

  // Install handlers to detect user interaction.
  window.addEventListener("mousedown", trackUserEvent);
  window.addEventListener("keydown", trackUserEvent);
  window.addEventListener("touchstart", trackUserEvent);
  window.addEventListener("mouseup", trackUserEvent);
  window.addEventListener("keyup", trackUserEvent);
  window.addEventListener("touchend", trackUserEvent);
  window.addEventListener("wheel", trackUserEvent);
  window.addEventListener("resize", trackUserEvent);
  
  window.addEventListener("scroll", event => {
      console.log("Got a scroll event!");
  })
  function trackUserEvent(event) {
    _lastUserEvent = {
      'type': event.type, 
      'time': Date.now(),
      'ueHasStart': true,
    };
    daxOptions.doDebug && console.debug('trackUserInterction(): ', _lastUserEvent);
    if (event.type === 'mousedown' || event.type === 'keydown' || event.type === 'touchstart') {
      // Start event; nothing else to do.
      return;
    } 
    // End events.
    if (event.type === 'wheel' || event.type === 'resize') {
      // Events without start events have no duration.
      _lastUserEvent.ueHasStart = false;
    }
    // All end events: reset _lastUserEvent after the scroll timing allowance.
    window.setTimeout(() => _lastUserEvent = {type: '', time: 0, ueHasStart: true}, _scrollTimingAllowance);
  };

  function handleScrollEnd(tracker) {
    const {type: ueType, time: ueTime, ueHasStart: ueHasStart} = _lastUserEvent;
    const {startTime: trStart, endTime: trEnd, duration: trDur, interval: trInt} = tracker.data;

    daxOptions.doDebug && (
      console.debug('handleScrollEnd:', tracker.data),
      console.debug(`--> last user ${ueType} event @ ${ueTime}.`)
    );
    if (ueTime === 0) {
      return;
    }
    // Check for scroll events during user interaction. If so, ignore the 
    // event (for our purposes) by updating the current scroll position.
    if (ueType) {
      if (ueHasStart) {
        daxOptions.doDebug && 
          console.debug('--> Ignoring user scroll.');
      } else {
        const startDiff = Math.abs(ueTime - trStart);
        const endDiff = Math.abs(ueTime - trEnd);
        daxOptions.doDebug &&
          console.debug(`--> startDiff: ${startDiff}, endDiff: ${endDiff}, allowance: ${_scrollTimingAllowance}`);
        if (startDiff <= _scrollTimingAllowance && 
            (trDur <= trInt || endDiff <= _scrollTimingAllowance)) {
            daxOptions.doDebug && 
              console.debug('--> Ignoring user scroll.');
        }
      }
      return;
    }
    // if (Math.abs(tracker.distance) > _maxScrollJump) {
    if (_allowJumpCorrection) {
      window.scrollTo(0, tracker.startPos);
      daxOptions.doDebug &&
        console.debug("--> Non-user scroll jump: returned scroll position to %d",
          tracker.startPos);
      // Prevent "bouncing", which only seems to happen following a window resize.
      _allowJumpCorrection = false;
      window.setTimeout(() => {_allowJumpCorrection = true}, 1000);
    }
  }
})();
