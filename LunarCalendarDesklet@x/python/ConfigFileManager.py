#!/usr/bin/env python3

from __future__ import unicode_literals
import sys
import os
import uuid
import json
import csv
import argparse
import xml.etree.ElementTree as et
import gi
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk

DEFAULT_EVENTS = '''
{
    "instances" : [ 
        {
            "name": "default",
            "events": [
                {
                    "id": "",
                    "enabled": true,
                    "title": "Tết dương lịch",                    
                    "isLunarDate": false,
                    "year": 2018,
                    "month": 1,
                    "day": 1,
                    "hour": 0,
                    "minute": 0,
                    "second": 0,
                    "isLoop": true,
                    "solarRecurrenceRule": "FREQ=YEARLY",
                    "lunarRecurrenceRule": "Yearly",
                    "notify": true,
                    "color": "Green",
                    "notifyBeforeYear": 0,
                    "notifyBeforeMonth": 0,
                    "notifyBeforeDay": 0,
                    "notifyBeforeHour": 14,
                    "notifyBeforeMinute": 0,
                    "notifyBeforeSecond": 0
                },
                {
                    "id": "",
                    "enabled": true,
                    "title": "Tết âm lịch",                    
                    "isLunarDate": true,
                    "year": 2018,
                    "month": 1,
                    "day": 1,
                    "hour": 0,
                    "minute": 0,
                    "second": 0,
                    "isLoop": true,
                    "solarRecurrenceRule": "",
                    "lunarRecurrenceRule": "Yearly",
                    "notify": true,
                    "color": "Green",
                    "notifyBeforeYear": 0,
                    "notifyBeforeMonth": 0,
                    "notifyBeforeDay": 6,
                    "notifyBeforeHour": 14,
                    "notifyBeforeMinute": 0,
                    "notifyBeforeSecond": 0
                }
            ]
        }
    ]
}
'''

