'''
 * Authors:    Eduardo Nunes 
 * Version:    1.0
 * Licence:    LGPL-3.0 (GNU Lesser General Public License)
 *
 * Description: Library for the general control of DeskPet functions, through serial commands and code using the API.
'''

import ure
import time
import _thread
from math import degrees
from src.utils import DTime, ConfigurationManager
from src.kinematics import Body, Joints
from src.peripherals import RGBLedController,LightSensor,PushButton,Buzzer
from src.esp_uart import ESPUART
from src.constants import CommErrorCode, MotionRegisters, LEDColor, LEDMode
from lib.lss import LSS


VERSION = "1.0.0" 

class EspCommunicationHandler:

    def __init__(self):
        # CMD variables
        self.cmd = ""
        self.value = 0
        self.extra = ""

        self._esp_bus = ESPUART()

        #### Commands supported by the RP2040
        # Query commands
        self.QUERY_CMD_TABLE = {
            "QV" : self.queryVoltage,
            "QLS" : self.queryLight,
            "QPB" : self.queryButtonState,
            "QLED" : self.queryLedColor,
            "QLB" : self.queryLedBlinkMode,
            "QJO" : self.queryJointOffset,
            "QM" : self.queryMotion,
            #"QI" : IMU,
        }

        # Control commands
        self.CONTROL_CMD_TABLE = {
            "CLED" : self.configLedColor,
            "LED" : self.setLedColor,
            "CLB" : self.configLedBlinkMode,
            "LB" : self.setLedBlinkMode,
            "B" : self.setBuzzer,
            "CJO" : self.setJointOffset,
            "M" : self.motionHandler
        }

        # Map motion register values to control functions
        self.CONTROL_MOTION_REGISTER = {
            MotionRegisters.WALKING: self.setWalking,
            MotionRegisters.ROTATION: self.setRotation,
            MotionRegisters.ROLL: self.setRoll,
            MotionRegisters.PITCH: self.setPitch,
            MotionRegisters.YAW: self.setYaw,
            MotionRegisters.XB: self.setXB,
            MotionRegisters.X: self.setX,
            MotionRegisters.Y: self.setY,
            MotionRegisters.Z: self.setZ,
            MotionRegisters.GAIT_TYPE: self.setGaitType,
            MotionRegisters.TROT: self.setTrot,
            MotionRegisters.BALANCE: self.setBalance,
            MotionRegisters.ASSEMBLY: self.setAssemblyMode,
            MotionRegisters.SEQUENCE: self.setSequence
        }

        self.QUERY_MOTION_REGISTER = {
            MotionRegisters.WALKING: self.queryWalking,
            MotionRegisters.ROTATION: self.queryRotation,
            MotionRegisters.ROLL: self.queryRoll,
            MotionRegisters.PITCH: self.queryPitch,
            MotionRegisters.YAW: self.queryYaw,
            MotionRegisters.XB: self.queryXB,
            MotionRegisters.X: self.queryX,
            MotionRegisters.Y: self.queryY,
            MotionRegisters.Z: self.queryZ,
            MotionRegisters.GAIT_TYPE: self.queryGaitType,
            MotionRegisters.TROT: self.queryTrot,
            MotionRegisters.BALANCE: self.queryBalance,
            MotionRegisters.ASSEMBLY: self.queryAssemblyMode,
            MotionRegisters.SEQUENCE: self.querySequence
        }

    def extractCommand(self,data):
        try:
            result = ure.match(r'([A-Za-z]+)(-?\d*)(.*)',data)
            code = result.group(1)
            value = int(result.group(2)) if result.group(2) else None
            extra = result.group(3)
            return (code,value,extra)
        except KeyError:
            return None

    def communicationLoop(self):
        if self._esp_bus.isMsg():
            try: 
                cmd = self._esp_bus.buffer.dequeue()
                self.cmd, self.value, self.extra = self.extractCommand(cmd)
                if self.cmd[0] == "Q":
                    self.msg_status = self.cmdQueryHandler()
                else:
                    self.msg_status = self.cmdControlHandler()
                self.msg_status = CommErrorCode.OK
                return True
            except KeyError: # Error in command
                self.msg_status = CommErrorCode.BAD_FORMAT 

    def cmdQueryHandler(self):
        try:
            return self.QUERY_CMD_TABLE[self.cmd]()
        except KeyError:
            return CommErrorCode.NOT_SUPPORTED
        
    def cmdControlHandler(self):
        try:
            return self.CONTROL_CMD_TABLE[self.cmd]()
        except KeyError:
            return CommErrorCode.NOT_SUPPORTED

    ####### CMD funcion handlers
    def queryVoltage(self):
        # Returns the battery voltage in millivolts
        v = LSS.getVoltage() 
        if deskpet_power_state[0] == 2:
            v = 3000 # Indicates that DeskPet has entered in sleep mode       
        self._esp_bus.reply(f"*QV{v}\r") 
        
    def queryLight(self):
        light_voltage = ldr.getLightVoltage()
        self._esp_bus.reply(f"*QLS{light_voltage}\r")

    def queryButtonState(self):
        self._esp_bus.reply(f"*QPB{button.isPressed()}\r")

    def queryLedColor(self):
        self._esp_bus.reply(f"*QLED{led_controller.color}\r")

    def queryLedBlinkMode(self):
        self._esp_bus.reply(f"*QLB{led_controller.leds_mode}\r")

    def setLedColor(self):
        led_controller.color = self.value

    def setLedBlinkMode(self):
        led_controller.leds_mode = self.value

    def queryJointOffset(self):
        if not (9<self.value<100):
            return
        servoID = str(self.value)
        # Extract the digits
        leg = int(servoID[0])
        joint = int(servoID[1])
        if 1<= joint <=3 and 1<= leg <=4:
            self._esp_bus.reply(f"*QJO{self.value}V{Joints.joint_calibration_offset[leg-1][joint-1]}\r")

    def setBuzzer(self):
        if self.extra:
            code,value,extra = self.extractCommand(self.extra)
            if code == 'T' or code == 't':
                bz.playFrequency(self.value, duration_ms = value)
        else:
            bz.playFrequency(self.value)  

    def configLedColor(self):
        if LEDColor.isValid(self.value):
            config_manager.config_data["led_color"] = self.value
            config_manager.save()
            led_controller.color = self.value

    def configLedBlinkMode(self):
        if LEDMode.isValid(self.value):
            config_manager.config_data["blink_mode"] = self.value
            config_manager.save()
            led_controller.leds_mode = self.value

    def setJointOffset(self):
        if not (9<self.value<100):
            return
        servoID = str(self.value)
        # Extract the digits for leg and joint
        leg = int(servoID[0])
        joint = int(servoID[1])
        if 1<= joint <=3 and 1<= leg <=4 and self.extra:
            code,value,extra = self.extractCommand(self.extra)
            if code == 'V' and value is not None:
                Joints.joint_calibration_offset[leg-1][joint-1] = value 
                config_manager.config_data["calibration"] = Joints.joint_calibration_offset
                config_manager.save() 

    def motionHandler(self):
        if MotionRegisters.isValid(self.value):
            self.CONTROL_MOTION_REGISTER[self.value]()

    def queryMotion(self):
        if MotionRegisters.isValid(self.value):
            self.QUERY_MOTION_REGISTER[self.value]()
    
    ###### MOTIONS SET METHODS
    # GENERIC GET MOTION VALUE
    def getMotionValue(self):
        if self.extra:
            code,value,extra = self.extractCommand(self.extra)
            if code == 'V' or code == 'v':
                return value
            if extra:
                #extract speed
                pass
        return None
    
    def setWalking(self):
        motion_value = self.getMotionValue()
        if motion_value is not None:
            robot.walkingDirection(motion_value) 

    def setRotation(self):
        motion_value = self.getMotionValue()
        if motion_value is not None:
            robot.walkingRotation(motion_value)

    def setRoll(self):
        motion_value = self.getMotionValue()
        if motion_value is not None:
            robot.rpy(roll=motion_value)

    def setPitch(self):
        motion_value = self.getMotionValue()
        if motion_value is not None:
            robot.rpy(pitch=motion_value)

    def setYaw(self):
        motion_value = self.getMotionValue()
        if motion_value is not None:
            robot.rpy(yaw=motion_value)

    def setXB(self):
        motion_value = self.getMotionValue()
        if motion_value is not None:
            robot.xyBody(xb=motion_value)

    def setX(self):
        motion_value = self.getMotionValue()
        if motion_value is not None:
            robot.xyz(x=motion_value)

    def setY(self):
        motion_value = self.getMotionValue()
        if motion_value is not None:
            robot.xyz(y=motion_value)

    def setZ(self):
        motion_value = self.getMotionValue()
        if motion_value is not None:
            robot.xyz(z=motion_value)

    def setGaitType(self):
        motion_value = self.getMotionValue()
        if motion_value is not None:
            robot.changeGait(type=motion_value)

    def setTrot(self):
        motion_value = self.getMotionValue()
        if motion_value is not None:
            if motion_value > 0:
                robot.setTrot(active=1)
            else:
                robot.setTrot(active=0)

    def setBalance(self):
        motion_value = self.getMotionValue()
        if motion_value is not None:
            if motion_value > 0:
                robot.setBalance(active=1)
            else:
                robot.setBalance(active=0)
    
    def setAssemblyMode(self):
        motion_value = self.getMotionValue()
        if motion_value is not None:
            if motion_value == 1:
                robot.assembly(1)
            else:
                robot.assembly_mode = 0

    def setSequence(self): ## FOR SPECIAL MOVES, NOT IMPLEMENTED YET
        motion_value = self.getMotionValue()
        if motion_value is not None:
            robot.specialMove(move = motion_value)

    ###### MOTIONS QUERY METHODS
    def queryWalking(self):
        v =  int(robot.getWalkingAngles()) #convert to int
        self._esp_bus.reply(f"*QM{self.value}V{v}\r")

    def queryRotation(self):
        v =  robot.getRotDir()
        self._esp_bus.reply(f"*QM{self.value}V{v}\r")

    def queryRoll(self):
        v =  int(degrees(robot.rpy_angles[0]))
        self._esp_bus.reply(f"*QM{self.value}V{v}\r")

    def queryPitch(self):
        v =  int(degrees(robot.rpy_angles[1]))
        self._esp_bus.reply(f"*QM{self.value}V{v}\r")

    def queryYaw(self):
        v =  int(degrees(robot.rpy_angles[2]))
        self._esp_bus.reply(f"*QM{self.value}V{v}\r")

    def queryXB(self):
        v =  int(robot.body_offsetB[0])
        self._esp_bus.reply(f"*QM{self.value}V{v}\r")

    def queryX(self):
        v =  int(robot.translation[0])
        self._esp_bus.reply(f"*QM{self.value}V{v}\r")

    def queryY(self):
        v =  int(robot.translation[1])
        self._esp_bus.reply(f"*QM{self.value}V{v}\r")

    def queryZ(self):
        v =  int(robot.translation[2])
        self._esp_bus.reply(f"*QM{self.value}V{v}\r")

    def queryGaitType(self):
        v = robot.getCurrentGait()
        self._esp_bus.reply(f"*QM{self.value}V{v}\r")

    def queryTrot(self):
        v =  robot.isTrot()
        self._esp_bus.reply(f"*QM{self.value}V{v}\r")

    def queryBalance(self):
        v =  robot.balance_function
        self._esp_bus.reply(f"*QM{self.value}V{v}\r")

    def queryAssemblyMode(self):
        v =  robot.assembly_mode
        self._esp_bus.reply(f"*QM{self.value}V{v}\r")

    def querySequence(self):
        # Add the code to query the sequence motion here
        pass

