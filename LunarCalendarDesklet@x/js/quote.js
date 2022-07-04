const St = imports.gi.St;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Pango = imports.gi.Pango;
const Mainloop = imports.mainloop;
const Util = imports.misc.util;
const Lang = imports.lang;
const uuid = "LunarCalendarDesklet@x";
const DESKLET_PATH = imports.ui.deskletManager.deskletMeta[uuid].path;

function Quote(settings, callbacks) {
    this._init(settings, callbacks);
}

Quote.prototype = {
    _init: function (settings, callbacks) {
        this.settings = settings;
        this.callbacks = callbacks;
        
        this.stepB = 8;
        this.stepG = 16;
        this.stepR = 24;
        this.maxColor = 0;
        this.startColor = 255;
        this.isIncrease = this.maxColor > this.startColor;
        this.r = this.startColor;
        this.g = this.startColor;
        this.b = this.startColor;
        this.updateId = null;
        this.updateColorId = null;        
        this.scriptFile = DESKLET_PATH + '/shell/randomFortuneCowsay.sh';
        
        this.settings.bindWithObject(this, "quote-file", "file", this.onSettingChanged);
        this.settings.bindWithObject(this, "quote-delay", "delay", this.onSettingChanged);
        this.settings.bindWithObject(this, "quote-max-height", "maxHeight", this.onFontSettingChanged);
        this.settings.bindWithObject(this, "quote-font-size", "fontSize", this.onFontSettingChanged);
        this.settings.bindWithObject(this, "quote-text-color", "fontColor", this.onFontSettingChanged);
        this.settings.bindWithObject(this, "quote-shadow-enabled", "shadowEnabled", this.onFontSettingChanged);
        this.settings.bindWithObject(this, "quote-horizontal-shadow", "horShadow", this.onFontSettingChanged);
        this.settings.bindWithObject(this, "quote-vertical-shadow", "vertShadow", this.onFontSettingChanged);
        this.settings.bindWithObject(this, "quote-shadow-blur", "shadowBlur", this.onFontSettingChanged);
        this.settings.bindWithObject(this, "quote-shadow-color", "shadowColor", this.onFontSettingChanged);
        this.settings.bindWithObject(this, "quote-fortune-params", "fortuneParams", this.onSettingChanged);
        this.settings.bindWithObject(this, "quote-ignore-input-file", "ignoreInputFile", this.onSettingChanged);
        this.settings.bindWithObject(this, "quote-text-color-random", "fontColorRandom", this.onFontSettingChanged);
        this.settings.bindWithObject(this, "quote-text-color-animate", "fontColorAnimate", this.onFontSettingChanged);
        this.settings.bindWithObject(this, "quote-use-cowsay", "cowsay", this.onCowsayChanged);
        this.settings.bindWithObject(this, "quote-cowsay-params", "cowsayParams", this.onCowsayChanged);
        
        // Quote
        this.quote = new St.Label({
            style_class: "quote"
        });
        this.quote.clutter_text.line_wrap_mode = Pango.WrapMode.WORD;
        this.quote.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
        this.quoteButton = new St.Button();
        this.quoteButton.set_child(this.quote);
        this.quoteBox = new St.BoxLayout({
            style_class: 'quote-container',
            vertical: true
        });
        this.quoteBox2 = new St.BoxLayout();
        this.quoteBox2.add(this.quoteButton);
        this.quoteBox.add(this.quoteBox2);
        this.quoteButton.connect('clicked', Lang.bind(this, this._update));         
        
        // Quote scroll
        this.quoteScroll = new St.ScrollView({
            style_class: 'quote-scroll-container'
        });
        this.quoteScroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC);
        this.quoteScroll.add_actor(this.quoteBox);            
    },
    
    onSettingChanged: function () {
        this._update();
    },

    onFontSettingChanged: function () {
        if (this.updateColorId) {
            Mainloop.source_remove(this.updateColorId);
            this.updateColorId = null;
        }
        this.quoteScroll.style = "max-height:" + this.maxHeight + "px;";
        this.quote.clutter_text.line_wrap = !this.cowsay;
        let shadow = this.horShadow + "px " + this.vertShadow + "px " + this.shadowBlur + "px " + this.shadowColor + ";";
        let color;
        if (this.fontColorAnimate) {
            this.increaseColor();
            color = 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
            this.updateColorId = Mainloop.timeout_add_seconds(1, Lang.bind(this, this.onFontSettingChanged));
        }
        else if (this.fontColorRandom) {
            color = 'rgb(' + this.getRandomColor() + ',' + this.getRandomColor() + ',' + this.getRandomColor() + ')';
        }
        else {
            color = this.fontColor;
        }
        this.quote.style = (this.cowsay ? "font-family: Monospace;\n" : "") + "font-size: " + this.fontSize + "pt;\n" +
            "color: " + color + ";\n" +
            (this.shadowEnabled ? ("text-shadow: " + shadow) : '');

    },

    onCowsayChanged: function () {
        this.onFontSettingChanged();
        this.onSettingChanged();
    },
    
    /**
     * Display a new quote
     **/
    _update: function () {
        if (this.updateId) {
            Mainloop.source_remove(this.updateId);
            this.updateId = null;
        }
        if (this.fontColorRandom) {
            this.onFontSettingChanged();
        }
        this._getNewQuote();        
        this.updateId = Mainloop.timeout_add_seconds(this.delay * 60, Lang.bind(this, this._update));
    },

    _addDoubleQuote: function (str) {
        return '"' + str + '"';
    },

    /**
     * Call fortune to obtain a random quote from the input file
     **/
    _getNewQuote: function () {
        let filePath = '';
        let commandLine = '';
        if (!this.ignoreInputFile && this.file) {
            let fileUri = Gio.File.new_for_uri(this.file);
            if (fileUri.query_exists(null)) {
                filePath = fileUri.get_path();
            }
        }
        switch (this.cowsay) {
            case 0:
                commandLine = ['fortune', this.fortuneParams, filePath].join(' ');
                break;

            case 1:
            case 2:
                let command = this.cowsay == 1 ? 'cowsay' : 'cowthink';
                commandLine = [
                    "bash",
                    this._addDoubleQuote(this.scriptFile),
                    this._addDoubleQuote(command),
                    this._addDoubleQuote(this.cowsayParams),
                    this._addDoubleQuote(this.fortuneParams),
                    this._addDoubleQuote(filePath)
                ].join(' ');
                break;
        }
        let [success, argv] = GLib.shell_parse_argv(commandLine);
        Util.spawn_async(argv, Lang.bind(this, this._setNewQuote));
    },

    /**
     * Callback for _getNewQuote to set the quote text when spawn_async returns
     **/
    _setNewQuote: function (quote) {
        this.quote.set_text(quote);
        if (this.callbacks['onUpdated']) {
            this.callbacks['onUpdated']();
        }
    },
    
    increaseColor: function () {
        let stepB, stepG, stepR, b, g, r, maxB, maxG, maxR;
        if (this.isIncrease) {
            stepB = this.stepB;
            stepG = this.stepG;
            stepR = this.stepR;
            b = this.b;
            g = this.g;
            r = this.r;
            maxB = maxG = maxR = this.maxColor;
        }
        else {
            stepB = -this.stepB;
            stepG = -this.stepG;
            stepR = -this.stepR;
            maxB = this.b;
            maxG = this.g;
            maxR = this.r;
            b = g = r = this.maxColor;
        }
        
        this.b += stepB;
        this.g += stepG;
        this.r += stepR;

        if (b > maxB) {
            this.b = this.startColor;
        }
        if (g > maxG) {
            this.g = this.startColor;
        }
        if (r > maxR) {
            this.r = this.startColor;
        }
    },

    getRandomColor: function () {
        return Math.floor((Math.random() * 255));
    },
    
    onDeskletRemove: function () {
        if (this.updateId) {
            Mainloop.source_remove(this.updateId);
        }
        if (this.updateColorId) {
            Mainloop.source_remove(this.updateColorId);
        }
    }
};