class ConfigFileManager:
    '''
        Class used to manage the new json multi-instance config file.
    '''
    def __init__(self, filename, instance_name):
        '''
            This requires the filename that is being read along
            with the instance name to bind to the event array
        '''
        self.events = Gtk.ListStore(
            str,
            bool,
            str,
            bool,
            int,
            int,
            int,
            int,
            int,
            int,
            bool,
            str,
            str,
            bool,
            str,
            int,
            int,
            int,
            int,
            int,
            int
        )
        self.instances = Gtk.ListStore(str, str)
        self.__filename = filename
        self.__json = ConfigFileManager.read(filename)
        self.set_instance(instance_name)


    def set_instance(self, instance_name):
        '''
            Method used to change which instance list is being bound to the events array
        '''
        self.__instance_selected = instance_name
        self.__load_events()
        for iid, row in enumerate(self.instances):
            if row[0] == instance_name:
                return iid
        # Not found (might indicate bigger issues?)
        return -1

    def get_instance(self):
        '''
            Returns the current selected instance name
        '''
        return self.__instance_selected

    def get_instance_id(self):
        '''
            Returns the curent selected instance ID
        '''
        for iid, row in enumerate(self.instances):
            if row[0] == self.__instance_selected:
                return iid
        # Not found (might indicate bigger issues?)
        return -1


    def save(self):
        '''
            Convert the array back into events instance in the config file and then save / export it
        '''
        for instance in self.__json['instances']:
            if instance['name'] == self.__instance_selected:
                # Remove the events
                instance.pop('events')
                # add a new empty section
                instance['events'] = []

                # Add all the events back in
                for event in self.events:
                    instance['events'].append({                        
                        "id": event[0],
                        "enabled": event[1],
                        "title": event[2],                    
                        "isLunarDate": event[3],
                        "year": event[4],
                        "month": event[5],
                        "day": event[6],
                        "hour": event[7],
                        "minute": event[8],
                        "second": event[9],
                        "isLoop": event[10],
                        "solarRecurrenceRule": event[11],
                        "lunarRecurrenceRule": event[12],
                        "notify": event[13],
                        "color": event[14],
                        "notifyBeforeYear": event[15],
                        "notifyBeforeMonth": event[16],
                        "notifyBeforeDay": event[17],
                        "notifyBeforeHour": event[18],
                        "notifyBeforeMinute": event[19],
                        "notifyBeforeSecond": event[20]
                    })

        ConfigFileManager.write(self.__filename, self.__json)


    def add_instance(self, new_name):
        '''
            Add a new instance (if doesnt exist) and switch the instance to it
        '''
        ## Check if name is already in list of instances
        if not self.__instance_exists(new_name):
            #Add new instance
            self.__json['instances'].append({
                'name': new_name,
                'events': []})

        return self.set_instance(new_name)


    def get_instance_name(self, index):
        '''
            Get the name of an instance by index in instance array
        '''
        return self.instances[index][0]


    def __instance_exists(self, name):
        '''
            Check if the instance already exists
        '''
        for instance in self.__json['instances']:
            if instance['name'] == name:
                return True
        return False


    def __load_events(self):
        '''
            This will parse the loaded json file and populate the instances and events arrays
        '''
        # reset the lists
        self.events = Gtk.ListStore(
            str,
            bool,
            str,
            bool,
            int,
            int,
            int,
            int,
            int,
            int,
            bool,
            str,
            str,
            bool,
            str,
            int,
            int,
            int,
            int,
            int,
            int
        )
        self.instances = Gtk.ListStore(str, str)

        # Populate the lists.
        for instance in self.__json['instances']:
            self.instances.append([instance['name'], instance['name']])
            if instance['name'] == self.__instance_selected:
                for event in instance['events']:
                    self.events.append([
                        event["id"],
                        event["enabled"],
                        event["title"],             
                        event["isLunarDate"],
                        event["year"],
                        event["month"],
                        event["day"],
                        event["hour"],
                        event["minute"],
                        event["second"],
                        event["isLoop"],
                        event["solarRecurrenceRule"],
                        event["lunarRecurrenceRule"],
                        event["notify"],
                        event["color"],
                        event["notifyBeforeYear"],
                        event["notifyBeforeMonth"],
                        event["notifyBeforeDay"],
                        event["notifyBeforeHour"],
                        event["notifyBeforeMinute"],
                        event["notifyBeforeSecond"]
                    ])

    def export_events(self, output_name):
        '''
            Writes the selected events array to a file.
            Note that the ID is not exported, it is created on import.
        '''
        if len(self.events) > 0:
            mode = 'w'
            if sys.version_info.major < 3:
                mode += 'b'

            with open(output_name, mode=mode) as file:
                file.write("### Events export v=1.0\n")
                if sys.version_info.major < 3:
                    filewriter = UnicodeCSVWriter(file, quoting=csv.QUOTE_NONNUMERIC)
                else:
                    filewriter = csv.writer(file, quoting=csv.QUOTE_NONNUMERIC)

                for event in self.events:
                    filewriter.writerow(event[1:])


    def import_events(self, input_name):
        '''
            Import a file in the events csv format.
        '''
        cnt = 0
        mode = 'rb' if sys.version_info.major < 3 else 'r'

        with open(input_name, mode=mode) as file:
            header = file.readline()
            if header != '### Events export v=1.0\n':
                raise Exception("Invalid file, must have a first line matching: ### Events export v=1.0")

            filereader = csv.reader(file)

            for line in filereader:
                self.events.append(
                    [ConfigFileManager.get_new_id()] + [
                        self.__to_bool(line[0]),
                        line[1],
                        self.__to_bool(line[2]),
                        int(line[3]),
                        int(line[4]),
                        int(line[5]),
                        int(line[6]),
                        int(line[7]),
                        int(line[8]),
                        self.__to_bool(line[9]),
                        line[10],
                        line[11],
                        self.__to_bool(line[12]),
                        line[13],
                        int(line[14]),
                        int(line[15]),
                        int(line[16]),
                        int(line[17]),
                        int(line[18]),
                        int(line[19])
                    ]
                )
                cnt += 1
        return cnt


    @classmethod
    def __to_bool(cls, val):
        return val.lower() == "true"


    @staticmethod
    def read(file_name):
        '''
            Returns the config.json file or creates a new one with
            default values if it does not exist
        '''
        try:
            with open(file_name, mode="r") as json_file:
                json_obj = json.load(json_file)

        except FileNotFoundError:
            # No file found, return default values # everything else throws.
            json_obj = json.loads(DEFAULT_EVENTS)
            # Populate the UUIDs
            for instance in json_obj['instances']:
                if instance['name'] == 'default':
                    for event in instance['events']:
                        # This unique ID is the identifier for this event for life
                        event['id'] = ConfigFileManager.get_new_id()
            # Create the UUID folder if it does not exist.
            path = os.path.dirname(file_name)
            if not os.path.exists(path):
                os.makedirs(path)
                
            ConfigFileManager.write(file_name, json_obj)

        return json_obj


    @staticmethod
    def write(jsonfile, json_obj):
        '''
            Takes a passed in json object and writes the file to disk
        '''
        mode = 'w'

        with open(jsonfile, mode=mode, encoding='utf-8') as file:
            content = json.dumps(json_obj, ensure_ascii=False)
            file.write(content)


    @staticmethod
    def get_new_id():
        '''
            Common method used to return a unique id in a string format.
        '''
        return str(uuid.uuid4())


if __name__ == '__main__':
    # pragma pylint: disable=C0103
    parser = argparse.ArgumentParser()
    parser.add_argument('filename', help='settings filename including path')

    args = parser.parse_args()

    filename = args.filename

    jsonfile = ConfigFileManager.read(filename)
    print(json.dumps(jsonfile))
