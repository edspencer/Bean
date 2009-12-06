/**
 * A Plunger is anything that drops down onto the Canvas.
 * Because it 'plunges'.
 * Yeah.
 */
Bean.Plunger = function(config) {
  config = config || {};
  
  var defaults = {
    /**
     * @property endRotation
     * @type Number
     * The fraction of 2 * PI by which the image should be rotated by the
     * time it has finished plunging
     */
    endRotation: 0,
    
    /**
     * @property xScale
     * @type Number
     * The fraction of 1 to scale the image to in the x axis
     */
    xScale: 1,
    
    /**
     * @property yScale
     * @type Number
     * The fraction of 1 to scale the image to in the y axis
     */
    yScale: 1,
    
    /**
     * @property xPos
     * @type Number
     * The current x-coord of the centre of the image
     */
    xPos: 0,
    
    /**
     * @property yPos
     * @type Number
     * The current y-coord of the centre of the image
     */
    yPos: 0,
    
    /**
     * @property fallDuration
     * @type Number
     * Number of milliseconds taken for this Plunger to fall
     */
    fallDuration: 3000,
    
    /**
     * @property scaleFraction
     * @type Number
     * The fraction of 1 that the image should be scaled down to by the end of its plunge.
     * e.g. if the image starts at 100px wide, setting a scaleFraction of 0.5 will make it
     * be 50px wide when it has finished its plunge. Defaults to 0.5.
     */
    scaleFraction: 0.5,
    
    /**
     * @property startWidth
     * @type Number
     * The initial width to draw the image at. Defaults to the width of the image
     */
    startWidth: config.image.width,
    
    /**
     * @property startHeight
     * @type Number
     * The initial height to draw the image at. Defaults to the height of the image
     */
    startHeight: config.image.height,
    
    /**
     * @property autoPlunge
     * @type Boolean
     * True to start plunging straight away (otherwise need to call this.plunge())
     */
    autoPlunge: true,
    
    /**
     * @property hasBorder
     * @type Boolean
     * True to draw a border frame around the image (defaults to true)
     */
    hasBorder: true,
    
    /**
     * @property borderColor
     * @type String
     * The hex colour string to use when drawing the frame (defaults to white - "#ffffff")
     */
    borderColor: "#ffffff",
    
    /**
     * @property borderWidth
     * @type Number
     * Width of the border (defaults to 10)
     */
    borderWidth: 15
  };
  
  for (var key in config) {
    defaults[key] = config[key] || defaults[key];
  }
  
  for (var key in defaults) {
    this[key] = defaults[key];
  }
  
  /**
   * @property started
   * @type Boolean
   * True if the plunger has started its descent yet
   */
  this.started = false;
  
  /**
   * @property stopped
   * @type Boolean
   * True if the plunger has finished its descent
   */
  this.stopped = false;
  
  /**
   * @property plungeCompleteCallbacks
   * @type Array
   * All callbacks to be executed when this Plunger has finished falling
   */
  this.plungeCompleteCallbacks = [];
  
  if (this.autoPlunge === true) this.plunge();
};

Bean.Plunger.prototype = {
  /**
   * Starts the image plunging
   */
  plunge: function() {
    this.started = true;
    
    /**
     * @property startedAt
     * @type Date
     * The time the plunge started
     */
    this.startedAt = new Date();
  },
  
  /**
   * Calls the given function when this Plunger has finished falling
   * @param {Function} callback The callback function
   * @param {Object} scope Optional execution scope
   */
  onPlungeComplete: function(callback, scope) {
    this.plungeCompleteCallbacks.push({
      callback: callback,
      scope   : scope || this
    });
  },
  
  /**
   * Draws this plunging object with the given canvas context
   * @param {Context} context The context to draw with
   */
  draw: function(context) {
    if (this.started === false) return;
    
    var elapsed  = new Date() - this.startedAt,
        fraction = elapsed / this.fallDuration;
    
    if (elapsed > this.fallDuration) {
      fraction = 1;
      
      if (!this.stopped) {
        this.stopped = true;
        
        var callbacks = this.plungeCompleteCallbacks;
        
        for (var i=0; i < callbacks.length; i++) {
          callbacks[i]['callback'].call(callbacks[i].scope);
        }
      }
    }
    
    //calculate the current scale, rotation, transparency
    var curScale    = 1 - (this.scaleFraction * fraction),
        curWidth    = this.startWidth  * curScale,
        curHeight   = this.startHeight * curScale,
        translateX  = curWidth  / 2,
        translateY  = curHeight / 2,
        curRotation = this.endRotation  * fraction;
    
    //set the context up with the correct positioning, scaling, rotation and alpha
    context.globalAlpha = 0.5 + (fraction * 0.5);
    context.translate(this.xPos, this.yPos);
    context.rotate(curRotation);
    context.translate(-translateX, -translateY);
    context.scale(curScale, curScale);
    
    //draw the border if the image has one
    if (this.hasBorder) {
      var borderWidth = this.borderWidth,
          borderColor = this.borderColor;
      
      context.save();
      
      context.translate(-borderWidth, -borderWidth);
      context.fillStyle = borderColor;
      context.lineWidth = borderWidth;
      
      //draw the 4 sides separately to make the transparency work correctly
      context.fillRect(0, 0, borderWidth, this.startHeight + (2 * borderWidth));
      context.fillRect(this.startWidth + borderWidth, 0, borderWidth, this.startHeight + (2 * borderWidth));
      context.fillRect(borderWidth, 0, this.startWidth, borderWidth);
      context.fillRect(borderWidth, this.startHeight + borderWidth, this.startWidth, borderWidth);
      
      context.restore();
    }
    
    //draw the image
    context.drawImage(this.image, 0, 0);
  }
};