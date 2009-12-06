/**
 * @class Bean.Plungers
 * Represents a Collection of Plungers
 */
Bean.Plungers = function() {
  /**
   * @property all
   * @type Array
   * The internal array of all the plungers
   */
  this.all = [];
  
  /**
   * @property plungeCompleteCallbacks
   * @type Array
   * The callbacks to be executed when a Plunger completes its descent
   */
  this.plungeCompleteCallbacks = [];
};

Bean.Plungers.prototype = {
  /**
   * Adds a Plunger to the collection
   * @param {Bean.Plunger} plunger The Plunger to add
   */
  add: function(plunger) {
    this.all.push(plunger);
    
    plunger.onPlungeComplete(function() {
      var callbacks = this.plungeCompleteCallbacks;
      
      for (var i=0; i < callbacks.length; i++) {
        callbacks[i]['callback'].call(callbacks[i].scope || this);
      }
    }, this);
  },
  
  /**
   * Returns all Plungers that have already finished plunging
   * @return {Array} All stopped Plungers
   */
  getStopped: function() {
    return this.select(function(plunger) {
      return plunger.stopped;
    });
  },
  
  /**
   * Returns all Plungers which have started moving but not yet stopped
   * @return {Array} All Plungers currently moving
   */
  getMoving: function() {
    return this.select(function(plunger) {
      return plunger.started && !plunger.stopped;
    });
  },
  
  /**
   * Runs the given function whenever a Plunger has finished plunging
   * @param {Function} callback The callback function
   * @param {Object} scope Optional scope to run the callback in
   */
  onPlungeComplete: function(callback, scope) {
    this.plungeCompleteCallbacks.push({
      callback: callback,
      scope   : scope
    });
  },
  
  /**
   * Returns a subset of this collection based on the a collection function
   * @param {Function} fn The selection function. The item is selected if the 
   * function returns anything but false
   * @param {Object} scope Optional scope to execute the select function in
   * @return {Array} All selected Plungers
   */
  select: function(fn, scope) {
    var all      = this.all,
        selected = [];
    
    for (var i=0, j = all.length; i < j; i++) {
      if (fn.call(scope || this, all[i])) {
        selected.push(all[i]);
      }
    };
    
    return selected;
  },
  
  /**
   * Calls the given argument for each Plunger in the collection
   * @param {Function} fn The function to call, given 1 argument: the current plunger
   * @param {Object} scope Optional scope to call the function in
   */
  each: function(fn, scope) {
    var all = this.all;
    
    for (var i=0, j = all.length; i < j; i++) {
      fn.call(scope || this, all[i]);
    }
  }
};