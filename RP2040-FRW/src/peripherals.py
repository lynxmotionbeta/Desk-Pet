from machine import Pin, ADC, PWM
import neopixel
from src.utils import DTime
from src.constants import LEDMode,LEDColor

################# PUSH BUTTON
class PushButton:

    def __init__(self, pin = 11):
        self._button = Pin(pin, Pin.IN, Pin.PULL_UP)
        
        self._toggle = False
        self._loop_update_timer = DTime(50) #50ms
        self.temp = self._button.value()
        self._button_pressed = 0 if self.temp else 1
    
    def isPressed(self):
        return self._button_pressed
            
    def buttonLoop(self):
        if self._loop_update_timer.getDT():
            temp = self._button.value()
            if self.temp != temp:
                self.temp = temp        
            else:   
                if self.temp == 0: 
                    self._button_pressed = 1
                else:
                    self._button_pressed = 0


################# LIGHT SENSOR
class LightSensor:

    def __init__(self, pin = 26, dark_th = 5, light_th = 9):
        self.adc = ADC(pin)
        self._voltage = 3300 #mV
        self._dark_th = 65535*dark_th/100
        self._light_th = 65535*light_th/100

    def getLightValue(self):
        return(self.adc.read_u16())

    def getLightVoltage(self):
        return(self._voltage*self.adc.read_u16()/65535)
    
    def getLightPercentage(self):
        raw_value = self.adc.read_u16()
        return (100.0*raw_value / 65535.0)
    
    def isLight(self):
        return (self.adc.read_u16() >= self._light_th)
    
    def isDark(self):
        return (self.adc.read_u16() <= self._dark_th)


