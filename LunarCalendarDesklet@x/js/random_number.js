const St = imports.gi.St;

function RandomNumber(settings, callbacks) {
    this._init(settings, callbacks);
}

RandomNumber.prototype = {
    _init: function (settings, callbacks) {
        this.randomNumberLabels = [];
        this.settings = settings;
        this.callbacks = callbacks;
        this.settings.bindWithObject(this, "random-numbers-enabled", "randomNumbersEnabled", this.onRandomNumbersChanged);
        this.settings.bindWithObject(this, "random-numbers-min", "randomNumbersMin", this.onRandomNumbersChanged);
        this.settings.bindWithObject(this, "random-numbers-max", "randomNumbersMax", this.onRandomNumbersChanged);
        this.settings.bindWithObject(this, "random-numbers-quantity", "randomNumbersQuantity", this.onRandomNumbersChanged);
        this.settings.bindWithObject(this, "random-numbers-unique", "randomNumbersUnique", this.onRandomNumbersChanged);
        this.randomNumberManager = new RandomNumberManager(
            this.randomNumbersMin,
            this.randomNumbersMax,
            this.randomNumbersQuantity,
            this.randomNumbersUnique
        );
        this.actor = new St.BoxLayout({
            
        });
        this.container = new St.BoxLayout({
            style_class: 'random-numbers-container'
        });
        this.container.add(this.actor, {
            expand: true
        });
    },
    
    createRandomNumberLabels: function () {
        let i;

        if (this.randomNumbersEnabled) {
            this.randomNumberLabels = [];
            for (i = 0; i < this.randomNumbersQuantity; ++i) {
                this.randomNumberLabels[i] = new St.Label({
                    style_class: "random-number"
                });

                this.actor.add(this.randomNumberLabels[i], {
                    expand: false
                });
            }
        }
    },

    destroyRandomNumberLabels: function () {
        let i, children;

        children = this.actor.get_children();
        for (i = 0; i < children.length; ++i)  {
            children[i].destroy();
        }
        this.randomNumberLabels = [];
    },

    generateRandomNumbers: function () {
        let i, numbers;

        if (this.randomNumbersEnabled) {
            numbers = this.randomNumberManager.generate();
            for (i = 0; i < numbers.length; ++i) {
                if (this.randomNumberLabels[i]) {
                    this.randomNumberLabels[i].set_text(String(numbers[i]));
                }
            }
        }
    },

    onRandomNumbersChanged: function () {
        this.destroyRandomNumberLabels();
        if (this.randomNumbersEnabled) {
            this.randomNumberManager.min = this.randomNumbersMin;
            this.randomNumberManager.max = this.randomNumbersMax;
            this.randomNumberManager.noOfNumbers = this.randomNumbersQuantity;
            this.randomNumberManager.unique = this.randomNumbersUnique;
            this.createRandomNumberLabels();            
            this.generateRandomNumbers();
            if (this.callbacks['onGenerated']) {
                this.callbacks['onGenerated']();
            }            
        }
        else {
            if (this.callbacks['onDisabled']) {
                this.callbacks['onDisabled']();
            }            
        }
    }
};

function RandomNumberManager(min, max, noOfNumbers, unique) {
    this.min = min;
    this.max = max;
    this.noOfNumbers = noOfNumbers;
    this.unique = unique;
}

RandomNumberManager.prototype = {
    generate: function () {
        let numbers, number;

        numbers = [];
        while (numbers.length < this.noOfNumbers) {
            number = this.getRandomInt(this.min, this.max);
            if (this.unique && numbers.indexOf(number) > -1) {
                continue;
            }
            numbers.push(number);
        }

        return numbers;
    },

    getRandomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};

