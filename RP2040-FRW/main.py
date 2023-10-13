from src.api import API
from src.utils import DTime
from src.constants import LEDColor,LEDMode
import time as t

############## LEDS CONTROL EXAMPLE
## CHANGE THE ROUTINE BY PRESSING THE PUSH BUTTON

deskpet = API()

is_toggle = False

current_routine = 0

last_button_state = False

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

demo_routines = [
    routine0,
    routine1,
    routine2,
    routine3,
    routine4,
    routine5,
    routine6,
    routine7,
    routine8
]

## add an lisgt sensor routine
routines_number = len(demo_routines)
def main():
    global last_button_state
    global current_routine
    global demo_routines
    global is_toggle
    global routines_number

    while True:
        button_state = deskpet.isButtonPressed()
        if button_state and not last_button_state: # Rising Edge
            is_toggle = True
        last_button_state = button_state

        if is_toggle:
            deskpet.playBuzzer(600,duration_ms=100)
            if current_routine < routines_number:
                demo_routines[current_routine]()
            
            current_routine+=1
            if current_routine >= routines_number:
                current_routine = 0
            
            is_toggle = False

        t.sleep_ms(30)

if __name__ == "__main__":
    main()