################# RGB LED CONTROL 
class RGBLedController:
    def __init__(self, num_leds=4, gpio_pin=10, loop_update_time_ms = 100):
        self.num_leds = num_leds
        self.neo_leds_pin = Pin(gpio_pin, Pin.OUT)
        self.np = neopixel.NeoPixel(self.neo_leds_pin, self.num_leds)

        # Dimmer variables
        self._leds_mode = LEDMode.OFF
        self._color = LEDColor.OFF
        self.leds_color = LEDColor.getRGBCode(self._color)
        self.leds_color2 = LEDColor.getRGBCode(self._color)
        self.blink_time = DTime(500) # 1 seccond

        self.function_time = DTime(5000) # 5 seccond

        self.loop_update_time = DTime(loop_update_time_ms)
        self.steps = int(1500 / self.loop_update_time.time) # 2 secconds diming transition OFF-ON-OFF
        
        self.step = 0   # Used for blink modes
        self.TIMES = 0 # Cycle times, TIMES = 5 implies 5 bliks for example
        self.count = 1 # Counter of blinks, or transitions in case of dimming

        self._system_msg = False ## Blocks the leds control functions, used for system msgs i.e. low battery

        self.np.fill(LEDColor.getRGBCode(self._color))  # Set all pixels to black/off
        self.np.write()

        self.is_running = False # Flag to know if there is some routine in progress
        
    def testLeds(self):
        # Set the initial colors for each individual LED
        self.np[0] = LEDColor.getRGBCode(LEDColor.RED)
        self.np[1] = LEDColor.getRGBCode(LEDColor.GREEN)
        self.np[2] = LEDColor.getRGBCode(LEDColor.BLUE)
        self.np[3] = LEDColor.getRGBCode(LEDColor.YELLOW)
        self.np.write()
        t = DTime(3000) 
        while(not t.getDT()): # Delay
            pass
        self.np.fill((0, 0, 0))  # Set all pixels to black/off
        self.np.write()

    # Private method
    def _setLeds(self,color):
        self.np.fill(color)  # Set all pixels to black/off
        self.np.write()

    def turnOff(self):
        self._setLeds((0,0,0))

    def dimLeds(self, start_color=None, end_color=LEDColor.OFF, time_ms = None, times = 0):
        if not self._system_msg:
            #print("dim_leds") 
            self.function_time.time = time_ms
            self.step = 0
            if LEDColor.isValid(start_color):
                self._color = start_color
                self.leds_color = LEDColor.getRGBCode(start_color)
            self.leds_color2 = LEDColor.getRGBCode(end_color)
            self._leds_mode = LEDMode.DIMMING
            self.count = 0
            self.TIMES = times if times > 0 else 0

    def blinkLeds(self, color=None, time_ms = None,  times = 0):
        if not self._system_msg:
            #print("blink_leds") 
            self.step = 0
            self.function_time.time = time_ms
            if LEDColor.isValid(color):
                self._color = color
                self.leds_color = LEDColor.getRGBCode(color)
            self._leds_mode = LEDMode.BLINKING
            self.count = 0
            self.TIMES = times if times > 0 else 0
    
    def setLeds(self,color=LEDColor.WHITE, time_ms = None, bright = 100):
        if not self._system_msg:  
            #print("set_leds")        
            if LEDColor.isValid(color):
                self.step = 0 # Reset blinking mode function
                self._leds_mode = LEDMode.OFF
                self.function_time.time = time_ms
                bright_percentage = bright/100 if 0<=bright<=100 else 1
                self._color = color
                rgb = LEDColor.getRGBCode(color)
                self.leds_color = [int(x * bright_percentage) for x in rgb]
    
    def isRunning(self):
        """
        Returns True if there is a Leds routine running, otherwise returns False, useful for concatenating routines.
        """
        return self.is_running

    # More LSS compatible methods used for serial communication
    @property
    def color(self):
        return self._color

    @color.setter
    def color(self, color):
        if LEDColor.isValid(color):
            self.step = 0 # Reset blinking mode function
            # Keeps the current blinking mode indefinitely
            self.TIMES = 0 
            self.function_time.time = None
            self._color = color
            self.leds_color = LEDColor.getRGBCode(self._color)
    
    @property
    def leds_mode(self):
        return self._leds_mode

    @leds_mode.setter
    def leds_mode(self,mode):
        if 0 <= mode < 3:
            self.step = 0 # Reset blinking mode function
            # Keeps the current blinking mode indefinitely
            self.TIMES = 0 
            self.function_time.time = None
            self._leds_mode = mode

    
    # System routine control
    def activateSystemRoutine(self, function, *args, **kwargs):
        function(*args, **kwargs)
        self._system_msg = True
    
    def changeSystemRoutine(self, function, *args, **kwargs):
        self._system_msg = False
        function(*args, **kwargs)
        self._system_msg = True

    def stopSystemRoutine(self):
        self._leds_mode = LEDMode.OFF
        self._setLeds(LEDColor.getRGBCode(LEDColor.OFF))
        self.TIMES = -1
        self.count = 0
        self.step = 0
        self._system_msg = False

    def RGBLedsLoop(self):  
        if self.loop_update_time.getDT():
            if not self.function_time.getDT() and ((self.count < self.TIMES) or self.TIMES == 0):
                self.is_running = True
                if self._leds_mode == LEDMode.BLINKING:
                    #print("BLINKING") 
                    if self.blink_time.getDT():
                        if self.step == 0:
                            self._setLeds(self.leds_color)
                            self.step = 1
                        else:
                            self._setLeds(LEDColor.getRGBCode(LEDColor.OFF))
                            self.step = 0
                            if self.TIMES != 0:
                                self.count+=1
                elif self._leds_mode == LEDMode.DIMMING:
                    # print("DIMMING") 
                    if self.step <= self.steps:
                        t = self.step / self.steps
                        bright = t if t < 0.5 else (1-t)
                        bright *=2
                        r = int((self.leds_color[0] + t * (self.leds_color2[0] - self.leds_color[0]))*bright)
                        g = int((self.leds_color[1] + t * (self.leds_color2[1] - self.leds_color[1]))*bright)
                        b = int((self.leds_color[2] + t * (self.leds_color2[2] - self.leds_color[2]))*bright)
                        
                        self._setLeds((r, g, b))
                        self.step +=1
                    else:
                        self.step = 0
                        if self.TIMES != 0:
                            self.count+=1
                if self._leds_mode == LEDMode.OFF:
                    #print("SOLID") 
                    if self.step == 0:
                        self._setLeds(self.leds_color)
                        self.step = 1

            elif self.step !=0:
                self.is_running = False
                self._setLeds(LEDColor.getRGBCode(LEDColor.OFF))
                self.TIMES = -1 # -1 disable: 0 solid
                self.count = 0
                self.step = 0
                if self._system_msg: # The system message has ended 
                    self._system_msg = False

################# BUZZER
class Buzzer:

    def __init__(self, pin = 8):
        self._buzzer_pin = PWM(Pin(pin))
        self._tone_timer = DTime(100)
        self.freq = 0
        self.playing_tone = False
        self.velocity = 100
        self._tones = {
            "C4": 261,
            "D4": 294,
            "E4": 329,
            "F4": 349,
            "G4": 392,
            "A4": 440,
            "B4": 494,
            "C5": 523,
            "P": 0  # Pausa
        }

    def buzzerLoop(self):
        if self.playing_tone:            
            if self.frequency > 0:
                self._buzzer_pin.freq(self.frequency)
                self._buzzer_pin.duty_u16(int(self.velocity * 1000 / 100))
            else:
                self._buzzer_pin.duty_u16(0)
            
            if self._tone_timer.getDT():
                self.stop()
                self.playing_tone = False

    def playTone(self, tone, duration_ms = 500, velocity=100):
        self.velocity = velocity
        self._tone_timer.time = duration_ms
        self.frequency = self._tones.get(tone, 0)
        self.playing_tone = True
    
    def playFrequency(self, frequency, duration_ms = 1000, velocity=100):
        self.velocity = velocity
        self._tone_timer.time = duration_ms
        self.frequency = frequency
        self.playing_tone = True
        
    def stop(self):
        self._buzzer_pin.duty_u16(0)

    def deinit(self):
        self.stop()
        self._buzzer_pin.deinit()
