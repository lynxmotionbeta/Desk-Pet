
'''
 * Authors:    Eduardo Nunes
 * Version:    1.0
 * Licence:    LGPL-3.0 (GNU Lesser General Public License)
 *
 * Description: Module with useful classes for general purposes.
'''

import time
import ujson
import uos
from math import radians, cos, pi


class DTime:
    def __init__(self, dt = None):
        if dt <= 0:
            raise ValueError("TIME should be greater than 0ms")
        self._new = time.ticks_ms()
        self._old = time.ticks_ms()
        self._dt = dt
        self.debug = False

    def reset(self):
        self._old = time.ticks_ms()

    @property
    def time(self):
        return self._dt

    @time.setter
    def time(self,dt):
        if dt is None:
            self._dt = dt
            return
        elif dt <= 0:
            raise ValueError("TIME should be greater than 0ms")
        self._dt = dt
        self.reset()
        
    def getDT(self,debug = False):
        if self._dt is None:
            return False
        self._new = time.ticks_ms()
        dt = time.ticks_diff(self._new, self._old)
        if (debug):
            #print("Time elapsed: ")
            print(dt)
        if dt-self._dt >= 0:
            self._old = self._new
            return True
        return False

class CircularBuffer:
    def __init__(self, max_size):
        self.max_size = max_size
        self.buffer = [None] * max_size  # Initialize a list with None elements
        self.head = 0  # Pointer to add elements at the end
        self.tail = 0  # Pointer to remove elements from the beginning
        self.size = 0  # Current size of the buffer

    def is_empty(self):
        return self.size == 0

    def is_full(self):
        return self.size == self.max_size

    def enqueue(self, message):
        if self.is_full():
            # If the buffer is full, overwrite the oldest message
            self.tail = (self.tail + 1) % self.max_size
        self.buffer[self.head] = message
        self.head = (self.head + 1) % self.max_size
        if self.size < self.max_size:
            self.size += 1

    def dequeue(self):
        if not self.is_empty():
            message = self.buffer[self.tail]
            self.tail = (self.tail + 1) % self.max_size
            self.size -= 1
            return message
        else:
            return None

class ConfigurationManager:
    def __init__(self): # takes 17 ms
        self.filename = "../data/internal_config.json"
        self.default_config ={
            "led_color": 0,
            "blink_mode": 0,
            "calibration": [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]
            }
        self.config_data = self.default_config
        self.loadConfig()

    def loadConfig(self):
        try:
            
            try:
                uos.stat("../data")
            except OSError:
                uos.mkdir("../data")
                
            # Try to open the JSON configuration file
            with open(self.filename, 'r') as f:
                # Check if the file is empty or does not exist
                try:
                    self.config_data = ujson.load(f)
                except Exception:
                    # The file is empty or does not exist, use the default configuration
                    self.save()
        except OSError:
            # The file doesn't exist, create a new one with the default configuration
            self.save()
            
    def save(self): # takes 8 ms
        # Save the current configuration data to the JSON file
        try:
            with open(self.filename, 'w') as f:
                ujson.dump(self.config_data, f)
            return True
        except:
            return False
        
    @staticmethod
    def exposeVersion(version):
        try:
            with open("version", 'w') as f:
                f.write(version)
            return True
        except:
            return False
        
    
class SmoothMotionController:

    def __init__(self, position_limit, time_to_target=1500, time_step_ms=50, initial_target_position=0):
        # Position limits
        self.position_limit = (position_limit[0], position_limit[1])
        # Time in ms to reach the target
        self.time_to_target = time_to_target
        # Time sampling in milliseconds
        self.time_step_ms = time_step_ms
        # Current position         
        self.current_position = initial_target_position
        # Target position 
        self.target_position = self.current_position
        # Start position for interpolation
        self.start_position = self.current_position
        # Counter for steps
        self.counter = 0
        # Number of steps required
        self.steps = round(self.time_to_target / self.time_step_ms)
        # Rate of change
        self.rate = 1 / self.steps

    def updateTargetPosition(self, new_tp, time_ms = None):
        if new_tp != self.target_position or time_ms != self.time_step_ms:
            if time_ms is not None:
                self.time_step_ms = time_ms 
            self.target_position = max(self.position_limit[0], min(new_tp, self.position_limit[1]))
            self.counter = 0
            self.steps = round(self.time_to_target / self.time_step_ms)
            self.rate = 1 / self.steps
            self.start_position = self.current_position

    def nextPosition(self):
        if self.counter <= self.steps:
            nextPos = self.start_position + (self.target_position - self.start_position) * (1 - cos(pi * self.counter * self.rate)) * 0.5
            self.counter += 1
            self.current_position = nextPos
            return nextPos
        else:
            return self.target_position

    def getCurrentPosition(self):
        return self.current_position

    def reset(self):
        self.current_position = self.target_position
        self.counter = 0
