/**
 * @class Bean
 * Bean is a silly thing which uses Canvas to drop images onto the screen in
 * a stack - imagine dropping a bunch of photographs onto a table and you'll
 * understand what Bean does.  Why is it called Bean though? I once knew a man named Bean.
 */
Bean = function(config) {
  config = config || {};
  
  var defaults = {
    /**
     * @property imageUrls
     * @type Array
     * The array of image urls to use as photographs
     */
    imageUrls: [],
    
    /**
     * @property canvasId
     * @type String
     * The DOM id of the Canvas to use (required)
     */
    canvasId: '',
    
    /**
     * @property randomize
     * @type Boolean
     * True to drop photos in random order (defaults to true). Otherwise they are dropped
     * in the order they are defined in the images array
     */
    randomize: true,
    
    /**
     * @property interval
     * @type Number
     * Number of milliseconds between each drop (defaults to 5000)
     */
    interval: 4000,
    
    /**
     * @property fallDuration
     * @type Number
     * Number of milliseconds it takes for each image to fall (defaults to 3000)
     */
    fallDuration: 3000,
    
    /**
     * @property backgroundColor
     * @type String
     * The hex color code to use for the canvas background (defaults to black - "#000000")
     */
    backgroundColor: "#000000",
    
    /**
     * @property constrain
     * @type Boolean
     * True to ensure that the each image falls within the bounds of the canvas
     */
    constrain: true,
    
    /**
     * @property fillBody
     * @type Boolean
     * True to resize the canvas to the full size of the window (defaults to false)
     */
    fillBody: false,
    
    /**
     * @property useKeyFrames
     * @type Boolean
     * True to optimize animation by using key frames. This takes a snapshot of all
     * Plungers that have already landed each time one lands, and then only redraws
     * the moving Plungers. Defaults to true. Does not work with images loaded from
     * another domain.
     */
    useKeyFrames: true
  };
  
  //apply defaults and config
  for (var key in defaults) {
    this[key] = config[key] || defaults[key];
  }
  
  //turn off key frames if any images are from another domain
  //FIXME: this could identify local urls as cross-domain if they are fully specified
  for (var i=0, j = config.imageUrls.length; i < j; i++) {
    if (/^http/.test(config.imageUrls[i])) this.useKeyFrames = false;
  }
  
  /**
   * @property images
   * @type Array
   * The array of Image objects which are preloaded using the imageUrls config
   */
  this.images = [];
  
  /**
   * @property plungers
   * @type Array
   * The set of plunging objects. These are each drawn on every iteration
   */
  this.plungers = new Bean.Plungers();
  
  /**
   * @property initialized
   * @type Boolean
   * True when Bean has been initialized and all images preloaded
   */
  this.initialized = false;
  
  /**
   * @property onReadyCallbacks
   * @type Array
   * The array of callback functions to call when all images have been loaded
   */
  this.onReadyCallbacks = [];
  
  /**
   * @property lastPlungerAdded
   * @type Date
   * The time the last plunger was added
   */
  this.lastPlungerAdded = new Date(new Date() - this.interval);
  
  this.initialize();
};

