'''
 * Authors:    Eduardo Nunes
 * Version:    1.0
 * Licence:    LGPL-3.0 (GNU Lesser General Public License)
 *
 * Description: Useful constants for DeskPet control using the API.
'''

################# RGB LED CONTROL 
class LEDMode:
    OFF = 0
    BLINKING = 1
    DIMMING = 2

class LEDColor:
    OFF = 0
    RED = 1
    GREEN = 2
    BLUE = 3
    YELLOW = 4
    CYAN = 5
    MAGENTA = 6
    WHITE = 7

    color_list = [
        (0, 0, 0),       # OFF
        (255, 0, 0),     # RED
        (0, 255, 0),     # GREEN
        (0, 0, 255),     # BLUE
        (255, 255, 0),   # YELLOW
        (0, 255, 255),   # CYAN
        (255, 0, 255),   # MAGENTA
        (255, 255, 255)  # WHITE
    ]

    @classmethod
    def getRGBCode(cls, color_value):
        if 0 <= color_value < len(cls.color_list):
            return cls.color_list[color_value]
        else:
            raise ValueError("Invalid color value")
    
    @classmethod
    def isValid(cls, color_value):
        if color_value is None:
            return False
        return 0 <= color_value < len(cls.color_list)

################# KINEMATICS
class Gait:
    Dynamic = 1
    Static = 3

    @classmethod
    def isValid(cls,type):
        return(type == 3 or type == 1)

class Rotation:
    CCW,STOP,CW = range(-1,2)

    @classmethod
    def isValid(cls,move):
        return (-1<=move<=1) 
    
class Walking:
    FORWARD = 90
    BACKWARD = 270
    LEFT = 180
    RIGHT = 360
    NE = 45 # Northeast
    NW = 135 # Southwest
    SW = 225 # Northwest
    SE = 315 # Northeast
    STOP = 0

################# COMMUNICATION

class CommErrorCode:
    #Error codes
    OK = 0
    BAD_FORMAT = 1
    NOT_SUPPORTED = 2

    @property
    def str(self):
        if self == CommErrorCode.OK:
            return "Message received successfully"
        elif self == CommErrorCode.BAD_FORMAT:
            return "Incorrect message format"
        elif self == CommErrorCode.NOT_SUPPORTED:
            return "command not supported by ATmega or RP2040"
        else:
            return "Unknown error code"

class MotionRegisters:
    WALKING = 0
    ROTATION = 1
    ROLL = 2
    PITCH = 3
    YAW = 4
    XB = 5
    X = 6
    Y = 7
    Z = 8
    GAIT_TYPE = 9
    TROT = 10
    BALANCE = 11
    ASSEMBLY = 12
    SEQUENCE = 20

    @classmethod
    def isValid(cls,register):
        return ((0<=register<=12) or register == 20)
