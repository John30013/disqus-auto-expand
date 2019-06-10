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
            // this._startY = window.scrollY;
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
  let _lastWheelEventTime = 0;
  const _maxScrollJump =
      60 * parseInt(getComputedStyle(document.body).fontSize, 10);
  const _scrollTracker = new ScrollTracker(window);

  _scrollTracker.start(handleScrollEnd);

  daxOptions.doDebug &&
    console.debug(
      "stopPageJumps: initalScrollTop ~= %d; scrollMax = %d",
      _scrollTracker.startPos, _maxScrollJump
    );

  // Install handlers to detect user interaction.
  window.addEventListener("mousedown", trackUserInteraction);
  window.addEventListener("mouseup", trackUserInteraction);
  window.addEventListener("keydown", trackUserInteraction);
  window.addEventListener("keyup", trackUserInteraction);
  window.addEventListener("touchstart", trackUserInteraction);
  window.addEventListener("touchend", trackUserInteraction);
  window.addEventListener("wheel", event => {
    _lastWheelEventTime = Date.now();
  });
  // TODO: wheel: capture the time of the wheel event. 
  // On scroll end, compare to the scroll start and end times. 
  // If it's between them, it was user interaction.
  function trackUserInteraction(event) {
    if (event.type === 'mousedown' || event.type === 'keydown' || event.type === 'touchstart') {
      _userInteraction = event.type;
      return;
    } else if (event.type === 'mouseup' || event.type === 'keyup' || event.type === 'touchend') {
      window.setTimeout(() => _userInteraction = '', 200);
      // _userInteraction = '';
      return;
    }
  };

  function handleScrollEnd(tracker) {
    daxOptions.doDebug &&
      console.debug('handleScrollEnd:', tracker.data);
    // Check for scroll events during user interaction. If so, ignore the 
    // event (for our purposes) by updating the current scroll position.
    if (_userInteraction || 
        _lastWheelEventTime >= tracker.startTime && _lastWheelEventTime <= tracker.endTime) {
      daxOptions.doDebug && 
        console.debug('Ignoring user scroll.');
      return;
    }
    if (tracker.distance > _maxScrollJump) {
      window.scrollTo(0, tracker.startPos);
      daxOptions.doDebug &&
        console.debug("--> Returned scroll position to %d",
          tracker.startPos);
    }
  }
})();
