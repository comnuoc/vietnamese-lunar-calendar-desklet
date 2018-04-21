#!/usr/bin/env python3

import os
import sys
import gi
import argparse
import gettext
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk
from ConfigFileManager import ConfigFileManager
from datetime import datetime

home = os.path.expanduser("~")
gettext.install("LunarCalendar@x", home + "/.local/share/locale")

UI_INFO = """
<ui>
  <menubar name='MenuBar'>
    <menu action='ImportMenu'>
      <menuitem action='ImportEventFile' />
    </menu>
    <menu action='ExportMenu'>
      <menuitem action='ExportEventFile' />
    </menu>
  </menubar>
</ui>
"""

class MainWindow(Gtk.Window):

    def __init__(self, config):        
        super(Gtk.Window, self).__init__(title=_("Manage your events"))
        self.config = config
        
        # Create UI manager
        self.ui_manager = Gtk.UIManager()

        # Set window properties
        # self.set_default_size(800, 150 + len(self.config.events) * 20)
        self.maximize()
        icon_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "icon.png"))
        self.set_icon_from_file(icon_path)

        box = Gtk.Box(False, 10, orientation=Gtk.Orientation.VERTICAL)
        instance_box = Gtk.Box(False, 150)        
        button_box = Gtk.Box(False, 10)

        # Build menus
        self.build_menus()
        menubar = self.ui_manager.get_widget("/MenuBar")
        
        self.instance_combo = Gtk.ComboBox()
        render = Gtk.CellRendererText()
        self.instance_combo.pack_start(render, True)
        self.instance_combo.set_model(self.config.instances)
        
        
        self.instance_combo.set_active(self.config.get_instance_id())
        
        
        self.instance_combo.set_id_column(0)
        self.instance_combo.add_attribute(render, "text", 1)
        self.instance_combo.connect('changed', self.change_instance)

        instance_label = Gtk.Label()
        instance_label.set_text(_("Instance Name:"))
        instance_label.show()

        new_instance_button = Gtk.LinkButton()
        new_instance_button.set_label(_("Add/remove event list"))
        new_instance_button.connect("activate-link", self.new_instance_button_activate)

        link = Gtk.LinkButton()
        rrule_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'js', 'rrule', "index.html"))
        link.set_uri('file:///' + rrule_path)
        link.set_label(_('Solar Recurrence Rule'))

        instance_box.pack_start(instance_label, False, False, 4)
        instance_box.pack_start(self.instance_combo, False, False, 0)
        instance_box.pack_start(link, False, False, 0)
        instance_box.pack_end(new_instance_button, False, False, 0)

        # Build event table
        currentYear = datetime.now().year
        yearStore = Gtk.ListStore(str)
        yearRange = 10
        for num in range(currentYear - yearRange, currentYear + yearRange + 1):
            yearStore.append([str(num)])
        monthStore = Gtk.ListStore(str)
        for num in range(1, 13):
            monthStore.append([str(num)])
        dayStore = Gtk.ListStore(str)
        for num in range(1, 32):
            dayStore.append([str(num)])
        hourStore = Gtk.ListStore(str)
        for num in range(0, 24):
            hourStore.append([str(num)])
        minuteStore = Gtk.ListStore(str)
        for num in range(0, 60):
            minuteStore.append([str(num)])
        secondStore = Gtk.ListStore(str)
        for num in range(0, 60):
            secondStore.append([str(num)])

        # sorted_model = Gtk.TreeModelSort(model=self.config.events)
        # sorted_model.set_default_sort_func(self.compare, None)
        # self.treeview = Gtk.TreeView(model=sorted_model)
        self.treeview = Gtk.TreeView(model=self.config.events)
        self.treeview.set_reorderable(True)

        col_no = 0

        renderer_id = Gtk.CellRendererText()
        renderer_id.set_property("editable", False)
        column_id = Gtk.TreeViewColumn("Id", renderer_id, text=col_no)
        column_id.set_expand(False)
        self.treeview.append_column(column_id)
        col_no += 1

        renderer_enable = Gtk.CellRendererToggle()
        renderer_enable.connect("toggled", self.field_toggled, col_no)
        column_enable = Gtk.TreeViewColumn(_("Enable"), renderer_enable, active=col_no)
        column_enable.set_expand(False)
        column_enable.set_sort_column_id(col_no)
        self.treeview.append_column(column_enable)
        col_no += 1

        renderer_title = Gtk.CellRendererText()
        renderer_title.set_property("editable", True)
        renderer_title.connect("edited", self.text_edited, col_no)
        column_title = Gtk.TreeViewColumn(_("Title"), renderer_title, text=col_no)
        column_title.set_expand(True)
        column_title.set_sort_column_id(col_no)
        self.treeview.append_column(column_title)
        col_no += 1

        renderer_is_lunar_date = Gtk.CellRendererToggle()
        renderer_is_lunar_date.connect("toggled", self.field_toggled, col_no)
        column_is_lunar_date = Gtk.TreeViewColumn(_("Lunar date"), renderer_is_lunar_date, active=col_no)
        column_is_lunar_date.set_expand(False)
        column_is_lunar_date.set_sort_column_id(col_no)
        self.treeview.append_column(column_is_lunar_date)
        col_no += 1

        # Date
        renderer_year = Gtk.CellRendererCombo()
        renderer_year.set_property("editable", True)
        renderer_year.set_property("model", yearStore)
        renderer_year.set_property("text-column", 0)
        renderer_year.set_property("has-entry", True)
        renderer_year.connect("edited", self.interval_edited, col_no, 1201, 2199)
        column_year = Gtk.TreeViewColumn(_("Year"), renderer_year, text=col_no)
        column_year.set_expand(False)
        column_year.set_sort_column_id(col_no)
        self.treeview.append_column(column_year)
        col_no += 1
        
        renderer_month = Gtk.CellRendererCombo()
        renderer_month.set_property("editable", True)
        renderer_month.set_property("model", monthStore)
        renderer_month.set_property("text-column", 0)
        renderer_month.set_property("has-entry", True)
        renderer_month.connect("edited", self.interval_edited, col_no, 1, 12)
        column_month = Gtk.TreeViewColumn(_("Month"), renderer_month, text=col_no)
        column_month.set_expand(False)
        column_month.set_sort_column_id(col_no)
        self.treeview.append_column(column_month)
        col_no += 1
        
        renderer_day = Gtk.CellRendererCombo()
        renderer_day.set_property("editable", True)
        renderer_day.set_property("model", dayStore)
        renderer_day.set_property("text-column", 0)
        renderer_day.set_property("has-entry", True)
        renderer_day.connect("edited", self.interval_edited, col_no, 1, 31)
        column_day = Gtk.TreeViewColumn(_("Day"), renderer_day, text=col_no)
        column_day.set_expand(False)
        column_day.set_sort_column_id(col_no)
        self.treeview.append_column(column_day)
        col_no += 1
        
        renderer_hour = Gtk.CellRendererCombo()
        renderer_hour.set_property("editable", True)
        renderer_hour.set_property("model", hourStore)
        renderer_hour.set_property("text-column", 0)
        renderer_hour.set_property("has-entry", True)
        renderer_hour.connect("edited", self.interval_edited, col_no, 0, 23)
        column_hour = Gtk.TreeViewColumn(_("Hour"), renderer_hour, text=col_no)
        column_hour.set_expand(False)
        column_hour.set_sort_column_id(col_no)
        self.treeview.append_column(column_hour)
        col_no += 1
        
        renderer_minute = Gtk.CellRendererCombo()
        renderer_minute.set_property("editable", True)
        renderer_minute.set_property("model", minuteStore)
        renderer_minute.set_property("text-column", 0)
        renderer_minute.set_property("has-entry", True)
        renderer_minute.connect("edited", self.interval_edited, col_no, 0, 59)
        column_minute = Gtk.TreeViewColumn(_("Minute"), renderer_minute, text=col_no)
        column_minute.set_expand(False)
        column_minute.set_sort_column_id(col_no)
        self.treeview.append_column(column_minute)
        col_no += 1
        
        renderer_second = Gtk.CellRendererCombo()
        renderer_second.set_property("editable", True)
        renderer_second.set_property("model", secondStore)
        renderer_second.set_property("text-column", 0)
        renderer_second.set_property("has-entry", True)
        renderer_second.connect("edited", self.interval_edited, col_no, 0, 59)
        column_second = Gtk.TreeViewColumn(_("Second"), renderer_second, text=col_no)
        column_second.set_expand(False)
        column_second.set_sort_column_id(col_no)
        self.treeview.append_column(column_second)
        col_no += 1
        
        # Loop
        renderer_is_loop = Gtk.CellRendererToggle()
        renderer_is_loop.connect("toggled", self.field_toggled, col_no)
        column_is_loop = Gtk.TreeViewColumn(_("Recurrence"), renderer_is_loop, active=col_no)
        column_is_loop.set_expand(False)
        column_is_loop.set_sort_column_id(col_no)
        self.treeview.append_column(column_is_loop)
        col_no += 1

        renderer_solar_recurrence_rule = Gtk.CellRendererText()
        renderer_solar_recurrence_rule.set_property("editable", True)
        renderer_solar_recurrence_rule.connect("edited", self.text_edited, col_no)
        column_solar_recurrence_rule = Gtk.TreeViewColumn(_("Solar recurrence rule"), renderer_solar_recurrence_rule, text=col_no)
        column_solar_recurrence_rule.set_expand(True)
        column_solar_recurrence_rule.set_sort_column_id(col_no)
        self.treeview.append_column(column_solar_recurrence_rule)
        col_no += 1

        lunar_rule_store = Gtk.ListStore(str)
        lunar_rule_store.append(["Yearly"])
        lunar_rule_store.append(["Monthly"])
        renderer_lunar_recurrence_rule = Gtk.CellRendererCombo()
        renderer_lunar_recurrence_rule.set_property("editable", True)
        renderer_lunar_recurrence_rule.set_property("model", lunar_rule_store)
        renderer_lunar_recurrence_rule.set_property("text-column", 0)
        renderer_lunar_recurrence_rule.set_property("has-entry", True)
        renderer_lunar_recurrence_rule.connect("edited", self.text_edited, col_no)
        column_lunar_recurrence_rule = Gtk.TreeViewColumn(_("Lunar recurrence rule"), renderer_lunar_recurrence_rule, text=col_no)
        column_lunar_recurrence_rule.set_expand(False)
        column_lunar_recurrence_rule.set_sort_column_id(col_no)
        self.treeview.append_column(column_lunar_recurrence_rule)
        col_no += 1
        
        # Remind
        renderer_is_notify = Gtk.CellRendererToggle()
        renderer_is_notify.connect("toggled", self.field_toggled, col_no)
        column_is_notify = Gtk.TreeViewColumn(_("Remind"), renderer_is_notify, active=col_no)
        column_is_notify.set_expand(False)
        column_is_notify.set_sort_column_id(col_no)
        self.treeview.append_column(column_is_notify)
        col_no += 1
        
        # Color
        remindColorStore = Gtk.ListStore(str)
        remindColorStore.append(["Red"])
        remindColorStore.append(["Green"])
        remindColorStore.append(["Blue"])
        remindColorStore.append(["Orange"])
        remindColorStore.append(["Yellow"])
        remindColorStore.append(["Violet"])
        remindColorStore.append(["Aqua"])
        renderer_remind_color = Gtk.CellRendererCombo()
        renderer_remind_color.set_property("editable", True)
        renderer_remind_color.set_property("model", remindColorStore)
        renderer_remind_color.set_property("text-column", 0)
        renderer_remind_color.set_property("has-entry", True)
        renderer_remind_color.connect("edited", self.text_edited, col_no)
        column_remind_color = Gtk.TreeViewColumn(_("Color"), renderer_remind_color, text=col_no)
        column_remind_color.set_expand(False)
        column_remind_color.set_sort_column_id(col_no)
        self.treeview.append_column(column_remind_color)
        col_no += 1
        
        # Remind before
        renderer_notify_year = Gtk.CellRendererText()
        renderer_notify_year.set_property("editable", True)
        renderer_notify_year.connect("edited", self.interval_edited, col_no, 0, None)
        column_notify_year = Gtk.TreeViewColumn(_("Remind before year"), renderer_notify_year, text=col_no)
        column_notify_year.set_expand(False)
        column_notify_year.set_sort_column_id(col_no)
        self.treeview.append_column(column_notify_year)
        col_no += 1
        
        renderer_notify_month = Gtk.CellRendererText()
        renderer_notify_month.set_property("editable", True)
        renderer_notify_month.connect("edited", self.interval_edited, col_no, 0, None)
        column_notify_month = Gtk.TreeViewColumn(_("Remind before month"), renderer_notify_month, text=col_no)
        column_notify_month.set_expand(False)
        column_notify_month.set_sort_column_id(col_no)
        self.treeview.append_column(column_notify_month)
        col_no += 1
        
        renderer_notify_day = Gtk.CellRendererText()
        renderer_notify_day.set_property("editable", True)
        renderer_notify_day.connect("edited", self.interval_edited, col_no, 0, None)
        column_notify_day = Gtk.TreeViewColumn(_("Remind before day"), renderer_notify_day, text=col_no)
        column_notify_day.set_expand(False)
        column_notify_day.set_sort_column_id(col_no)
        self.treeview.append_column(column_notify_day)
        col_no += 1
        
        renderer_notify_hour = Gtk.CellRendererText()
        renderer_notify_hour.set_property("editable", True)
        renderer_notify_hour.connect("edited", self.interval_edited, col_no, 0, None)
        column_notify_hour = Gtk.TreeViewColumn(_("Remind before hour"), renderer_notify_hour, text=col_no)
        column_notify_hour.set_expand(False)
        column_notify_hour.set_sort_column_id(col_no)
        self.treeview.append_column(column_notify_hour)
        col_no += 1
        
        renderer_notify_minute = Gtk.CellRendererText()
        renderer_notify_minute.set_property("editable", True)
        renderer_notify_minute.connect("edited", self.interval_edited, col_no, 0, None)
        column_notify_minute = Gtk.TreeViewColumn(_("Remind before minute"), renderer_notify_minute, text=col_no)
        column_notify_minute.set_expand(False)
        column_notify_minute.set_sort_column_id(col_no)
        self.treeview.append_column(column_notify_minute)
        col_no += 1
        
        renderer_notify_second = Gtk.CellRendererText()
        renderer_notify_second.set_property("editable", True)
        renderer_notify_second.connect("edited", self.interval_edited, col_no, 0, None)
        column_notify_second = Gtk.TreeViewColumn(_("Remind before second"), renderer_notify_second, text=col_no)
        column_notify_second.set_expand(False)
        column_notify_second.set_sort_column_id(col_no)
        self.treeview.append_column(column_notify_second)
        
        # Scroll
        scrolled_window = Gtk.ScrolledWindow()
        scrolled_window.set_policy(Gtk.PolicyType.AUTOMATIC,
                                   Gtk.PolicyType.AUTOMATIC)
                
        scrolled_window.add(self.treeview)


        # Add buttons
        add_button = Gtk.Button(stock=Gtk.STOCK_ADD)
        add_button.connect("clicked", self.new_event)

        del_button = Gtk.Button(stock=Gtk.STOCK_DELETE)
        del_button.connect("clicked", self.remove_event)

        cancel_button = Gtk.Button(stock=Gtk.STOCK_CANCEL)
        cancel_button.connect("clicked", Gtk.main_quit)

        save_button = Gtk.Button(stock=Gtk.STOCK_APPLY)
        save_button.connect("clicked", self.save_clicked)
        save_button.connect("clicked", Gtk.main_quit)

        button_box.pack_start(add_button, False, False, 0)
        button_box.pack_start(del_button, False, False, 0)
        button_box.pack_end(save_button, False, False, 0)
        button_box.pack_end(cancel_button, False, False, 0)


        box.pack_start(menubar, False, False, 0)
        box.pack_start(instance_box, False, True, 0)

        box.pack_start(scrolled_window, True, True, 0)

        box.add(button_box)

        self.add(box)

    def compare(self, model, row1, row2, user_data):
         sort_column, _ = model.get_sort_column_id()
         if (sort_column == None):
             sort_column = 1
         value1 = model.get_value(row1, sort_column)
         value2 = model.get_value(row2, sort_column)
         if value1 < value2:
             return -1
         elif value1 == value2:
             dict = {1: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9}
             return self.compareDefault(model, row1, row2, user_data, dict, sort_column)
         else:
             return 1

    def compareDefault(self, model, row1, row2, user_data, dict, column_id):
         value1 = model.get_value(row1, column_id)
         value2 = model.get_value(row2, column_id)
         if value1 < value2:
             return -1
         elif value1 == value2:
             if column_id in dict:
                 return self.compareDefault(model, row1, row2, user_data, dict, dict[column_id])
             else:
                 return 0
         else:
             return 1

    def build_menus(self):
        action_group = Gtk.ActionGroup("global_actions")

        # Create Import menu
        action_import_menu = Gtk.Action("ImportMenu", _("Import"), None, None)
        action_group.add_action(action_import_menu)

        action_import_file = Gtk.Action("ImportEventFile",
                                        _("_Import Events File"),
                                        _("Import events from file"),
                                        Gtk.STOCK_FILE)
        action_import_file.connect("activate", self.on_menu_import)
        action_group.add_action(action_import_file)

        # Create Export menu
        action_export_menu = Gtk.Action("ExportMenu", _("Export"), None, None)
        action_group.add_action(action_export_menu)

        action_export_file = Gtk.Action("ExportEventFile",
                                        _("_Export Events File"),
                                        _("Export events to file"),
                                        Gtk.STOCK_FILE)
        action_export_file.connect("activate", self.on_menu_export)
        action_group.add_action(action_export_file)


        # Setup UI manager
        self.ui_manager.add_ui_from_string(UI_INFO)
        self.add_accel_group(self.ui_manager.get_accel_group())
        self.ui_manager.insert_action_group(action_group)


    def new_instance_button_activate(self, widget):
        checking = Gtk.MessageDialog(self, 
                                         Gtk.DialogFlags.MODAL | Gtk.DialogFlags.DESTROY_WITH_PARENT,
                                         Gtk.MessageType.QUESTION,
                                         Gtk.ButtonsType.OK_CANCEL,
                                         _("Changes will be discarded, continue?"))        
        checking.set_title(_('Are you sure?'))
        response = checking.run()
        checking.destroy()
        if response == Gtk.ResponseType.OK:
            dialog = Gtk.MessageDialog(self, 
                                            Gtk.DialogFlags.MODAL | Gtk.DialogFlags.DESTROY_WITH_PARENT,
                                            Gtk.MessageType.QUESTION,
                                            Gtk.ButtonsType.OK_CANCEL,
                                            _("New Instance (List) Name"))
            dialog_box = dialog.get_content_area()
            dialog.set_title(_('Add New Instance (List)'))
            entry = Gtk.Entry()
            entry.set_size_request(100, 0)
            dialog_box.pack_end(entry, False, False, 5)
            dialog.show_all()
            response = dialog.run()
            name = entry.get_text()
            dialog.destroy()
            if response == Gtk.ResponseType.OK and name != '':
                self.add_instance(name)


    def add_instance(self, name):
        """ Add a new instance by name """
        index = self.config.add_instance(name)
        self.instance_combo.set_model(self.config.instances)
        self.instance_combo.set_active(index)


    def change_instance(self, combo):
        """ When a new instance is selected we need to switch the events and the instance gets updated also """
        selected = combo.get_active()
        self.config.set_instance(self.config.get_instance_name(selected))
        self.treeview.set_model(self.config.events)        
        

    def text_edited(self, widget, row, text, col):
        """ When a text box is edited we need to update the event array. """
        if len(text) > 0:
            self.config.events[row][col] = text 
            
        else:
            self.config.events[row][col] = None


    def field_toggled(self, widget, row, col):
        """ Toggle the value of the passed row / col in the event array """
        self.config.events[row][col] = not self.config.events[row][col]


    def interval_edited(self, widget, row, text, col, min, max):
        """ When the interval is changed convert it to a number or refuse to update the field in the event array """
        try:
            txtInt = int(text)
            if min != None and txtInt < min:
                txtInt = min
            if max != None and txtInt > max:
                txtInt = max
            self.config.events[row][col] = txtInt
        except:
            pass# Nothing to do, ignore this.


    def remove_event(self, button):
        """ When delete button is clicked we find the selected record and remove it from the event array """
        selection = self.treeview.get_selection()
        result = selection.get_selected()
        if result:
            model, itr = result
        try:
            model.remove(itr)
        except:
            pass
        

    def new_event(self, button):
        """ Adds a new row to the bottom of the array / Grid """  
        now = datetime.now();      
        self.config.events.append([
            ConfigFileManager.get_new_id(),
            True,
            '',
            False,
            now.year,
            now.month,
            now.day,
            8,
            30,
            0,
            False,
            '',
            'Yearly',
            True,
            'Green',
            0,
            0,
            0,
            15,
            0,
            0
        ])        
        self.treeview.set_cursor(len(self.config.events) - 1, self.treeview.get_column(0), True)
        self.set_size_request(-1, 150 + len(self.config.events) * 20 )
        

    def save_clicked(self, button):
        """ When the user clicks apply we update and save the json file to disk """
        try:
            self.config.save()
            print(self.config.get_instance())
        except Exception as e:
            dialog = Gtk.MessageDialog(self, 0,
                                        Gtk.MessageType.ERROR,
                                        Gtk.ButtonsType.CLOSE,
                                        _("Failed to save config file"))
            dialog.format_secondary_text(str(e))
            dialog.run()
            dialog.destroy()            


    def on_menu_import(self, widget):

        filter_type = Gtk.FileFilter()
        title = _("Choose events file")
        filter_type.set_name(_("Text files"))
        filter_type.add_mime_type("text/plain")        


        dialog = Gtk.FileChooserDialog(title, self,
                                       Gtk.FileChooserAction.OPEN,
                                       (
                                           Gtk.STOCK_CANCEL,
                                           Gtk.ResponseType.CANCEL,
                                           Gtk.STOCK_OPEN,
                                           Gtk.ResponseType.OK
                                       ))

        # Add filters to dialog box
        dialog.add_filter(filter_type)

        filter_any = Gtk.FileFilter()
        filter_any.set_name(_("All files"))
        filter_any.add_pattern("*")
        dialog.add_filter(filter_any)

        response = dialog.run()
        filename = dialog.get_filename()
        dialog.destroy()
        if response == Gtk.ResponseType.OK:
            try:
                new_events = self.config.import_events(filename)

                dialog = Gtk.MessageDialog(self, 0,
                                        Gtk.MessageType.INFO,
                                        Gtk.ButtonsType.OK,
                                        _("file imported"))
                dialog.format_secondary_text(_("Imported %d events") % new_events)
                dialog.run()
                dialog.destroy()
                
            except Exception as e:
                dialog = Gtk.MessageDialog(self, 0,
                                        Gtk.MessageType.ERROR,
                                        Gtk.ButtonsType.CLOSE,
                                        _("Failed to import file"))
                dialog.format_secondary_text(str(e))
                dialog.run()
                dialog.destroy()        


    def on_menu_export(self, widget):
        dialog = Gtk.FileChooserDialog(_("Save events file"), self,
                                       Gtk.FileChooserAction.SAVE,
                                       (
                                           Gtk.STOCK_CANCEL,
                                           Gtk.ResponseType.CANCEL,
                                           Gtk.STOCK_SAVE,
                                           Gtk.ResponseType.OK
                                       ))

        # Add filters to dialog box
        filter_text = Gtk.FileFilter()
        filter_text.set_name(_("Text files"))
        filter_text.add_mime_type("text/plain")
        dialog.add_filter(filter_text)

        filter_any = Gtk.FileFilter()
        filter_any.set_name(_("All files"))
        filter_any.add_pattern("*")
        dialog.add_filter(filter_any)

        response = dialog.run()
        filename = dialog.get_filename()
        dialog.destroy()
        sys.stderr.write(str(response))
        if response == Gtk.ResponseType.OK:
            try:
                self.config.export_events(filename)
                #ConfigManager.write(self.config.events, filename=filename)
            except Exception as ex:
                sys.stderr.write(_("Unable to export file, exception: %s") % str(ex))
                error_dialog = Gtk.MessageDialog(self, 0,
                                        Gtk.MessageType.ERROR,
                                        Gtk.ButtonsType.CLOSE,
                                        _("Unable to export file"))
                error_dialog.format_secondary_text(str(ex))
                
                error_dialog.run()
                error_dialog.destroy()                         


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('filename', help='settings filename including path')
    parser.add_argument('instance', help='instance name')

    args = parser.parse_args()    

    filename = args.filename
    instance_name = args.instance

    # Display the window to allow the user to manage the events.
    config = ConfigFileManager(filename, instance_name)
    window = MainWindow(config)
    window.connect("delete-event", Gtk.main_quit)
    
    window.show_all()
    Gtk.main()