Bean.prototype = {
  
  /**
   * Sets up the canvas element
   */
  initialize: function() {
    /**
     * @property canvas
     * @type HTMLElement
     * The Canvas element (NOT the context - see this.context)
     */
    this.canvas = document.getElementById(this.canvasId);
    
    if (this.fillBody) {
      var body = document.body;
      
      this.canvas.width = body.clientWidth;
      this.canvas.height = body.clientHeight;
    }
    
    /**
     * @property context
     * @type Context2d
     * The 2d canvas context
     */
    this.context = this.canvas.getContext('2d');
    
    if (this.useKeyFrames) {
      /**
       * @property takeKeyFrame
       * @type Boolean
       * @private
       * True if a keyframe should be generated next time the scene is drawn.
       * This is usually set to true after a Plunger has landed so that it can
       * be pruned from being re-rendered on every frame
       */
      this.takeKeyFrame = false;
      
      /**
       * @property currentKeyFrame
       * @type Image
       * The current keyframe image.
       */
      this.currentKeyFrame = undefined;
      
      this.plungers.onPlungeComplete(function() {
        this.takeKeyFrame = true;
      }, this);
    }
    
    this.preloadImages();
  },
  
  /**
   * Iterates over this.imageUrls and preloads all images
   */
  preloadImages: function() {
    var urls   = this.imageUrls,
        total  = this.imageUrls.length,
        loaded = 0;
    
    //used in the loadCallback below
    var onReadyCallbacks = this.onReadyCallbacks;
    var me = this;
    
    //Returns a function which is called after each image loads.
    //Calls each onReady callback when the final image has been loaded
    var loadCallback = function(image, id) {
      return function() {
        loaded += 1;
        me.images[id] = image;
        
        if (loaded == total) {
          for (var i=0; i < onReadyCallbacks.length; i++) {
            var cfg = onReadyCallbacks[i];

            cfg.fn.call(cfg.scope, me);
          }
        }
      };
    };
    
    //load the actual images
    for (var i=0, j = urls.length; i < j; i++) {
      var image = new Image();
      image.onload = loadCallback(image, i);
      image.src = urls[i];
    }
  },
  
  /**
   * Registers a function to be called when all images have been loaded.
   * The function will be called with a single argument - this Bean instance.
   * @param {Function} fn The function to call
   * @param {Object} scope Optional scope to call the function with (defaults to this)
   */
  onReady: function(fn, scope) {
    this.onReadyCallbacks.push({
      fn   : fn,
      scope: scope || this
    });
  },
  
  /**
   * Draws the frame with all existing and currently falling images
   */
  drawFrame: function() {
    var frameTime = new Date() - this.lastFrameTime,
        totalTime = new Date() - this.startTime,
        context   = this.context,
        plungers  = this.plungers;
    
    //create a new plunger if required
    if (new Date() - this.lastPlungerAdded > this.interval) {
      this.addPlunger();
    }
    
    //take a key frame if necessary
    if (this.takeKeyFrame) {
      this.currentKeyFrame = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
      //we've now taken the keyframe, no need to take another next frame
      this.takeKeyFrame = false;
    }
    
    //clear canvas and redraw everything
    this.clearCanvas();
    var moving = plungers.getMoving();
    
    for (var i=0, j = moving.length; i < j; i++) {
      this.withContext(function(context) {
        moving[i].draw(context);
      });
    }
    
    this.lastFrameTime = new Date();
  },
  
  /**
   * Starts dropping the photos
   */
  start: function() {
    /**
     * @property startTime
     * @type Date
     * The time the animation started. Used for calculating when to drop next plunger, etc
     */
    this.startTime = new Date();
    
    /**
     * @property lastFrameTime
     * @type Date
     * The time the last frame was drawn
     */
    this.lastFrameTime = new Date();
    
    var me = this;
    var looper = function() {
      me.drawFrame.call(me);
    };
    
    this.clearCanvas(false);
    setInterval(looper, 50);
  },
  
  /**
   * Stop dropping the photos. Maybe.
   */
  stop: function() {
    
  },
  
  /**
   * Adds a new plunger with randomised location and end rotation
   */
  addPlunger: function(config) {
    config = config || {};
    
    var imageId = 0;
    if (this.randomize) {
      imageId = Math.floor(Math.random() * this.images.length);
    } else {
      this.lastImageId = this.lastImageId || 0;
      this.lastImageId ++;
      this.lastImageId = this.lastImageId % this.images.length;
      imageId = this.lastImageId;
    }
    
    var defaults = {
      fallDuration: this.fallDuration,
      image       : this.images[imageId],
      endRotation : (Math.random() * Math.PI / 2) - (Math.PI / 4),
      xPos        : Math.random() * (this.canvas.width  - 100) + 50,
      yPos        : Math.random() * (this.canvas.height - 100) + 50
    };
    
    for (var key in config) {
      defaults[key] = config[key];
    }
    
    this.plungers.add(new Bean.Plunger(defaults));
    
    this.lastPlungerAdded = new Date();
  },
  
  /**
   * Clears the canvas by filling it with the backgroundColor
   * @param {Boolean} redrawKeyFrame True to automatically redraw the background keyframe
   * immediately after clearing (defaults to true)
   */
  clearCanvas: function(redrawKeyFrame) {
    this.withContext(function(context) {
      if (redrawKeyFrame !== false && this.currentKeyFrame != undefined) {
        context.putImageData(this.currentKeyFrame, 0, 0, this.canvas.height, this.canvas.width);
      } else {
        context.fillStyle = this.backgroundColor;
        context.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
    });
  },
  
  /**
   * Runs a function with the context as a single argument. Saves and restores the context
   * so as not to pollute other drawing functions
   * @param {Function} fn The function to run
   * @param {Object} scope Optional scope to call the function in (defaults to this)
   */
  withContext: function(fn, scope) {
    var context = this.context;
    
    context.save();
    fn.call(scope || this, context);
    context.restore();
  }
};