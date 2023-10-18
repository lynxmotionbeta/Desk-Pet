'''
 * Authors:    Eduardo Nunes 
 * Version:    1.0
 * Licence:    LGPL-3.0 (GNU Lesser General Public License)
 *
 * Description: Sample code for peripheral management: light sensor, push button, RGB LEDs, and buzzer using the API.
'''

from src.api import API
from src.utils import DTime
from src.constants import LEDColor,LEDMode
import time as t

############## LEDS CONTROL EXAMPLE
## CHANGE THE ROUTINE BY PRESSING THE PUSH BUTTON

deskpet = API()

is_toggle = False

current_routine = -1

last_button_state = False

leds_state = False

light_state = 0 # -1: Dark, 0: Undetermined, 1: Light

def routine0():
    print("Routine 0: blinks RED 5 times")
    deskpet.blinkLeds(color = LEDColor.RED, times = 5)

def routine1():
    print("Routine 1: dim BLUE 4 times")
    deskpet.dimLeds(color=LEDColor.BLUE, times=4)

def routine2():
    print("Routine 2: dim leds from YELLOW TO CYAN 6 times")
    deskpet.dimLeds(color=LEDColor.YELLOW, end_color=LEDColor.CYAN, times = 6)

def routine3():
    print("Routine 3: hold solid MAGENTA color for 5 seconds")
    deskpet.setLeds(color=LEDColor.MAGENTA, time_ms= 5000)

def routine4():
    print("Routine 4: Hold blinking WHITE indefinitely")
    deskpet.blinkLeds(color = LEDColor.WHITE) # color = LEDColor.WHITE is the default

def routine5():
    print("Routine 5: hold solid GREEN color at 100'%'")
    deskpet.setLeds(color=LEDColor.GREEN)

def routine6():
    print("Routine 6: hold solid GREEN color at 50'%'")
    deskpet.setLeds(color=LEDColor.GREEN, bright=50)

def routine7():
    print("Routine 7: hold solid GREEN color at 20'%'")
    deskpet.setLeds(color=LEDColor.GREEN, bright=20)

def routine8():
    print("Routine 8: Turn off the leds")
    deskpet.setLeds(color=LEDColor.OFF)

def routine9():
    #print("Routine 9: Changes the LED color and flashing mode depending on the light sensor value")
    if deskpet.isDark():
        deskpet.dimLeds(color=LEDColor.BLUE)
    elif deskpet.isLight():
        deskpet.dimLeds(color=LEDColor.YELLOW)
    else:
        deskpet.blinkLeds(color=LEDColor.RED)

def routine10():
    #print("Routine 10: LED brightness control based on the light sensor value")
    value = deskpet.getLightPercentage()
    deskpet.setLeds(color=LEDColor.CYAN, bright= value)

demo_routines = [
    routine0,
    routine1,
    routine2,
    routine3,
    routine4,
    routine5,
    routine6,
    routine7,
    routine8,
    routine9,
    routine10
]

routines_number = len(demo_routines)-1

def main():
    global last_button_state
    global current_routine
    global demo_routines
    global is_toggle
    global routines_number
    global leds_state
    
    leds_state = deskpet.areLedsIdle()
    
    print(" > Starting demo")
    while True:

        # Show the LEDs state
        if leds_state != deskpet.areLedsIdle():
            leds_state = deskpet.areLedsIdle()
            if leds_state:
                print(" >> LED routine completed")
            else:
                print(" >> Starting LED routine")
                
        # Check button state   
        button_state = deskpet.isButtonPressed()
        if button_state and not last_button_state: # Rising Edge
            is_toggle = True
        last_button_state = button_state
            
        # Set a routine when the button is pressed
        if is_toggle:
            deskpet.playBuzzer(600,duration_ms=100)
                        
            current_routine+=1
            if current_routine > routines_number:
                current_routine = 0
                            
            if current_routine < routines_number-1:
                demo_routines[current_routine]()
            
            # Descriptions of additional sample routines
            if routines_number-1 == current_routine:
                print(f"Routine {routines_number-1}: Changes the LED color and flashing mode depending on the light sensor value")
            elif routines_number == current_routine:
                print(f"Routine {routines_number}: LED brightness control based on the light sensor value")
            
            is_toggle = False
 
        # More complex routine examples
        if routines_number-1 <= current_routine <= routines_number:
            demo_routines[current_routine]()
            
        t.sleep_ms(30)

if __name__ == "__main__":
    main()

