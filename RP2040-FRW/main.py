from src.api import API
from src.utils import DTime
from src.constants import LEDColor,LEDMode
import time as t

deskpet = API()

routine_time_ms = 4000

current_routine = 0

update_routine = DTime(routine_time_ms)

is_toggled = False

def routine0():
    print("Routine 0: blinks RED 5 times")
    deskpet.blinkLeds(color = LEDColor.WHITE, times = 5)

def routine1():
    print("Routine 1: dim BLUE 4 times")
    deskpet.dimLeds(color=LEDColor.BLUE, times=4)

def routine2():
    print("Routine 2: dim leds from YELLOW TO CYAN 6 times")
    deskpet.dimLeds(color=LEDColor.YELLOW, end_color=LEDColor.CYAN, times = 6)

def routine3():
    print("Routine 3: hold solid MAGENTA color for 5 seconds")
    #deskpet.setLeds(color=LEDColor.MAGENTA, time_ms= 5000)

def routine4():
    print("Routine 4: Hold blinking WHITE indefinitely")
    deskpet.blinkLeds(color = LEDColor.WHITE) # color = LEDColor.WHITE is the default

demo_routines = [
    routine0,
    routine1,
    routine2,
    routine3,
    routine4,
]

current_routine = 0
last_button_state = False
def main():
    global last_button_state
    global current_routine
    global demo_routines

    while True:
        button_state = deskpet.isButtonPressed()
        if button_state and not last_button_state: # Rising Edge
            is_toggled = True
        last_button_state = button_state

        if is_toggled:
            deskpet.playBuzzer(600,duration_ms=100)
            demo_routines[current_routine]()
            current_routine+=1
            if current_routine >= len(demo_routines):
                current_routine = 0
            is_toggled = False

        t.sleep_ms(30)

if __name__ == "__main__":
    main()

