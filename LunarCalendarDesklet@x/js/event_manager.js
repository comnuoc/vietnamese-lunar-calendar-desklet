const uuid = 'LunarCalendarDesklet@x';
const GLib = imports.gi.GLib;
// Set the path constants
const DESKLET_PATH = imports.ui.deskletManager.deskletMeta[uuid].path;
const DATA_PATH = GLib.get_home_dir() + "/.cinnamon/" + uuid;
const EVENT_CONFIG_FILE = DATA_PATH + "/events.json";
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const MessageTray = imports.ui.messageTray;
const Main = imports.ui.main;
const Util = imports.misc.util;
const St = imports.gi.St;
const RRule = imports.ui.deskletManager.desklets[uuid].js.rrule.cinnamonjs.rrule;
// Translation support
const Gettext = imports.gettext;
Gettext.bindtextdomain(uuid, GLib.get_home_dir() + "/.local/share/locale");

function _(str) {
    return Gettext.dgettext(uuid, str);
}

function EventManager(settings, callbacks, lunarDateManager, dateFormatFull) {
    this._init(settings, callbacks, lunarDateManager, dateFormatFull);
}

EventManager.prototype = {
    _init: function (settings, callbacks, lunarDateManager, dateFormatFull) {
        this.settings = settings;
        this.callbacks = callbacks;
        this.lunarDateManager = lunarDateManager;
        this.dateFormatFull = dateFormatFull;
        this.settings.bindWithObject(this, "events-instance-name", "instanceName", this.readJsonConfig);
    },

    manage: function() {
        let pythonFile = 'manage_events.py';
        try {
            this.setPermissions(pythonFile);
            let argv = ['python3', DESKLET_PATH + '/python/' + pythonFile, EVENT_CONFIG_FILE, this.instanceName];
            Util.spawn_async(argv, Lang.bind(this, this.readJsonConfig));
        }
        catch (e) {
            global.logError(e);
        }
    },

    setPermissions: function (pythonFile) {
        try {
            Util.spawnCommandLine('chmod +x "' + DESKLET_PATH + '/python/' + pythonFile + '"');
            Util.spawnCommandLine('chown $USER "' + DESKLET_PATH + '/python/' + pythonFile + '"');
        } catch (e) {
            global.logError(e);
        }
    },

    readJsonConfig: function (instanceName = null) {
        if (instanceName != null && instanceName.trim() != "") {
            this.instanceName = instanceName.trim();
        }
        // Read the json config file.
        let argv = ["python3", DESKLET_PATH + '/python/' + "ConfigFileManager.py", EVENT_CONFIG_FILE];
        Util.spawn_async(argv, Lang.bind(this, this.loadEvents));
    },

    resetEvents: function () {
        this.solarEvents = [];
        this.lunarEvents = [];
        this.solarRecurrenceEvents = [];
        this.lunarRecurrenceEvents = [];
    },

    loadEvents: function (jsonUrl) {
        let data = JSON.parse(jsonUrl);

        // Reset events.
        this.resetEvents();
        // Find the feeds for the selected instance_name and populate those feeds.
        for (let key in data['instances']) {
            if (data['instances'][key]['name'].trim() === this.instanceName) {
                for (let ekey in data['instances'][key]['events']) {
                    if (data['instances'][key]['events'][ekey]['enabled']) {
                        this.loadEvent(data['instances'][key]['events'][ekey]);
                    }
                }
            }
        }
        this.callbacks['onUpdated']();
    },

    loadEvent: function (event) {
        // Solar date.
        if (!event['isLunarDate']) {
            // Not recurrence.
            if (!event['isLoop']) {
                this.solarEvents.push(event);
            }
            // Recurrence.
            else {
                this.solarRecurrenceEvents.push(event);
            }
        }
        // Lunar date.
        else {
            // Not recurrence.
            if (!event['isLoop']) {
                this.lunarEvents.push(event);
            }
            // Recurrence.
            else {
                this.lunarRecurrenceEvents.push(event);
            }
        }
    },

    // Get all events between 2 solar dates.
    getEvents: function (fromDate, toDate) {
        let eventDates = {};
        let dateEvents = {};

        if (fromDate > toDate) {
            return {
                'events': dateEvents,
                'dates': eventDates
            };
        }
        let getGroupByDateKey = this.getGroupByDateKey;
        let addToDateGroup = function (dates, event) {
            for (let j in dates) {
                let dateKey = getGroupByDateKey(dates[j]);
                if (!dateEvents[dateKey]) {
                    dateEvents[dateKey] = [];
                }
                if (dateEvents[dateKey].indexOf(event) < 0) {
                    dateEvents[dateKey].push(event);
                }                
            }
        };
        for (let i in this.solarEvents) {
            let dates = this.getSolarEventDates(this.solarEvents[i], fromDate, toDate);
            if (dates.length) {
                eventDates[this.solarEvents[i]['id']] = dates;
                addToDateGroup(dates, this.solarEvents[i]);
            }
        }
        for (let i in this.lunarEvents) {
            let dates = this.getLunarEventDates(this.lunarEvents[i], fromDate, toDate);
            if (dates.length) {
                eventDates[this.lunarEvents[i]['id']] = dates;
                addToDateGroup(dates, this.lunarEvents[i]);
            }
        }
        for (let i in this.solarRecurrenceEvents) {
            let dates = this.getSolarRecurrenceEventDates(this.solarRecurrenceEvents[i], fromDate, toDate);
            if (dates.length) {
                eventDates[this.solarRecurrenceEvents[i]['id']] = dates;
                addToDateGroup(dates, this.solarRecurrenceEvents[i]);
            }
        }
        for (let i in this.lunarRecurrenceEvents) {
            let dates = this.getLunarRecurrenceEventDates(this.lunarRecurrenceEvents[i], fromDate, toDate);
            if (dates.length) {
                eventDates[this.lunarRecurrenceEvents[i]['id']] = dates;
                addToDateGroup(dates, this.lunarRecurrenceEvents[i]);
            }
        }

        return {
            'events': dateEvents,
            'dates': eventDates
        };
    },

    getGroupByDateKey: function (date) {
        return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    },

    getGroupByDateSecondKey: function (date) {
        return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + '-'
            + date.getHours() + '-' + date.getMinutes() + '-' + date.getSeconds();
    },

    // Get dates of solar event between 2 solar dates.
    getSolarEventDates: function (event, fromDate, toDate) {
        let eventDate = new Date(
            event['year'],
            event['month'] - 1,
            event['day'],
            event['hour'],
            event['minute'],
            event['second']
        );

        return (eventDate >= fromDate && eventDate <= toDate) ? [eventDate] : [];
    },

    // Get dates of lunar event between 2 solar dates.
    getLunarEventDates: function (event, fromDate, toDate) {
        let sd = this.getSolarFromLunarDateInRange(
            event['year'],
            event['month'],
            event['day'],
            event['hour'],
            event['minute'],
            event['second'],
            fromDate,
            toDate
        );

        return sd ? [sd] : [];
    },

    // Get solar date from lunar date between 2 solar dates.
    getSolarFromLunarDateInRange: function (
        lunarYear,
        lunarMonth,
        lunarDay,
        lunarHour,
        lunarMinute,
        lunarSecond,
        fromSolarDate,
        toSolarDate
    ) {
        let sd = this.lunarDateManager.getSolarDate(lunarDay, lunarMonth, lunarYear);
        sd = new Date(
            sd[2],
            sd[1] - 1,
            sd[0],
            lunarHour,
            lunarMinute,
            lunarSecond
        );

        return (sd >= fromSolarDate && sd <= toSolarDate) ? sd : null;
    },

    // Get dates of solar recurrence event between 2 solar dates.
    getSolarRecurrenceEventDates: function (event, fromDate, toDate) {
        try {
            let options = RRule.window.RRule.parseString(event['solarRecurrenceRule']);
            options.dtstart = new Date(
                event['year'],
                event['month'] - 1,
                event['day'],
                event['hour'],
                event['minute'],
                event['second']
            );
            options.until = toDate;
            let rule = new RRule.window.RRule(options);
            let dates = rule.between(fromDate, toDate, true);

            return dates;
        }
        catch (e) {
            // Invalid rrule.
            return this.getSolarEventDates(event, fromDate, toDate);
        }
    },

    // Get dates of lunar recurrence event between 2 solar dates.
    getLunarRecurrenceEventDates: function (event, fromDate, toDate) {
        let dates = [];
        // Convert from date, to date to lunar dates.
        let lunarFromDate = this.lunarDateManager.getLunarDate(
            fromDate.getDate(),
            fromDate.getMonth() + 1,
            fromDate.getFullYear()
        );
        let lunarToDate = this.lunarDateManager.getLunarDate(
            toDate.getDate(),
            toDate.getMonth() + 1,
            toDate.getFullYear()
        );
        // Set start compare year is a year of from date.
        let year = lunarFromDate.year;
        let month = event['month'];
        // Loop month, set start compare month is a month of from date.
        if (event['lunarRecurrenceRule'] !== 'Yearly') {
            month = lunarFromDate.month;
        }
        while (year < lunarToDate.year || (year === lunarToDate.year && month <= lunarToDate.month)) {
            let sd = this.getSolarFromLunarDateInRange(
                year,
                month,
                event['day'],
                event['hour'],
                event['minute'],
                event['second'],
                fromDate,
                toDate
            );
            if (sd) {
                dates.push(sd);
            }
            // Increase date, month.
            if (event['lunarRecurrenceRule'] === 'Yearly') {
                year += 1;
            }
            else {
                month += 1;
                if (month > 12) {
                    month = month - 12;
                    year += 1;
                }
            }
        }

        return dates;
    },

    getEventRecurrenceString: function (event) {
        if (event['isLunarDate']) {
            return event['lunarRecurrenceRule'].toLowerCase();
        }
        try {
            let options = RRule.window.RRule.parseString(event['solarRecurrenceRule']);
            options.dtstart = new Date(
                event['year'],
                event['month'] - 1,
                event['day'],
                event['hour'],
                event['minute'],
                event['second']
            );
            let rule = new RRule.window.RRule(options);
            return rule.toText();
        }
        catch (e) {
            return '';
        }
    },

    getEventTimeString: function (event) {
        return (event['hour'] < 10 ? '0' : '')
            + event['hour']
            + ':'
            + (event['minute'] < 10 ? '0' : '')
            + event['minute']
            + ':'
            + (event['second'] < 10 ? '0' : '')
            + event['second'];
    },

    sortSameDateEvents: function (events) {
        events.sort(function (e1, e2) {
            let e1Sec = e1['hour'] * 3600 + e1['minute'] * 60 + e1['second'];
            let e2Sec = e2['hour'] * 3600 + e2['minute'] * 60 + e2['second'];

            return e1Sec < e2Sec ? -1 : (e1Sec > e2Sec ? 1 : 0);
        });
    },

    getNotificationEvents: function (fromDate, toDate) {
        let dateEvents = {};
        let getGroupByDateSecondKey = this.getGroupByDateSecondKey;
        let getNotificationDateFromApplicableDate = this.getNotificationDateFromApplicableDate;
        let addToDateGroup = function (dates, event) {
            for (let j in dates) {
                let dateKey = getGroupByDateSecondKey(getNotificationDateFromApplicableDate(dates[j], event));
                if (!dateEvents[dateKey]) {
                    dateEvents[dateKey] = {};
                }
                if (!dateEvents[dateKey][event['id']]) {
                    dateEvents[dateKey][event['id']] = {
                        event: event,
                        date: dates[j]
                    };
                }
            }
        }
        for (let i in this.solarEvents) {
            if (!this.solarEvents[i]['notify']) {
                continue;
            }
            let eventFromDate = this.getApplicableEventDate(fromDate, this.solarEvents[i]);
            let eventToDate = this.getApplicableEventDate(toDate, this.solarEvents[i]);
            let applicableDates = this.getSolarEventDates(this.solarEvents[i], eventFromDate, eventToDate);
            if (applicableDates.length) {
                addToDateGroup(applicableDates, this.solarEvents[i]);
            }
        }
        for (let i in this.lunarEvents) {
            if (!this.lunarEvents[i]['notify']) {
                continue;
            }
            let eventFromDate = this.getApplicableEventDate(fromDate, this.lunarEvents[i]);
            let eventToDate = this.getApplicableEventDate(toDate, this.lunarEvents[i]);
            let applicableDates = this.getLunarEventDates(this.lunarEvents[i], eventFromDate, eventToDate);
            if (applicableDates.length) {
                addToDateGroup(applicableDates, this.lunarEvents[i]);
            }
        }
        for (let i in this.solarRecurrenceEvents) {
            if (!this.solarRecurrenceEvents[i]['notify']) {
                continue;
            }
            let eventFromDate = this.getApplicableEventDate(fromDate, this.solarRecurrenceEvents[i]);
            let eventToDate = this.getApplicableEventDate(toDate, this.solarRecurrenceEvents[i]);
            let applicableDates = this.getSolarRecurrenceEventDates(this.solarRecurrenceEvents[i], eventFromDate, eventToDate);
            if (applicableDates.length) {
                addToDateGroup(applicableDates, this.solarRecurrenceEvents[i]);
            }
        }
        for (let i in this.lunarRecurrenceEvents) {
            if (!this.lunarRecurrenceEvents[i]['notify']) {
                continue;
            }
            let eventFromDate = this.getApplicableEventDate(fromDate, this.lunarRecurrenceEvents[i]);
            let eventToDate = this.getApplicableEventDate(toDate, this.lunarRecurrenceEvents[i]);
            let applicableDates = this.getLunarRecurrenceEventDates(this.lunarRecurrenceEvents[i], eventFromDate, eventToDate);
            if (applicableDates.length) {
                addToDateGroup(applicableDates, this.lunarRecurrenceEvents[i]);
            }
        }

        return dateEvents;
    },

    getApplicableEventDate: function (date, event) {
        let applicableDate = new Date(date.toUTCString());

        if (event['notifyBeforeYear']) {
            applicableDate.setFullYear(applicableDate.getFullYear() + event['notifyBeforeYear']);
        }
        if (event['notifyBeforeMonth']) {
            applicableDate.setMonth(applicableDate.getMonth() + event['notifyBeforeMonth']);
        }
        if (event['notifyBeforeDay']) {
            applicableDate.setDate(applicableDate.getDate() + event['notifyBeforeDay']);
        }
        if (event['notifyBeforeHour']) {
            applicableDate.setHours(applicableDate.getHours() + event['notifyBeforeHour']);
        }
        if (event['notifyBeforeMinute']) {
            applicableDate.setMinutes(applicableDate.getMinutes() + event['notifyBeforeMinute']);
        }
        if (event['notifyBeforeSecond']) {
            applicableDate.setSeconds(applicableDate.getSeconds() + event['notifyBeforeSecond']);
        }

        return applicableDate;
    },

    getNotificationDateFromApplicableDate: function (date, event) {
        let notificationDate = new Date(date.toUTCString());

        if (event['notifyBeforeYear']) {
            notificationDate.setFullYear(notificationDate.getFullYear() - event['notifyBeforeYear']);
        }
        if (event['notifyBeforeMonth']) {
            notificationDate.setMonth(notificationDate.getMonth() - event['notifyBeforeMonth']);
        }
        if (event['notifyBeforeDay']) {
            notificationDate.setDate(notificationDate.getDate() - event['notifyBeforeDay']);
        }
        if (event['notifyBeforeHour']) {
            notificationDate.setHours(notificationDate.getHours() - event['notifyBeforeHour']);
        }
        if (event['notifyBeforeMinute']) {
            notificationDate.setMinutes(notificationDate.getMinutes() - event['notifyBeforeMinute']);
        }
        if (event['notifyBeforeSecond']) {
            notificationDate.setSeconds(notificationDate.getSeconds() - event['notifyBeforeSecond']);
        }

        return notificationDate;
    },

    ensureSource: function () {
        if (!this.source) {
            this.source = new EventMessageTraySource();
            this.source.connect('destroy', Lang.bind(this, function(){
                this.source = null;
            }));
            if (Main.messageTray) Main.messageTray.add(this.source);
        }
    },

    notifyMessage: function (title, text) {
        this.ensureSource();
        let gicon = Gio.icon_new_for_string(DESKLET_PATH + "/icon.png");
        let icon = new St.Icon({ gicon: gicon});
        let notification = new MessageTray.Notification(this.source, title, text, {icon: icon});
        notification.setTransient(false);
        notification.connect('destroy', function(){
            
        });

        this.source.notify(notification);
    }
};

function EventMessageTraySource() {
    this._init();
}

EventMessageTraySource.prototype = {
    __proto__: MessageTray.Source.prototype,

    _init: function() {
        MessageTray.Source.prototype._init.call(this, _("Lunar Calendar"));

        let gicon = Gio.icon_new_for_string(DESKLET_PATH + "/icon.png");
        let icon = new St.Icon({ gicon: gicon});

        this._setSummaryIcon(icon);
    }
};
