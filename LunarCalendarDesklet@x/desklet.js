const Desklet = imports.ui.desklet;
const Gettext = imports.gettext;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Settings = imports.ui.settings;
const St = imports.gi.St;
const UPowerGlib = imports.gi.UPowerGlib;
const Mainloop = imports.mainloop;
const uuid = "LunarCalendarDesklet@x";
const Calendar = imports.ui.deskletManager.desklets[uuid].js.calendar;
const RandomNumber = imports.ui.deskletManager.desklets[uuid].js.random_number;
const Quote = imports.ui.deskletManager.desklets[uuid].js.quote;
const EventManager = imports.ui.deskletManager.desklets[uuid].js.event_manager;
const LunarDateManager = imports.ui.deskletManager.desklets[uuid].js.lunar_calendar;

// l10n/translation support

Gettext.bindtextdomain(uuid, GLib.get_home_dir() + "/.local/share/locale");

function _(str) {
    return Gettext.dgettext(uuid, str);
}

function MyDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

MyDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function (metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);

        try {
            global.settings.connect('changed::desklet-decorations', Lang.bind(this, this._updateDecoration));
            this.updateCalendarId = null;
            this.lastUpdate = null;
            this.notificationEvents = null;
            
            this.settings = new Settings.DeskletSettings(
                this, this.metadata["uuid"], this.instance_id);                
            this.settings.bind("box-decoration", "boxDecoration", this._updateDecoration);
            this._dateFormatFull = _("%A %B %-e, %Y");

            this.lunarDateManager = new LunarDateManager.LunarDateManager(null);
            this.eventManager = new EventManager.EventManager(
                this.settings,
                {
                    onUpdated: Lang.bind(this, function () {
                        this.onEventsUpdated();
                    })
                },
                this.lunarDateManager,
                this._dateFormatFull
            );
            this.randomNumber = new RandomNumber.RandomNumber(this.settings, {
                onGenerated: Lang.bind(this, function () {
                    // this.mainBox.insert_child_at_index(this.randomNumber.container, 3);
                    this.mainBox.add_actor(this.randomNumber.container);
                }),
                onDisabled: Lang.bind(this, function () {
                    this.mainBox.remove_actor(this.randomNumber.container);
                })
            });
            this.randomNumber.container.style_class = this.randomNumber.container.style_class + ' calendar';

            // Date
            this._date = new St.Label();
            this._date.style_class = 'datemenu-date-label';
            
            // Date button
            this._dateBtn = new St.Button();
            this._dateBtn.set_child(this._date);
            this._dateBtn.connect('clicked', Lang.bind(this, this._updateCalendar));         
            
            // Lunar date
            this._lunarDate = new St.Label();
            this._lunarDate.style_class = 'datemenu-lunar-date-label';
            
            // Calendar
            this._calendar = new Calendar.Calendar(
                this.settings,
                this.lunarDateManager,
                this.eventManager,
                this._dateFormatFull
            );
            
            // Quote
            this.quote = new Quote.Quote(this.settings, {
                onUpdated: Lang.bind(this, function () {
                    this.randomNumber.generateRandomNumbers();
                })
            });
            
            this._menu.addAction(_("Copy"), Lang.bind(this, function () {
                St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, this.quote.quote.get_text());
            }));
            
            this._menu.addAction(_("Manage events"), Lang.bind(this, function () {
                this.eventManager.manage();
            }));

            // Today event
            this.todayEventContainer = new St.BoxLayout({
                vertical: true,
                style_class: 'today-events-container calendar'
            });
            
            // Main            
            this.mainBox = new St.BoxLayout({
                vertical: true,
                style_class: 'lunar-calendar-container'
            });
            this.mainBox.add(this._dateBtn);
            this.mainBox.add(this._lunarDate);
            this.mainBox.add(this.quote.quoteScroll, {expand: false});
            this.mainBox.add(this.todayEventContainer, {expand: false});
            this.mainBox.add(this._calendar.actor, {expand: false});
            this.quote.quoteBox.style_class = this.quote.quoteBox.style_class + ' calendar';
            
            this._upClient = new UPowerGlib.Client();
            try {
                this._upClient.connect('notify-resume', Lang.bind(this, this._updateCalendar));
            } catch (e) {
                this._upClient.connect('notify::resume', Lang.bind(this, this._updateCalendar));
            }
            
            this._updateDecoration();
            this.setContent(this.mainBox);
            this.setHeader(_("Lunar Calendar"));
            this.eventManager.readJsonConfig();
        }
        catch (e) {
            global.logError(e);
        }
    },
    
    fixQuoteBoxSize: function () {
        this.quote.quoteScroll.set_width(this._calendar.actor.get_width());
    },
    
    _updateDecoration: function () {
        let dec = this.boxDecoration;

        switch (dec) {
            case 0:
                this._header.hide();
                this.content.style_class = 'desklet';
                break;
            case 1:
                this._header.hide();
                this.content.style_class = 'desklet-with-borders';
                break;
            case 2:
                this._header.show();
                this.content.style_class = 'desklet-with-borders-and-header';
                break;
        }
    },
    
    _updateCalendar: function () {
        let now = new Date();
        this.lastUpdate = now;
        this._calendar.setDate(now, true);
        this.lunarDateManager.setDate(now);
        let currentLunarDate = this.lunarDateManager.getLunarDateString();
        let dateFormattedFull = now.toLocaleFormat(this._dateFormatFull).capitalize();
        if (dateFormattedFull !== this._lastDateFormattedFull) {
            this._date.set_text(dateFormattedFull);
            this._lunarDate.set_text(currentLunarDate);
            this._lastDateFormattedFull = dateFormattedFull;
        }        
    },
    
    _updateCalendarPeriodic: function () {
        if (this.updateCalendarId) {
            Mainloop.source_remove(this.updateCalendarId);
            this.updateCalendarId = null;
        }
        let now = new Date();
        if (!this.isSameDate(this.lastUpdate, now)) {
            this.setTodayNotificationEvents();
            this.updateTodayEvents();
            this._updateCalendar();
        }
        this.notifyEvents(now);
        this.updateCalendarId = Mainloop.timeout_add_seconds(1, Lang.bind(this, this._updateCalendarPeriodic));
    },

    isSameDate: function (date1, date2) {
        if (date1.getDate() != date2.getDate()
            || date1.getMonth() != date2.getMonth()
            || date1.getFullYear() != date2.getFullYear()
        ) {
            return false;
        }

        return true;
    },

    on_desklet_removed: function () {
        this.quote.onDeskletRemove();
        if (this.updateCalendarId) {
            Mainloop.source_remove(this.updateCalendarId);
        }
    },

    onEventsUpdated: function () {
        this.setTodayNotificationEvents();
        this.updateTodayEvents();
        this._updateCalendar();
        this.randomNumber.onRandomNumbersChanged();
        this.fixQuoteBoxSize();
        this.quote.onCowsayChanged();
        this._updateCalendarPeriodic();
    },

    setTodayNotificationEvents: function () {
        let now = new Date();
        let endDate = new Date();
        endDate.setHours(23);
        endDate.setMinutes(59);
        endDate.setSeconds(59);

        this.notificationEvents = this.eventManager.getNotificationEvents(now, endDate);
    },

    notifyEvents: function (date) {
        let title, text, events;

        date = date || new Date();
        let dateKey = this.eventManager.getGroupByDateSecondKey(date);
        if (this.notificationEvents[dateKey]) {
            events = [];
            for (let id in this.notificationEvents[dateKey]) {
                events.push(this.notificationEvents[dateKey][id]);
            }
            events.sort(function (a, b) {
                return a['date'] < b['date'] ? -1 : (a['date'] > b['date'] ? 1 : 0);
            });
            if (events.length === 1) {
                title = events[0]['event']['title'];
                text = this.getNotificationDateFormat(events[0]['date']);
                if (events[0]['event']['isLunarDate']) {
                    this.lunarDateManager.setDate(events[0]['date']);
                    text += '\n';
                    text += '(' + this.lunarDateManager.getLunarDateString() + ')';
                }
            }
            else {
                title = events.length + ' ' + _('events');
                text = '';
                for (let i in events) {
                    text += events[i]['event']['title'];
                    text += ' - ';
                    text += this.getNotificationDateFormat(events[i]['date']);
                    if (events[i]['event']['isLunarDate']) {
                        this.lunarDateManager.setDate(events[i]['date']);
                        text += '\n';
                        text += '(' + this.lunarDateManager.getLunarDateString() + ')';
                    }
                    text += '\n\n';
                }
            }
            this.eventManager.notifyMessage(title, text);
        }
    },

    getNotificationDateFormat: function (date) {
        let now = new Date();

        return this.isSameDate(date, now)
            ? (_('Today') + date.toLocaleFormat(' %H:%M:%S'))
            : date
                .toLocaleFormat('%A %B %-e, %Y %H:%M:%S')
                .capitalize();
    },

    updateTodayEvents: function () {
        let i, children, events, now, nowKey, eventItem, eventTitle, eventDate;

        children = this.todayEventContainer.get_children();
        for (i = 0; i < children.length; ++i)  {
            children[i].destroy();
        }
        now = new Date();
        // Find events.
        events = this.eventManager.getEvents(
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                0,
                0,
                0
            ),
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                23,
                59,
                59
            )
        );
        nowKey = this.eventManager.getGroupByDateKey(now);
        if (events['events'][nowKey] && events['events'][nowKey].length) {
            this.eventManager.sortSameDateEvents(events['events'][nowKey]);
            for (i in events['events'][nowKey]) {
                let event = events['events'][nowKey][i];

                eventItem = new St.BoxLayout({
                    style_class: 'today-event-item'
                });
                eventTitle = new St.Label({
                    style_class: 'today-event-title'
                });
                eventTitle.set_text(event['title']);
                eventDate = new St.Label({
                    style_class: 'today-event-date'
                });
                eventDate.set_text(
                    ' - ' + this.eventManager.getEventTimeString(event)
                    + (event['isLunarDate'] ? ' (AL)' : '')
                );
                eventItem.add(eventTitle, {expand: true});
                eventItem.add(eventDate);
                this.todayEventContainer.add(eventItem);
            }
        }
    }
}

function main(metadata, desklet_id) {
    return new MyDesklet(metadata, desklet_id);
}