########################################################## INSTANCES

# Peripherical instances
ldr = LightSensor()
button = PushButton()
led_controller = RGBLedController()
bz = Buzzer()

# Memory manager for internal configuration
config_manager = ConfigurationManager()

# Communication with the ESP
esp = EspCommunicationHandler()
#esp = []

# Body Kinematic instance
robot = Body(height = 90, rot_point_x = 0, rot_point_y = 0)
#robot = []
# Identifies the battery status, 0 is OK, 1 is low voltage alert and 2 indicates that DeskPet has entered sleep state.
deskpet_power_state = [0]



######################################################### API CLASS
class API:

    def __init__(self):
        config_manager.exposeVersion(VERSION)
        
        # Initializes LSS BUS for servomotor control
        LSS.initBus()
        
        self.ALERT_VOLTAGE = 6700 #mV
        self.MIN_VOLTAGE = 6500 #mV
        self.bat_voltage = LSS.getVoltage() 
        self.system_loop_timer = DTime(20000) # update the batery voltage every 30 secconds 

        # Initializes parameters with stored values
        led_controller.leds_mode = config_manager.config_data["blink_mode"]
        led_controller.color = config_manager.config_data["led_color"]
        Joints.joint_calibration_offset = config_manager.config_data["calibration"]
        self.stop_thread = False
        '''wait a short time before starting the secondary thread
            in order to completely stop the microcontroller
            after the reset so it can be programmed'''
        #time.sleep(5)
        _thread.start_new_thread(self._loop, ())
      
    def stop(self):
        print("Stopping thread...")
        self.stop_thread = True

    # private method
    def _sys_loop(self):
        if self.system_loop_timer.getDT():
            self.bat_voltage = LSS.getVoltage() #7200
            if self.MIN_VOLTAGE < self.bat_voltage <= self.ALERT_VOLTAGE and not led_controller.isSystemMSG():
                led_controller.activateSystemRoutine(led_controller.dimLeds, start_color=LEDColor.MAGENTA, end_color=LEDColor.RED)
                deskpet_power_state[0] = 1
            elif 1000 < self.bat_voltage <= self.MIN_VOLTAGE: #turn off the servos
                self._turnOff()
            elif self.bat_voltage > self.ALERT_VOLTAGE and led_controller.isSystemMSG():
                led_controller.stopSystemRoutine()

    # private method
    def _turnOff(self):
        robot.turnOff()
        bz.deinit()
        led_controller.turnOff()
        deskpet_power_state[0] = 2

    # private method
    def _loop(self):
        while True:
            try:
                self._sys_loop()
            except Exception as e:
                print("Error in _sys_loop:", e)
            
            if deskpet_power_state[0] < 2:
                try:
                    robot.motionLoop()
                except Exception as e:
                    print("Error in motionLoop:", e)

                try:
                    led_controller.RGBLedsLoop()
                except Exception as e:
                    print("Error in RGBLedsLoop:", e)

                try:
                    button.buttonLoop()
                except Exception as e:
                    print("Error in buttonLoop:", e)

                try:
                    bz.buzzerLoop()
                except Exception as e:
                    print("Error in buzzerLoop:", e)
            
            try:
                esp.communicationLoop()
            except Exception as e:
                print("Error in communicationLoop:", e)      

    #################### API METHODS
    # LEDS
    def blinkLeds(self, color=None, time_ms = None,  times = 0):
        led_controller.blinkLeds(color, time_ms = time_ms,  times = times)

    def dimLeds(self, color=None, end_color= LEDColor.OFF, time_ms = None, times = 0):
        led_controller.dimLeds(start_color=color, end_color=end_color, time_ms = time_ms, times = times)
    
    def setLeds(self,color=LEDColor.WHITE, time_ms = None, bright = 100):
        led_controller.setLeds(color=color, time_ms = time_ms, bright = bright)

    def areLedsIdle(self):
        # Checks the status of the LEDs to verify if they are not running a routine.
        return not led_controller.isRunning()
        
    # Push Button
    def isButtonPressed(self):
        return button.isPressed()
    
    # Buzzer
    def playBuzzer(self, frequency, duration_ms = 1000, velocity=100):
        bz.playFrequency(frequency=frequency, duration_ms = duration_ms, velocity=velocity)
        #bz.play_frequency(600,duration_ms=100) for system

    def stopBuzzer(self):
        bz.stop()

    # Light Sensor
    def getLightValue(self):
        return ldr.getLightValue()

    def getLightVoltage(self):
        return ldr.getLightVoltage()
    
    def getLightPercentage(self):
        return ldr.getLightPercentage()
    
    def isLight(self):
        return ldr.isLight()
    
    def isDark(self):
        return ldr.isDark()

    # Atmega information
    def getBatVoltage(self):
        # Returns the battery voltage in millivolts
        #return (0 if self.bat_voltage is None else self.bat_voltage)
        v =  LSS.getVoltage()
        return v
    
    def getPowerState():
        return deskpet_power_state[0]
    
    ###### MOTIONS SET METHODS
    # Body Position
    def setRPYAngles(self,roll = None,pitch = None, yaw = None):
        robot.rpy(roll = roll,pitch = pitch, yaw = yaw)

    def setXYZ(self,x = None, y = None, z = None):
        robot.xyz(x = x, y = y, z = z)

    def setXYBody(self,xb = None, yb = None):
        robot.xyBody(xb = xb, yb = yb)

    # Walking controls
    def walk(self,angle_deg):  #angle in degrees
        robot.walkingDirection(angle_deg)

    def rotate(self,direction):
        robot.walkingRotation(direction)

    def changeGait(self,type):
        robot.changeGait(type)

    # Modes
    def trotON(self):
        robot.setTrot(1)

    def trotOFF(self):
        robot.setTrot(0)
    
    def balanceON(self):
        robot.setBalance(1)

    def balanceOFF(self):
        robot.setBalance(0)

    def enableAssembly(self):
        robot.assembly(1)

    def disableAssembly(self):
        robot.assembly_mode = 0

    def setJointOffset(self, leg, joint, angle_deg):
        if not 1 <= leg <= 4:
            raise ValueError("leg_id must be greater than 1 and less than 4")
        if not 1 <= joint <= 3:
            raise ValueError("joint_id must be greater than 1 and less than 3")
        Joints.joint_calibration_offset[leg-1][joint-1] = angle_deg
        config_manager.config_data["calibration"] = Joints.joint_calibration_offset
        config_manager.save()

    ###### MOTIONS QUERY METHODS
    # Body Position
    def getRPYAngles(self):
        rpy_angles_deg = tuple(degrees(angle) for angle in robot.rpy_angles)
        return rpy_angles_deg

    def getXYZ(self):
        return robot.translation[:]

    def getXYBody(self):
        return (robot.body_offsetB[0],robot.body_offsetB[1])

    # Walking controls
    def getWalkingAngle(self):  #angle in degrees
        return (robot.getWalkingAngles())

    def getRotateDirection(self):
        return robot.getRotDir()

    def getCurrentGait(self):
        return robot.getCurrentGait()

    # Modes
    def getTrot(self):
        return robot.isTrot()
    
    def getBalanceMode(self):
        return robot.balance_function
    
    def isAssembly(self):
        return bool(robot.assembly_mode)

    def getJointOffset(self, leg, joint):
        if not 1 <= leg <= 4:
            raise ValueError("leg_id must be greater than 1 and less than 4")
        if not 1 <= joint <= 3:
            raise ValueError("joint_id must be greater than 1 and less than 3")
       
        return Joints.joint_calibration_offset[leg-1][joint-1]

            