/*
 * navigation.js - Navigation class (controller).
 *
 * The Navigation class holds the information about the current position,
 * layer and data availability. Events are fired when the position or layer
 * changes. The class is independent from other classes.
 */

var Navigation = new Class({
    Implements: EventEmitter2,
    
    initialize: function(profile) {
        this.profile = profile;
        this.zoom = 0;
        window.addEventListener('hashchange', this.update.bind(this));
        this.update();
    },
    
    update: function() {
        if (window.location.hash === '') return;
        var date = new Date().parse(window.location.hash.substring(1) + ' +0000');
        if (!date.isValid()) return;
        this.current = date;
        this.emit('change');
    },
    
    getLayers: function() { return this.profile.layers; },
    
    getLayer: function() { return this.layer; },
    setLayer: function(name) {
        this.layer = this.profile.layers[name];
        
        if (typeof this.layer.colormap == 'string') {
            new Request.JSON({
                'url': this.profile.prefix+'/'+this.layer.colormap,
                onSuccess: function(json) {
                    this.layer.colormap = json;
                    this.emit('change');
                    this.emit('layerchange');
                }.bind(this)
            }).get();
        }
        
        if (typeof this.layer.availability == 'string') {
            new Request.JSON({
                'url': this.profile.prefix+'/'+this.layer.availability,
                onSuccess: function(json) {
                    this.layer.availability = json;
                    this.emit('change');
                    this.emit('layerchange');
                }.bind(this)
            }).get();
        }
        
        this.emit('change');
        this.emit('layerchange');
    },
    
    getCurrent: function() { return new Date(this.current); },
    setCurrent: function(date) {
        this.current = date;
        window.location.replace('#'+date.formatUTC('%Y-%b-%d,%H:%M:%S'));
        this.emit('change');
    },
    
    getZoom: function() { return this.zoom; },
    setZoom: function(zoom) {
        this.zoom = zoom;
        this.emit('change');
    },
    
    getMaxZoom: function() {
        var i = 0;
        while (this.profile.zoom[i.toString()])
            i++;
        return i-1;
    },
    
    getAvailability: function() {
        if (!this.layer || !this.layer.availability || typeof this.layer.availability == 'string' || !this.layer.availability[this.zoom])
            return [];
        return this.layer.availability[this.zoom];
    },
    
    isAvailable: function(start, end) {
        var availability = this.getAvailability()
        
        var x1  = (start - this.profile.origin[0])/this.profile.zoom[this.zoom].width;
        var x2  = (end - this.profile.origin[0])/this.profile.zoom[this.zoom].width;
        
        for (var i = 0; i < availability.length; i++) {
            var range = availability[i];
            if (range[0] >= x1 && range[0] <= x2) return true;
            if (range[1] >= x1 && range[1] <= x2) return true;
            if (range[0] <= x1 && range[1] >= x2) return true;
        }
        return false;
    },
    
    isAvailableYear: function(year) {
        return this.isAvailable(new UTCDate(year, 0, 1),
                                new UTCDate(year, 0, 1).increment('year', 1));
    },
    
    isAvailableMonth: function(year, month) {
        return this.isAvailable(new UTCDate(year, month, 1),
                                new UTCDate(year, month, 1).increment('month', 1));
    },
    
    isAvailableDay: function(year, month, day) {
        return this.isAvailable(new UTCDate(year, month, day),
                                new UTCDate(year, month, day).increment('day', 1));
    },
    
    availableBetween: function(start, end) {
        if (!this.layer || !this.layer.availability || typeof this.layer.availability == 'string' || !this.layer.availability[this.zoom])
            return [];
        var availability = this.layer.availability[this.zoom];
        
        var x1  = (start - this.profile.origin[0])/this.profile.zoom[this.zoom].width;
        var x2  = (end - this.profile.origin[0])/this.profile.zoom[this.zoom].width;
        
        var intervals = [];
        for (var i = 0; i < availability.length; i++) {
            var range = availability[i];
            
            var date1 = (new Date(this.profile.origin[0])).increment('ms', range[0]*this.profile.zoom[this.zoom].width);
            var date2 = (new Date(this.profile.origin[0])).increment('ms', range[1]*this.profile.zoom[this.zoom].width);
            
            if (range[0] <= x1 && range[1] >= x2) intervals.push([start, end]);
            if (range[0] >= x1 && range[1] <= x2) intervals.push([date1, date2]);
            if (range[0] <= x1 && range[1] >= x1) intervals.push([start, date2]);
            if (range[0] <= x2 && range[1] >= x2) intervals.push([date1, end]);
        }
        return intervals;
    }
});
